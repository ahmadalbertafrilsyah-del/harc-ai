"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Save, Loader2, CheckCircle2, AlertCircle, Settings2, Code2, Sliders } from "lucide-react";
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
      setStatusPesan({ tipe: "sukses", teks: "Instruksi sistem berhasil disimpan." });
      setTimeout(() => setStatusPesan(null), 3000);
    } catch (error) {
      setStatusPesan({ tipe: "error", teks: "Gagal menyimpan konfigurasi AI." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-600" role="status">
        <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" aria-hidden="true"/>
        <p className="text-xs font-bold text-slate-700">Memuat Konfigurasi...</p>
      </div>
    );
  }

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto space-y-5 pb-12">
      
      {/* HEADER DESKTOP */}
      <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Konfigurasi Prompt AI</h1>
          <p className="text-slate-500 text-sm mt-1">Kendalikan parameter dan instruksi dasar Large Language Model (LLM).</p>
        </div>
      </header>

      {/* HEADER MOBILE (App-Like Card) */}
      <div className="md:hidden bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Engine Controller</span>
        <h2 className={`text-xl font-bold mt-1 ${teachersFont.className}`}>Pengaturan Sistem AI</h2>
        <p className="text-xs text-indigo-100 mt-1">Sesuaikan perilaku respon AI sesuai standar modul.</p>
      </div>

      {/* NOTIFIKASI */}
      <AnimatePresence>
        {statusPesan && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${statusPesan.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`} role="alert">
            {statusPesan.tipe === 'sukses' ? <CheckCircle2 size={18} className="shrink-0"/> : <AlertCircle size={18} className="shrink-0"/>}
            <p className="text-xs font-bold">{statusPesan.teks}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* NAVIGASI KATEGORI (Mobile Swipeable Cards) */}
        <aside className="lg:col-span-1 flex flex-col gap-4">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Pilih Kategori</h3>
            <div className="flex lg:flex-col overflow-x-auto gap-2 pb-1 lg:pb-0 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {(['modul', 'asesmen', 'feedback'] as const).map((tab) => (
                <button
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 lg:w-full text-left px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                >
                  <Code2 size={16} className={activeTab === tab ? 'text-indigo-200' : 'text-slate-400'}/> 
                  <span>{tab === 'modul' ? 'Modul Ajar' : tab === 'asesmen' ? 'Asesmen & Kisi' : 'Feedback Naratif'}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* SLIDER KREATIVITAS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <label htmlFor="temp-slider" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Sliders size={14} className="text-indigo-600"/> Kreativitas AI
              </label>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-mono font-bold px-2 py-0.5 rounded-lg border border-indigo-100">{prompts.temperature}</span>
            </div>
            <input 
              id="temp-slider" 
              type="range" min="0" max="1" step="0.1" 
              value={prompts.temperature} 
              onChange={(e) => setPrompts({...prompts, temperature: parseFloat(e.target.value)})}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-2">
              <span>0.0 (Kaku)</span>
              <span>1.0 (Kreatif)</span>
            </div>
          </div>
        </aside>

        {/* EDITOR PROMPT */}
        <section className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <form onSubmit={handleSimpan} className="flex flex-col h-[55vh] lg:h-[500px]">
            <div className="bg-slate-900 text-slate-300 px-4 py-3.5 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Code2 size={16} className="text-indigo-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-indigo-300 truncate">system_instructions_{activeTab}.txt</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">Active Editor</span>
            </div>
            
            <textarea
              required
              value={activeTab === 'modul' ? prompts.modulAjar : activeTab === 'asesmen' ? prompts.asesmen : prompts.feedback}
              onChange={(e) => setPrompts({...prompts, [activeTab === 'modul' ? 'modulAjar' : activeTab === 'asesmen' ? 'asesmen' : 'feedback']: e.target.value})}
              className="flex-1 w-full bg-[#0d1117] text-slate-200 p-4 md:p-5 font-mono text-xs md:text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar"
              placeholder="Masukkan instruksi sistem..."
            ></textarea>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-95"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Perubahan
              </button>
            </div>
          </form>
        </section>

      </div>
    </motion.main>
  );
}