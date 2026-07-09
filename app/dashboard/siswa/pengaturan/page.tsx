"use client";

import { motion } from "framer-motion";
import { Save, User, Mail, GraduationCap, Loader2, Building } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function PengaturanSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    kelas: "",
    npsn: ""
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            nama: data.nama || "",
            email: data.email || user.email || "",
            kelas: data.kelas || "",
            npsn: data.npsn || data.instansi || ""
          });
        }
        setIsLoading(false);
      } else {
        window.location.href = "/login";
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid) return;
    
    setIsSaving(true);
    try {
      const docRef = doc(db, "users", userUid);
      await updateDoc(docRef, {
        nama: formData.nama,
        kelas: formData.kelas,
        npsn: formData.npsn,
        instansi: formData.npsn // Fallback relasi
      });
      alert("Profil berhasil diperbarui!");
    } catch (error) {
      alert("Gagal menyimpan profil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-emerald-600" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6 pb-16">
      
      <div className="pb-5 border-b border-slate-200">
        <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Pengaturan Profil</h1>
        <p className="text-slate-500 text-sm mt-1.5">Lengkapi identitas diri Anda agar dikenali oleh sistem dan guru.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={16} className="text-slate-400" /></div>
              <input type="text" name="nama" value={formData.nama} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kelas Anda</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><GraduationCap size={16} className="text-slate-400" /></div>
                <input type="text" name="kelas" value={formData.kelas} onChange={handleChange} placeholder="Contoh: Kelas 8A" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">NPSN Sekolah</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building size={16} className="text-slate-400" /></div>
                <input type="text" name="npsn" value={formData.npsn} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:border-emerald-500 outline-none transition-all" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email (Read-Only)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={16} className="text-slate-400" /></div>
              <input type="email" value={formData.email} disabled className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed" />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 w-full md:w-auto">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Profil
            </button>
          </div>
        </form>
      </div>

    </motion.div>
  );
}