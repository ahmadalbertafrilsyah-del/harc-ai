"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Save, Loader2, CheckCircle2, AlertCircle, Settings2, Code2 } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, FormEvent, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function KonfigurasiAI() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusPesan, setStatusPesan] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);
  const [activeTab, setActiveTab] = useState<"modul" | "asesmen" | "feedback">("modul");

  const [prompts, setPrompts] = useState({
    modulAjar: "Anda adalah pakar pendidikan Indonesia. Buatlah Modul Ajar berbasis Kurikulum Merdeka yang mencakup CP, TP, ATP, dan langkah pembelajaran berdiferensiasi...",
    asesmen: "Anda adalah evaluator akademik. Buatlah soal berstandar HOTS (Higher Order Thinking Skills) berdasarkan Indikator Pencapaian Kompetensi berikut...",
    feedback: "Berperanlah sebagai guru yang empatik. Berikan narasi evaluasi belajar (maksimal 2 paragraf) berdasarkan nilai dan analisis butir soal siswa berikut...",
    temperature: 0.7
  });

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const docRef = doc(db, "sistem_pengaturan", "ai_prompts");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPrompts(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Gagal menarik prompts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, []);

  const handleSimpan = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, "sistem_pengaturan", "ai_prompts"), {
        ...prompts,
        terakhirDiperbarui: serverTimestamp()
      });
      setStatusPesan({ tipe: "sukses", teks: "Instruksi Sistem AI berhasil diperbarui!" });
      setTimeout(() => setStatusPesan(null), 3000);
    } catch (error) {
      setStatusPesan({ tipe: "error", teks: "Gagal menyimpan konfigurasi AI." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="w-full h-[70vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-indigo-600" aria-hidden="true"/></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-5 md:space-y-6 pb-10 px-4 md:px-6 lg:px-0 pt-2 md:pt-0">
      
      {/* HEADER */}
      <header className="border-b border-slate-200 pb-4 md:pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 md:p-3 bg-indigo-100 text-indigo-700 rounded-xl shrink-0" aria-hidden="true">
            <BrainCircuit size={24} className="w-5 h-5 md:w-6 md:h-6"/>
          </div>
          <div>
            <h1 className={`text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 ${teachersFont.className}`} tabIndex={0}>Konfigurasi Prompt AI</h1>
            <p className="text-slate-600 text-xs md:text-sm mt-1 leading-relaxed">Kendalikan cara kerja, gaya bahasa, dan output <i>Large Language Model</i> (LLM) di seluruh fitur.</p>
          </div>
        </div>
      </header>

      {/* NOTIFIKASI */}
      <AnimatePresence>
        {statusPesan && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${statusPesan.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`} role="alert" aria-live="assertive">
            {statusPesan.tipe === 'sukses' ? <CheckCircle2 size={20} className="shrink-0"/> : <AlertCircle size={20} className="shrink-0"/>}
            <p className="text-xs md:text-sm font-bold">{statusPesan.teks}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 md:gap-6">
        
        {/* KOLOM KIRI / ATAS: Navigasi Kategori (Mobile: Horizontal Swipe, Desktop: Vertical List) */}
        <aside className="lg:col-span-1 flex flex-col gap-4" role="tablist" aria-orientation="vertical">
          <div>
            <h2 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 lg:mb-3 px-1">Kategori Sistem</h2>
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
              {(['modul', 'asesmen', 'feedback'] as const).map((tab) => (
                <button
                  key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
                  className={`snap-start shrink-0 w-auto lg:w-full text-left px-4 py-2.5 lg:py-3 rounded-xl text-xs lg:text-sm font-bold flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                >
                  <Code2 size={16} className="w-4 h-4" aria-hidden="true"/> 
                  {tab === 'modul' ? 'Modul Ajar' : tab === 'asesmen' ? 'Asesmen & Kisi' : 'Feedback Naratif'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-1 lg:mt-4">
            <label htmlFor="temp-slider" className="block text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5"><Settings2 size={14} className="text-indigo-600"/> Kreativitas AI</label>
            <input 
              id="temp-slider" type="range" min="0" max="1" step="0.1" 
              value={prompts.temperature} onChange={(e) => setPrompts({...prompts, temperature: parseFloat(e.target.value)})}
              className="w-full accent-indigo-600 mb-1" aria-valuemin={0} aria-valuemax={1} aria-valuenow={prompts.temperature}
            />
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mt-1">
              <span>0.0 (Kaku)</span>
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">{prompts.temperature}</span>
              <span>1.0 (Kreatif)</span>
            </div>
          </div>
        </aside>

        {/* KOLOM KANAN / BAWAH: Editor Prompt */}
        <section className="lg:col-span-3 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSimpan} className="flex flex-col h-[60vh] lg:h-full min-h-[400px]">
            <div className="bg-slate-900 text-slate-300 p-3 md:p-4 rounded-t-xl flex justify-between items-center border-b border-slate-800">
              <label htmlFor="prompt-editor" className="text-xs md:text-sm font-mono font-bold text-indigo-400 flex items-center gap-2 truncate">
                <Code2 size={16} className="hidden sm:block" /> system_instructions_{activeTab}.txt
              </label>
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest bg-slate-800 px-2 py-1 rounded shrink-0">Edit Mode</span>
            </div>
            
            <textarea
              id="prompt-editor" required
              value={activeTab === 'modul' ? prompts.modulAjar : activeTab === 'asesmen' ? prompts.asesmen : prompts.feedback}
              onChange={(e) => setPrompts({...prompts, [activeTab === 'modul' ? 'modulAjar' : activeTab === 'asesmen' ? 'asesmen' : 'feedback']: e.target.value})}
              className="flex-1 w-full bg-[#0d1117] text-slate-300 p-4 md:p-5 font-mono text-xs md:text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar"
              placeholder="Ketik instruksi dasar (System Prompt) di sini..."
              aria-label={`Editor Prompt untuk ${activeTab}`}
            ></textarea>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
              <button 
                type="submit" disabled={isSaving}
                className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 lg:py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 active:scale-95"
                aria-label="Simpan Konfigurasi Prompt"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <Save size={18} aria-hidden="true"/>}
                Terapkan Konfigurasi
              </button>
            </div>
          </form>
        </section>
      </div>

    </motion.main>
  );
}