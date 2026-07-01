"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Database, Search, Plus, BookOpen, Trash2, ShieldCheck, Loader2, BookMarked, MessageSquareWarning, AlertCircle } from "lucide-react";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // State Real-time dari Firebase
  const [daftarKorpus, setDaftarKorpus] = useState<any[]>([]);
  
  // State Form Tambah Korpus
  const [formData, setFormData] = useState({
    frasaLokal: "",
    bentukStandar: "",
    kategori: "Sosiolinguistik",
    catatanBudaya: "",
  });

  useEffect(() => {
    const qKorpus = query(collection(db, "korpus_budaya"), orderBy("timestamp", "desc"));
    
    // onSnapshot dengan parameter ke-3 untuk menangkap Error agar tidak stuck loading
    const unsubKorpus = onSnapshot(
      qKorpus, 
      (snapshot) => {
        const korpus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDaftarKorpus(korpus);
        setIsLoading(false);
        setErrorMessage(null); // Bersihkan error jika berhasil
      },
      (error) => {
        console.error("Gagal menarik data Korpus:", error);
        // Tetap matikan loading agar halaman muncul
        setIsLoading(false);
        // Tampilkan pesan jika ditolak oleh Rules Firestore
        if (error.code === 'permission-denied') {
          setErrorMessage("Akses ditolak. Pastikan Rules Firestore mengizinkan Admin membaca 'korpus_budaya'.");
        } else if (error.code === 'failed-precondition') {
          setErrorMessage("Firebase sedang membangun Indeks Database. Tunggu beberapa menit.");
        }
      }
    );

    return () => unsubKorpus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTambahKorpus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "korpus_budaya"), {
        frasaLokal: formData.frasaLokal,
        bentukStandar: formData.bentukStandar,
        kategori: formData.kategori,
        catatanBudaya: formData.catatanBudaya,
        timestamp: serverTimestamp()
      });
      
      setFormData({ frasaLokal: "", bentukStandar: "", kategori: "Sosiolinguistik", catatanBudaya: "" });
    } catch (error) {
      console.error("Gagal menambah korpus:", error);
      alert("Terjadi kesalahan jaringan atau izin. Pastikan Anda masuk sebagai Admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapusKorpus = async (id: string, frasa: string) => {
    const konfirmasi = confirm(`Hapus frasa "${frasa}" dari basis data AI?`);
    if (!konfirmasi) return;

    try {
      await deleteDoc(doc(db, "korpus_budaya", id));
    } catch (error) {
      console.error("Gagal menghapus korpus:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Memuat Pangkalan Data AI...</p>
        <p className="text-sm">Menyinkronkan korpus budaya dari Firestore</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Korpus & Standar Kurikulum</h1>
          <p className="text-slate-500 text-sm mt-1">Kalibrasi pangkalan data dialek lokal agar AI dapat memberikan penilaian yang presisi.</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <ShieldCheck size={14} /> AI Engine Terkalibrasi
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm font-medium">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-6 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("korpus")}
          className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "korpus" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
        >
          Korpus Dialek Lokal ({daftarKorpus.length})
          {activeTab === "korpus" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button 
          onClick={() => setActiveTab("standar")}
          className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "standar" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
        >
          Standar Nasional (Kemenag & Kemendikbud)
          {activeTab === "standar" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 pt-2">
        
        {activeTab === "korpus" && (
          <>
            <div className="lg:w-4/12">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80 sticky top-6">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                  <Database size={18} className="text-indigo-600" />
                  <h2 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>Entri Data Baru</h2>
                </div>

                <form onSubmit={handleTambahKorpus} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frasa / Dialek Lokal</label>
                    <input 
                      type="text" 
                      name="frasaLokal"
                      value={formData.frasaLokal}
                      onChange={handleInputChange}
                      placeholder="Cth: Sam (Boso Walikan Malang)" 
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bentuk Standar (Krama/Baku)</label>
                    <input 
                      type="text" 
                      name="bentukStandar"
                      value={formData.bentukStandar}
                      onChange={handleInputChange}
                      placeholder="Cth: Mas / Kangmas" 
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Anomali</label>
                    <select 
                      name="kategori"
                      value={formData.kategori}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    >
                      <option value="Sosiolinguistik">Sosiolinguistik (Tingkat Tutur)</option>
                      <option value="Interpretasi Budaya">Interpretasi Budaya (Makna)</option>
                      <option value="Adab Digital">Adab Digital & Kesantunan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Konteks / Catatan AI</label>
                    <textarea 
                      name="catatanBudaya"
                      value={formData.catatanBudaya}
                      onChange={handleInputChange}
                      placeholder="Berikan instruksi bagaimana AI harus merespons jika siswa menggunakan kata ini..." 
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px] resize-none"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full mt-2 py-3 rounded-lg text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 ${
                      isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-800 shadow-indigo-700/20'
                    }`}
                  >
                    {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Plus size={16} /> Latih AI Engine</>}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:w-8/12">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
                    Daftar Instruksi Tersimpan
                  </h3>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-full sm:w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                    <Search size={14} className="text-slate-400" />
                    <input type="text" placeholder="Cari frasa lokal..." className="bg-transparent border-none outline-none text-xs w-full text-slate-700" />
                  </div>
                </div>
                
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="px-6 py-4">Kata / Frasa Lokal</th>
                        <th className="px-6 py-4">Kategori & Standar</th>
                        <th className="px-6 py-4">Instruksi Mediasi AI</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {daftarKorpus.length > 0 ? daftarKorpus.map((item) => (
                          <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 align-top">
                              <p className="font-bold text-slate-800 text-sm">{item.frasaLokal}</p>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-indigo-100">
                                {item.kategori}
                              </span>
                              <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                                <ArrowRight size={12} className="text-slate-400" /> {item.bentukStandar}
                              </p>
                            </td>
                            <td className="px-6 py-4 align-top max-w-[250px]">
                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                                {item.catatanBudaya}
                              </p>
                            </td>
                            <td className="px-6 py-4 align-top text-right">
                              <button onClick={() => handleHapusKorpus(item.id, item.frasaLokal)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Hapus dari database AI">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </motion.tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="text-center py-16 text-slate-500">
                              <div className="flex flex-col items-center justify-center">
                                <MessageSquareWarning size={32} className="text-slate-300 mb-3" />
                                <p className="text-sm font-bold text-slate-700">Korpus masih kosong.</p>
                                <p className="text-xs text-slate-400 mt-1">Tambahkan pangkalan data dialek di panel kiri.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "standar" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200/80">
              <div className="flex items-start gap-4 mb-8">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BookMarked size={28} />
                </div>
                <div>
                  <h2 className={`text-xl font-bold text-slate-800 ${teachersFont.className}`}>Pemetaan Standar Nasional</h2>
                  <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                    Parameter ini digunakan oleh modul AI Generator untuk memastikan bahwa bahan ajar yang diproduksi otomatis selaras dengan regulasi nasional.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-600" /> Kurikulum Merdeka (Kemendikbud)
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                      <span>Fase E & F (SMA/SMK) untuk mata pelajaran muatan lokal.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                      <span>Fokus Capaian Pembelajaran: Analisis konteks tutur dan apresiasi sastra daerah.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600" /> Standar Kemenag (Madrasah)
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                      <span>Integrasi nilai Adab dan Akhlak dalam komunikasi digital (Sosiolinguistik).</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                      <span>Penyelarasan kearifan lokal dengan nilai-nilai moderasi beragama.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  )
}