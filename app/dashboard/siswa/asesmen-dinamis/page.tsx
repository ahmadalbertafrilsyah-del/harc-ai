"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, BrainCircuit, Clock, Target, PlayCircle, FileText, Loader2 } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AsesmenSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [daftarUjian, setDaftarUjian] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Cari kelas yang diikuti siswa
        const qKelas = query(collection(db, "manajemen_kelas"), where("peserta", "array-contains", user.uid));
        const unsubKelas = onSnapshot(qKelas, (kelasSnap) => {
          const kelasIds = kelasSnap.docs.map(k => k.id);
          
          if (kelasIds.length === 0) {
            setDaftarUjian([]);
            setIsLoading(false);
            return;
          }

          // 2. Cari Ujian (bank_soal) yang kelasId-nya ada di dalam kelasIds
          const qUjian = query(collection(db, "bank_soal"), where("kelasId", "in", kelasIds));
          const unsubUjian = onSnapshot(qUjian, (ujianSnap) => {
            setDaftarUjian(ujianSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
          });
          
          return () => unsubUjian();
        });
        return () => unsubKelas();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const filteredUjian = daftarUjian.filter(u => 
    (u.pengaturan?.judul || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-600" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-10">
      
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
            <BrainCircuit className="text-blue-600"/> Asesmen Dinamis (CBT)
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-lg">
            Kerjakan tugas dan ujian yang diberikan oleh guru. AI siap membantu sebagai <i>scaffolding</i> jika kamu kesulitan.
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
            {filteredUjian.map((ujian) => (
              <motion.div key={ujian.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex flex-col h-full relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -z-0"></div>
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider rounded-lg mb-3">
                    {ujian.pengaturan?.jenisUjian || "Ujian"}
                  </span>
                  <h3 className={`text-lg font-bold text-slate-800 mb-2 leading-snug ${teachersFont.className}`}>{ujian.pengaturan?.judul}</h3>
                  
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1.5"><Target size={14} className="text-slate-400"/> {ujian.soal?.length || 0} Soal</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {ujian.pengaturan?.waktuMenit} Menit</span>
                  </div>

                  <button onClick={() => alert("Fitur Lembar Ujian & Scaffolding AI akan hadir di pembaruan selanjutnya!")} className="mt-6 w-full bg-slate-900 hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                    <PlayCircle size={18}/> Mulai Kerjakan
                  </button>
                </div>
              </motion.div>
            ))}
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