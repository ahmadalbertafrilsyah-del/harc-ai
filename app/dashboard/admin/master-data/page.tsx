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
      
      setStatusPesan({ tipe: "sukses", teks: "Master Data berhasil diperbarui ke seluruh sistem." });
      setTimeout(() => setStatusPesan(null), 3000);
    } catch (error) {
      setStatusPesan({ tipe: "error", teks: "Gagal menyimpan pengaturan." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-indigo-600" aria-hidden="true"/></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6 pb-10">
      <header className="border-b border-slate-200 pb-5 flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl" aria-hidden="true"><Database size={24}/></div>
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`} tabIndex={0}>Master Data Akademik</h1>
          <p className="text-slate-600 text-sm mt-1">Atur parameter dasar yang akan menjadi acuan seluruh transaksi data (Absensi, Jurnal, Rapor) di sistem.</p>
        </div>
      </header>

      <AnimatePresence>
        {statusPesan && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`p-4 rounded-xl flex items-center gap-3 border ${statusPesan.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`} role="alert" aria-live="assertive">
            {statusPesan.tipe === 'sukses' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
            <p className="text-sm font-bold">{statusPesan.teks}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200" aria-label="Formulir Pengaturan Tahun Ajaran">
        <form onSubmit={handleSimpan} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="tahunAjaran" className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" aria-hidden="true"/> Tahun Ajaran Aktif
              </label>
              <select 
                id="tahunAjaran" value={masterData.tahunAjaran} onChange={e => setMasterData({...masterData, tahunAjaran: e.target.value})}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
                <option value="2027/2028">2027/2028</option>
              </select>
            </div>
            <div>
              <label htmlFor="semester" className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" aria-hidden="true"/> Semester Berjalan
              </label>
              <select 
                id="semester" value={masterData.semester} onChange={e => setMasterData({...masterData, semester: e.target.value})}
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="kurikulum" className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <GraduationCap size={16} className="text-indigo-500" aria-hidden="true"/> Acuan Kurikulum Nasional
            </label>
            <select 
              id="kurikulum" value={masterData.kurikulum} onChange={e => setMasterData({...masterData, kurikulum: e.target.value})}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Kurikulum Merdeka">Kurikulum Merdeka (Kemdikbud/Kemenag)</option>
              <option value="Kurikulum 2013">Kurikulum 2013 Revisi</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">Acuan ini akan digunakan oleh mesin AI untuk merumuskan Standar Kompetensi Lulusan (SKL) dan Modul Ajar.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              aria-label="Simpan Pengaturan Master Data"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <Save size={18} aria-hidden="true"/>}
              Simpan Master Data
            </button>
          </div>
        </form>
      </section>
    </motion.main>
  );
}