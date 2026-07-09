"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, BrainCircuit, Clock, Target, PlayCircle, FileText, Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AsesmenSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [daftarUjian, setDaftarUjian] = useState<any[]>([]);
  const [ujianSelesai, setUjianSelesai] = useState<string[]>([]); // Menyimpan ID ujian yang sudah dikerjakan
  const [searchQuery, setSearchQuery] = useState("");
  const [userUid, setUserUid] = useState<string | null>(null);

  // === STATE UNTUK MODE CBT ===
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [currentSoalIndex, setCurrentSoalIndex] = useState(0);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // 1. Ambil Data Ujian & Rekam Jejak Jawaban
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        
        // A. Tarik Daftar Kelas
        const qKelas = query(collection(db, "manajemen_kelas"), where("peserta", "array-contains", user.uid));
        const unsubKelas = onSnapshot(qKelas, (kelasSnap) => {
          const kelasIds = kelasSnap.docs.map(k => k.id);
          
          if (kelasIds.length === 0) {
            setDaftarUjian([]);
            setIsLoading(false);
            return;
          }

          // B. Tarik Ujian dari Kelas tersebut
          const qUjian = query(collection(db, "bank_soal"), where("kelasId", "in", kelasIds));
          const unsubUjian = onSnapshot(qUjian, (ujianSnap) => {
            setDaftarUjian(ujianSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
          });
          
          return () => unsubUjian();
        });

        // C. Tarik Rekam Jejak Jawaban (Pencegah Ujian Ganda)
        const qJawaban = query(collection(db, "jawaban_siswa"), where("userId", "==", user.uid));
        const unsubJawaban = onSnapshot(qJawaban, (snap) => {
          const selesaiIds = snap.docs.map(doc => doc.data().ujianId);
          setUjianSelesai(selesaiIds);
        });

        return () => { unsubKelas(); unsubJawaban(); };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Logika Hitung Mundur (Timer CBT)
  useEffect(() => {
    let timer: any;
    if (activeExam && timeLeft > 0 && !isSubmitting && !isFinished) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && activeExam && !isFinished) {
      // Waktu habis, otomatis kumpulkan
      handleSubmitUjian();
    }
    return () => clearInterval(timer);
  }, [activeExam, timeLeft, isSubmitting, isFinished]);

  // Fungsi Mulai Ujian
  const handleMulaiUjian = (ujian: any) => {
    if(confirm(`Apakah kamu siap memulai ujian "${ujian.pengaturan.judul}"?\nWaktu akan mulai berjalan dan tidak bisa dijeda.`)) {
      setActiveExam(ujian);
      setCurrentSoalIndex(0);
      setJawaban({});
      setTimeLeft((ujian.pengaturan.waktuMenit || 60) * 60); // Konversi menit ke detik
      setIsFinished(false);
    }
  };

  // Fungsi Simpan Jawaban Sementara
  const handlePilihJawaban = (soalId: string, val: string) => {
    setJawaban(prev => ({ ...prev, [soalId]: val }));
  };

  // Fungsi Kirim ke Database
  const handleSubmitUjian = async () => {
    if (!userUid || !activeExam) return;
    setIsSubmitting(true);
    
    try {
      // Hitung nilai sementara untuk Pilihan Ganda
      let benarPG = 0;
      let totalPG = 0;

      activeExam.soal.forEach((soal: any) => {
        if (soal.tipe === "PG") {
          totalPG++;
          if (jawaban[soal.id] === soal.kunci) {
            benarPG++;
          }
        }
      });

      const nilaiPGBersih = totalPG > 0 ? (benarPG / totalPG) * 100 : 0;

      // Simpan ke koleksi jawaban_siswa
      await addDoc(collection(db, "jawaban_siswa"), {
        userId: userUid,
        ujianId: activeExam.id,
        kelasId: activeExam.kelasId,
        judulUjian: activeExam.pengaturan.judul,
        jawaban: jawaban,
        nilaiPGSementara: Math.round(nilaiPGBersih),
        benarPG: benarPG,
        totalPG: totalPG,
        statusKoreksi: activeExam.soal.some((s:any) => s.tipe === "Esai") ? "Menunggu Koreksi AI/Guru" : "Selesai",
        timestamp: serverTimestamp()
      });

      setIsFinished(true);
      alert("Ujian berhasil dikumpulkan!");
    } catch (error) {
      console.error("Gagal mengirim ujian:", error);
      alert("Terjadi kesalahan saat mengirim jawaban.");
    } finally {
      setIsSubmitting(false);
      setActiveExam(null);
    }
  };

  const formatWaktu = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredUjian = daftarUjian.filter(u => 
    (u.pengaturan?.judul || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-600" /></div>;

  // ==========================================
  // MODE UJIAN (CBT) AKTIF
  // ==========================================
  if (activeExam) {
    const currentSoal = activeExam.soal[currentSoalIndex];
    
    return (
      // PERBAIKAN MOBILE: h-auto untuk HP agar bisa scroll alami, lg:h-[calc(100vh-120px)] untuk Desktop
      // Penambahan pb-28 agar di HP tidak tertutup bottom navigation
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 pb-28 lg:pb-10 h-auto lg:h-[calc(100vh-120px)]">
        
        {/* Kolom Kiri: Lembar Soal */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] lg:min-h-0">
          {/* Header Soal */}
          <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <h2 className="font-bold text-slate-800 text-sm md:text-base">Soal No. {currentSoalIndex + 1}</h2>
            <div className={`px-3 py-1.5 rounded-lg font-mono font-bold flex items-center gap-2 text-sm ${timeLeft < 300 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-blue-100 text-blue-800'}`}>
              <Clock size={16} /> {formatWaktu(timeLeft)}
            </div>
          </div>

          {/* Body Soal */}
          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <p className="text-base md:text-lg text-slate-800 leading-relaxed font-medium mb-8 whitespace-pre-wrap">
              {currentSoal.pertanyaan}
            </p>

            {currentSoal.tipe === "PG" ? (
              <div className="space-y-3">
                {currentSoal.opsi.map((opt: any) => (
                  <label key={opt.id} className={`flex items-start gap-3 md:gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${jawaban[currentSoal.id] === opt.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      name={`soal_${currentSoal.id}`} 
                      value={opt.id}
                      checked={jawaban[currentSoal.id] === opt.id}
                      onChange={(e) => handlePilihJawaban(currentSoal.id, e.target.value)}
                      className="mt-1 w-4 h-4 md:w-5 md:h-5 accent-blue-600 cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="font-bold text-slate-700 mr-2 text-sm md:text-base">{opt.id}.</span>
                      <span className="text-slate-700 text-sm md:text-base">{opt.teks}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jawaban Uraian / Esai</p>
                <textarea 
                  value={jawaban[currentSoal.id] || ""}
                  onChange={(e) => handlePilihJawaban(currentSoal.id, e.target.value)}
                  placeholder="Ketik jawabanmu di sini..."
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white resize-none transition-all leading-relaxed text-sm md:text-base"
                />
              </div>
            )}
          </div>

          {/* Footer Navigasi Soal */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <button 
              onClick={() => setCurrentSoalIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSoalIndex === 0}
              className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-sm rounded-xl disabled:opacity-50 flex items-center gap-2 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={18} /> <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            {currentSoalIndex === activeExam.soal.length - 1 ? (
              <button 
                onClick={() => {
                  if(confirm("Apakah kamu yakin ingin menyelesaikan ujian? Jawaban tidak bisa diubah lagi.")) {
                    handleSubmitUjian();
                  }
                }}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18} />} <span className="hidden sm:inline">Selesai & Kumpulkan</span><span className="sm:hidden">Kumpulkan</span>
              </button>
            ) : (
              <button 
                onClick={() => setCurrentSoalIndex(prev => Math.min(activeExam.soal.length - 1, prev + 1))}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <span className="hidden sm:inline">Selanjutnya</span> <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Navigasi Cepat (Grid Soal) */}
        <div className="w-full lg:w-[300px] flex flex-col gap-4 shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className={`font-bold text-slate-800 mb-1 ${teachersFont.className} line-clamp-2`}>{activeExam.pengaturan.judul}</h3>
            <p className="text-xs font-medium text-slate-500 mb-4">{activeExam.pengaturan.jenisUjian}</p>
            
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-2 text-amber-800 text-xs mb-6">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>Jangan tutup jendela browser ini sebelum menekan tombol <b className="whitespace-nowrap">Selesai & Kumpulkan</b>.</p>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Navigasi Soal</p>
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2">
              {activeExam.soal.map((s: any, idx: number) => {
                const isAnswered = jawaban[s.id] && jawaban[s.id].trim() !== "";
                const isCurrent = currentSoalIndex === idx;
                
                return (
                  <button 
                    key={s.id}
                    onClick={() => setCurrentSoalIndex(idx)}
                    className={`aspect-square flex items-center justify-center text-xs md:text-sm font-bold rounded-lg transition-all border-2
                      ${isCurrent ? 'border-blue-600 ring-2 ring-blue-200' : isAnswered ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}
                    `}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 space-y-2 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Sudah Dijawab</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border-2 border-slate-200 rounded"></div> Belum Dijawab</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border-2 border-blue-600 rounded"></div> Posisi Saat Ini</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN UTAMA (DAFTAR UJIAN TERSEDIA)
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-28 md:pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
            <BrainCircuit className="text-blue-600"/> Asesmen Dinamis (CBT)
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-lg">
            Kerjakan tugas dan ujian yang diberikan oleh guru. Pastikan jaringan internetmu stabil sebelum memulai.
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Cari judul ujian..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      <AnimatePresence>
        {filteredUjian.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredUjian.map((ujian) => {
              // PERBAIKAN LOGIKA: Cek apakah ID ujian ini ada di dalam array ujianSelesai
              const isDone = ujianSelesai.includes(ujian.id);

              return (
                <motion.div key={ujian.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all flex flex-col h-full relative overflow-hidden group ${isDone ? 'border-emerald-200 opacity-90' : 'border-slate-200 hover:shadow-md hover:border-blue-300'}`}>
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full -z-0 ${isDone ? 'bg-emerald-50' : 'bg-blue-50'}`}></div>
                  <div className="relative z-10">
                    <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg mb-3 ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {ujian.pengaturan?.jenisUjian || "Ujian"}
                    </span>
                    <h3 className={`text-lg font-bold text-slate-800 mb-2 leading-snug ${teachersFont.className}`}>{ujian.pengaturan?.judul}</h3>
                    
                    <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="flex items-center gap-1.5"><Target size={14} className="text-slate-400"/> {ujian.soal?.length || 0} Soal</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {ujian.pengaturan?.waktuMenit} Menit</span>
                    </div>

                    <button 
                      onClick={() => !isDone && handleMulaiUjian(ujian)} 
                      disabled={isDone}
                      className={`mt-6 w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                        isDone 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed shadow-none' 
                          : 'bg-slate-900 hover:bg-blue-600 text-white active:scale-95'
                      }`}
                    >
                      {isDone ? <><CheckCircle2 size={18}/> Sudah Dikerjakan</> : <><PlayCircle size={18}/> Mulai Kerjakan</>}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="font-bold text-slate-700">Belum Ada Ujian</h3>
            <p className="text-sm text-slate-500 mt-1">Guru Anda belum merilis ujian atau tugas baru untuk kelas ini.</p>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}