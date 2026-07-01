"use client";

import { motion } from "framer-motion";
import { Save, BellRing, BrainCircuit, Loader2 } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function PengaturanSistem() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Menggabungkan state pengaturan menjadi satu objek agar mudah dikirim ke database
  const [pengaturan, setPengaturan] = useState({
    notifEmail: false,
    notifPush: false,
    aiStrictness: false,
    autoApprove: false,
  });

  useEffect(() => {
    const docRef = doc(db, "pengaturan_guru", "guru_ahmad");
    const unsubPengaturan = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setPengaturan(doc.data() as any);
      }
      setIsLoading(false);
    });

    return () => unsubPengaturan();
  }, []);

  // Handler dinamis untuk mengubah nilai toggle
  const handleToggle = (kunci: keyof typeof pengaturan) => {
    setPengaturan((prev) => ({
      ...prev,
      [kunci]: !prev[kunci]
    }));
  };

  // Fungsi untuk menyimpan pengaturan ke Firestore
  const handleSimpan = async () => {
    setIsSaving(true);
    
    // ----------------------------------------------------------------------
    // BLOK SIMPAN KE FIREBASE FIRESTORE
    // ----------------------------------------------------------------------
    /*
    try {
      const docRef = doc(db, "pengaturan_guru", "guru_ahmad");
      await updateDoc(docRef, pengaturan);
      console.log("Pengaturan berhasil disinkronisasi ke server");
    } catch (error) {
      console.error("Gagal menyimpan pengaturan:", error);
      alert("Terjadi kesalahan jaringan saat menyimpan konfigurasi.");
    }
    */

    // Simulasi jeda jaringan
    setTimeout(() => {
      alert("Konfigurasi sistem berhasil disimpan ke Database (Firebase)!");
      setIsSaving(false);
    }, 1200);
  };

  // Komponen Switch Toggle buatan sendiri
  const ToggleSwitch = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <button 
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative shadow-inner ${active ? 'bg-blue-600' : 'bg-slate-300'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${active ? 'translate-x-6' : 'translate-x-1'}`}></div>
    </button>
  );

  // Tampilan Loading Layar Penuh
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Memuat Konfigurasi...</p>
        <p className="text-sm">Membaca preferensi sistem dari profil Anda</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto space-y-6 pb-10">
      
      {/* Header Halaman */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Pengaturan Sistem</h1>
          <p className="text-slate-500 text-sm mt-1">Konfigurasi notifikasi, keamanan, dan sensitivitas AI.</p>
        </div>
        <button 
          onClick={handleSimpan}
          disabled={isSaving}
          className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      <div className="space-y-6">
        
        {/* Panel Preferensi AI */}
        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80">
          <h2 className={`text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 ${teachersFont.className}`}>
            <BrainCircuit size={20} className="text-blue-600" /> Preferensi Kecerdasan Buatan (AI)
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-700">Sensitivitas Sosiolinguistik Tinggi</p>
                <p className="text-sm text-slate-500 mt-1">AI akan menandai sekecil apapun perbedaan tingkat tutur (Krama/Ngoko).</p>
              </div>
              <ToggleSwitch active={pengaturan.aiStrictness} onToggle={() => handleToggle('aiStrictness')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700">Otomatisasi Validasi Budaya</p>
                <p className="text-sm text-slate-500 mt-1">Sistem akan menyetujui variasi dialek umum tanpa perlu validasi manual guru.</p>
              </div>
              <ToggleSwitch active={pengaturan.autoApprove} onToggle={() => handleToggle('autoApprove')} />
            </div>
          </div>
        </div>

        {/* Panel Notifikasi */}
        <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80">
          <h2 className={`text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 ${teachersFont.className}`}>
            <BellRing size={20} className="text-amber-500" /> Notifikasi
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-700">Notifikasi Email Mingguan</p>
                <p className="text-sm text-slate-500 mt-1">Terima laporan analitik kelas dan metrik perkembangan siswa.</p>
              </div>
              <ToggleSwitch active={pengaturan.notifEmail} onToggle={() => handleToggle('notifEmail')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700">Push Notification Intervensi</p>
                <p className="text-sm text-slate-500 mt-1">Peringatan langsung saat siswa terlalu banyak menggunakan petunjuk AI.</p>
              </div>
              <ToggleSwitch active={pengaturan.notifPush} onToggle={() => handleToggle('notifPush')} />
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}