"use client";

import { motion } from "framer-motion";
import { BookOpen, Target, Sparkles, Flame, Loader2, ArrowRight, Activity } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import Link from "next/link";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function BerandaSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [profil, setProfil] = useState<any>({});
  const [jumlahKelas, setJumlahKelas] = useState(0);
  const [tugasAktif, setTugasAktif] = useState(0);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Fetch Profil Siswa Real-time
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) setProfil(docSnap.data());
        });

        // 2. Fetch Jumlah Kelas yang Diikuti (Dimana UID siswa ada di array 'peserta')
        const qKelas = query(collection(db, "manajemen_kelas"), where("peserta", "array-contains", user.uid));
        const unsubKelas = onSnapshot(qKelas, (snap) => {
          setJumlahKelas(snap.size);
          setIsLoading(false);
          // Di aplikasi nyata, Anda bisa meloop kelas ini untuk mencari tugas aktif dari bank_soal
        });

        return () => { unsubProfil(); unsubKelas(); };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-emerald-600" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6 md:space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-[#064e3b] to-emerald-900 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-emerald-200 text-sm md:text-base font-medium mb-1">Selamat datang kembali,</p>
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${teachersFont.className}`}>
              {profil.nama || "Pelajar Hebat"}! 🚀
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-lg leading-relaxed">
              Siap untuk menaklukkan tantangan hari ini? Selesaikan asesmen dan kumpulkan lebih banyak XP untuk menaikkan level belajarmu.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center min-w-[140px]">
            <Sparkles size={28} className="mx-auto text-amber-400 mb-2" />
            <p className="text-xs text-emerald-100 font-medium uppercase tracking-wider">Total XP</p>
            <p className="text-3xl font-black text-amber-400">{profil.xpPoints || 0}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><BookOpen size={24}/></div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kelas Diikuti</p>
            <p className={`text-2xl font-black text-slate-800 ${teachersFont.className}`}>{jumlahKelas}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Target size={24}/></div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tugas Aktif</p>
            <p className={`text-2xl font-black text-slate-800 ${teachersFont.className}`}>{tugasAktif}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><Flame size={24}/></div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Rata-rata Nilai</p>
            <p className={`text-2xl font-black text-slate-800 ${teachersFont.className}`}>--</p>
          </div>
        </div>
      </div>

      {/* Navigasi Cepat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link href="/dashboard/siswa/ruang-kelas" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-2"><BookOpen size={20} className="text-emerald-600"/> Ruang Kelas</h3>
          <p className="text-sm text-slate-500 mb-4">Masuk ke kelas baru menggunakan kode dari guru atau lihat materi pelajaran.</p>
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all">Lihat Kelas <ArrowRight size={14}/></span>
        </Link>
        <Link href="/dashboard/siswa/asesmen-dinamis" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-2"><Activity size={20} className="text-blue-600"/> Asesmen & Ujian</h3>
          <p className="text-sm text-slate-500 mb-4">Kerjakan tugas, ulangan, dan ujian CBT yang didukung oleh kecerdasan buatan.</p>
          <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">Mulai Ujian <ArrowRight size={14}/></span>
        </Link>
      </div>

    </motion.div>
  );
}