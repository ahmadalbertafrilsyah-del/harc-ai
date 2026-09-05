"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Save, Loader2, CheckCircle2, AlertCircle, 
  BookOpen, GraduationCap, Database
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, FormEvent } from "react";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function MasterDataAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusPesan, setStatusPesan] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);

  const [masterData, setMasterData] = useState({
    tahunAjaran: "2026/2027",
    semester: "Ganjil",
    kurikulum: "Kurikulum Merdeka",
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const docRef = doc(db, "sistem_pengaturan", "master_data");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMasterData(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Gagal menarik data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMasterData();
  }, []);

  const handleSimpan = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, "sistem_pengaturan", "master_data"), {
        ...masterData,
        terakhirDiperbarui: serverTimestamp()
      }, { merge: true });
      
      setStatusPesan({ tipe: "sukses", teks: "Master data berhasil diperbarui." });
      setTimeout(() => setStatusPesan(null), 3000);
    } catch (error) {
      setStatusPesan({ tipe: "error", teks: "Gagal menyimpan pengaturan." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500" role="status">
        <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-bold text-slate-700">Memuat Master Data...</p>
      </div>
    );
  }

  return (
    // DIUBAH: Mengganti pb-12 menjadi pb-6 agar jarak bawah lebih pas dan tidak ada sisa ruang kosong yang berlebih
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-4xl mx-auto space-y-4 pb-6">
      
      {/* HEADER DESKTOP */}
      <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Master Data Akademik</h1>
          <p className="text-slate-500 text-sm mt-1">Atur parameter dasar yang menjadi acuan seluruh transaksi data di sistem.</p>
        </div>
      </header>

      {/* HEADER MOBILE (App-Like Card) */}
      <div className="md:hidden bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Academic Engine</span>
        <h2 className={`text-xl font-bold mt-1 ${teachersFont.className}`}>Master Data Akademik</h2>
        <p className="text-xs text-indigo-100 mt-0.5">Atur tahun ajaran, semester, dan acuan kurikulum aktif.</p>
      </div>

      <AnimatePresence>
        {statusPesan && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`p-3.5 rounded-2xl flex items-center gap-3 border shadow-sm ${statusPesan.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`} role="alert">
            {statusPesan.tipe === 'sukses' ? <CheckCircle2 size={18} className="shrink-0"/> : <AlertCircle size={18} className="shrink-0"/>}
            <p className="text-xs font-bold">{statusPesan.teks}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleSimpan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tahunAjaran" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <Calendar size={15} className="text-indigo-600"/> Tahun Ajaran Aktif
              </label>
              <select 
                id="tahunAjaran" value={masterData.tahunAjaran} onChange={e => setMasterData({...masterData, tahunAjaran: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
                <option value="2027/2028">2027/2028</option>
              </select>
            </div>
            <div>
              <label htmlFor="semester" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <BookOpen size={15} className="text-indigo-600"/> Semester Berjalan
              </label>
              <select 
                id="semester" value={masterData.semester} onChange={e => setMasterData({...masterData, semester: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="kurikulum" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
              <GraduationCap size={15} className="text-indigo-600"/> Acuan Kurikulum Nasional
            </label>
            <select 
              id="kurikulum" value={masterData.kurikulum} onChange={e => setMasterData({...masterData, kurikulum: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
            >
              <option value="Kurikulum Merdeka">Kurikulum Merdeka (Kemendikdasmen/Kemenag)</option>
              <option value="Kurikulum 2013">Kurikulum 2013 Revisi</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">Acuan ini digunakan oleh mesin AI untuk merumuskan Standar Kompetensi Lulusan (SKL) dan Modul Ajar.</p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" disabled={isSaving}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
              <span>Simpan Master Data</span>
            </button>
          </div>
        </form>
      </section>
    </motion.main>
  );
}