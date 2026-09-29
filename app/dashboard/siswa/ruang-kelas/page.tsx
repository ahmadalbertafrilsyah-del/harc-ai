"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, Key, Plus, Loader2, Users, CheckCircle2, ChevronLeft,
  FileText, ArrowRight, Activity, Clock, Target, Send, AlertTriangle, Lightbulb, Sparkles
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, getDoc, getDocs, updateDoc, arrayUnion, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

/**
 * Pengacakan deterministik untuk opsi lajur kanan soal menjodohkan.
 * Berbasis benih dari id soal agar urutan pilihan TIDAK berubah setiap render
 * (mis. saat timer berdetak), sehingga siswa tidak kebingungan.
 */
function acakStabil<T>(arr: T[], benihTeks: string): T[] {
  let benih = 2166136261;
  for (let i = 0; i < benihTeks.length; i++) {
    benih ^= benihTeks.charCodeAt(i);
    benih = Math.imul(benih, 16777619);
  }
  const acak = () => {
    benih |= 0;
    benih = (benih + 0x6d2b79f5) | 0;
    let t = Math.imul(benih ^ (benih >>> 15), 1 | benih);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const hasil = [...arr];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(acak() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

/**
 * Menyiapkan teks soal untuk ditampilkan: gambar SVG dari guru/AI dipertahankan
 * dan dirender, tag lain di-escape agar markup tak terduga tidak ikut dijalankan.
 */
function soalKeHtml(teks: string): string {
  const svg: string[] = [];
  const disimpan = String(teks ?? "").replace(/<svg[\s\S]*?<\/svg>/gi, (m) => {
    svg.push(m.replace(/\son[a-z]+\s*=\s*(["'])[^"']*\1/gi, "")); // buang handler event
    return `\u0000SVG${svg.length - 1}\u0000`;
  });
  return disimpan
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>")
    .replace(/\u0000SVG(\d+)\u0000/g, (_m, i) => svg[Number(i)] || "");
}

export default function RuangKelasSiswa() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [kelasSaya, setKelasSaya] = useState<any[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [profilSiswa, setProfilSiswa] = useState<any>({});

  const [kodeKelas, setKodeKelas] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // State Detail Kelas
  const [activeClass, setActiveClass] = useState<any | null>(null);
  const [activeTabDetail, setActiveTabDetail] = useState<'materi' | 'asesmen'>('materi');
  const [daftarMateri, setDaftarMateri] = useState<any[]>([]);
  const [daftarUjian, setDaftarUjian] = useState<any[]>([]);
  const [materiTerbuka, setMateriTerbuka] = useState<any | null>(null);

  // ==========================================
  // STATE E-UJIAN (CBT) SISWA
  // ==========================================
  const [ujianAktif, setUjianAktif] = useState<any | null>(null);
  const [jawaban, setJawaban] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isSubmittingUjian, setIsSubmittingUjian] = useState(false);

  // Bantuan AI dalam ujian (menentukan Status Kemandirian)
  const [modelAI, setModelAI] = useState("gemini-1.5-flash");
  const [jumlahBantuanAI, setJumlahBantuanAI] = useState(0);
  const [hintMap, setHintMap] = useState<Record<string, string>>({});
  const [hintLoading, setHintLoading] = useState<string | null>(null);

  // Inisialisasi Data Kelas
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        // Model AI aktif untuk fitur bantuan dalam ujian
        getDoc(doc(db, "ai_monitoring", "api_config")).then((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const models = d.availableModels
              ? d.availableModels.split(",").map((m: string) => m.trim()).filter(Boolean)
              : [d.modelName || "gemini-1.5-flash"];
            if (models[0]) setModelAI(models[0]);
          }
        }).catch(() => {});
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) setProfilSiswa(snap.data());
        });
        const qKelas = query(collection(db, "manajemen_kelas"), where("peserta", "array-contains", user.uid));
        const unsubKelas = onSnapshot(qKelas, (snapshot) => {
          setKelasSaya(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        });
        return () => { unsubKelas(); unsubProfil(); };
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Fetch Materi & Ujian Saat Kelas Dipilih
  useEffect(() => {
    if (activeClass) {
      const qMateri = query(collection(db, "modul_ajar"), where("userId", "==", activeClass.guruId), where("mapel", "==", activeClass.mapel), where("statusValidasi", "==", "disetujui"));
      const unsubMateri = onSnapshot(qMateri, (snapshot) => setDaftarMateri(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
      
      const qUjian = query(collection(db, "bank_soal"), where("kelasId", "==", activeClass.id));
      const unsubUjian = onSnapshot(qUjian, (snapshot) => setDaftarUjian(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

      return () => { unsubMateri(); unsubUjian(); };
    }
  }, [activeClass]);

  // Opsi lajur kanan (menjodohkan) diacak sekali per ujian — stabil selama pengerjaan.
  const petaOpsiJodohkan = useMemo(() => {
    const peta: Record<string, string[]> = {};
    if (!ujianAktif?.soal) return peta;
    ujianAktif.soal.forEach((soal: any) => {
      if (soal.tipe === "Jodohkan" && Array.isArray(soal.pasangan)) {
        peta[soal.id] = acakStabil(soal.pasangan.map((p: any) => p.kanan), soal.id || "jodohkan");
      }
    });
    return peta;
  }, [ujianAktif]);

  // Progres pengerjaan (jumlah soal terjawab)
  const progresUjian = useMemo(() => {
    const soal = ujianAktif?.soal || [];
    const total = soal.length;
    let terisi = 0;
    soal.forEach((s: any) => {
      const j = jawaban[s.id];
      if (s.tipe === "Jodohkan") {
        const n = s.pasangan?.length || 0;
        if (j && n > 0 && Object.keys(j).length === n) terisi++;
      } else if (j !== undefined && j !== null && String(j).trim() !== "") {
        terisi++;
      }
    });
    return { total, terisi, persen: total ? Math.round((terisi / total) * 100) : 0 };
  }, [ujianAktif, jawaban]);

  // ==========================================
  // LOGIKA TIMER & UJIAN
  // ==========================================
  useEffect(() => {
    if (!ujianAktif || isTimeUp || isSubmittingUjian || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          submitUjian(true); // Otomatis Kumpul Saat Waktu Habis
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ujianAktif, isTimeUp, isSubmittingUjian, timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const mulaiUjian = (ujian: any) => {
    setUjianAktif(ujian);
    setTimeLeft((ujian.pengaturan?.waktuMenit || 60) * 60);
    setJawaban({});
    setIsTimeUp(false);
    setJumlahBantuanAI(0);
    setHintMap({});
    setHintLoading(null);
  };

  // Meminta PETUNJUK (bukan jawaban) dari AI. Setiap permintaan menambah
  // hitungan bantuan yang memengaruhi Status Kemandirian pada analitik guru.
  const mintaBantuanAI = async (soal: any) => {
    if (hintLoading) return;
    setHintLoading(soal.id);
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const response = await fetch("/api/petunjuk-ujian", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          model: modelAI,
          soal: {
            tipe: soal.tipe,
            pertanyaan: soal.pertanyaan,
            opsi: soal.opsi || [],
          },
        }),
      });
      const data = await response.json();
      if (response.ok && data?.petunjuk) {
        setHintMap((prev) => ({ ...prev, [soal.id]: data.petunjuk }));
        setJumlahBantuanAI((prev) => prev + 1);
      } else {
        setHintMap((prev) => ({ ...prev, [soal.id]: data?.error || "Petunjuk belum tersedia. Coba lagi sebentar." }));
      }
    } catch {
      setHintMap((prev) => ({ ...prev, [soal.id]: "Gagal memuat petunjuk. Periksa koneksi internetmu." }));
    } finally {
      setHintLoading(null);
    }
  };

  const handleJawabanChange = (soalId: string, value: any) => {
    setJawaban(prev => ({ ...prev, [soalId]: value }));
  };

  const handleJodohkanChange = (soalId: string, kiri: string, kananValue: string) => {
    setJawaban(prev => {
      const existingJodohkan = prev[soalId] || {};
      return { ...prev, [soalId]: { ...existingJodohkan, [kiri]: kananValue } };
    });
  };

  const submitUjian = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const konfirmasi = confirm("Apakah kamu yakin ingin mengumpulkan jawaban ini? Kamu tidak bisa mengulanginya lagi.");
      if (!konfirmasi) return;
    }

    setIsSubmittingUjian(true);

    try {
      let totalSkor = 0;
      let maxSkor = 0;
      let benar = 0;
      let salah = 0;

      ujianAktif.soal.forEach((soal: any) => {
        const jawabSiswa = jawaban[soal.id];
        
        // Auto-Grading PG & Benar/Salah
        if (soal.tipe === "PG" || soal.tipe === "Benar/Salah") {
          maxSkor += 1;
          if (jawabSiswa && jawabSiswa === soal.kunci) {
            totalSkor += 1; benar += 1;
          } else { salah += 1; }
        } 
        // Auto-Grading Jodohkan (Parsial)
        else if (soal.tipe === "Jodohkan" && soal.pasangan) {
          soal.pasangan.forEach((pas: any) => {
            maxSkor += 1;
            if (jawabSiswa && jawabSiswa[pas.kiri] === pas.kanan) {
              totalSkor += 1; benar += 1;
            } else { salah += 1; }
          });
        }
        // Auto-Grading Isian Singkat bila kunci tersedia (normalisasi spasi & huruf)
        else if (soal.tipe === "Isian Singkat" && (soal.kunci || "").trim() !== "") {
          maxSkor += 1;
          const norm = (s: string) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
          // Kunci boleh berisi beberapa alternatif dipisah "/" atau ";"
          const alternatif = String(soal.kunci).split(/[/;]/).map((a) => norm(a));
          if (jawabSiswa && alternatif.includes(norm(jawabSiswa))) {
            totalSkor += 1; benar += 1;
          } else { salah += 1; }
        }
        // Uraian (dan Isian tanpa kunci) dinilai manual oleh Guru nanti
      });

      const nilaiAkhirCBT = maxSkor > 0 ? Math.round((totalSkor / maxSkor) * 100) : 0;

      await addDoc(collection(db, "jawaban_siswa"), {
        uid: userUid,
        siswaId: userUid,
        nama: profilSiswa.nama || "",
        nisn: profilSiswa.nisn || "",
        idUjian: ujianAktif.id,
        judulUjian: ujianAktif.pengaturan.judul,
        kelas: activeClass.nama,
        jawabanMentah: jawaban,
        jawaban: jawaban,
        nilai: nilaiAkhirCBT,
        skor: totalSkor,
        skorMaks: maxSkor,
        benar: benar,
        salah: salah,
        sumber: "CBT daring",
        status: "Selesai",
        timestamp: serverTimestamp(),
        metadataAnalitik: {
          waktuSelesaiMnt: Math.round(((ujianAktif.pengaturan.waktuMenit * 60) - timeLeft) / 60),
          totalBantuanAI: jumlahBantuanAI, // dibaca guru/analitik (rata-rata bantuan)
          jumlahBantuanAI, // alias untuk kompatibilitas
          statusKemandirian:
            jumlahBantuanAI === 0 ? "Mandiri" : jumlahBantuanAI <= 2 ? "Berkembang" : "Perlu Pendampingan",
        }
      });

      alert(autoSubmit ? "Waktu habis! Jawaban otomatis dikumpulkan." : "Jawaban berhasil dikumpulkan! Selamat.");
      setUjianAktif(null); // Keluar dari mode CBT
    } catch (error) {
      console.error("Gagal mengirim jawaban:", error);
      alert("Terjadi kesalahan jaringan. Coba klik kumpulkan lagi.");
    } finally {
      setIsSubmittingUjian(false);
    }
  };

  const handleGabungKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeKelas || !userUid) return;
    setIsJoining(true);

    try {
      const qCari = query(collection(db, "manajemen_kelas"), where("kode", "==", kodeKelas));
      const querySnapshot = await getDocs(qCari);

      if (querySnapshot.empty) { alert("Kode kelas tidak ditemukan."); setIsJoining(false); return; }
      const kelasDoc = querySnapshot.docs[0];
      const kelasData = kelasDoc.data();

      if (kelasData.peserta && kelasData.peserta.includes(userUid)) { alert("Anda sudah bergabung!"); setKodeKelas(""); setIsJoining(false); return; }

      await updateDoc(doc(db, "manajemen_kelas", kelasDoc.id), { peserta: arrayUnion(userUid), siswa: increment(1) });
      alert(`Berhasil bergabung ke kelas ${kelasData.nama}!`);
      setKodeKelas("");
    } catch (error) { alert("Terjadi kesalahan sistem."); } finally { setIsJoining(false); }
  };

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-emerald-600" /></div>;

  // ==========================================
  // TAMPILAN 3: MODE E-UJIAN (CBT) AKTIF
  // ==========================================
  if (ujianAktif) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100">

        {/* Header CBT Tetap */}
        <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-3 sm:px-4 md:px-8 py-2.5 sm:py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <Target size={18} />
              </div>
              <div className="min-w-0">
                <h1 className={`font-bold text-slate-800 text-sm sm:text-base md:text-lg leading-tight truncate ${teachersFont.className}`}>{ujianAktif.pengaturan.judul}</h1>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{ujianAktif.pengaturan.jenisUjian}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-sm'}`}>
                <Clock size={16} className="shrink-0" />
                <span className="font-mono font-bold text-base sm:text-lg md:text-xl tracking-wider tabular-nums">{formatTime(timeLeft)}</span>
              </div>

              <button
                onClick={() => submitUjian(false)}
                disabled={isSubmittingUjian || isTimeUp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isSubmittingUjian ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span className="hidden sm:inline">Kumpulkan</span>
              </button>
            </div>
          </div>

          {/* Bilah progres pengerjaan */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progresUjian.persen}%` }} />
            </div>
            {jumlahBantuanAI > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                <Sparkles size={11} /> {jumlahBantuanAI}
              </span>
            )}
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tabular-nums shrink-0">
              {progresUjian.terisi}/{progresUjian.total} terjawab
            </span>
          </div>
        </header>

        {/* Kanvas Soal */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-10">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-5">
            {ujianAktif.soal?.map((soal: any, index: number) => {
              
              // Opsi Kanan untuk Jodohkan — urutan stabil (tidak berubah tiap render)
              const opsiKananAcak = soal.tipe === "Jodohkan" ? (petaOpsiJodohkan[soal.id] || []) : [];

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.3) }}
                  key={soal.id}
                  className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                        {index + 1}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        {soal.tipe}
                      </span>
                    </div>
                    {/* Indikator terisi */}
                    {((soal.tipe !== "Jodohkan" && jawaban[soal.id]) || (soal.tipe === "Jodohkan" && jawaban[soal.id] && Object.keys(jawaban[soal.id]).length === soal.pasangan?.length)) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Terisi
                      </span>
                    )}
                  </div>

                  {/* Render Pertanyaan (mendukung gambar SVG dari guru/AI) */}
                  <div
                    className="text-[15px] md:text-base text-slate-800 leading-relaxed font-medium mb-5 break-words [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:my-3 [&_svg]:mx-auto [&_svg]:block [&_svg]:rounded-lg [&_svg]:border [&_svg]:border-slate-100 [&_svg]:bg-slate-50/50 [&_svg]:p-2"
                    dangerouslySetInnerHTML={{ __html: soalKeHtml(soal.pertanyaan) }}
                  />

                  {/* LOGIKA INPUT BERDASARKAN TIPE */}
                  {soal.tipe === "PG" && (
                    <div className="space-y-2.5">
                      {soal.opsi?.map((opt: any) => {
                        const terpilih = jawaban[soal.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleJawabanChange(soal.id, terpilih ? "" : opt.id)}
                            className={`w-full flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all active:scale-[0.99] ${
                              terpilih ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className={`shrink-0 w-7 h-7 rounded-full border-2 text-xs font-bold flex items-center justify-center transition-colors ${
                              terpilih ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-500"
                            }`}>
                              {opt.id}
                            </span>
                            <span className="text-sm md:text-[15px] text-slate-700 flex-1 leading-snug">{opt.teks}</span>
                            {terpilih && <CheckCircle2 size={16} className="text-blue-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {soal.tipe === "Benar/Salah" && (
                    <div className="grid grid-cols-2 gap-3">
                      {["Benar", "Salah"].map((opt) => {
                        const terpilih = jawaban[soal.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleJawabanChange(soal.id, terpilih ? "" : opt)}
                            className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 font-bold text-base transition-all active:scale-[0.98] ${
                              terpilih
                                ? opt === "Benar" ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-rose-50 border-rose-500 text-rose-800"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {soal.tipe === "Jodohkan" && (
                    <div className="space-y-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                      <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><BookOpen size={14}/> Pasangkan setiap pernyataan dengan pilihan yang tepat</p>

                      {/* Referensi pilihan (lajur kanan) berlabel huruf */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Pilihan Jawaban</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                          {opsiKananAcak.map((kananOpt: string, kIdx: number) => (
                            <div key={kIdx} className="flex items-start gap-2">
                              <span className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                                {String.fromCharCode(65 + kIdx)}
                              </span>
                              <span className="text-[13px] text-slate-700 leading-snug">{kananOpt}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pernyataan (lajur kiri) + pemilih huruf */}
                      <div className="space-y-2.5">
                        {soal.pasangan?.map((pas: any, pIdx: number) => {
                          const dipilih = jawaban[soal.id]?.[pas.kiri] || "";
                          return (
                            <div key={pIdx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                              <span className="shrink-0 w-6 h-6 rounded-lg bg-slate-100 text-slate-500 font-bold text-[11px] flex items-center justify-center">{pIdx + 1}</span>
                              <div className="flex-1 text-[13.5px] font-semibold text-slate-800 leading-snug min-w-0">{pas.kiri}</div>
                              <select
                                value={dipilih}
                                onChange={(e) => handleJodohkanChange(soal.id, pas.kiri, e.target.value)}
                                aria-label={`Pasangan untuk pernyataan ${pIdx + 1}`}
                                className={`shrink-0 w-[88px] p-2.5 bg-white border text-sm font-bold rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                                  dipilih ? "border-blue-400 text-blue-800 bg-blue-50/60" : "border-slate-300 text-slate-400"
                                }`}
                              >
                                <option value="">—</option>
                                {opsiKananAcak.map((kananOpt: string, kIdx: number) => (
                                  <option key={kIdx} value={kananOpt}>{String.fromCharCode(65 + kIdx)}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(soal.tipe === "Isian Singkat" || soal.tipe === "Uraian") && (
                    <div>
                      <textarea
                        value={jawaban[soal.id] || ""}
                        onChange={(e) => handleJawabanChange(soal.id, e.target.value)}
                        placeholder={soal.tipe === "Isian Singkat" ? "Ketik jawaban singkatmu di sini..." : "Ketik jawaban uraianmu secara rinci di sini..."}
                        className={`w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-[15px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none shadow-inner ${soal.tipe === "Uraian" ? "h-40" : "h-16"}`}
                      />
                    </div>
                  )}

                  {/* Bantuan AI (petunjuk, bukan jawaban) — memengaruhi Status Kemandirian */}
                  <div className="mt-5 pt-4 border-t border-dashed border-slate-200">
                    {hintMap[soal.id] && (
                      <div className="mb-3 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">Petunjuk AI</p>
                          <p className="text-[12.5px] text-amber-900 leading-relaxed">{hintMap[soal.id]}</p>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => mintaBantuanAI(soal)}
                      disabled={hintLoading === soal.id}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-60 active:scale-95"
                    >
                      {hintLoading === soal.id
                        ? <><Loader2 size={14} className="animate-spin" /> Meminta petunjuk…</>
                        : <><Sparkles size={14} /> {hintMap[soal.id] ? "Minta petunjuk lain" : "Minta Bantuan AI"}</>}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1.5">Bantuan AI memberi petunjuk, bukan jawaban. Penggunaannya tercatat pada status kemandirianmu.</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </main>

        <div className="sm:hidden shrink-0 p-3 bg-white border-t border-slate-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
          <button onClick={() => submitUjian(false)} disabled={isSubmittingUjian || isTimeUp} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50">
            {isSubmittingUjian ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {isSubmittingUjian ? "Mengirim Jawaban..." : "Kumpulkan Ujian Sekarang"}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN 2: DETAIL KELAS
  // ==========================================
  if (activeClass) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-6xl mx-auto space-y-6 pb-28 lg:pb-10 relative">
        <button onClick={() => { setActiveClass(null); setMateriTerbuka(null); }} className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors text-sm font-bold mb-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 w-fit">
          <ChevronLeft size={16} /> Kembali ke Daftar Kelas
        </button>

        <div className="h-32 md:h-40 bg-gradient-to-r from-emerald-600 to-teal-800 rounded-2xl p-6 md:p-8 flex flex-col justify-end relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <h1 className={`text-2xl md:text-4xl font-bold text-white mb-1 ${teachersFont.className}`}>{activeClass.nama}</h1>
            <p className="text-emerald-100 font-medium text-sm flex items-center gap-2"><BookOpen size={14}/> {activeClass.mapel}</p>
          </div>
        </div>

        {/* Tab Kontrol Kelas */}
        <div className="flex space-x-2 border-b border-slate-200">
          <button onClick={() => setActiveTabDetail('materi')} className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${activeTabDetail === 'materi' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            <BookOpen size={16}/> Materi Pelajaran
          </button>
          <button onClick={() => setActiveTabDetail('asesmen')} className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${activeTabDetail === 'asesmen' ? 'border-blue-500 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
            <Activity size={16}/> Tugas & Asesmen <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-[10px] ml-1">{daftarUjian.length}</span>
          </button>
        </div>

        {activeTabDetail === 'materi' ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className={`${materiTerbuka ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 flex-col gap-4`}>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 h-auto lg:h-[500px] overflow-y-auto custom-scrollbar">
                {daftarMateri.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {daftarMateri.map((materi) => (
                      <button key={materi.id} onClick={() => setMateriTerbuka(materi)} className={`text-left p-4 rounded-xl transition-all border-l-4 ${materiTerbuka?.id === materi.id ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block bg-emerald-100 text-emerald-700">{materi.tipe}</span>
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{materi.materi || materi.topik}</h4>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-70">
                    <BookOpen size={32} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-600">Belum Ada Materi</p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-2/3">
              {materiTerbuka ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[70vh] lg:h-[calc(100vh-250px)]">
                  <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <button onClick={() => setMateriTerbuka(null)} className="lg:hidden p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500"><ChevronLeft size={16}/></button>
                    <div><h3 className="font-bold text-slate-800 text-sm md:text-base">{materiTerbuka.materi || materiTerbuka.topik}</h3></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar bg-white">
                    <div className="markdown-body max-w-none">
                      <style>{`.markdown-body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; color: #1e293b; text-align: justify; }`}</style>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{materiTerbuka.konten.replace(/<br\s*\/?>/gi, '\n\n')}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden lg:flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-dashed border-slate-300 h-full p-10 text-center opacity-70">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><BookOpen size={32} className="text-slate-400"/></div>
                  <h3 className="font-bold text-slate-700 text-lg">Area Baca Materi</h3>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {daftarUjian.length > 0 ? (
              daftarUjian.map(ujian => (
                <div key={ujian.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col hover:border-blue-300 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md uppercase tracking-wider">{ujian.pengaturan?.jenisUjian || "Tugas"}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-500"><Clock size={12}/> {ujian.pengaturan?.waktuMenit || 60} Min</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-2">{ujian.pengaturan?.judul}</h3>
                  <p className="text-xs text-slate-500 mb-6 flex items-center gap-1.5"><Target size={14}/> {ujian.soal?.length || 0} Butir Soal Evaluasi</p>
                  
                  {/* UBAHAN PENTING: Memanggil fungsi mulaiUjian() untuk membuka kanvas CBT di file yang sama */}
                  <button onClick={() => mulaiUjian(ujian)} className="mt-auto w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all active:scale-95">
                    Mulai Kerjakan <ArrowRight size={16}/>
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 opacity-80">
                <Activity size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="font-bold text-slate-700">Belum Ada Tugas</h3>
                <p className="text-sm text-slate-500 mt-1">Guru belum memberikan tugas atau asesmen untuk kelas ini.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // ==========================================
  // TAMPILAN 1: DAFTAR KELAS (HOME SISWA)
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-28 md:pb-10 px-4 md:px-0">
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#064e3b] via-emerald-900 to-slate-900 text-white shadow-lg shadow-emerald-950/10 border border-emerald-900/40">
        <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden="true" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-emerald-100 text-[10px] sm:text-[11px] font-bold tracking-wide backdrop-blur-sm">
              <BookOpen size={12} className="text-emerald-300" /> {kelasSaya.length} Kelas Terdaftar
            </span>
            <h1 className={`text-2xl md:text-3xl font-bold text-white mt-3 leading-tight ${teachersFont.className}`}>Ruang Kelas Saya</h1>
            <p className="text-emerald-100/85 text-[12.5px] sm:text-sm mt-2 max-w-lg leading-relaxed">
              Akses materi pelajaran serta kerjakan asesmen dari guru Anda. Masukkan kode kelas untuk bergabung ke kelas baru.
            </p>
          </div>

          <form onSubmit={handleGabungKelas} className="flex items-center w-full lg:w-auto bg-white/10 p-1.5 rounded-xl border border-white/20 shadow-sm backdrop-blur-sm focus-within:border-emerald-300/60 focus-within:bg-white/15 transition-all shrink-0">
            <div className="pl-3 pr-2 text-emerald-200"><Key size={18} /></div>
            <input type="text" placeholder="Kode 6 Digit" value={kodeKelas} onChange={(e) => setKodeKelas(e.target.value.toUpperCase())} required maxLength={6} className="w-full lg:w-32 bg-transparent border-none outline-none text-sm font-bold font-mono tracking-widest text-white placeholder:text-emerald-200/60 placeholder:tracking-normal placeholder:font-sans" />
            <button type="submit" disabled={isJoining} className="bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-70 active:scale-95">
              {isJoining ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Gabung
            </button>
          </form>
        </div>
      </section>

      <AnimatePresence>
        {kelasSaya.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kelasSaya.map((kelas) => (
              <motion.div key={kelas.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group cursor-pointer" onClick={() => setActiveClass(kelas)}>
                <div className="h-24 bg-gradient-to-r from-emerald-600 to-teal-800 p-5 flex flex-col justify-end relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <h3 className={`text-xl font-bold text-white relative z-10 ${teachersFont.className}`}>{kelas.nama}</h3>
                </div>
                <div className="p-5 relative">
                  <div className="absolute -top-6 right-5 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 text-emerald-600"><BookOpen size={20}/></div>
                  <p className="text-sm font-bold text-slate-700">{kelas.mapel}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Users size={14}/> {kelas.siswa} Teman Sekelas</p>
                  
                  <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center group-hover:border-emerald-100 transition-colors">
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1"><CheckCircle2 size={12}/> Terdaftar</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">Buka Kelas <ArrowRight size={14}/></span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="font-bold text-slate-700">Belum Ada Kelas</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Anda belum bergabung ke kelas manapun. Mintalah kode akses kepada guru Anda.</p>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}