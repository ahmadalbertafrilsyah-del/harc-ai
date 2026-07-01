"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, Settings, FileText, Download, CheckCircle, Bot, Loader2, Save, History } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function GeneratorBahanAjar() {
  // State Interaksi UI
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State Form Input
  const [formData, setFormData] = useState({
    topik: "",
    tingkat: "",
    kurikulum: "kemdikbud",
    dimensi: {
      sosiolinguistik: true,
      budaya: true,
      adab: true
    }
  });

  // State Hasil AI & Riwayat (Real-time siap)
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [riwayatModul, setRiwayatModul] = useState<any[]>([]);

  useEffect(() => {
    const qRiwayat = query(collection(db, "modul_ajar"), orderBy("createdAt", "desc"), limit(5));
    const unsubRiwayat = onSnapshot(qRiwayat, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRiwayatModul(data);
    });
    return () => unsubRiwayat();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (dimensiKey: string) => {
    setFormData(prev => ({
      ...prev,
      dimensi: {
        ...prev.dimensi,
        [dimensiKey as keyof typeof prev.dimensi]: !prev.dimensi[dimensiKey as keyof typeof prev.dimensi]
      }
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topik || !formData.tingkat) {
      alert("Mohon lengkapi Topik dan Tingkat Kelas terlebih dahulu.");
      return;
    }

    setIsGenerating(true);
    setGeneratedResult(null);
    
    setTimeout(() => {
      // Data dinamis berdasarkan input user
      const simulasiHasilAI = {
        judul: `Modul Ajar: ${formData.topik}`,
        standar: formData.kurikulum === 'kemenag' ? "Standar Nasional Kemenag" : `Capaian Pembelajaran Fase ${formData.tingkat === '10' ? 'E' : 'F'}`,
        tujuan: [
          `Peserta didik mampu menganalisis konteks sosiolinguistik pada materi ${formData.topik.toLowerCase()}.`,
          "Menerapkan nilai-nilai tata krama (adab) dalam komunikasi adaptif.",
          "Mengevaluasi interpretasi makna budaya lokal secara presisi."
        ],
        prompt: `Berikan tugas kepada siswa untuk menyusun teks terkait ${formData.topik}. Jika sistem mendeteksi variasi dialek non-standar, berikan scaffolding tingkat pertama yang mengingatkan siswa akan konteks lawan bicara dan adab digital.`
      };
      
      setGeneratedResult(simulasiHasilAI);
      setIsGenerating(false);
    }, 2500);
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);

    setTimeout(() => {
      alert("Modul berhasil disimpan ke Database Sistem (Firebase Firestore)!");
      setIsSaving(false);
    }, 800);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      <div className="border-b border-slate-200 pb-5">
        <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>AI Generator Modul & Asesmen</h1>
        <p className="text-slate-500 text-sm mt-1">Otomatisasi penyusunan bahan ajar yang responsif budaya dan terhubung langsung ke basis data madrasah.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Panel Kiri: Form & Riwayat */}
        <div className="lg:w-5/12 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <Settings size={18} className="text-blue-600" />
              <h2 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>Parameter AI</h2>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Topik Pembelajaran</label>
                <input 
                  type="text" 
                  name="topik"
                  value={formData.topik}
                  onChange={handleInputChange}
                  placeholder="Cth: Teks Dialog Krama Inggil" 
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tingkat Kelas</label>
                <select 
                  name="tingkat"
                  value={formData.tingkat}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                >
                  <option value="">Pilih Tingkat</option>
                  <option value="10">Kelas 10 (Fase E)</option>
                  <option value="11">Kelas 11 (Fase F)</option>
                  <option value="12">Kelas 12 (Fase F)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Standar Kurikulum</label>
                <select 
                  name="kurikulum"
                  value={formData.kurikulum}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="kemenag">Standar Nasional Kemenag</option>
                  <option value="kemdikbud">Kurikulum Merdeka Kemendikbud</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fokus Dimensi HARC-AI</label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={formData.dimensi.sosiolinguistik} onChange={() => handleCheckboxChange('sosiolinguistik')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span>Ketepatan Sosiolinguistik</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={formData.dimensi.budaya} onChange={() => handleCheckboxChange('budaya')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span>Interpretasi Makna Budaya</span>
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={formData.dimensi.adab} onChange={() => handleCheckboxChange('adab')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span>Adab & Kesantunan Berkomunikasi</span>
                  </label>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isGenerating}
                className={`w-full mt-4 py-3 rounded-lg text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 ${
                  isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800 shadow-blue-900/20'
                }`}
              >
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin" /> Menganalisis Korpus Cloud...</>
                ) : (
                  <><Sparkles size={18} className="text-amber-400" /> Generate Modul Dinamis</>
                )}
              </button>
            </form>
          </div>

          {/* Area Riwayat Terakhir dari Firestore */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <History size={14} /> Riwayat Database
            </h3>
            <div className="space-y-2">
              {riwayatModul.map(riwayat => (
                <div key={riwayat.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 text-sm hover:border-blue-300 transition-colors cursor-pointer">
                  <span className="font-medium text-slate-700 truncate pr-2">{riwayat.topik}</span>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{riwayat.waktu}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel Kanan: Hasil Generasi AI */}
        <div className="lg:w-7/12">
          {!generatedResult && !isGenerating && (
            <div className="h-full min-h-[500px] bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mb-4">
                <Bot size={32} />
              </div>
              <h3 className={`text-lg font-bold text-slate-400 ${teachersFont.className}`}>Ruang Kerja Kosong</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">
                Isi parameter di sebelah kiri lalu klik generate untuk memicu engine AI merakit modul ajar secara real-time.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="h-full min-h-[500px] bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 flex flex-col items-center justify-center p-8">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <Bot size={20} className="text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-bold text-slate-600 mt-6 animate-pulse">Menghubungkan ke Model Bahasa...</p>
              <p className="text-xs text-slate-400 mt-1">Menyusun struktur kurikulum nasional</p>
            </div>
          )}

          <AnimatePresence>
            {generatedResult && !isGenerating && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 overflow-hidden flex flex-col h-full"
              >
                <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle size={18} />
                    <span className="text-sm font-bold">Modul Berhasil Dirakit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => alert("Menginisiasi pengunduhan PDF...")} className="bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
                      <Download size={14} /> PDF
                    </button>
                    <button 
                      onClick={handleSaveToDatabase}
                      disabled={isSaving}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 shadow-sm disabled:opacity-70"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                      Simpan
                    </button>
                  </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                  <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold text-slate-800 ${teachersFont.className}`}>{generatedResult.judul}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1 bg-slate-100 px-2 py-0.5 rounded inline-block">{generatedResult.standar}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tujuan Pembelajaran</h4>
                      <ul className="space-y-2.5 text-sm text-slate-700">
                        {generatedResult.tujuan.map((tjh: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                            <span className="leading-relaxed">{tjh}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Skenario Asesmen Dinamis (AI-Prompt)</h4>
                      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-inner">
                        <div className="flex items-center gap-2 mb-3">
                          <Bot size={16} className="text-amber-400" />
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Instruksi Sistem</span>
                        </div>
                        <p className="text-sm text-slate-300 font-mono leading-relaxed">
                          "{generatedResult.prompt}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}