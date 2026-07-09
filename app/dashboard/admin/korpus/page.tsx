"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, Search, Plus, BookOpen, Trash2, ShieldCheck, 
  Loader2, BookMarked, MessageSquareWarning, AlertCircle, 
  Landmark, GraduationCap, Microscope, Bot, X, ArrowRight 
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE REAL-TIME
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function KorpusStandarAdmin() {
  const [activeTab, setActiveTab] = useState("korpus"); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingBatasan, setIsSubmittingBatasan] = useState(false); // State baru untuk loading form Batasan
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [batasanForm, setBatasanForm] = useState({ kategori: "Gaya Bahasa", aturan: "" });
  const [daftarBatasan, setDaftarBatasan] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ frasaLokal: "", bentukStandar: "", kategori: "Dialek/Slang Lokal", instruksiAi: "Jika pengguna menggunakan kata ini, sistem harus...", });
  const [daftarKorpus, setDaftarKorpus] = useState<any[]>([]);

  // Mengambil Data Korpus dan Batasan secara Real-Time
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
          setErrorMessage("Akses ditolak. Pastikan Rules Firestore mengizinkan Admin membaca 'korpus_budaya'.");
        } else if (error.code === 'failed-precondition') {
          setErrorMessage("Firebase sedang membangun Indeks Database. Tunggu beberapa menit.");
        }
      }
    );

    return () => {
      unsubKorpus();
      unsubBatasan(); // Membersihkan memory leak pada listener Batasan
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // LOGIKA TAMBAH BATASAN YANG TELAH DIPERBAIKI
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
      alert(`Gagal menyimpan aturan: ${error.message}. Pastikan izin Firestore Anda sudah benar.`);
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
      alert("Gagal menghapus aturan."); 
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
      alert("Terjadi kesalahan jaringan atau izin. Pastikan Anda masuk sebagai Admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapusKorpus = async (id: string, frasa: string) => {
    const konfirmasi = confirm(`Hapus instruksi untuk "${frasa}" dari pangkalan data LLM?`);
    if (!konfirmasi) return;

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
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Memuat Pangkalan Data AI...</p>
        <p className="text-sm">Menyinkronkan instruksi LLM dari Firestore</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6 pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Korpus & Standar Kurikulum</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">Kalibrasi pangkalan data linguistik untuk mengarahkan respons *Large Language Model* (LLM) secara presisi.</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2 w-fit">
          <ShieldCheck size={14} /> Sinkronisasi Prompt Aktif
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm font-medium">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* TABS DENGAN CLASS CAPITALIZE */}
      <div className="flex flex-wrap gap-4 md:gap-6 border-b border-slate-200 capitalize">
        <button onClick={() => setActiveTab("korpus")} className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "korpus" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>
          Linguistik korpus({filteredKorpus.length})
          {activeTab === "korpus" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("standar")} className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "standar" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>
          SNP
          {activeTab === "standar" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("batasan")} className={`pb-3 text-sm font-bold ${activeTab === "batasan" ? "text-indigo-700" : "text-slate-500"}`}>
          Batasan AI
        </button>
      </div>

      <div className="pt-2">
        {activeTab === "korpus" && (
          <div className="space-y-6">
            
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                <Bot size={20} className="text-indigo-600" />
                <div>
                  <h2 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>Injeksi Sistem Prompt</h2>
                  <p className="text-xs text-slate-500">Ajarkan AI untuk mengenali dan merespons konteks linguistik spesifik.</p>
                </div>
              </div>

              <form onSubmit={handleTambahKorpus} className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-3 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frasa / Kata Lokal</label>
                    <input type="text" name="frasaLokal" value={formData.frasaLokal} onChange={handleInputChange} placeholder="Cth: Sam" className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bentuk Standar (Baku)</label>
                    <input type="text" name="bentukStandar" value={formData.bentukStandar} onChange={handleInputChange} placeholder="Cth: Mas" className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" required />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Linguistik</label>
                  <select name="kategori" value={formData.kategori} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                    <option value="Dialek/Slang Lokal">Dialek/Slang Lokal</option>
                    <option value="Etika Kesantunan (Undak-Usuk)">Etika Kesantunan (Undak-Usuk)</option>
                    <option value="Bias Makna Kultural">Bias Makna Kultural</option>
                  </select>
                  <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 hidden md:block">
                    <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                      AI akan memproses instruksi ini pada saat tahap `pre-processing` *prompt* siswa di sistem belakang.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-6 flex flex-col h-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Database size={12}/> Instruksi Mediasi AI (System Prompt)</label>
                  <textarea name="instruksiAi" value={formData.instruksiAi} onChange={handleInputChange} className="w-full flex-grow bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px] resize-none font-mono" required />
                  
                  <button type="submit" disabled={isSubmitting} className={`w-full mt-3 py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-800 shadow-indigo-700/20'}`}>
                    {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Menginjeksi...</> : <><Plus size={16} /> Tambahkan ke Database LLM</>}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
                  Daftar Instruksi Tersimpan
                </h3>
                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-full sm:w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pencarian cepat..." className="bg-transparent border-none outline-none text-xs w-full text-slate-700" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                </div>
              </div>
              
              <div className="w-full">
                
                <div className="block md:hidden p-4 space-y-4 bg-slate-50/30">
                  <AnimatePresence>
                    {filteredKorpus.length > 0 ? filteredKorpus.map((item) => (
                      <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                        <button onClick={() => handleHapusKorpus(item.id, item.frasaLokal)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>
                        <div className="pr-10">
                          <h4 className="font-bold text-slate-800 text-lg mb-0.5">{item.frasaLokal}</h4>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-1"><ArrowRight size={10}/> {item.bentukStandar}</p>
                          <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase border border-indigo-100 mb-3">{item.kategori}</span>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instruksi Mediasi AI</p>
                            <p className="text-xs text-slate-600 font-mono leading-relaxed">{item.instruksiAi}</p>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
                        <MessageSquareWarning size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-700">Tidak ada data ditemukan.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="hidden md:block overflow-x-auto min-h-[300px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="px-6 py-4 text-center w-[15%]">Kata / Frasa Lokal</th>
                        <th className="px-6 py-4 text-center w-[20%]">Kategori</th>
                        <th className="px-6 py-4 text-center w-[15%]">Standar</th>
                        <th className="px-6 py-4 text-center w-[40%]">Instruksi Mediasi AI</th>
                        <th className="px-6 py-4 text-center w-[10%]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {filteredKorpus.length > 0 ? filteredKorpus.map((item) => (
                          <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 align-top"><p className="font-bold text-slate-800 text-sm">{item.frasaLokal}</p></td>
                            <td className="px-6 py-4 align-top"><span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-100 text-center">{item.kategori}</span></td>
                            <td className="px-6 py-4 align-top"><p className="text-sm font-bold text-emerald-600">{item.bentukStandar}</p></td>
                            <td className="px-6 py-4 align-top"><p className="text-[11px] text-slate-600 font-mono leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">{item.instruksiAi}</p></td>
                            <td className="px-6 py-4 align-top text-center">
                              <button onClick={() => handleHapusKorpus(item.id, item.frasaLokal)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mx-auto block"><Trash2 size={16} /></button>
                            </td>
                          </motion.tr>
                        )) : (
                          <tr><td colSpan={5} className="text-center py-16 text-slate-500">Database instruksi masih kosong atau tidak ditemukan.</td></tr>
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
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full">
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200/80">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 w-fit">
                  <BookMarked size={28} />
                </div>
                <div>
                  <h2 className={`text-xl md:text-2xl font-bold text-slate-800 ${teachersFont.className}`}>Pemetaan Standar Kurikulum Nasional</h2>
                  <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                    Parameter ini digunakan oleh modul AI Generator untuk memastikan bahwa bahan ajar yang diproduksi otomatis selaras dengan regulasi kementerian terkait, mencakup seluruh jenjang pendidikan dari Fase A hingga Fase F.
                  </p>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-indigo-500 pl-3">Integrasi Fase Pembelajaran</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="font-bold text-indigo-700 mb-1">Fase A - C (Dasar)</h4>
                    <p className="text-xs text-slate-600">SD / MI / Sederajat</p>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Fokus AI: Pengenalan kosa kata dasar daerah, literasi awal, dan budi pekerti dasar.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="font-bold text-indigo-700 mb-1">Fase D (Menengah)</h4>
                    <p className="text-xs text-slate-600">SMP / MTs / Sederajat</p>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Fokus AI: Analisis teks sederhana, etika komunikasi digital, dan toleransi budaya lokal.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="font-bold text-indigo-700 mb-1">Fase E - F (Lanjut)</h4>
                    <p className="text-xs text-slate-600">SMA / SMK / MA / Sederajat</p>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Fokus AI: Analisis sosiolinguistik kritis, apresiasi sastra daerah, dan riset terapan berkelanjutan.</p>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-indigo-500 pl-3">Asesmen Berbasis Kementerian</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                
                <div className="p-5 md:p-6 rounded-xl border border-blue-200 bg-blue-50/30">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2.5 text-sm md:text-base">
                    <GraduationCap size={20} className="text-blue-600 shrink-0" /> Kementerian Pendidikan Dasar & Menengah
                  </h3>
                  <ul className="space-y-3 text-xs md:text-sm text-slate-600">
                    <li className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span><span>Implementasi Kurikulum Nasional pada Fase A hingga F.</span></li>
                    <li className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span><span>Integrasi muatan lokal dalam literasi dan numerasi siswa.</span></li>
                  </ul>
                </div>

                <div className="p-5 md:p-6 rounded-xl border border-emerald-200 bg-emerald-50/30">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2.5 text-sm md:text-base">
                    <ShieldCheck size={20} className="text-emerald-600 shrink-0" /> Kementerian Agama (Kemenag)
                  </h3>
                  <ul className="space-y-3 text-xs md:text-sm text-slate-600">
                    <li className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span><span>Penyelarasan Modul Ajar berlandaskan nilai moderasi beragama.</span></li>
                    <li className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span><span>Fokus pada Adab dan Akhlak dalam bahasa tutur digital AI.</span></li>
                  </ul>
                </div>

                <div className="p-5 md:p-6 rounded-xl border border-amber-200 bg-amber-50/30">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2.5 text-sm md:text-base">
                    <Landmark size={20} className="text-amber-600 shrink-0" /> Kementerian Kebudayaan (Kemenbud)
                  </h3>
                  <ul className="space-y-3 text-xs md:text-sm text-slate-600">
                    <li className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span><span>Pelestarian leksikon, dialek, dan bahasa daerah yang terancam.</span></li>
                    <li className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span><span>Validasi norma kesantunan sosial (Sosiolinguistik) nusantara.</span></li>
                  </ul>
                </div>

                <div className="p-5 md:p-6 rounded-xl border border-purple-200 bg-purple-50/30">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2.5 text-sm md:text-base">
                    <Microscope size={20} className="text-purple-600 shrink-0" /> Kementerian Diktisaintek
                  </h3>
                  <ul className="space-y-3 text-xs md:text-sm text-slate-600">
                    <li className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span><span>R&D arsitektur model AI untuk edukasi responsif budaya.</span></li>
                    <li className="flex items-start gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span><span>Penerapan etika AI dan tata kelola pangkalan data (korpus).</span></li>
                  </ul>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* TAB BATASAN AI */}
        {activeTab === "batasan" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquareWarning size={18} className="text-amber-600" /> Tambah Aturan Pembatas AI
            </h2>
            <form onSubmit={handleTambahBatasan} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select 
                value={batasanForm.kategori} 
                onChange={(e) => setBatasanForm({...batasanForm, kategori: e.target.value})} 
                className="bg-slate-50 border p-2.5 rounded-lg text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Gaya Bahasa">Gaya Bahasa</option>
                <option value="Topik Terlarang">Topik Terlarang</option>
                <option value="Cakupan Materi">Cakupan Materi</option>
              </select>
              
              <input 
                type="text"
                value={batasanForm.aturan} 
                onChange={(e) => setBatasanForm({...batasanForm, aturan: e.target.value})} 
                className="md:col-span-1 flex-1 bg-slate-50 border p-2.5 rounded-lg text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                placeholder="Contoh: Dilarang menyebutkan politik..." 
                disabled={isSubmittingBatasan}
              />
              
              <button 
                type="submit" 
                disabled={isSubmittingBatasan || !batasanForm.aturan.trim()}
                className={`text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${isSubmittingBatasan || !batasanForm.aturan.trim() ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {isSubmittingBatasan ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} 
                {isSubmittingBatasan ? "Menyimpan..." : "Simpan Aturan"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4 text-left">Kategori</th>
                  <th className="px-6 py-4 text-left">Detail Aturan</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftarBatasan.length > 0 ? daftarBatasan.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-700">{item.kategori}</td>
                    <td className="px-6 py-4 text-slate-700">{item.aturan}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleHapusBatasan(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all inline-flex items-center justify-center">
                         <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500 text-sm">
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