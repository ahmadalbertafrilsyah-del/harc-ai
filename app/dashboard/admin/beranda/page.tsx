"use client";

import { motion } from "framer-motion";
import { Users, Server, BrainCircuit, Activity, AlertTriangle, CheckCircle2, Loader2, Database, ShieldCheck, AlertCircle } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import Link from "next/link";

// IMPORT FIREBASE SEBENARNYA
import { db } from "@/lib/firebase"; 
import { doc, collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function BerandaAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk metrik sistem
  const [systemStats, setSystemStats] = useState({
    totalGuru: 0,
    totalSiswa: 0,
    totalModul: 0,
    aiTokens: 0,
  });
  
  const [aktivitasTerbaru, setAktivitasTerbaru] = useState<any[]>([]);

  useEffect(() => {
    // 1. MENGHITUNG TOTAL GURU SECARA LIVE (Dari koleksi 'users')
    const qGuru = query(collection(db, "users"), where("role", "==", "guru"));
    const unsubGuru = onSnapshot(qGuru, (snapshot) => {
      setSystemStats(prev => ({ ...prev, totalGuru: snapshot.size }));
    });

    // 2. MENGHITUNG TOTAL SISWA SECARA LIVE (Dari koleksi 'users')
    const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"));
    const unsubSiswa = onSnapshot(qSiswa, (snapshot) => {
      setSystemStats(prev => ({ ...prev, totalSiswa: snapshot.size }));
    });

    // 3. MENARIK METRIK AI & MODUL (Dari dokumen 'main_metrics')
    const unsubStats = onSnapshot(doc(db, "sistem_stats", "main_metrics"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSystemStats(prev => ({ 
          ...prev, 
          totalModul: data.totalModul || 0,
          aiTokens: data.aiTokens || 0 
        }));
      }
    });

    // 4. MENARIK LOG AKTIVITAS (Maksimal 5 terbaru)
    const qLog = query(collection(db, "log_sistem"), orderBy("timestamp", "desc"), limit(5));
    const unsubLog = onSnapshot(qLog, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAktivitasTerbaru(logs);
      
      setIsLoading(false); // Matikan loading setelah semua inisialisasi berjalan
    });

    // Bersihkan listener saat pindah halaman
    return () => {
      unsubGuru();
      unsubSiswa();
      unsubStats();
      unsubLog();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Mengakses Server Utama...</p>
        <p className="text-sm">Menarik metrik kesehatan sistem dari Firebase</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Ikhtisar Sistem</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Terhubung langsung ke Database.
          </p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-2">
          <Server size={14} /> Sinkronisasi Real-time Aktif
        </div>
      </div>

      {/* Baris 1: Kartu Metrik Kesehatan Sistem */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Pendidik</p>
              <h3 className={`text-3xl font-bold text-slate-800 ${teachersFont.className}`}>{systemStats.totalGuru}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md"><Users size={20} /></div>
          </div>
          <div className="text-xs text-slate-500 font-medium">Akun aktif terdaftar</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Peserta Didik</p>
              <h3 className={`text-3xl font-bold text-slate-800 ${teachersFont.className}`}>{systemStats.totalSiswa}</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md"><Users size={20} /></div>
          </div>
          <div className="text-xs text-slate-500 font-medium">Akun siswa terdaftar</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modul Ter-Generate</p>
              <h3 className={`text-3xl font-bold text-slate-800 ${teachersFont.className}`}>{systemStats.totalModul}</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-md"><Database size={20} /></div>
          </div>
          <div className="text-xs text-slate-500 font-medium">Oleh engine AI</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden ring-1 ring-indigo-50">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex justify-between items-start mb-4 pl-2">
            <div>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Token AI Terpakai</p>
              <h3 className={`text-2xl font-bold text-slate-800 ${teachersFont.className}`}>
                {systemStats.aiTokens >= 1000000 
                  ? `${(systemStats.aiTokens / 1000000).toFixed(1)}M` 
                  : systemStats.aiTokens.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md"><BrainCircuit size={20} /></div>
          </div>
          <div className="text-xs text-slate-500 font-medium pl-2">Kapasitas API aktif</div>
        </div>
      </div>

      {/* Baris 2: Log Sistem & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Log Sistem Keamanan & Aktivitas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <Activity size={18} className="text-indigo-600" /> Log Sistem Utama
            </h3>
          </div>
          <div className="p-2">
            {aktivitasTerbaru.length > 0 ? (
              aktivitasTerbaru.map((log: any) => (
                <div key={log.id} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex items-start gap-3">
                  <div className="mt-0.5">
                    {log.status === "sukses" ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{log.aksi}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{log.entitas}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <AlertCircle size={32} className="mb-2 text-slate-300" />
                <p className="text-sm font-medium">Belum ada log terekam.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (Aksi Cepat Admin) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <ShieldCheck size={18} className="text-indigo-600" /> Panel Kendali Cepat
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <Link href="/dashboard/admin/pengguna" className="block h-full">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer h-full">
                <Users size={24} className="text-indigo-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">Manajemen Pengguna</h4>
                <p className="text-xs text-slate-500">ACC pendaftaran pendidik dan kelola akses.</p>
              </div>
            </Link>

            <Link href="/dashboard/admin/korpus" className="block h-full">
              <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer h-full">
                <Database size={24} className="text-emerald-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">Update Korpus Budaya</h4>
                <p className="text-xs text-slate-500">Sinkronkan database bahasa daerah ke engine AI.</p>
              </div>
            </Link>

          </div>
        </div>

      </div>
    </motion.div>
  );
}