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

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-indigo-600" aria-hidden="true"/></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6 pb-10">
      
      <header className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl" aria-hidden="true"><BrainCircuit size={24}/></div>
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`} tabIndex={0}>Konfigurasi Prompt AI</h1>
            <p className="text-slate-600 text-sm mt-1">Kendalikan cara kerja, gaya bahasa, dan output *Large Language Model* (LLM) di seluruh fitur sistem.</p>
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Kolom Kiri: Navigasi Kategori (Aksesibel) */}
        <aside className="lg:col-span-1 space-y-2" role="tablist" aria-orientation="vertical">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Kategori Sistem</h2>
          {(['modul', 'asesmen', 'feedback'] as const).map((tab) => (
            <button
              key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
            >
              <Code2 size={16} aria-hidden="true"/> 
              {tab === 'modul' ? 'Modul Ajar' : tab === 'asesmen' ? 'Asesmen & Kisi' : 'Feedback Naratif'}
            </button>
          ))}
          
          <div className="mt-8 bg-white p-4 rounded-xl border border-slate-200">
            <label htmlFor="temp-slider" className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Settings2 size={14}/> Kreativitas AI (Temperature)</label>
            <input 
              id="temp-slider" type="range" min="0" max="1" step="0.1" 
              value={prompts.temperature} onChange={(e) => setPrompts({...prompts, temperature: parseFloat(e.target.value)})}
              className="w-full accent-indigo-600" aria-valuemin={0} aria-valuemax={1} aria-valuenow={prompts.temperature}
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-1">
              <span>0.0 (Kaku/Pasti)</span>
              <span>{prompts.temperature}</span>
              <span>1.0 (Kreatif)</span>
            </div>
          </div>
        </aside>

        {/* Kolom Kanan: Editor Prompt */}
        <section className="lg:col-span-3 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSimpan} className="flex flex-col h-full min-h-[400px]">
            <div className="bg-slate-900 text-slate-300 p-4 rounded-t-xl flex justify-between items-center border-b border-slate-800">
              <label htmlFor="prompt-editor" className="text-sm font-mono font-bold text-indigo-400">
                system_instructions_{activeTab}.txt
              </label>
              <span className="text-[10px] uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">Edit Mode</span>
            </div>
            
            <textarea
              id="prompt-editor" required
              value={activeTab === 'modul' ? prompts.modulAjar : activeTab === 'asesmen' ? prompts.asesmen : prompts.feedback}
              onChange={(e) => setPrompts({...prompts, [activeTab === 'modul' ? 'modulAjar' : activeTab === 'asesmen' ? 'asesmen' : 'feedback']: e.target.value})}
              className="flex-1 w-full bg-[#0d1117] text-slate-300 p-5 font-mono text-sm focus:outline-none resize-none leading-relaxed"
              placeholder="Ketik instruksi dasar (System Prompt) di sini..."
              aria-label={`Editor Prompt untuk ${activeTab}`}
            ></textarea>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
              <button 
                type="submit" disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
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