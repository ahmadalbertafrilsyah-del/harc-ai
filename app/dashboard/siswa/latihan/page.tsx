"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Sparkles, Flame, CheckCircle2, XCircle, ArrowRight, RotateCcw,
  Crown, Medal, Zap, BookOpen, BrainCircuit, Coins, ChevronRight,
} from "lucide-react";
import { Teachers } from "next/font/google";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, doc, increment, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { MemuatHalaman, OverlayProses } from "@/components/Memuat";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

type SoalLatihan = {
  pertanyaan: string;
  opsi: Record<"A" | "B" | "C" | "D", string>;
  kunci: "A" | "B" | "C" | "D";
  pembahasan: string;
};

type JawabRecord = {
  dipilih: "A" | "B" | "C" | "D";
  benar: boolean;
};

function gelarDariXp(xp: number) {
  if (xp >= 1500) return { nama: "Maestro HARC", warna: "from-amber-400 to-orange-500", target: 2500 };
  if (xp >= 800) return { nama: "Juara Utama", warna: "from-violet-500 to-purple-600", target: 1500 };
  if (xp >= 400) return { nama: "Bintang Kelas", warna: "from-blue-500 to-indigo-600", target: 800 };
  if (xp >= 150) return { nama: "Penjelajah Ilmu", warna: "from-emerald-500 to-teal-600", target: 400 };
  return { nama: "Pelajar Pemula", warna: "from-slate-500 to-slate-700", target: 150 };
}

function ekstrakJsonSoal(teks: string): SoalLatihan[] {
  const bersih = teks.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const awal = bersih.indexOf("{");
  const akhir = bersih.lastIndexOf("}");
  const slice = awal !== -1 && akhir > awal ? bersih.slice(awal, akhir + 1) : bersih;
  const parsed = JSON.parse(slice);
  const arr = Array.isArray(parsed) ? parsed : parsed?.soal;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((s: any) => s?.pertanyaan && s?.opsi && s?.kunci)
    .map((s: any) => ({
      pertanyaan: String(s.pertanyaan),
      opsi: {
        A: String(s.opsi.A || s.opsi.a || ""),
        B: String(s.opsi.B || s.opsi.b || ""),
        C: String(s.opsi.C || s.opsi.c || ""),
        D: String(s.opsi.D || s.opsi.d || ""),
      },
      kunci: (String(s.kunci).trim().toUpperCase().slice(0, 1) as "A" | "B" | "C" | "D") || "A",
      pembahasan: String(s.pembahasan || "Pelajari kembali konsep utama pada topik ini."),
    }));
}

