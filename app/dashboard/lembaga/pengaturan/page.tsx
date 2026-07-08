"use client";

import { motion } from "framer-motion";
import { Building, Mail, User, Phone, Save, ShieldCheck, Loader2 } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function PengaturanLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    instansi: "",
    noTelp: ""
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
            instansi: data.instansi || data.namaInstansi || "",
            noTelp: data.noTelp || ""
          });
        }
        setIsLoading(false);
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
        instansi: formData.instansi,
        namaInstansi: formData.instansi, // Simpan di kedua field untuk keamanan kompatibilitas
        noTelp: formData.noTelp
      });
      alert("Profil Lembaga berhasil diperbarui!");
    } catch (error) {
      console.error("Gagal menyimpan:", error);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6 pb-16">
      
      <div className="pb-5 border-b border-slate-200">
        <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Pengaturan Profil</h1>
        <p className="text-slate-500 text-sm mt-1.5">
          Kelola informasi identitas lembaga dan narahubung yang bertanggung jawab.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <Building className="text-purple-600" size={20} />
          <h2 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>Identitas Lembaga</h2>
        </div>
        
        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lembaga / Sekolah</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building size={16} className="text-slate-400" /></div>
                <input 
                  type="text" name="instansi" value={formData.instansi} onChange={handleChange} required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Terdaftar (Read-Only)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={16} className="text-slate-400" /></div>
                <input 
                  type="email" name="email" value={formData.email} disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Penanggung Jawab</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={16} className="text-slate-400" /></div>
                <input 
                  type="text" name="nama" value={formData.nama} onChange={handleChange} required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nomor Telepon / WhatsApp</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone size={16} className="text-slate-400" /></div>
                <input 
                  type="text" name="noTelp" value={formData.noTelp} onChange={handleChange} placeholder="Mulai dengan 628..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                />
              </div>
            </div>
            
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex items-start gap-4">
        <ShieldCheck className="text-blue-600 shrink-0 mt-1" size={24} />
        <div>
          <h3 className="text-sm font-bold text-blue-900 mb-1">Keamanan Sistem Terjamin</h3>
          <p className="text-xs text-blue-700 leading-relaxed">
            Perubahan nama instansi secara otomatis akan diperbarui pada seluruh laporan dan sertifikat di dalam sistem. Data kredensial (Kata Sandi) hanya dapat diubah melalui fitur Lupa Password di halaman Login.
          </p>
        </div>
      </div>

    </motion.div>
  );
}