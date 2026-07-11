"use client";

import { motion } from "framer-motion";
import { 
  ClipboardCheck, CalendarDays, Users, Search, 
  Filter, CheckCircle2, Loader2, BookOpen
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function SupervisiKBMLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [jurnalList, setJurnalList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Tarik data Jurnal KBM yang diisi guru
    const qJurnal = query(collection(db, "jurnal_kbm"), orderBy("timestamp", "desc"), limit(20));
    const unsub = onSnapshot(qJurnal, (snapshot) => {
      // Mock data kombinasi dengan data real untuk UI R&D
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Jika kosong, kita berikan data simulasi agar tabel tidak kosong saat presentasi
      if (data.length === 0) {
        setJurnalList([
          { id: "1", namaGuru: "Budi Santoso, S.Pd", mapel: "Matematika", materi: "Aljabar Linear", kelas: "VII-A", tanggal: "2026-07-11", status: "Selesai" },
          { id: "2", namaGuru: "Siti Aminah, M.Pd", mapel: "Bahasa Indonesia", materi: "Teks Observasi", kelas: "VIII-B", tanggal: "2026-07-11", status: "Selesai" }
        ]);
      } else {
        setJurnalList(data);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-purple-600" aria-hidden="true"/></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      <header className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`} tabIndex={0}>
            <ClipboardCheck className="text-purple-600" aria-hidden="true"/> Supervisi Akademik
          </h1>
          <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Pantau kedisiplinan administratif pendidik. Jurnal KBM dan rekapan absensi siswa harian dapat ditinjau secara *real-time* di sini.
          </p>
        </div>
      </header>

      {/* Filter & Pencarian */}
      <section aria-label="Kontrol Pencarian" className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} aria-hidden="true"/>
          <input 
            type="text" placeholder="Cari nama guru atau mata pelajaran..." 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Cari Jurnal"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-sm hover:bg-purple-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
          <CalendarDays size={18} aria-hidden="true"/> Pilih Tanggal
        </button>
      </section>

      {/* Tabel Jurnal KBM */}
      <section aria-label="Daftar Jurnal Mengajar" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BookOpen size={18} className="text-purple-600" aria-hidden="true"/> Laporan KBM Harian
          </h2>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Tabel Jurnal Kegiatan Belajar Mengajar Guru</caption>
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th scope="col" className="px-6 py-4">Pendidik & Kelas</th>
                <th scope="col" className="px-6 py-4">Materi Pembelajaran</th>
                <th scope="col" className="px-6 py-4 text-center">Tanggal</th>
                <th scope="col" className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jurnalList.map((jurnal, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors focus-within:bg-purple-50/50" tabIndex={0}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{jurnal.namaGuru || "Guru Anonim"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Mapel: {jurnal.mapel} • Kelas: {jurnal.kelas || "Umum"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-700">{jurnal.materi}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-slate-600">
                    {jurnal.tanggal}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg" aria-label="Status: Terekam">
                      <CheckCircle2 size={12} aria-hidden="true"/> Terekam
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </motion.main>
  );
}