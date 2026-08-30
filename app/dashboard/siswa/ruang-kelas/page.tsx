"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, BookOpen, Key, Plus, Loader2, Users, CheckCircle2, ChevronLeft, 
  FileText, ArrowRight, Activity, Clock, Target, Send, AlertTriangle
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc, getDocs, updateDoc, arrayUnion, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function RuangKelasSiswa() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [kelasSaya, setKelasSaya] = useState<any[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);

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

  // Inisialisasi Data Kelas
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        const qKelas = query(collection(db, "manajemen_kelas"), where("peserta", "array-contains", user.uid));
        const unsubKelas = onSnapshot(qKelas, (snapshot) => {
          setKelasSaya(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        });
        return () => unsubKelas();
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
        // Isian Singkat & Uraian dinilai manual oleh Guru nanti
      });

      const nilaiAkhirCBT = maxSkor > 0 ? Math.round((totalSkor / maxSkor) * 100) : 0;

      await addDoc(collection(db, "jawaban_siswa"), {
        uid: userUid,
        idUjian: ujianAktif.id,
        judulUjian: ujianAktif.pengaturan.judul,
        kelas: activeClass.nama,
        jawabanMentah: jawaban,
        nilai: nilaiAkhirCBT,
        benar: benar,
        salah: salah,
        status: "Selesai",
        timestamp: serverTimestamp(),
        metadataAnalitik: {
          waktuSelesaiMnt: Math.round(((ujianAktif.pengaturan.waktuMenit * 60) - timeLeft) / 60),
          statusKemandirian: "Mandiri"
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
      <div className="min-h-screen bg-slate-50 flex flex-col relative -mt-4 md:-mt-8 -mx-4 md:-mx-8">
        
        {/* Header CBT Tetap */}
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <Target size={20} />
            </div>
            <div className="hidden sm:block">
              <h1 className={`font-bold text-slate-800 text-lg leading-tight ${teachersFont.className}`}>{ujianAktif.pengaturan.judul}</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{ujianAktif.pengaturan.jenisUjian}</p>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-sm'}`}>
            <Clock size={18} />
            <span className="font-mono font-bold text-lg md:text-xl tracking-wider">{formatTime(timeLeft)}</span>
          </div>

          <button 
            onClick={() => submitUjian(false)} 
            disabled={isSubmittingUjian || isTimeUp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 md:py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmittingUjian ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span className="hidden sm:inline">Kumpulkan</span>
          </button>
        </header>

        {/* Kanvas Soal */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-32">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            {ujianAktif.soal?.map((soal: any, index: number) => {
              
              // Opsi Kanan untuk Jodohkan
              const opsiKananAcak = soal.tipe === "Jodohkan" 
                ? [...(soal.pasangan || [])].map(p => p.kanan).sort(() => Math.random() - 0.5) 
                : [];

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  key={soal.id} 
                  className="bg-white p-5 md:p-8 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-200/80"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-black text-sm flex items-center justify-center border border-blue-100">
                        {index + 1}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                        {soal.tipe}
                      </span>
                    </div>
                    {/* Indikator terisi */}
                    {((soal.tipe !== "Jodohkan" && jawaban[soal.id]) || (soal.tipe === "Jodohkan" && jawaban[soal.id] && Object.keys(jawaban[soal.id]).length === soal.pasangan?.length)) && (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    )}
                  </div>

                  {/* Render Pertanyaan dengan Whitespace */}
                  <div className="text-[15px] md:text-base text-slate-800 leading-relaxed font-medium mb-6 whitespace-pre-wrap">
                    {soal.pertanyaan}
                  </div>

                  {/* LOGIKA INPUT BERDASARKAN TIPE */}
                  {soal.tipe === "PG" && (
                    <div className="space-y-3">
                      {soal.opsi?.map((opt: any) => (
                        <label key={opt.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${jawaban[soal.id] === opt.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                          <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                            <input type="radio" name={`soal_${soal.id}`} value={opt.id} checked={jawaban[soal.id] === opt.id} onChange={() => handleJawabanChange(soal.id, opt.id)} className="peer w-5 h-5 opacity-0 absolute cursor-pointer" />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${jawaban[soal.id] === opt.id ? 'border-blue-600' : 'border-slate-300'}`}>
                              {jawaban[soal.id] === opt.id && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                            </div>
                          </div>
                          <span className="text-sm md:text-[15px] text-slate-700 flex-1 leading-snug"><strong className="mr-1">{opt.id}.</strong> {opt.teks}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {soal.tipe === "Benar/Salah" && (
                    <div className="flex gap-4">
                      {["Benar", "Salah"].map((opt) => (
                        <label key={opt} className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${jawaban[soal.id] === opt ? (opt === 'Benar' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-rose-50 border-rose-500 text-rose-800') : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                          <input type="radio" name={`soal_${soal.id}`} value={opt} checked={jawaban[soal.id] === opt} onChange={() => handleJawabanChange(soal.id, opt)} className="hidden" />
                          <span className="font-bold text-base">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {soal.tipe === "Jodohkan" && (
                    <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mb-3"><BookOpen size={14}/> Pilih Pasangan yang Tepat</p>
                      {soal.pasangan?.map((pas: any, pIdx: number) => (
                        <div key={pIdx} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <div className="flex-1 text-sm font-bold text-slate-800 border-b sm:border-b-0 sm:border-r border-slate-100 pb-2 sm:pb-0 sm:pr-3">{pas.kiri}</div>
                          <div className="flex-1">
                            <select 
                              value={jawaban[soal.id]?.[pas.kiri] || ""} 
                              onChange={(e) => handleJodohkanChange(soal.id, pas.kiri, e.target.value)}
                              className="w-full p-2.5 bg-blue-50/50 border border-blue-200 text-blue-800 text-sm font-medium rounded-md outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="" disabled>-- Pilih Pasangannya --</option>
                              {opsiKananAcak.map((kananOpt, kIdx) => <option key={kIdx} value={kananOpt}>{kananOpt}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
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
                </motion.div>
              );
            })}
          </div>
        </main>

        <div className="md:hidden fixed bottom-[70px] left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-40">
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
      <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Ruang Kelas Saya</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-lg">Daftar kelas yang Anda ikuti. Masukkan kode dari guru untuk bergabung ke kelas baru.</p>
        </div>
        
        <form onSubmit={handleGabungKelas} className="flex items-center w-full md:w-auto bg-white p-1.5 rounded-xl border border-slate-300 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
          <div className="pl-3 pr-2 text-slate-400"><Key size={18} /></div>
          <input type="text" placeholder="Kode 6 Digit..." value={kodeKelas} onChange={(e) => setKodeKelas(e.target.value.toUpperCase())} required maxLength={6} className="w-full md:w-32 bg-transparent border-none outline-none text-sm font-bold font-mono tracking-widest text-slate-700 placeholder:tracking-normal placeholder:font-sans" />
          <button type="submit" disabled={isJoining} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-70">
            {isJoining ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Gabung
          </button>
        </form>
      </div>

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