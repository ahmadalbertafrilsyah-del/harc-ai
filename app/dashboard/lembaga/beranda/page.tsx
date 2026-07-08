"use client";

import { motion } from "framer-motion";
import { Users, GraduationCap, BookOpen, Activity, Loader2, ArrowRight } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import Link from "next/link";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function LembagaBeranda() {
  const [isLoading, setIsLoading] = useState(true);
  const [namaInstansi, setNamaInstansi] = useState("");
  
  const [stats, setStats] = useState({
    totalGuru: 0,
    totalSiswa: 0,
    totalModul: 0
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Ambil data instansi Lembaga saat ini
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const instansi = docSnap.data().instansi || docSnap.data().namaInstansi;
            setNamaInstansi(instansi);

            if (instansi) {
              // 1. Hitung Total Guru di instansi ini
              const qGuru = query(collection(db, "users"), where("role", "==", "guru"), where("instansi", "==", instansi));
              const unsubGuru = onSnapshot(qGuru, (snap) => {
                setStats(prev => ({ ...prev, totalGuru: snap.size }));
              });

              // 2. Hitung Total Siswa di instansi ini
              const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("instansi", "==", instansi));
              const unsubSiswa = onSnapshot(qSiswa, (snap) => {
                setStats(prev => ({ ...prev, totalSiswa: snap.size }));
              });

              // 3. Hitung Total Bahan Ajar dari instansi ini
              const qModul = query(collection(db, "modul_ajar"), where("namaSekolah", "==", instansi));
              const unsubModul = onSnapshot(qModul, (snap) => {
                setStats(prev => ({ ...prev, totalModul: snap.size }));
                setIsLoading(false);
              });

              return () => { unsubGuru(); unsubSiswa(); unsubModul(); };
            } else {
              setIsLoading(false);
            }
          }
        });
        return () => unsubProfil();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-purple-500">
        <Loader2 size={40} className="animate-spin text-purple-600 mb-4" />
        <p className="font-bold text-lg text-slate-700 uppercase tracking-widest">Memuat Dasbor...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#2e1065] to-purple-900 rounded-3xl p-8 md:p-10 text-white shadow-lg shadow-purple-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${teachersFont.className}`}>
            Dasbor Utama {namaInstansi || "Lembaga"}
          </h1>
          <p className="text-purple-200 max-w-xl text-sm md:text-base leading-relaxed">
            Pantau aktivitas pendidik, sebaran siswa, dan kualitas bahan ajar secara terpusat untuk memastikan ekosistem belajar yang optimal.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-300 transition-all group flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Pendidik</span>
          </div>
          <h3 className={`text-4xl font-black text-slate-800 mb-1 ${teachersFont.className}`}>{stats.totalGuru}</h3>
          <p className="text-xs text-slate-500 font-medium mb-4">Guru terdaftar di institusi ini</p>
          <Link href="/dashboard/lembaga/guru" className="mt-auto flex items-center text-xs font-bold text-purple-600 hover:text-purple-800 gap-1 pt-4 border-t border-slate-100">
            Kelola Guru <ArrowRight size={14}/>
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><GraduationCap size={24} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Siswa</span>
          </div>
          <h3 className={`text-4xl font-black text-slate-800 mb-1 ${teachersFont.className}`}>{stats.totalSiswa}</h3>
          <p className="text-xs text-slate-500 font-medium mb-4">Siswa aktif di berbagai kelas</p>
          <Link href="/dashboard/lembaga/siswa" className="mt-auto flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 gap-1 pt-4 border-t border-slate-100">
            Kelola Siswa <ArrowRight size={14}/>
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-all group flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><BookOpen size={24} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Dokumen</span>
          </div>
          <h3 className={`text-4xl font-black text-slate-800 mb-1 ${teachersFont.className}`}>{stats.totalModul}</h3>
          <p className="text-xs text-slate-500 font-medium mb-4">Bahan ajar & soal digenerate</p>
          <Link href="/dashboard/lembaga/bahan-ajar" className="mt-auto flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-800 gap-1 pt-4 border-t border-slate-100">
            Tinjau Dokumen <ArrowRight size={14}/>
          </Link>
        </div>
      </div>

    </motion.div>
  );
}