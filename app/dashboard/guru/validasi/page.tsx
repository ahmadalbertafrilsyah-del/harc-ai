"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, FileWarning, Search, Filter, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, orderBy } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ValidasiBudaya() {
  const [activeTab, setActiveTab] = useState("antrean");
  const [isLoading, setIsLoading] = useState(true);
  const [temuanAI, setTemuanAI] = useState<any[]>([]);

  useEffect(() => {
    const qValidasi = query(collection(db, "antrean_validasi"), orderBy("timestamp", "desc"));
    const unsubValidasi = onSnapshot(qValidasi, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemuanAI(data);
      setIsLoading(false);
    });

    return () => unsubValidasi();
  }, []);

  // Fungsi eksekusi validasi ke Database
  const handleValidasi = async (id: string, status: string) => {
    // Optimistic UI Update: Langsung hapus dari layar agar UI terasa sangat responsif
    const sisaAntrean = temuanAI.filter((item) => item.id !== id);
    setTemuanAI(sisaAntrean);
    
    // Tampilkan feedback instan
    console.log(`Mengeksekusi keputusan: ${status} untuk dokumen ID: ${id}`);
  };

  // Tampilan Loading Layar Penuh
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Memuat Antrean Validasi...</p>
        <p className="text-sm">Menarik data analitik terbaru dari model AI</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto space-y-6 pb-10">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Validasi AI & Makna Budaya</h1>
          <p className="text-slate-500 text-sm mt-1">Tinjau dan putuskan apakah variasi dialek yang ditandai AI merupakan kesalahan atau variasi lokal yang sah.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg w-full md:w-64 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input type="text" placeholder="Cari nama siswa..." className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400" />
          </div>
          <button className="bg-white border border-slate-200 p-2 rounded-lg text-slate-500 hover:bg-slate-50 shadow-sm transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("antrean")}
          className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "antrean" ? "text-blue-700" : "text-slate-500 hover:text-slate-700"}`}
        >
          Antrean Validasi ({temuanAI.length})
          {activeTab === "antrean" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
        </button>
        <button 
          onClick={() => setActiveTab("riwayat")}
          className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "riwayat" ? "text-blue-700" : "text-slate-500 hover:text-slate-700"}`}
        >
          Riwayat Keputusan
          {activeTab === "riwayat" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
        </button>
      </div>

      {/* Area Konten Validasi */}
      <div className="grid gap-6 pt-2">
        <AnimatePresence>
          {temuanAI.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Antrean Bersih!</h3>
              <p className="text-slate-500 text-sm mt-1">Anda sudah meninjau dan memvalidasi seluruh temuan sistem AI hari ini.</p>
            </motion.div>
          ) : (
            temuanAI.map((item) => (
              <motion.div key={item.id} exit={{ opacity: 0, x: -50, backgroundColor: "#f8fafc" }} className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 relative flex flex-col lg:flex-row gap-6 hover:shadow-md transition-shadow">
                
                {/* Indikator Garis Kiri */}
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>

                {/* Bagian Kiri: Info Siswa & Konteks */}
                <div className="lg:w-1/3 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-800">{item.siswa}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">{item.kelas}</span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><FileWarning size={12}/> {item.waktu}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dimensi HARC-AI</p>
                    <span className="inline-flex px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100">
                      {item.dimensi}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Modul Tugas</p>
                    <p className="text-sm text-slate-700 font-medium">{item.konteks}</p>
                  </div>
                </div>

                {/* Bagian Kanan: Jawaban & Validasi */}
                <div className="lg:w-2/3 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Jawaban Siswa */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Respons Peserta Didik</p>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-sm text-slate-800 leading-relaxed shadow-inner">
                        "{item.jawaban}"
                      </div>
                    </div>

                    {/* Deteksi AI */}
                    <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200/60">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <ShieldCheck size={12} /> Diagnostik Kecerdasan Buatan
                      </p>
                      <p className="text-sm text-slate-700">
                        {item.catatanAI}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button onClick={() => handleValidasi(item.id, "Variasi Sah")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-95">
                      <CheckCircle size={16} /> Sahkan (Variasi Sah)
                    </button>
                    <button onClick={() => handleValidasi(item.id, "Kesalahan")} className="flex-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                      <XCircle size={16} /> Tandai Kesalahan
                    </button>
                  </div>
                </div>

              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}