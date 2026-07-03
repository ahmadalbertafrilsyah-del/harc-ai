"use client";

import { motion } from "framer-motion";
import { 
  Users, Server, BrainCircuit, Activity, AlertTriangle, 
  CheckCircle2, Loader2, Database, ShieldCheck, AlertCircle, 
  BellRing, ArrowRight, Zap, Clock 
} from "lucide-react";
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
  const [pengajuanPending, setPengajuanPending] = useState(0);
  const [statusEngine, setStatusEngine] = useState("Online");

  useEffect(() => {
    // 1. MENGHITUNG TOTAL GURU SECARA LIVE
    const qGuru = query(collection(db, "users"), where("role", "==", "guru"));
    const unsubGuru = onSnapshot(qGuru, (snapshot) => {
      setSystemStats(prev => ({ ...prev, totalGuru: snapshot.size }));
    });

    // 2. MENGHITUNG TOTAL SISWA SECARA LIVE
    const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"));
    const unsubSiswa = onSnapshot(qSiswa, (snapshot) => {
      setSystemStats(prev => ({ ...prev, totalSiswa: snapshot.size }));
    });

    // 3. MENGHITUNG PENGAJUAN AKUN PENDING
    const qPending = query(collection(db, "pengajuan_akun"), where("status", "==", "pending"));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setPengajuanPending(snapshot.size);
    });

    // 4. MENARIK METRIK TOTAL MODUL (Dari laci sistem_stats)
    const unsubStats = onSnapshot(doc(db, "sistem_stats", "main_metrics"), (docSnap) => {
      if (docSnap.exists()) {
        setSystemStats(prev => ({ ...prev, totalModul: docSnap.data().totalModul || 0 }));
      }
    });

    // 5. MENARIK METRIK TOKEN AI & STATUS (DARI LACI BARU: ai_monitoring)
    const unsubToken = onSnapshot(doc(db, "ai_monitoring", "token_stats"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSystemStats(prev => ({ ...prev, aiTokens: data.tokenTerpakai || 0 }));
        if (data.statusEngine) setStatusEngine(data.statusEngine);
      }
    });

    // 6. MENARIK LOG AKTIVITAS (Maksimal 5 terbaru)
    const qLog = query(collection(db, "log_sistem"), orderBy("timestamp", "desc"), limit(5));
    const unsubLog = onSnapshot(qLog, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAktivitasTerbaru(logs);
      
      setIsLoading(false); 
    });

    return () => {
      unsubGuru();
      unsubSiswa();
      unsubPending();
      unsubStats();
      unsubToken();
      unsubLog();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Mengakses Server Utama...</p>
        <p className="text-sm">Menarik metrik kesehatan sistem dari Database</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-10">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Ikhtisar Sistem</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Terhubung langsung ke Database.
          </p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-2 w-fit">
          <Server size={14} /> Sinkronisasi Real-time Aktif
        </div>
      </div>

      {/* Banner Notifikasi Cerdas */}
      {pengajuanPending > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-0.5">
              <BellRing size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Tindakan Diperlukan: Pengajuan Pendidik Baru</h3>
              <p className="text-xs text-amber-700 mt-1">Terdapat <strong className="text-amber-900 text-sm bg-amber-200/50 px-1.5 rounded">{pengajuanPending}</strong> pendidik yang menunggu persetujuan (ACC) untuk mengakses sistem.</p>
            </div>
          </div>
          <Link href="/dashboard/admin/pengguna" className="shrink-0">
            <button className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
              Tinjau Sekarang <ArrowRight size={14} />
            </button>
          </Link>
        </motion.div>
      )}

      {/* Baris 1: Kartu Metrik Kesehatan Sistem */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        
        <div className="bg-white p-3 md:p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2 md:mb-4">
            <div>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Pendidik</p>
              <h3 className={`text-xl md:text-3xl font-bold text-slate-800 ${teachersFont.className}`}>{systemStats.totalGuru}</h3>
            </div>
            <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-md shrink-0"><Users className="w-4 h-4 md:w-5 md:h-5" /></div>
          </div>
          <div className="text-[9px] md:text-xs text-slate-500 font-medium truncate">Akun aktif terdaftar</div>
        </div>

        <div className="bg-white p-3 md:p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2 md:mb-4">
            <div>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peserta Didik</p>
              <h3 className={`text-xl md:text-3xl font-bold text-slate-800 ${teachersFont.className}`}>{systemStats.totalSiswa}</h3>
            </div>
            <div className="p-1.5 md:p-2 bg-emerald-50 text-emerald-600 rounded-md shrink-0"><Users className="w-4 h-4 md:w-5 md:h-5" /></div>
          </div>
          <div className="text-[9px] md:text-xs text-slate-500 font-medium truncate">Akun siswa tersinkron</div>
        </div>

        <div className="bg-white p-3 md:p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2 md:mb-4">
            <div>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Modul</p>
              <h3 className={`text-xl md:text-3xl font-bold text-slate-800 ${teachersFont.className}`}>{systemStats.totalModul}</h3>
            </div>
            <div className="p-1.5 md:p-2 bg-purple-50 text-purple-600 rounded-md shrink-0"><Database className="w-4 h-4 md:w-5 md:h-5" /></div>
          </div>
          <div className="text-[9px] md:text-xs text-slate-500 font-medium truncate">Di-generate AI</div>
        </div>

        <div className="bg-white p-3 md:p-5 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden ring-1 ring-indigo-50">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex justify-between items-start mb-2 md:mb-4 pl-1.5 md:pl-2">
            <div>
              <p className="text-[9px] md:text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Token AI</p>
              <h3 className={`text-lg md:text-2xl font-bold text-slate-800 ${teachersFont.className}`}>
                {systemStats.aiTokens >= 1000000 
                  ? `${(systemStats.aiTokens / 1000000).toFixed(1)}M` 
                  : systemStats.aiTokens.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-1.5 md:p-2 bg-indigo-50 text-indigo-600 rounded-md shrink-0"><BrainCircuit className="w-4 h-4 md:w-5 md:h-5" /></div>
          </div>
          <div className="text-[9px] md:text-xs text-slate-500 font-medium pl-1.5 md:pl-2 truncate">Kapasitas API aktif</div>
        </div>
      </div>

      {/* Baris 2: Log Sistem, Panel Kendali, & Server Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        
        {/* Log Sistem Keamanan */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden lg:col-span-2">
          <div className="px-5 md:px-6 py-4 md:py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className={`text-sm md:text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <Activity size={18} className="text-indigo-600" /> Log Sistem Utama
            </h3>
            <Link href="/dashboard/admin/pengaturan" className="text-[10px] md:text-xs font-bold text-indigo-600 hover:text-indigo-700">Lihat Semua</Link>
          </div>
          <div className="p-2 flex-grow">
            {aktivitasTerbaru.length > 0 ? (
              aktivitasTerbaru.map((log: any) => (
                <div key={log.id} className="p-3 md:p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {log.status === "sukses" ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-700">{log.aksi}</p>
                    <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{log.entitas} • <span className="text-slate-400">{log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'Baru saja'}</span></p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-slate-400">
                <AlertCircle size={28} className="mb-2 text-slate-300" />
                <p className="text-xs md:text-sm font-medium">Belum ada log terekam.</p>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan */}
        <div className="space-y-5 md:space-y-6 flex flex-col">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className={`text-sm md:text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
                <ShieldCheck size={18} className="text-indigo-600" /> Panel Kendali Cepat
              </h3>
            </div>
            <div className="p-4 md:p-5 grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
              <Link href="/dashboard/admin/pengguna" className="block">
                <div className="p-3 md:p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer h-full group">
                  <div className="flex items-center gap-3 mb-1.5 md:mb-2">
                    <Users size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs md:text-sm font-bold text-slate-800 leading-tight">Pengguna</h4>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-slate-500 leading-relaxed hidden md:block">ACC pendaftaran pendidik dan kelola akses.</p>
                </div>
              </Link>
              <Link href="/dashboard/admin/korpus" className="block">
                <div className="p-3 md:p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all cursor-pointer h-full group">
                  <div className="flex items-center gap-3 mb-1.5 md:mb-2">
                    <Database size={20} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs md:text-sm font-bold text-slate-800 leading-tight">Korpus AI</h4>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-slate-500 leading-relaxed hidden md:block">Sinkronkan database dialek bahasa daerah.</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden flex-grow">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className={`text-sm md:text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
                <Activity size={18} className="text-blue-600" /> Kesehatan Layanan
              </h3>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] md:text-xs font-bold text-slate-600 flex items-center gap-1.5"><Database size={12} className="text-slate-400"/> Firebase Database</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Optimal</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '95%'}}></div></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] md:text-xs font-bold text-slate-600 flex items-center gap-1.5"><Zap size={12} className="text-slate-400"/> LLM Engine</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusEngine === 'Online' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                    {statusEngine}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5"><div className={`${statusEngine === 'Online' ? 'bg-blue-500' : 'bg-rose-500'} h-1.5 rounded-full`} style={{width: '100%'}}></div></div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Clock size={12} className="text-slate-400" />
                <span className="text-[10px] text-slate-500">Pembaruan terakhir: Baru saja</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}