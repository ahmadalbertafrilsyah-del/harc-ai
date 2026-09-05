"use client";

import { motion } from "framer-motion";
import { Settings, Save, ShieldCheck, Bell, Database, Loader2, KeyRound, Globe, Phone, Mail, ChevronDown } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE
import { db } from "@/lib/firebase"; 
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function PengaturanGlobalAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pengaturan, setPengaturan] = useState({
    maintenanceMode: false,
    bukaPendaftaran: true,
    notifPengajuanBaru: true,
    notifLimitToken: true,
    strictModeAI: true,
    adminWhatsApp: "6281234567890",
    adminEmail: "admin@syntax.web.id",
    metodeVerifikasi: "manual"
  });

  useEffect(() => {
    const docRef = doc(db, "sistem_stats", "pengaturan_global");
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPengaturan((prev) => ({ 
          ...prev, 
          ...data,
          metodeVerifikasi: data.metodeVerifikasi || "manual" 
        }));
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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    <button onClick={onToggle} className={`w-11 h-6 rounded-full transition-colors relative shadow-inner shrink-0 ${active ? 'bg-indigo-600' : 'bg-slate-300'}`} aria-label="Toggle Switch">
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${active ? 'translate-x-6' : 'translate-x-1'}`}></div>
    </button>
  );

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500" role="status">
        <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-bold text-slate-700">Memuat Konfigurasi...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto space-y-5 pb-6">
      
      {/* HEADER DESKTOP */}
      <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Pengaturan Global Sistem</h1>
          <p className="text-slate-500 text-sm mt-1">Konfigurasi keamanan, pendaftaran, dan data kontak terpusat.</p>
        </div>
        <button onClick={handleSimpanPengaturan} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shrink-0">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
        </button>
      </header>

      {/* HEADER MOBILE (App-Like Card) */}
      <div className="md:hidden bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">System Control</span>
        <h2 className={`text-xl font-bold mt-1 ${teachersFont.className}`}>Pengaturan Global</h2>
        <p className="text-xs text-indigo-100 mt-1">Konfigurasi keamanan, akses, dan kontak sistem.</p>
      </div>

      {/* TOMBOL SIMPAN MOBILE */}
      <div className="md:hidden">
        <button onClick={handleSimpanPengaturan} disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* PANEL 1: Kontak & Profil Admin */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><ShieldCheck size={18} /></div>
            <div>
              <h2 className={`text-base font-bold text-slate-800 ${teachersFont.className}`}>Profil & Kontak Routing Admin</h2>
              <p className="text-xs text-slate-400">Atur nomor WhatsApp dan email utama pusat.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor WhatsApp Validasi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-slate-400" /></div>
                <input 
                  type="text" 
                  name="adminWhatsApp" 
                  value={pengaturan.adminWhatsApp} 
                  onChange={handleTextChange} 
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 text-xs md:text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium" 
                  placeholder="628123..."
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Gunakan format internasional (awalan 62).</p>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Administrator Utama</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400" /></div>
                <input 
                  type="email" 
                  name="adminEmail" 
                  value={pengaturan.adminEmail} 
                  onChange={handleTextChange} 
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 text-xs md:text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium" 
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Untuk notifikasi server dan pemulihan sandi.</p>
            </div>
          </div>
        </div>

        {/* PANEL 2: Akses & Keamanan */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Globe size={18} /></div>
            <div>
              <h2 className={`text-base font-bold text-slate-800 ${teachersFont.className}`}>Kendali Akses & Pendaftaran</h2>
              <p className="text-xs text-slate-400">Atur ketersediaan sistem dan pendaftaran akun.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-800 text-xs md:text-sm">Mode Pemeliharaan</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Kunci sistem sementara bagi non-admin.</p>
              </div>
              <div className="mt-0.5"><ToggleSwitch active={pengaturan.maintenanceMode} onToggle={() => handleToggle('maintenanceMode')} /></div>
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-800 text-xs md:text-sm">Buka Pengajuan Akun Baru</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Sembunyikan atau tampilkan tombol daftar di login.</p>
              </div>
              <div className="mt-0.5"><ToggleSwitch active={pengaturan.bukaPendaftaran} onToggle={() => handleToggle('bukaPendaftaran')} /></div>
            </div>

            {pengaturan.bukaPendaftaran && (
              <div className="pt-3 mt-3 border-t border-slate-100">
                <label className="block font-bold text-slate-800 text-xs md:text-sm mb-1">Metode Verifikasi Akun Baru</label>
                <div className="relative mt-1.5">
                  <select 
                    name="metodeVerifikasi" 
                    value={pengaturan.metodeVerifikasi} 
                    onChange={handleTextChange}
                    className="w-full pl-3 pr-8 py-2.5 bg-indigo-50/50 border border-indigo-100 text-indigo-900 font-bold rounded-xl outline-none text-xs md:text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 appearance-none cursor-pointer"
                  >
                    <option value="manual">Manual (ACC Admin via Dashboard)</option>
                    <option value="otp_email">Otomatis (Kode OTP 6 Angka via Email)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-indigo-500" />
                  </div>
                </div>

                {pengaturan.metodeVerifikasi === 'otp_email' && (
                  <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <KeyRound size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-emerald-800 leading-relaxed">Sistem mengirimkan PIN 6 angka ke email pendaftar secara otomatis.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PANEL 3: Notifikasi Admin */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Bell size={18} /></div>
            <div>
              <h2 className={`text-base font-bold text-slate-800 ${teachersFont.className}`}>Notifikasi Sistem</h2>
              <p className="text-xs text-slate-400">Atur pemberitahuan penting untuk administrator.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-800 text-xs md:text-sm">Laporan Pengajuan Akun</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Kirim alert email saat ada pendaftar baru.</p>
              </div>
              <div className="mt-0.5"><ToggleSwitch active={pengaturan.notifPengajuanBaru} onToggle={() => handleToggle('notifPengajuanBaru')} /></div>
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-800 text-xs md:text-sm">Peringatan Kuota Token</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Alert mendesak jika token LLM melewati 85%.</p>
              </div>
              <div className="mt-0.5"><ToggleSwitch active={pengaturan.notifLimitToken} onToggle={() => handleToggle('notifLimitToken')} /></div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}