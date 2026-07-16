"use client";

import { motion } from "framer-motion";
import { User, ShieldCheck, Database, Trash2, AlertTriangle, CheckCircle2, Loader2, Info, Save, Hash } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function PengaturanSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  
  const [profil, setProfil] = useState<any>({});
  const [isConsented, setIsConsented] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfil, setIsSavingProfil] = useState(false);

  // State untuk form identitas yang bisa diedit
  const [formData, setFormData] = useState({
    nisn: ""
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        await fetchProfil(user.uid);
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchProfil = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfil(data);
        setFormData({ nisn: data.nisn || "" });
        setIsConsented(data.aiDataConsent === true);
      }
    } catch (error) {
      console.error("Gagal menarik data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimpanProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid) return;
    setIsSavingProfil(true);
    try {
      await updateDoc(doc(db, "users", userUid), { nisn: formData.nisn });
      setProfil({ ...profil, nisn: formData.nisn });
      alert("Profil berhasil diperbarui!");
    } catch (error) {
      alert("Gagal menyimpan profil.");
    } finally {
      setIsSavingProfil(false);
    }
  };

  const handleToggleConsent = async () => {
    if (!userUid) return;
    setIsSaving(true);
    const newConsentStatus = !isConsented;
    try {
      await updateDoc(doc(db, "users", userUid), { aiDataConsent: newConsentStatus });
      setIsConsented(newConsentStatus);
      alert(newConsentStatus ? "Terima kasih! Kamu telah menyetujui penggunaan data." : "Persetujuan dicabut.");
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleHapusDataAI = async () => {
    if (!userUid) return;
    const konfirmasi = window.confirm("PERINGATAN: Apakah kamu yakin ingin menghapus seluruh rekam jejak interaksimu dengan AI?");
    if (!konfirmasi) return;
    
    setIsDeleting(true);
    try {
      const q = query(collection(db, "jawaban_siswa"), where("uid", "==", userUid));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map((document) => {
        return updateDoc(doc(db, "jawaban_siswa", document.id), {
          "metadataAnalitik": null, "sanggahan": null
        });
      });
      await Promise.all(deletePromises);
      alert("Seluruh jejak interaksi AI milikmu telah dibersihkan.");
    } catch (error) {
      alert("Gagal menghapus data.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20 p-4 md:p-6 ${teachersFont.className}`}>
      
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <User className="text-blue-600" size={28} /> Profil & Privasi Data
        </h1>
        <p className="text-slate-600 text-sm mt-2 max-w-2xl leading-relaxed">
          Kelola informasi pribadimu dan kendalikan bagaimana mesin AI memproses data belajarmu.
        </p>
      </header>

      {/* Bagian 1: Profil Dasar & NISN */}
      <section className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
          <User size={20} className="text-blue-500"/> Informasi Akun Akademik
        </h2>
        
        <form onSubmit={handleSimpanProfil} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
              <input type="text" disabled value={profil.nama || ""} className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Terdaftar</label>
              <input type="email" disabled value={profil.email || ""} className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">NPSN Sekolah</label>
              <input type="text" disabled value={profil.npsn || "-"} className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">NISN Siswa</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Hash size={16} className="text-slate-400" /></div>
                <input 
                  type="text" 
                  value={formData.nisn} 
                  onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                  placeholder="Masukkan 10 digit NISN"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Info size={14} className="shrink-0"/> Hubungi Admin untuk mengubah data yang terkunci.</p>
            <button type="submit" disabled={isSavingProfil || formData.nisn === profil.nisn} className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              {isSavingProfil ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan NISN
            </button>
          </div>
        </form>
      </section>

      {/* Bagian 2: Pusat Privasi & Etika Data */}
      <section className="bg-slate-900 rounded-2xl shadow-md border border-slate-800 overflow-hidden">
        <div className="p-5 md:p-8 border-b border-slate-800">
          <h2 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck size={24} className="text-emerald-400"/> Pusat Privasi & Etika AI
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">Sistem HARC-AI mengedepankan hak privasi pelajar. Kamu memiliki kendali penuh atas datamu.</p>
        </div>

        <div className="p-5 md:p-8 space-y-8">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-between items-start md:items-center">
            <div className="max-w-xl">
              <h3 className="text-base md:text-lg font-bold text-slate-100 flex items-center gap-2 mb-2"><Database size={18} className="text-blue-400"/> Persetujuan Analitik Proses</h3>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">Mengizinkan sistem merekam jumlah petunjuk (scaffolding) yang kamu minta untuk memberikan rekomendasi belajar.</p>
            </div>
            <button onClick={handleToggleConsent} disabled={isSaving} className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none shrink-0 ${isConsented ? 'bg-emerald-500' : 'bg-slate-600'}`}>
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isConsented ? 'translate-x-9' : 'translate-x-1'}`} />
            </button>
          </div>

          <hr className="border-slate-800" />

          <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-between items-start md:items-center">
            <div className="max-w-xl">
              <h3 className="text-base md:text-lg font-bold text-red-400 flex items-center gap-2 mb-2"><Trash2 size={18} /> Hak Menghapus Jejak AI</h3>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">Tarik kembali dan hapus seluruh metadata interaksimu dengan AI. Nilai akhir ujianmu akan tetap aman.</p>
            </div>
            <button onClick={handleHapusDataAI} disabled={isDeleting} className="w-full md:w-auto px-6 py-3 bg-red-950/50 hover:bg-red-900 border border-red-900/50 text-red-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shrink-0 disabled:opacity-50">
              {isDeleting ? <Loader2 size={18} className="animate-spin"/> : <AlertTriangle size={18}/>} Hapus Jejak AI
            </button>
          </div>
        </div>
      </section>

    </motion.main>
  );
}