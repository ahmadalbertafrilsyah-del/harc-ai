"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Award, BookOpen, Edit, Loader2, Camera, AlertCircle } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// Pastikan import ini sudah mengarah ke file konfigurasi Firebase Anda
import { db } from "@/lib/firebase"; 
import { doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ProfilGuru() {
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk menampung data dari database
  const [profilData, setProfilData] = useState<any>(null);
  const [aktivitas, setAktivitas] = useState<any[]>([]);

  useEffect(() => {
    // 1. Ambil data profil dari dokumen guru
    const unsubProfil = onSnapshot(doc(db, "users", "guru_ahmad"), (docSnap) => {
      if (docSnap.exists()) {
        setProfilData(docSnap.data());
      } else {
        console.warn("Dokumen profil guru_ahmad tidak ditemukan di database!");
      }
    });

    // 2. Ambil riwayat aktivitas
    const qAktivitas = query(collection(db, "aktivitas_guru"), orderBy("timestamp", "desc"), limit(5));
    const unsubAktivitas = onSnapshot(qAktivitas, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAktivitas(data);
      
      // Matikan loading hanya setelah pengecekan aktivitas selesai
      setIsLoading(false);
    });

    return () => {
      unsubProfil();
      unsubAktivitas();
    };
  }, []);

  const handleEditProfil = () => {
    alert("Membuka modal Edit Profil. Data yang disimpan akan langsung meng-update Firestore.");
  };

  const handleUploadFoto = () => {
    alert("Memicu widget upload Cloudinary. Setelah sukses, URL gambar baru akan disimpan ke profil Firestore.");
  };

  // PENGAMAN 1: Tampilkan Loading saat data masih diproses
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Memuat Data Profil...</p>
        <p className="text-sm">Menyinkronkan identitas dari server pusat</p>
      </div>
    );
  }

  // PENGAMAN 2: Tangani kasus jika dokumen 'guru_ahmad' belum dibuat di Firebase
  if (!profilData) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500 text-center px-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <p className="font-bold text-lg text-slate-800">Data Profil Tidak Ditemukan</p>
        <p className="text-sm mt-2 max-w-md">
          Sistem tidak dapat menemukan dokumen <b>guru_ahmad</b> di koleksi <b>users</b> pada Firebase Firestore. 
          Silakan buat dokumen tersebut secara manual di Firebase Console untuk melanjutkan.
        </p>
      </div>
    );
  }

  // JIKA DATA ADA, TAMPILKAN UI UTAMA
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto space-y-6 pb-10">
      
      {/* Header Halaman */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Profil Pendidik</h1>
          <p className="text-slate-500 text-sm mt-1">Informasi personal dan rekam jejak mengajar yang terintegrasi sistem.</p>
        </div>
        <button 
          onClick={handleEditProfil}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
        >
          <Edit size={16} /> Edit Profil
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Kartu Identitas Utama */}
        <div className="md:w-1/3 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 text-center flex flex-col items-center">
            
            {/* Foto Profil Dinamis dari Cloudinary dengan Optional Chaining (?) */}
            <div className="relative mb-4 group cursor-pointer" onClick={handleUploadFoto}>
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100">
                {profilData?.fotoUrl ? (
                  <img src={profilData.fotoUrl} alt={profilData?.nama || "Pendidik"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400 bg-slate-100 uppercase">
                    {profilData?.nama ? profilData.nama.charAt(0) : "U"}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={24} className="text-white" />
              </div>
            </div>

            <h2 className={`text-xl font-bold text-slate-800 ${teachersFont.className}`}>
              {profilData?.nama || "Nama Tidak Terdaftar"}
            </h2>
            <p className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2">
              {profilData?.peran || "Pendidik"}
            </p>
            
            <div className="w-full mt-6 space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-slate-400 shrink-0" /> 
                <span className="truncate" title={profilData?.email}>{profilData?.email || "Belum ada email"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-slate-400 shrink-0" /> 
                {profilData?.telepon || "-"}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin size={16} className="text-slate-400 shrink-0" /> 
                {profilData?.lokasi || "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Informasi Tambahan & Riwayat */}
        <div className="md:w-2/3 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80">
            <h3 className={`text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 ${teachersFont.className}`}>
              <Award size={20} className="text-amber-500" /> Spesialisasi & Kompetensi
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mata Pelajaran</p>
                <p className="text-sm font-bold text-slate-700 mt-1">{profilData?.spesialisasi || "-"}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fokus Sistem</p>
                <p className="text-sm font-bold text-slate-700 mt-1">{profilData?.fokus || "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80">
            <h3 className={`text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 ${teachersFont.className}`}>
              <BookOpen size={20} className="text-blue-500" /> Aktivitas Terbaru
            </h3>
            <div className="space-y-4">
              {aktivitas.length > 0 ? (
                aktivitas.map((akt) => (
                  <div key={akt.id} className="flex gap-4 items-start relative pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className={`w-2 h-2 bg-${akt.warna || 'blue'}-500 rounded-full mt-1.5 shrink-0`}></div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{akt.deskripsi}</p>
                      <p className="text-xs text-slate-500 mt-1">{akt.waktu}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">Belum ada log aktivitas terekam.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}