export default function ArenaLatihanSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [profil, setProfil] = useState<any>({});
  const [temanSekolah, setTemanSekolah] = useState<any[]>([]);
  const [tab, setTab] = useState<"kuis" | "peringkat">("kuis");

  // Parameter generator kuis
  const [mapel, setMapel] = useState("");
  const [kelas, setKelas] = useState("");
  const [topik, setTopik] = useState("");
  const [kesulitan, setKesulitan] = useState("Sedang (Konseptual)");
  const [jumlahSoal, setJumlahSoal] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pesanError, setPesanError] = useState("");

  // State bermain kuis
  const [soalList, setSoalList] = useState<SoalLatihan[]>([]);
  const [indeks, setIndeks] = useState(0);
  const [riwayatJawab, setRiwayatJawab] = useState<Record<number, JawabRecord>>({});
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [selesai, setSelesai] = useState(false);
  const [xpBaru, setXpBaru] = useState(0);

  useEffect(() => {
    let unsubProfil: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(getAuth(), (user) => {
      unsubProfil?.();
      if (!user) { setIsLoading(false); return; }
      setUserUid(user.uid);
      unsubProfil = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfil(data);
          setKelas((prev) => prev || data.kelas || "");
        }
        setIsLoading(false);
      });
    });
    return () => { unsubAuth(); unsubProfil?.(); };
  }, []);

  useEffect(() => {
    const npsn = profil.npsn || profil.instansi;
    if (!npsn) { setTemanSekolah([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn)),
      (snap) => {
        setTemanSekolah(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, [profil.npsn, profil.instansi]);

  const papanPeringkat = useMemo(() => {
    return [...temanSekolah]
      .sort((a, b) => (Number(b.xpPoints) || 0) - (Number(a.xpPoints) || 0));
  }, [temanSekolah]);

  const peringkatSaya = useMemo(() => {
    if (!userUid) return -1;
    return papanPeringkat.findIndex((s) => s.id === userUid) + 1;
  }, [papanPeringkat, userUid]);

  const gelarSaya = useMemo(() => gelarDariXp(Number(profil.xpPoints) || 0), [profil.xpPoints]);

  const mulaiKuis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid || !mapel.trim() || !topik.trim()) return;
    if ((profil.aiTokens || 0) <= 0) {
      setPesanError("Token AI habis. Silakan isi ulang di menu Beli Token untuk membuat latihan baru.");
      return;
    }

    setIsGenerating(true);
    setPesanError("");
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const sys = `Anda adalah tutor ahli pembuat kuis interaktif kurikulum Kemendikdasmen/Kemenag. Kembalikan HANYA JSON valid tanpa teks pembuka/penutup.`;
      const prompt = `Buat ${jumlahSoal} soal pilihan ganda (4 opsi A, B, C, D) untuk latihan mandiri siswa.\nMata Pelajaran: ${mapel}\nJenjang/Kelas: ${kelas || "Umum"}\nTopik/Materi: ${topik}\nTingkat Kesulitan: ${kesulitan}\n\nFormat JSON WAJIB persis seperti ini:\n{"soal":[{"pertanyaan":"...","opsi":{"A":"...","B":"...","C":"...","D":"..."},"kunci":"A","pembahasan":"Penjelasan singkat dan jelas mengapa jawaban tersebut benar."}]}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.choices?.[0]?.message?.content) {
        throw new Error(data?.error || "Gagal membuat soal latihan.");
      }
      const parsed = ekstrakJsonSoal(data.choices[0].message.content);
      if (parsed.length === 0) throw new Error("Format soal tidak terbaca. Coba ulangi lagi.");

      setSoalList(parsed);
      setIndeks(0);
      setRiwayatJawab({});
      setStreak(0);
      setMaxStreak(0);
      setSelesai(false);
      setXpBaru(0);
    } catch (err: any) {
      setPesanError(err?.message || "Gagal menyiapkan latihan interaktif.");
    } finally {
      setIsGenerating(false);
    }
  };

  const pilihOpsi = (opsi: "A" | "B" | "C" | "D") => {
    if (riwayatJawab[indeks]) return;
    const soal = soalList[indeks];
    const benar = opsi === soal.kunci;
    setRiwayatJawab((prev) => ({ ...prev, [indeks]: { dipilih: opsi, benar } }));
    if (benar) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setMaxStreak((m) => Math.max(m, nextStreak));
    } else {
      setStreak(0);
    }
  };

  const lanjutBerikutnya = async () => {
    if (indeks + 1 < soalList.length) {
      setIndeks(indeks + 1);
      return;
    }
    const jumlahBenar = Object.values(riwayatJawab).filter((r) => r.benar).length;
    const earned = Math.max(10, jumlahBenar * 10 + maxStreak * 5);
    setXpBaru(earned);
    setSelesai(true);
    if (userUid) {
      try {
        await updateDoc(doc(db, "users", userUid), { xpPoints: increment(earned) });
      } catch { /* abaikan jika gagal update */ }
    }
  };

  const resetKuis = () => {
    setSoalList([]);
    setRiwayatJawab({});
    setSelesai(false);
    setStreak(0);
    setMaxStreak(0);
    setIndeks(0);
  };

  if (isLoading) return <MemuatHalaman label="Memuat Arena Latihan..." subLabel="Menyiapkan kuis interaktif dan peringkat prestasi" />;

  const jumlahBenarTotal = Object.values(riwayatJawab).filter((r) => r.benar).length;
  const skorPersen = soalList.length > 0 ? Math.round((jumlahBenarTotal / soalList.length) * 100) : 0;
  const xpSaatIni = Number(profil.xpPoints) || 0;
  const persenLevel = Math.min(100, Math.round((xpSaatIni / gelarSaya.target) * 100));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto w-full space-y-5 pb-4">
      {/* HEADER BANNER */}
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-emerald-700/40">
        <div className="pointer-events-none absolute -top-16 -right-16 w-60 h-60 rounded-full bg-amber-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-amber-200 text-[10px] sm:text-[11px] font-bold tracking-wide">
              <Zap size={12} className="text-amber-300" /> Tingkatkan Prestasi &amp; Peringkat
            </span>
            <h1 className={`text-2xl sm:text-3xl font-bold mt-2.5 ${teachersFont.className}`}>Arena Latihan Mandiri</h1>
            <p className="text-emerald-100/85 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
              Uji pemahamanmu lewat kuis interaktif bertahap lengkap dengan pembahasan seketika dan kumpulkan XP prestasi.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 min-w-[210px] shrink-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r text-white ${gelarSaya.warna}`}>
                {gelarSaya.nama}
              </span>
              <span className="text-xs font-black text-amber-300 tabular-nums">{xpSaatIni} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all duration-500" style={{ width: `${persenLevel}%` }} />
            </div>
            <p className="text-[10px] text-emerald-100/80 mt-1.5 flex justify-between">
              <span>Target gelar berikutnya</span>
              <span className="font-bold">{gelarSaya.target} XP</span>
            </p>
          </div>
        </div>
      </section>

      {/* TAB KONTROL */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setTab("kuis")}
          className={`flex-1 sm:flex-initial min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            tab === "kuis" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <BrainCircuit size={16} /> Kuis Interaktif
        </button>
        <button
          type="button"
          onClick={() => setTab("peringkat")}
          className={`flex-1 sm:flex-initial min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            tab === "peringkat" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Trophy size={16} /> Papan Peringkat
        </button>
      </div>

      {/* TAB 1: KUIS INTERAKTIF */}
      {tab === "kuis" && (
        <div className="relative">
          {isGenerating && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[340px] relative overflow-hidden">
              <OverlayProses judul="Menyiapkan Soal Latihan..." keterangan={`Merancang ${jumlahSoal} soal interaktif materi ${topik}`} />
            </div>
          )}

          {!isGenerating && soalList.length === 0 && (
            <form onSubmit={mulaiKuis} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                <div>
                  <h2 className={`text-base sm:text-lg font-bold text-slate-800 ${teachersFont.className}`}>Pilih Tantangan Belajar</h2>
                  <p className="text-xs text-slate-500 mt-0.5">AI akan membuat soal latihan baru beserta pembahasan langsung di tiap nomor.</p>
                </div>
                <Link href="/dashboard/siswa/beli-token" className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors">
                  <Coins size={13} className="text-amber-500" /> {(profil.aiTokens || 0).toLocaleString("id-ID")} Token AI
                </Link>
              </div>

              {pesanError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                  {pesanError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Mata Pelajaran *</label>
                  <input
                    type="text" required value={mapel} onChange={(e) => setMapel(e.target.value)}
                    placeholder="Cth: Matematika / IPA / Bahasa Indonesia / Fikih"
                    className="w-full min-h-[44px] px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Kelas / Jenjang</label>
                  <input
                    type="text" value={kelas} onChange={(e) => setKelas(e.target.value)}
                    placeholder="Cth: Kelas 8 / VII MTs / Kelas 11 SMA"
                    className="w-full min-h-[44px] px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Topik atau Materi yang Ingin Dilatih *</label>
                <input
                  type="text" required value={topik} onChange={(e) => setTopik(e.target.value)}
                  placeholder="Cth: Teorema Pythagoras / Fotosintesis / Teks Eksplanasi"
                  className="w-full min-h-[44px] px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tingkat Kesulitan</label>
                  <select value={kesulitan} onChange={(e) => setKesulitan(e.target.value)} className="w-full min-h-[44px] px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-500">
                    <option value="Dasar (Pemahaman Awal)">Dasar (Pemahaman Awal)</option>
                    <option value="Sedang (Konseptual)">Sedang (Konseptual)</option>
                    <option value="HOTS (Penalaran Tinggi)">HOTS (Penalaran Tinggi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Jumlah Soal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[5, 10].map((n) => (
                      <button
                        key={n} type="button" onClick={() => setJumlahSoal(n)}
                        className={`min-h-[44px] rounded-xl text-xs font-bold border transition-all ${
                          jumlahSoal === n ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-300 hover:bg-white"
                        }`}
                      >
                        {n} Soal Pilihan Ganda
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[50px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-extrabold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Sparkles size={18} /> Mulai Latihan Interaktif
              </button>
            </form>
          )}

          {/* MODE BERMAIN KUIS */}
          {!isGenerating && soalList.length > 0 && !selesai && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                  Soal <strong className="text-slate-800">{indeks + 1}</strong> / {soalList.length}
                </span>
                <div className="flex items-center gap-2">
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full animate-bounce">
                      <Flame size={14} className="fill-orange-500 text-orange-500" /> Combo x{streak}
                    </span>
                  )}
                  <button type="button" onClick={resetKuis} className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1">
                    Keluar
                  </button>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${((indeks + (riwayatJawab[indeks] ? 1 : 0)) / soalList.length) * 100}%` }} />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={indeks}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  className="space-y-4"
                >
                  <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed">
                    {soalList[indeks].pertanyaan}
                  </p>

                  <div className="space-y-2.5">
                    {(["A", "B", "C", "D"] as const).map((huruf) => {
                      const jawab = riwayatJawab[indeks];
                      const benar = huruf === soalList[indeks].kunci;
                      const dipilih = jawab?.dipilih === huruf;

                      let gaya = "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-700";
                      if (jawab) {
                        if (benar) gaya = "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200";
                        else if (dipilih) gaya = "border-rose-400 bg-rose-50 text-rose-900";
                        else gaya = "border-slate-200 bg-slate-50/60 text-slate-400 opacity-75";
                      }

                      return (
                        <button
                          key={huruf}
                          type="button"
                          disabled={Boolean(jawab)}
                          onClick={() => pilihOpsi(huruf)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${gaya}`}
                        >
                          <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 border ${
                            jawab && benar ? "bg-emerald-600 text-white border-emerald-600"
                            : jawab && dipilih ? "bg-rose-600 text-white border-rose-600"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {huruf}
                          </span>
                          <span className="text-sm font-medium flex-1">{soalList[indeks].opsi[huruf]}</span>
                          {jawab && benar && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
                          {jawab && dipilih && !benar && <XCircle size={18} className="text-rose-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {riwayatJawab[indeks] && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
                      <div className={`p-4 rounded-xl border ${
                        riwayatJawab[indeks].benar ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"
                      }`}>
                        <p className="text-xs font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <BookOpen size={14} /> {riwayatJawab[indeks].benar ? "Tepat Sekali! Pembahasan:" : `Kunci: ${soalList[indeks].kunci} — Pembahasan:`}
                        </p>
                        <p className="text-xs sm:text-sm leading-relaxed">{soalList[indeks].pembahasan}</p>
                      </div>

                      <button
                        type="button"
                        onClick={lanjutBerikutnya}
                        className="w-full min-h-[48px] bg-slate-900 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        {indeks + 1 < soalList.length ? "Soal Berikutnya" : "Lihat Skor & Ambil XP"} <ArrowRight size={16} />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* HASIL AKHIR KUIS */}
          {!isGenerating && selesai && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex flex-col items-center justify-center shadow-lg">
                  <span className={`text-2xl font-black leading-none ${teachersFont.className}`}>{skorPersen}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5">Skor</span>
                </div>
                <h2 className={`text-xl sm:text-2xl font-bold text-slate-900 ${teachersFont.className}`}>
                  {skorPersen >= 80 ? "Luar Biasa! Penguasaan Sangat Baik" : skorPersen >= 60 ? "Bagus! Terus Pertajam Pemahamanmu" : "Tetap Semangat! Ulangi untuk Skor Lebih Tinggi"}
                </h2>
                <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-1.5 rounded-full text-xs font-black">
                  <Sparkles size={15} className="text-amber-500" /> +{xpBaru} XP Prestasi Ditambahkan!
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-lg font-black text-emerald-700">{jumlahBenarTotal}/{soalList.length}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Benar</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-lg font-black text-orange-600">x{maxStreak}</p>
                  <p className="text-[10px] font-bold text-orange-600 uppercase">Max Combo</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-lg font-black text-blue-700">{xpSaatIni}</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Total XP</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ringkasan Pembahasan</p>
                {soalList.map((s, i) => {
                  const r = riwayatJawab[i];
                  return (
                    <div key={i} className={`p-3.5 rounded-xl border text-xs space-y-1 ${r?.benar ? "bg-emerald-50/40 border-emerald-200" : "bg-rose-50/40 border-rose-200"}`}>
                      <p className="font-bold text-slate-800">{i + 1}. {s.pertanyaan}</p>
                      <p className="text-[11px] font-semibold">
                        Jawabanmu: <span className={r?.benar ? "text-emerald-700" : "text-rose-700"}>{r?.dipilih || "-"}</span> • Kunci: <span className="text-emerald-700 font-bold">{s.kunci}</span>
                      </p>
                      <p className="text-[11px] text-slate-600">{s.pembahasan}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={resetKuis} className="min-h-[46px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                  <RotateCcw size={16} /> Latihan Topik Lain
                </button>
                <button type="button" onClick={() => setTab("peringkat")} className="min-h-[46px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                  <Trophy size={16} /> Lihat Papan Peringkat
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 2: PAPAN PERINGKAT SEKOLAH */}
      {tab === "peringkat" && (
        <div className="space-y-4">
          {papanPeringkat.length > 0 ? (
            <>
              {/* Podium Top 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {papanPeringkat.slice(0, 3).map((siswa, i) => {
                  const tema = [
                    { badge: "bg-amber-400 text-amber-950", box: "border-amber-300 bg-gradient-to-b from-amber-50 to-white", ikon: Crown },
                    { badge: "bg-slate-300 text-slate-800", box: "border-slate-300 bg-gradient-to-b from-slate-50 to-white", ikon: Medal },
                    { badge: "bg-orange-300 text-orange-950", box: "border-orange-200 bg-gradient-to-b from-orange-50/70 to-white", ikon: Medal },
                  ][i];
                  const Ikon = tema.ikon;
                  return (
                    <div key={siswa.id} className={`rounded-2xl border p-4 shadow-sm flex sm:flex-col items-center justify-between sm:justify-center text-left sm:text-center gap-3 ${tema.box}`}>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1 shrink-0 ${tema.badge}`}>
                        <Ikon size={13} /> Juara {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 sm:flex-initial">
                        <p className="font-bold text-slate-800 text-sm truncate">{siswa.nama || "Pelajar"}</p>
                        <p className="text-[11px] text-slate-500 truncate">{siswa.kelas || "Siswa"}</p>
                      </div>
                      <p className={`text-lg font-black text-emerald-700 tabular-nums shrink-0 ${teachersFont.className}`}>
                        {Number(siswa.xpPoints) || 0} <span className="text-xs font-bold">XP</span>
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Daftar Lengkap */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <h3 className={`text-sm font-bold text-slate-800 ${teachersFont.className}`}>Peringkat Sekolah</h3>
                  {peringkatSaya > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      Posisimu: #{peringkatSaya}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {papanPeringkat.map((siswa, idx) => {
                    const adalahSaya = siswa.id === userUid;
                    const gelar = gelarDariXp(Number(siswa.xpPoints) || 0);
                    return (
                      <div key={siswa.id} className={`flex items-center gap-3 px-4 py-3 ${adalahSaya ? "bg-emerald-50/70" : ""}`}>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          idx < 3 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {siswa.nama || "Pelajar"} {adalahSaya && <span className="text-[10px] text-emerald-700 font-extrabold">(Kamu)</span>}
                          </p>
                          <p className="text-[10.5px] text-slate-500 truncate">{siswa.kelas || "Siswa"} • {gelar.nama}</p>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-emerald-700 tabular-nums shrink-0 flex items-center gap-1">
                          {Number(siswa.xpPoints) || 0} XP <ChevronRight size={13} className="text-slate-300 hidden sm:inline" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <Trophy size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Papan Peringkat Belum Tersedia</p>
              <p className="text-xs text-slate-500 mt-1">Pastikan NPSN sekolah sudah terhubung di Pengaturan Profil untuk melihat peringkat se-sekolah.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
