"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, Search, Plus, Trash2, ShieldCheck, 
  Loader2, BookMarked, MessageSquareWarning, AlertCircle, 
  Landmark, GraduationCap, Microscope, Bot, X, ArrowRight, SlidersHorizontal 
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE REAL-TIME
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, addDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function KorpusStandarAdmin() {
  const [activeTab, setActiveTab] = useState("korpus"); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingBatasan, setIsSubmittingBatasan] = useState(false); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [batasanForm, setBatasanForm] = useState({ kategori: "Gaya Bahasa", aturan: "" });
  const [daftarBatasan, setDaftarBatasan] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ frasaLokal: "", bentukStandar: "", kategori: "Dialek/Slang Lokal", instruksiAi: "Jika pengguna menggunakan kata ini, sistem harus...", });
  const [daftarKorpus, setDaftarKorpus] = useState<any[]>([]);

  useEffect(() => {
    const qKorpus = query(collection(db, "korpus_budaya"), orderBy("timestamp", "desc"));
    const qBatasan = query(collection(db, "ai_constraints"), orderBy("timestamp", "desc"));
    
    const unsubBatasan = onSnapshot(
      qBatasan, 
      (snapshot) => {
        setDaftarBatasan(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Gagal menarik data Batasan AI:", error);
      }
    );

    const unsubKorpus = onSnapshot(
      qKorpus, 
      (snapshot) => {
        const korpus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDaftarKorpus(korpus);
        setIsLoading(false);
        setErrorMessage(null); 
      },
      (error) => {
        console.error("Gagal menarik data Korpus:", error);
        setIsLoading(false);
        if (error.code === 'permission-denied') {
          setErrorMessage("Akses ditolak. Pastikan aturan keamanan Firestore mengizinkan Admin.");
        } else if (error.code === 'failed-precondition') {
          setErrorMessage("Sistem sedang memproses indeks database. Mohon tunggu.");
        }
      }
    );

    return () => {
      unsubKorpus();
      unsubBatasan();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleTambahBatasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batasanForm.aturan.trim()) return;

    setIsSubmittingBatasan(true);
    try {
      await addDoc(collection(db, "ai_constraints"), {
        kategori: batasanForm.kategori,
        aturan: batasanForm.aturan,
        timestamp: serverTimestamp()
      });
      setBatasanForm({ kategori: "Gaya Bahasa", aturan: "" });
    } catch (error: any) {
      console.error("Gagal menambah batasan:", error);
      alert(`Gagal menyimpan aturan: ${error.message}`);
    } finally {
      setIsSubmittingBatasan(false);
    }
  };

  const handleHapusBatasan = async (id: string) => { 
    if (!confirm("Hapus batasan ini dari sistem?")) return; 
    try {  
      await deleteDoc(doc(db, "ai_constraints", id)); 
    } catch (error) { 
      console.error("Gagal menghapus batasan:", error); 
    }
  };

  const handleTambahKorpus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "korpus_budaya"), {
        frasaLokal: formData.frasaLokal,
        bentukStandar: formData.bentukStandar,
        kategori: formData.kategori,
        instruksiAi: formData.instruksiAi,
        timestamp: serverTimestamp()
      });
      
      setFormData({ frasaLokal: "", bentukStandar: "", kategori: "Dialek/Slang Lokal", instruksiAi: "Jika pengguna menggunakan kata ini, sistem harus..." });
    } catch (error) {
      console.error("Gagal menambah korpus:", error);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapusKorpus = async (id: string, frasa: string) => {
    if (!confirm(`Hapus instruksi untuk "${frasa}" dari database?`)) return;

    try {
      await deleteDoc(doc(db, "korpus_budaya", id));
    } catch (error) {
      console.error("Gagal menghapus korpus:", error);
    }
  };

  const filteredKorpus = daftarKorpus.filter((item) => {
    const keyword = searchQuery.toLowerCase();
    return (
      (item.frasaLokal || "").toLowerCase().includes(keyword) ||
      (item.bentukStandar || "").toLowerCase().includes(keyword) ||
      (item.kategori || "").toLowerCase().includes(keyword)
    );
  });

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500" role="status">
        <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-bold text-slate-700">Memuat Pangkalan Data AI...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-5 pb-12">
      
      {/* HEADER DESKTOP */}
      <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Korpus & Standar Kurikulum</h1>
          <p className="text-slate-500 text-sm mt-1">Kalibrasi pangkalan data linguistik untuk mengarahkan respons Large Language Model (LLM).</p>
        </div>
        <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2 shadow-sm">
          <ShieldCheck size={14} /> Sinkronisasi Prompt Aktif
        </div>
      </header>

      {/* HEADER MOBILE (App-Like Card) */}
      <div className="md:hidden bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Grounding System</span>
        <h2 className={`text-xl font-bold mt-1 ${teachersFont.className}`}>Korpus & Kurikulum</h2>
        <p className="text-xs text-indigo-100 mt-1">Kelola aturan bahasa dan standar pendidikan nasional.</p>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start gap-3 text-xs font-bold" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* TABS (Mobile Swipeable / Desktop Clean) */}
      <div className="flex gap-2 border-b border-slate-200 pb-0 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        <button 
          onClick={() => setActiveTab("korpus")} 
          className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all relative shrink-0 ${activeTab === "korpus" ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}
        >
          Linguistik Korpus ({filteredKorpus.length})
          {activeTab === "korpus" && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button 
          onClick={() => setActiveTab("standar")} 
          className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all relative shrink-0 ${activeTab === "standar" ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}
        >
          Standar Kurikulum (SNP)
          {activeTab === "standar" && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button 
          onClick={() => setActiveTab("batasan")} 
          className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all relative shrink-0 ${activeTab === "batasan" ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}
        >
          Batasan AI ({daftarBatasan.length})
          {activeTab === "batasan" && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>}
        </button>
      </div>

      <div className="pt-1">
        {activeTab === "korpus" && (
          <div className="space-y-5">
            
            {/* FORM TAMBAH KORPUS */}
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Bot size={18} /></div>
                <div>
                  <h2 className={`text-base font-bold text-slate-800 ${teachersFont.className}`}>Injeksi Sistem Prompt</h2>
                  <p className="text-xs text-slate-400">Tambahkan panduan leksikon lokal untuk model bahasa.</p>
                </div>
              </div>

              <form onSubmit={handleTambahKorpus} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Frasa / Kata Lokal</label>
                    <input type="text" name="frasaLokal" value={formData.frasaLokal} onChange={handleInputChange} placeholder="Cth: Sam" className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bentuk Standar (Baku)</label>
                    <input type="text" name="bentukStandar" value={formData.bentukStandar} onChange={handleInputChange} placeholder="Cth: Mas" className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium" required />
                  </div>
                </div>

                <div className="md:col-span-3 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori Linguistik</label>
                    <select name="kategori" value={formData.kategori} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400">
                      <option value="Dialek/Slang Lokal">Dialek/Slang Lokal</option>
                      <option value="Etika Kesantunan (Undak-Usuk)">Etika Kesantunan</option>
                      <option value="Bias Makna Kultural">Bias Makna Kultural</option>
                    </select>
                  </div>
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 hidden md:block">
                    <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                      AI memproses instruksi ini pada tahap pra-pemrosesan data.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-6 flex flex-col justify-between">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instruksi Mediasi AI (System Prompt)</label>
                    <textarea name="instruksiAi" value={formData.instruksiAi} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 h-24 resize-none font-mono" required />
                  </div>
                  
                  <button type="submit" disabled={isSubmitting} className={`w-full mt-3 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Menginjeksi...</> : <><Plus size={16} /> Tambahkan ke Database</>}
                  </button>
                </div>
              </form>
            </div>

            {/* DAFTAR KORPUS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <h3 className={`text-sm font-bold text-slate-800 ${teachersFont.className}`}>
                  Daftar Instruksi Tersimpan
                </h3>
                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl w-full sm:w-60 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 shadow-sm">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari kata atau frasa..." className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder:text-slate-400" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                </div>
              </div>
              
              <div className="w-full">
                {/* Tampilan Mobile Card */}
                <div className="block md:hidden p-3 space-y-3 bg-slate-50/30">
                  <AnimatePresence>
                    {filteredKorpus.length > 0 ? filteredKorpus.map((item) => (
                      <motion.div key={item.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                        <button onClick={() => handleHapusKorpus(item.id, item.frasaLokal)} className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl"><Trash2 size={16} /></button>
                        <div className="pr-8">
                          <h4 className="font-bold text-slate-900 text-sm">{item.frasaLokal}</h4>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mt-0.5 mb-2 flex items-center gap-1"><ArrowRight size={10}/> Baku: {item.bentukStandar}</p>
                          <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-bold uppercase border border-indigo-100 mb-2.5">{item.kategori}</span>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mediasi AI</p>
                            <p className="text-[11px] text-slate-600 font-mono leading-relaxed">{item.instruksiAi}</p>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-400">Tidak ada data ditemukan.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tampilan Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="px-5 py-3.5">Kata / Frasa Lokal</th>
                        <th className="px-5 py-3.5">Kategori</th>
                        <th className="px-5 py-3.5">Bentuk Baku</th>
                        <th className="px-5 py-3.5">Instruksi Mediasi AI</th>
                        <th className="px-5 py-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      <AnimatePresence>
                        {filteredKorpus.length > 0 ? filteredKorpus.map((item) => (
                          <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 align-top font-bold text-slate-900">{item.frasaLokal}</td>
                            <td className="px-5 py-3.5 align-top">
                              <span className="inline-flex px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-indigo-100">{item.kategori}</span>
                            </td>
                            <td className="px-5 py-3.5 align-top font-bold text-emerald-600">{item.bentukStandar}</td>
                            <td className="px-5 py-3.5 align-top font-mono text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 max-w-xs">{item.instruksiAi}</td>
                            <td className="px-5 py-3.5 align-top text-center">
                              <button onClick={() => handleHapusKorpus(item.id, item.frasaLokal)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex items-center justify-center"><Trash2 size={16} /></button>
                            </td>
                          </motion.tr>
                        )) : (
                          <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-xs">Database instruksi masih kosong.</td></tr>
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "standar" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 border-b border-slate-100 pb-5">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 w-fit">
                  <BookMarked size={24} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold text-slate-900 ${teachersFont.className}`}>Pemetaan Standar Kurikulum Nasional</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5 leading-relaxed">
                    Parameter ini digunakan oleh modul AI Generator untuk memastikan bahwa bahan ajar selaras dengan regulasi kementerian.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Fase Pembelajaran</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <h4 className="font-bold text-indigo-700 text-xs mb-1">Fase A - C (Dasar)</h4>
                    <p className="text-[10px] text-slate-500">SD / MI / Sederajat</p>
                    <p className="text-[10px] text-slate-600 mt-2">Pengenalan kosa kata dasar, literasi awal, dan budi pekerti.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <h4 className="font-bold text-indigo-700 text-xs mb-1">Fase D (Menengah)</h4>
                    <p className="text-[10px] text-slate-500">SMP / MTs / Sederajat</p>
                    <p className="text-[10px] text-slate-600 mt-2">Analisis teks sederhana, etika komunikasi, dan toleransi budaya.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                    <h4 className="font-bold text-indigo-700 text-xs mb-1">Fase E - F (Lanjut)</h4>
                    <p className="text-[10px] text-slate-500">SMA / SMK / MA / Sederajat</p>
                    <p className="text-[10px] text-slate-600 mt-2">Analisis sosiolinguistik kritis, sastra daerah, dan riset terapan.</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Integrasi Kementerian</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/20">
                  <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-2">
                    <GraduationCap size={16} className="text-blue-600" /> Kemendikdasmen
                  </h4>
                  <p className="text-[11px] text-slate-600">Implementasi Kurikulum Nasional Fase A hingga F serta penguatan muatan lokal.</p>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20">
                  <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" /> Kementerian Agama
                  </h4>
                  <p className="text-[11px] text-slate-600">Penyelarasan modul berlandaskan nilai moderasi beragama serta penekanan aspek adab.</p>
                </div>

                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/20">
                  <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-2">
                    <Landmark size={16} className="text-amber-600" /> Kementerian Kebudayaan
                  </h4>
                  <p className="text-[11px] text-slate-600">Pelestarian leksikon dan dialek daerah nusantara serta validasi norma kesantunan sosial.</p>
                </div>

                <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/20">
                  <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-2">
                    <Microscope size={16} className="text-purple-600" /> Diktisaintek
                  </h4>
                  <p className="text-[11px] text-slate-600">Pengembangan arsitektur model AI edukasi responsif budaya dan tata kelola korpus.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "batasan" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <MessageSquareWarning size={16} className="text-amber-600" /> Tambah Aturan Pembatas AI
              </h2>
              <form onSubmit={handleTambahBatasan} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select 
                  value={batasanForm.kategori} 
                  onChange={(e) => setBatasanForm({...batasanForm, kategori: e.target.value})} 
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs md:text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="Gaya Bahasa">Gaya Bahasa</option>
                  <option value="Topik Terlarang">Topik Terlarang</option>
                  <option value="Cakupan Materi">Cakupan Materi</option>
                </select>
                
                <input 
                  type="text"
                  value={batasanForm.aturan} 
                  onChange={(e) => setBatasanForm({...batasanForm, aturan: e.target.value})} 
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs md:text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" 
                  placeholder="Contoh: Dilarang menyebutkan topik sensitif..." 
                  disabled={isSubmittingBatasan}
                />
                
                <button 
                  type="submit" 
                  disabled={isSubmittingBatasan || !batasanForm.aturan.trim()}
                  className={`text-white p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${isSubmittingBatasan || !batasanForm.aturan.trim() ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                >
                  {isSubmittingBatasan ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 
                  <span>{isSubmittingBatasan ? "Menyimpan..." : "Simpan Aturan"}</span>
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left">Kategori</th>
                    <th className="px-5 py-3 text-left">Detail Aturan</th>
                    <th className="px-5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {daftarBatasan.length > 0 ? daftarBatasan.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-indigo-700">{item.kategori}</td>
                      <td className="px-5 py-3.5 text-slate-700">{item.aturan}</td>
                      <td className="px-5 py-3.5 text-center">
                        <button onClick={() => handleHapusBatasan(item.id)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all inline-flex items-center justify-center">
                           <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-5 py-10 text-center text-slate-400 text-xs">
                        Belum ada aturan batasan AI yang tersimpan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}