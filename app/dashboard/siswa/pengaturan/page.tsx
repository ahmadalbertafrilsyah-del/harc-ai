"use client";

import { motion } from "framer-motion";
import { User, ShieldCheck, Database, Trash2, AlertTriangle, CheckCircle2, Loader2, Info } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function PengaturanSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  
  // State Data Pengguna & Privasi
  const [profil, setProfil] = useState<any>({});
  const [isConsented, setIsConsented] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        // Membaca status persetujuan data AI (Informed Consent)
        setIsConsented(data.aiDataConsent === true);
      }
    } catch (error) {
      console.error("Gagal menarik data profil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // FUNGSI 1: Persetujuan Penggunaan Data (Informed Consent)
  const handleToggleConsent = async () => {
    if (!userUid) return;
    setIsSaving(true);
    const newConsentStatus = !isConsented;
    
    try {
      await updateDoc(doc(db, "users", userUid), {
        aiDataConsent: newConsentStatus
      });
      setIsConsented(newConsentStatus);
      
      if (newConsentStatus) {
        alert("Terima kasih! Kamu telah menyetujui penggunaan data interaksimu untuk evaluasi AI yang lebih baik.");
      } else {
        alert("Persetujuan dicabut. AI tidak akan lagi merekam jejak belajarmu secara personal.");
      }
    } catch (error) {
      console.error("Gagal mengubah privasi:", error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  // FUNGSI 2: Hak Untuk Dilupakan (Right to be Forgotten)
  const handleHapusDataAI = async () => {
    if (!userUid) return;
    
    const konfirmasi = window.confirm(
      "PERINGATAN ETIKA DATA:\n\nApakah kamu yakin ingin menghapus seluruh rekam jejak interaksimu dengan AI (termasuk riwayat petunjuk/scaffolding dan log kemandirian)?\n\nTindakan ini bersifat permanen dan dijamin oleh hak privasimu."
    );
    
    if (!konfirmasi) return;
    
    setIsDeleting(true);
    try {
      // Mencari semua data jawaban ujian siswa ini
      const q = query(collection(db, "jawaban_siswa"), where("uid", "==", userUid));
      const querySnapshot = await getDocs(q);
      
      // Menghapus hanya metadata analitik AI, namun tetap mempertahankan nilai akhir (Minimisasi Data)
      const deletePromises = querySnapshot.docs.map((document) => {
        return updateDoc(doc(db, "jawaban_siswa", document.id), {
          "metadataAnalitik": null, // Hapus jejak AI
          "sanggahan": null // Hapus riwayat sanggahan
        });
      });
      
      await Promise.all(deletePromises);
      alert("Proses berhasil. Seluruh jejak interaksi dan log analitik AI milikmu telah dibersihkan dari pangkalan data sekolah.");
    } catch (error) {
      console.error("Gagal menghapus log AI:", error);
      alert("Gagal menghapus data. Silakan hubungi Guru/Admin.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`max-w-4xl mx-auto space-y-8 pb-20 p-6 ${teachersFont.className}`}>
      
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <User className="text-blue-600" size={32} /> Profil & Privasi Data
        </h1>
        <p className="text-slate-600 text-sm mt-2 max-w-2xl leading-relaxed">
          Kelola informasi pribadimu dan kendalikan bagaimana mesin kecerdasan buatan (AI) memproses data belajarmu sesuai prinsip adab digital.
        </p>
      </header>

      {/* Bagian 1: Profil Dasar */}
      <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <User size={20} className="text-slate-400"/> Informasi Akun
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
            <input type="text" disabled value={profil.nama || "Nama Siswa"} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Terdaftar</label>
            <input type="email" disabled value={profil.email || "email@siswa.com"} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">NPSN Sekolah</label>
            <input type="text" disabled value={profil.npsn || "-"} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5"><Info size={14}/> Untuk mengubah data dasar, silakan hubungi Administrator Tata Usaha Sekolah.</p>
      </section>

      {/* Bagian 2: Pusat Privasi & Etika Data (Dimensi 6 [x-AI]) */}
      <section className="bg-slate-900 rounded-2xl shadow-md border border-slate-800 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck size={24} className="text-emerald-400"/> Pusat Privasi & Etika AI
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Sistem HARC-AI mengedepankan hak privasi pelajar (Data Minimization). Kamu memiliki kendali penuh atas data interaksimu dengan Asisten AI.
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          
          {/* Fitur Informed Consent */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="max-w-xl">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">
                <Database size={18} className="text-blue-400"/> Persetujuan Analitik Proses
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Mengizinkan sistem merekam jumlah petunjuk (scaffolding) yang kamu minta dan menganalisis tingkat kemandirianmu untuk memberikan rekomendasi belajar yang lebih sesuai dengan korpus budayamu.
              </p>
            </div>
            
            <button 
              onClick={handleToggleConsent}
              disabled={isSaving}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none shrink-0 ${isConsented ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isConsented ? 'translate-x-9' : 'translate-x-1'}`} />
            </button>
          </div>

          <hr className="border-slate-800" />

          {/* Fitur Right to be Forgotten */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="max-w-xl">
              <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-2">
                <Trash2 size={18} /> Hak Menghapus Jejak AI (Right to be Forgotten)
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tarik kembali dan hapus seluruh metadata interaksimu dengan AI (log petunjuk, log waktu, dan sanggahan). Nilai akhir ujianmu akan tetap aman, namun analitik proses belajar akan dihapus permanen.
              </p>
            </div>
            
            <button 
              onClick={handleHapusDataAI}
              disabled={isDeleting}
              className="px-6 py-3 bg-red-950/50 hover:bg-red-900 border border-red-900/50 text-red-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shrink-0 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={18} className="animate-spin"/> : <AlertTriangle size={18}/>}
              Hapus Jejak AI
            </button>
          </div>

        </div>
      </section>

    </motion.main>
  );
}