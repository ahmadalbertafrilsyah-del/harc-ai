"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, TrendingUp, BrainCircuit, Activity, MousePointerClick, RefreshCcw, Loader2, Search, Download } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, doc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AnalitikProses() {
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk Data Real-time KPI dan Tabel
  const [kpiStats, setKpiStats] = useState({
    rataPetunjuk: 0,
    tingkatSukses: 0,
    ketergantunganTinggi: 0
  });
  const [analitikData, setAnalitikData] = useState<any[]>([]);

  useEffect(() => {
    // Fetch KPI
    const unsubKpi = onSnapshot(doc(db, "analitik_agregat", "semester_ini"), (doc) => {
      if (doc.exists()) setKpiStats(doc.data() as any);
    });

    // Fetch Tabel Data Siswa
    const qAnalitik = query(collection(db, "analitik_siswa"), orderBy("petunjuk", "desc"));
    const unsubAnalitik = onSnapshot(qAnalitik, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnalitikData(data);
      setIsLoading(false);
    });

    return () => {
      unsubKpi();
      unsubAnalitik();
    };
  }, []);

  // Fungsi Interaksi Tombol
  const handleLihatDetail = (nama: string) => {
    alert(`Membuka log interaksi detail untuk siswa: ${nama}. Data akan ditarik dari sub-collection Firebase.`);
  };

  const handleEksporLaporan = () => {
    alert("Mengekspor data analitik ke format CSV/PDF...");
  };

  // Tampilan Loading Layar Penuh
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Memuat Analitik Proses...</p>
        <p className="text-sm">Menghitung metrik penggunaan scaffolding dari database</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Analitik Proses Belajar</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pantau penggunaan bantuan AI (scaffolding) dan rekam jejak revisi tugas peserta didik.
          </p>
        </div>
        <button 
          onClick={handleEksporLaporan}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
        >
          <Download size={16} /> Ekspor Laporan
        </button>
      </div>

      {/* Baris Metrik KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rata-rata Petunjuk Diminta</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MousePointerClick size={18} /></div>
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-4xl font-bold text-slate-800 ${teachersFont.className}`}>{kpiStats.rataPetunjuk}</span>
            <span className="text-sm font-medium text-slate-500 mb-1">kali per tugas</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Revisi Sukses</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><RefreshCcw size={18} /></div>
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-4xl font-bold text-slate-800 ${teachersFont.className}`}>{kpiStats.tingkatSukses}%</span>
            <span className="text-sm font-medium text-emerald-600 mb-1 flex items-center gap-1"><TrendingUp size={14}/> +5%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ketergantungan AI Tinggi</h3>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><BrainCircuit size={18} /></div>
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-4xl font-bold text-slate-800 ${teachersFont.className}`}>{kpiStats.ketergantunganTinggi}</span>
            <span className="text-sm font-medium text-slate-500 mb-1">Siswa</span>
          </div>
        </div>
      </div>

      {/* Tabel Detail Interaksi Siswa */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
            <Activity size={18} className="text-blue-600" /> Profil Respons Mediasi Adaptif
          </h3>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-full sm:w-64 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
            <Search size={14} className="text-slate-400" />
            <input type="text" placeholder="Cari siswa..." className="bg-transparent border-none outline-none text-xs w-full text-slate-700" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">Petunjuk Diminta (Scaffolding)</th>
                <th className="px-6 py-4">Jumlah Revisi</th>
                <th className="px-6 py-4">Status Kemandirian</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <AnimatePresence>
                {analitikData.map((item) => (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{item.nama}</p>
                      <p className="text-xs text-slate-500">{item.kelas}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${item.petunjuk > 5 ? 'bg-amber-400' : 'bg-blue-500'}`} 
                            style={{ width: `${Math.min((item.petunjuk / 10) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700">{item.petunjuk}x</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{item.revisi} Kali</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border ${
                        item.status === "Mandiri" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        item.status === "Berkembang" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleLihatDetail(item.nama)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md"
                      >
                        Detail Log
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}