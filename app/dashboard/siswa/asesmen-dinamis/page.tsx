"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, BrainCircuit, Clock, Target, PlayCircle, FileText, Loader2, ChevronRight, Send, Bot, Lightbulb, PenTool } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AsesmenSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [daftarUjian, setDaftarUjian] = useState<any[]>([]);
  const [ujianSelesai, setUjianSelesai] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userUid, setUserUid] = useState<string | null>(null);

  // === STATE UJIAN ===
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [currentSoalIndex, setCurrentSoalIndex] = useState(0);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waktuMulai, setWaktuMulai] = useState<number>(0);

  // === STATE SCAFFOLDING & REFLEKSI (DIMENSI 4 & 5 x-AI) ===
  const [hintsHistory, setHintsHistory] = useState<Record<string, string[]>>({});
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [showRefleksi, setShowRefleksi] = useState(false);
  const [refleksiText, setRefleksiText] = useState("");

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) { setUserUid(user.uid); fetchDataUjian(user.uid); } 
      else setIsLoading(false);
    });
  }, []);

  const fetchDataUjian = (uid: string) => {
    onSnapshot(query(collection(db, "bank_soal")), (snapshot) => {
      setDaftarUjian(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });
    onSnapshot(query(collection(db, "jawaban_siswa"), where("uid", "==", uid)), (snapshot) => {
      setUjianSelesai(snapshot.docs.map(doc => doc.data().idUjian));
    });
  };

  const handleMulaiUjian = (ujian: any) => {
    setActiveExam(ujian); setCurrentSoalIndex(0); setJawaban({}); setHintsHistory({}); setWaktuMulai(Date.now());
  };

  const handleJawaban = (soalId: string, opsiId: string) => setJawaban(prev => ({ ...prev, [soalId]: opsiId }));

  // DIMENSI 4: Mediasi Adaptif (Graduated Mediation)
  const handleMintaPetunjuk = async (soalId: string, teksSoal: string) => {
    setIsRequestingHint(true);
    try {
      const currentHints = hintsHistory[soalId] || [];
      const hintLevel = currentHints.length + 1; 

      const systemPrompt = `Anda adalah tutor AI Responsif Budaya. JANGAN berikan jawaban langsung. 
      - Permintaan 1: Petunjuk sangat implisit/konsep dasar.
      - Permintaan 2: Petunjuk semi-eksplisit yang mengarahkan.
      - Permintaan 3+: Penjelasan konteks budaya atau sosiolinguistik detail namun biarkan siswa menyimpulkan.`;

      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ messages: [ { role: "system", content: systemPrompt }, { role: "user", content: `Soal: ${teksSoal}\nBantuan ke-${hintLevel}.` }] })
      });
      const data = await response.json();
      const newHint = data.choices[0].message.content;

      setHintsHistory(prev => ({ ...prev, [soalId]: [...(prev[soalId] || []), newHint] }));
    } catch (error) {
      alert("Gagal memuat petunjuk AI.");
    } finally { setIsRequestingHint(false); }
  };

  // Memicu Modal Refleksi (Bukan langsung submit)
  const triggerRefleksi = () => { setShowRefleksi(true); };

  // DIMENSI 5: Submit Ujian beserta Jurnal Refleksi
  const handleSubmitUjianFinal = async () => {
    if (!activeExam || !userUid) return;
    setIsSubmitting(true);
    try {
      const durasiDetik = Math.floor((Date.now() - waktuMulai) / 1000);
      let totalPetunjuk = 0; Object.values(hintsHistory).forEach(hints => { totalPetunjuk += hints.length; });

      let nilaiBenar = 0;
      activeExam.soal.forEach((item: any) => { if (jawaban[item.id] === item.kunci) nilaiBenar++; });
      const nilaiAkhir = (nilaiBenar / activeExam.soal.length) * 100;

      // 1. Simpan Jawaban
      await addDoc(collection(db, "jawaban_siswa"), {
        uid: userUid, idUjian: activeExam.id, judulUjian: activeExam.pengaturan.judul,
        jawaban: jawaban, nilai: nilaiAkhir, durasiDetik: durasiDetik, timestamp: serverTimestamp(),
        metadataAnalitik: { totalBantuanAI: totalPetunjuk, historiPetunjuk: hintsHistory, statusKemandirian: totalPetunjuk === 0 ? "Mandiri" : totalPetunjuk < (activeExam.soal.length * 0.5) ? "Berkembang" : "Perlu Pendampingan" }
      });

      // 2. Simpan Refleksi ke Jurnal Siswa
      if (refleksiText.trim()) {
        await addDoc(collection(db, "jurnal_siswa"), {
          userId: userUid, ujianId: activeExam.id, isi: `[Refleksi Pasca Ujian ${activeExam.pengaturan.judul}]\n${refleksiText}`, timestamp: serverTimestamp()
        });
      }

      setActiveExam(null); setShowRefleksi(false); setRefleksiText("");
      alert("Asesmen berhasil diselesaikan! Proses kemandirian dan refleksimu telah direkam.");
    } catch (error) { alert("Terjadi kesalahan."); } finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;

  if (activeExam) {
    const currentSoal = activeExam.soal[currentSoalIndex];
    const isLastSoal = currentSoalIndex === activeExam.soal.length - 1;
    const currentHints = hintsHistory[currentSoal.id] || [];

    return (
      <div className={`min-h-screen bg-slate-50 p-6 ${teachersFont.className}`}>
        
        {/* MODAL REFLEKSI (DIMENSI 5) */}
        <AnimatePresence>
          {showRefleksi && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                <h3 className="font-bold text-xl text-slate-800 mb-2 flex items-center gap-2"><PenTool className="text-emerald-600"/> Jurnal Refleksi</h3>
                <p className="text-sm text-slate-600 mb-4">Sebelum jawaban dikirim, ceritakan sedikit: Apa kesulitan yang kamu alami selama ujian ini? Apakah bantuan AI membantu pemahamanmu?</p>
                <textarea 
                  value={refleksiText} onChange={(e) => setRefleksiText(e.target.value)} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none min-h-[120px] mb-4"
                  placeholder="Ketik refleksimu di sini..."
                ></textarea>
                <button onClick={handleSubmitUjianFinal} disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Kirim Ujian & Refleksi
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center mb-6">
            <div><h1 className="text-2xl font-bold text-slate-800">{activeExam.pengaturan.judul}</h1><p className="text-slate-500 flex items-center gap-2 mt-1"><Target size={16}/> Soal {currentSoalIndex + 1} dari {activeExam.soal.length}</p></div>
            <div className="flex gap-4">
              <button onClick={() => setActiveExam(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition font-bold">Batalkan</button>
              {isLastSoal ? (
                <button onClick={triggerRefleksi} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"><Send size={18}/> Kumpulkan</button>
              ) : (
                <button onClick={() => setCurrentSoalIndex(prev => prev + 1)} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2">Selanjutnya <ChevronRight size={18}/></button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-lg text-slate-800 leading-relaxed mb-8">{currentSoal.pertanyaan}</p>
                <div className="space-y-3">
                  {currentSoal.opsi?.map((opsi: any, idx: number) => (
                    <label key={opsi.id || idx} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${jawaban[currentSoal.id] === opsi.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300 bg-slate-50'}`}>
                      <input type="radio" name={`soal-${currentSoal.id}`} className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" checked={jawaban[currentSoal.id] === opsi.id} onChange={() => handleJawaban(currentSoal.id, opsi.id)} />
                      <span className="text-slate-700 font-medium">{opsi.teks}</span>
                    </label>
                  ))}
                  {(currentSoal.tipe === "Uraian" || currentSoal.tipe === "Isian Singkat") && (
                    <textarea value={jawaban[currentSoal.id] || ""} onChange={(e) => handleJawaban(currentSoal.id, e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]" placeholder="Ketik jawabanmu di sini..."></textarea>
                  )}
                </div>
              </div>

              {/* MEDIASI BERTINGKAT AI UI */}
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2"><Bot size={20}/> Asisten AI Responsif Budaya</h3>
                  <button onClick={() => handleMintaPetunjuk(currentSoal.id, currentSoal.pertanyaan)} disabled={isRequestingHint} className="text-sm bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition flex items-center gap-2 disabled:opacity-50">
                    {isRequestingHint ? <Loader2 size={16} className="animate-spin"/> : <Lightbulb size={16}/>} Minta Petunjuk
                  </button>
                </div>
                <AnimatePresence>
                  {currentHints.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {currentHints.map((hint, hIdx) => {
                        let hintLabel = "Petunjuk Dasar"; let hintColor = "bg-blue-100 text-blue-700 border-blue-200";
                        if(hIdx === 1) { hintLabel = "Petunjuk Lanjutan"; hintColor = "bg-amber-100 text-amber-700 border-amber-200"; }
                        if(hIdx >= 2) { hintLabel = "Konteks Budaya/Linguistik"; hintColor = "bg-rose-100 text-rose-700 border-rose-200"; }
                        return (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={hIdx} className="bg-white p-4 rounded-xl border border-slate-200 text-slate-700 text-sm shadow-sm flex flex-col gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-max border ${hintColor}`}>{hintLabel} (Level {hIdx+1})</span>
                            <div className="leading-relaxed">{hint}</div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit sticky top-6">
              <h3 className="font-bold text-slate-800 mb-4">Navigasi Soal</h3>
              <div className="grid grid-cols-4 gap-2">
                {activeExam.soal.map((s: any, idx: number) => {
                  const hasAnswered = !!jawaban[s.id]; const hasHint = (hintsHistory[s.id]?.length || 0) > 0;
                  return (
                    <button key={s.id} onClick={() => setCurrentSoalIndex(idx)} className={`relative w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm border-2 ${currentSoalIndex === idx ? 'border-slate-800 bg-slate-800 text-white' : hasAnswered ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                      {idx + 1} {hasHint && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white"></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-6 max-w-6xl mx-auto ${teachersFont.className}`}>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><BrainCircuit className="text-blue-500" size={32} /> Asesmen Dinamis (CBT)</h1>
          <p className="text-slate-500 mt-2">Uji pemahamanmu secara adaptif dengan pendampingan Tutor AI.</p>
        </div>
      </div>
      {daftarUjian.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {daftarUjian.map((ujian) => {
            const isDone = ujianSelesai.includes(ujian.id);
            return (
              <div key={ujian.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-800 text-lg mb-2">{ujian.pengaturan?.judul}</h3>
                  <p className="text-xs font-bold text-blue-600 mb-6">{ujian.pengaturan?.jenisUjian}</p>
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5"><FileText size={14} className="text-slate-400"/> {ujian.soal?.length || 0} Soal</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {ujian.pengaturan?.waktuMenit || 60} Menit</span>
                    </div>
                    <button onClick={() => !isDone && handleMulaiUjian(ujian)} disabled={isDone} className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${isDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                      {isDone ? "Sudah Dikerjakan" : "Mulai Kerjakan"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <p className="font-bold text-slate-700">Belum Ada Ujian Tersedia</p>
        </div>
      )}
    </motion.div>
  );
}