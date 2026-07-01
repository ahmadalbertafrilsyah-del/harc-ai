"use client";

import { motion } from "framer-motion";
import { Settings, Save, ShieldCheck, Bell, Database, Loader2, KeyRound, Globe, Phone, Mail } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE
import { db } from "@/lib/firebase"; 
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function PengaturanGlobalAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // State Pengaturan Global (Termasuk Kontak Admin)
  const [pengaturan, setPengaturan] = useState({
    maintenanceMode: false,
    bukaPendaftaran: true,
    notifPengajuanBaru: true,
    notifLimitToken: true,
    strictModeAI: true,
    adminWhatsApp: "6281234567890",
    adminEmail: "admin@syntax.web.id"
  });

  useEffect(() => {
    const docRef = doc(db, "sistem_stats", "pengaturan_global");
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        // Gabungkan data default dengan data dari Firebase
        setPengaturan((prev) => ({ ...prev, ...docSnap.data() }));
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const handleToggle = (kunci: keyof typeof pengaturan) => {
    setPengaturan((prev) => ({
      ...prev,
      [kunci]: !prev[kunci as keyof typeof prev]
    }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPengaturan((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSimpanPengaturan = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "sistem_stats", "pengaturan_global");
      await setDoc(docRef, pengaturan, { merge: true });
      alert("Pengaturan & Kontak Admin berhasil diperbarui ke database!");
    } catch (error) {
      console.error("Gagal menyimpan pengaturan:", error);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  const ToggleSwitch = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-11 h-6 rounded-full transition-colors relative shadow-inner flex-shrink-0 ${active ? 'bg-indigo-600' : 'bg-slate-300'}`}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${active ? 'translate-x-6' : 'translate-x-1'}`}></div>
    </button>
  );

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Memuat Konfigurasi...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto space-y-6 pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Pengaturan Global Sistem</h1>
          <p className="text-slate-500 text-sm mt-1">Konfigurasi keamanan, pendaftaran, dan data kontak terpusat.</p>
        </div>
        <button onClick={handleSimpanPengaturan} disabled={isSaving} className="bg-indigo-900 hover:bg-indigo-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-900/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* PANEL 1: Kontak & Profil Admin */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200/80 md:col-span-2">
          <h2 className={`text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 ${teachersFont.className}`}>
            <ShieldCheck size={20} className="text-blue-600" /> Profil & Kontak Routing Admin
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nomor WhatsApp Validasi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-slate-400" /></div>
                <input 
                  type="text" 
                  name="adminWhatsApp" 
                  value={pengaturan.adminWhatsApp} 
                  onChange={handleTextChange} 
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                  placeholder="Gunakan awalan 62 (contoh: 628123...)"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Nomor ini akan menerima pesan otomatis dari guru yang mendaftar di halaman Login. Wajib gunakan format internasional (62).</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Administrator Utama</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400" /></div>
                <input 
                  type="email" 
                  name="adminEmail" 
                  value={pengaturan.adminEmail} 
                  onChange={handleTextChange} 
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Digunakan untuk menerima notifikasi server dan permohonan pemulihan kata sandi.</p>
            </div>
          </div>
        </div>

        {/* PANEL 2: Akses & Keamanan */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200/80">
          <h2 className={`text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 ${teachersFont.className}`}>
            <Globe size={20} className="text-indigo-600" /> Kendali Akses & Platform
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700 text-sm">Mode Pemeliharaan (Maintenance)</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Kunci sistem sementara. Guru & Siswa tidak akan bisa masuk ke dasbor.</p>
              </div>
              <ToggleSwitch active={pengaturan.maintenanceMode} onToggle={() => handleToggle('maintenanceMode')} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700 text-sm">Buka Pengajuan Akun Pendidik</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Jika dimatikan, tombol pendaftaran di halaman login akan langsung hilang.</p>
              </div>
              <ToggleSwitch active={pengaturan.bukaPendaftaran} onToggle={() => handleToggle('bukaPendaftaran')} />
            </div>
          </div>
        </div>

        {/* PANEL 3: Notifikasi Admin */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200/80">
          <h2 className={`text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4 ${teachersFont.className}`}>
            <Bell size={20} className="text-amber-500" /> Notifikasi Sistem
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700 text-sm">Laporan Pendaftaran Pendidik</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Kirim alert ke Email Admin ketika ada guru baru yang mengajukan akun.</p>
              </div>
              <ToggleSwitch active={pengaturan.notifPengajuanBaru} onToggle={() => handleToggle('notifPengajuanBaru')} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700 text-sm">Peringatan Kuota Token API</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Beri notifikasi mendesak jika penggunaan token melampaui 85% batas bulanan.</p>
              </div>
              <ToggleSwitch active={pengaturan.notifLimitToken} onToggle={() => handleToggle('notifLimitToken')} />
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}