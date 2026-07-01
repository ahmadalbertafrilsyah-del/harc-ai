"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, BookOpen, MoreVertical, Plus, ChevronRight, GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenKelas() {
  const [isLoading, setIsLoading] = useState(true);
  const [kelasData, setKelasData] = useState<any[]>([]);

  useEffect(() => {
    const qKelas = query(collection(db, "manajemen_kelas"), orderBy("nama", "asc"));
    const unsubKelas = onSnapshot(qKelas, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setKelasData(data);
      setIsLoading(false);
    });

    return () => unsubKelas();
  }, []);

  // Fungsi simulasi interaksi tombol
  const handleTambahKelas = () => {
    alert("Modal penambahan kelas baru akan terbuka di sini. Data akan langsung terkirim ke Firestore.");
  };

  const handleKelolaPeserta = (namaKelas: string) => {
    alert(`Membuka panel manajemen peserta didik khusus untuk ${namaKelas}...`);
  };

  // Tampilan Loading Layar Penuh
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Memuat Data Kelas...</p>
        <p className="text-sm">Menyinkronkan daftar peserta didik dari database pusat</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Kelas & Akademik</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola data peserta didik, pembagian kelas, dan penugasan modul.</p>
        </div>
        <button 
          onClick={handleTambahKelas}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={18} /> Tambah Kelas Baru
        </button>
      </div>

      {/* Area Konten Kelas */}
      <AnimatePresence>
        {kelasData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kelasData.map((kelas) => (
              <motion.div 
                key={kelas.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 overflow-hidden group hover:shadow-md transition-all relative"
              >
                {/* Indikator Status */}
                <div className={`absolute top-0 left-0 w-1 h-full ${kelas.status === 'Aktif' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>

                <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 pl-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kelas.status === 'Aktif' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>{kelas.nama}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${kelas.status === 'Aktif' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <p className="text-xs text-slate-500 font-medium">{kelas.mapel}</p>
                      </div>
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"><MoreVertical size={18} /></button>
                </div>
                
                <div className="p-5 pl-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><Users size={16} className="text-slate-400"/> Jumlah Siswa</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{kelas.siswa} Peserta</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><BookOpen size={16} className="text-slate-400"/> Modul Aktif</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{kelas.modulAktif} Modul</span>
                  </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-white">
                  <button 
                    onClick={() => handleKelolaPeserta(kelas.nama)}
                    className="w-full text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1 py-1"
                  >
                    Kelola Peserta Didik <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Belum Ada Data Kelas</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">Anda belum ditugaskan sebagai wali atau pengajar di kelas manapun.</p>
            <button 
              onClick={handleTambahKelas}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} /> Buat Kelas Baru Sekarang
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}