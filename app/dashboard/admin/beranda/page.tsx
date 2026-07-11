"use client";

import { motion } from "framer-motion";
import { 
  Users, Server, BrainCircuit, Activity, AlertTriangle, 
  CheckCircle2, Loader2, Database, ShieldCheck, AlertCircle, 
  BellRing, ArrowRight, Zap, Clock, HardDrive, Cpu
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
  const [currentDate, setCurrentDate] = useState("");
  
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
    // Set Tanggal untuk Aksesibilitas
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('id-ID', dateOptions));

    const qGuru = query(collection(db, "users"), where("role", "==", "guru"));
    const unsubGuru = onSnapshot(qGuru, (snapshot) => {
      setSystemStats(prev => ({ ...prev, totalGuru: snapshot.size }));
    });

    const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"));
    const unsubSiswa = onSnapshot(qSiswa, (snapshot) => {
      setSystemStats(prev => ({ ...prev, totalSiswa: snapshot.size }));
    });

    const qPending = query(collection(db, "pengajuan_akun"), where("status", "==", "pending"));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setPengajuanPending(snapshot.size);
    });

    const qModul = query(collection(db, "modul_ajar"));
    const unsubModul = onSnapshot(qModul, (snapshot) => {
      setSystemStats(prev => ({ ...prev, totalModul: snapshot.size }));
    });

    const unsubToken = onSnapshot(doc(db, "ai_monitoring", "token_stats"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSystemStats(prev => ({ ...prev, aiTokens: data.tokenTerpakai || 0 }));
        if (data.statusEngine) setStatusEngine(data.statusEngine);
      }
    });

    const qLog = query(collection(db, "ai_logs"), orderBy("timestamp", "desc"), limit(5));
    const unsubLog = onSnapshot(qLog, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAktivitasTerbaru(logs);
      setIsLoading(false); 
    });

    return () => {
      unsubGuru(); unsubSiswa(); unsubPending(); unsubModul(); unsubToken(); unsubLog();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-600" role="status" aria-live="polite">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" aria-hidden="true" />
        <p className="font-bold text-lg">Mengakses Server Utama...</p>
        <p className="text-sm mt-1">Menarik metrik kesehatan sistem dari Database</p>
        <span className="sr-only">Harap tunggu, halaman sedang memuat data.</span>
      </div>
    );
  }

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-10">
      
      {/* Header Halaman (Aksesibel) */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`} tabIndex={0}>Ikhtisar Sistem Admin</h1>
          <p className="text-slate-600 text-sm mt-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
            Terhubung ke Database • {currentDate}
          </p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-indigo-800 text-xs font-bold flex items-center gap-2 w-fit shadow-sm" role="status">
          <Server size={14} aria-hidden="true" /> Sinkronisasi Real-time Aktif
        </div>
      </header>

      {/* Banner Notifikasi Cerdas (Aksesibel Alert) */}
      {pengajuanPending > 0 && (
        <motion.section initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm" role="alert" aria-live="assertive">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5" aria-hidden="true">
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-900">Tindakan Diperlukan: Pengajuan Pendidik Baru</h2>
              <p className="text-xs md:text-sm text-amber-800 mt-1">
                Terdapat <strong className="text-amber-900 font-black bg-amber-200/50 px-1.5 rounded">{pengajuanPending}</strong> pendidik yang menunggu persetujuan akses sistem.
              </p>
            </div>
          </div>
          <Link href="/dashboard/admin/pengguna" className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
            <button className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm" aria-label={`Tinjau ${pengajuanPending} pengajuan pendidik sekarang`}>
              Tinjau Sekarang <ArrowRight size={16} aria-hidden="true" />
            </button>
          </Link>
        </motion.section>
      )}

      {/* Baris 1: Kartu Metrik Kesehatan Sistem */}
      <section aria-label="Metrik Utama Sistem" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        
        <article className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group" tabIndex={0}>
          <div className="flex justify-between items-start mb-3 md:mb-4">
            <div>
              <h2 className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Total Pendidik</h2>
              <p className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>
                <span className="sr-only">Jumlah total pendidik adalah </span>{systemStats.totalGuru}
              </p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0" aria-hidden="true"><Users size={20} /></div>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">Akun aktif terdaftar</p>
        </article>

        <article className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group" tabIndex={0}>
          <div className="flex justify-between items-start mb-3 md:mb-4">
            <div>
              <h2 className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Peserta Didik</h2>
              <p className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>
                <span className="sr-only">Jumlah peserta didik yang tersinkronisasi adalah </span>{systemStats.totalSiswa}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0" aria-hidden="true"><Users size={20} /></div>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">Akun siswa tersinkron</p>
        </article>

        <article className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group" tabIndex={0}>
          <div className="flex justify-between items-start mb-3 md:mb-4">
            <div>
              <h2 className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Total Modul</h2>
              <p className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>
                <span className="sr-only">Jumlah total modul yang telah di-generate adalah </span>{systemStats.totalModul}
              </p>
            </div>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg shrink-0" aria-hidden="true"><Database size={20} /></div>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">Di-generate otomatis oleh AI</p>
        </article>

        <article className="bg-white p-4 md:p-5 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden ring-1 ring-indigo-50" tabIndex={0}>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" aria-hidden="true"></div>
          <div className="flex justify-between items-start mb-3 md:mb-4 pl-2 md:pl-3">
            <div>
              <h2 className="text-[10px] md:text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Token AI Terpakai</h2>
              <p className={`text-xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>
                <span className="sr-only">Kapasitas Token AI yang terpakai adalah </span>
                {systemStats.aiTokens >= 1000000 ? `${(systemStats.aiTokens / 1000000).toFixed(1)}M` : systemStats.aiTokens.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0" aria-hidden="true"><BrainCircuit size={20} /></div>
          </div>
          <p className="text-[10px] md:text-xs text-slate-600 font-medium pl-2 md:pl-3 truncate">Kapasitas API aktif sistem</p>
        </article>
      </section>

      {/* Baris 2: Log Sistem & Dashboard Sidebar Kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        
        {/* Log Sistem Keamanan */}
        <section aria-labelledby="log-heading" className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden lg:col-span-2">
          <header className="px-5 md:px-6 py-4 md:py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 id="log-heading" className={`text-base font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
              <Activity size={20} className="text-indigo-600" aria-hidden="true" /> Log Aktivitas AI Utama
            </h2>
            <Link href="/dashboard/admin/logs" className="text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label="Lihat semua log aktivitas">
              Lihat Semua
            </Link>
          </header>
          
          <div className="flex-grow p-2">
            {aktivitasTerbaru.length > 0 ? (
              <ul className="divide-y divide-slate-50" role="list">
                {aktivitasTerbaru.map((log: any) => (
                  <li key={log.id} className="p-3 md:p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 rounded-lg focus-within:ring-2 focus-within:ring-indigo-100" tabIndex={0}>
                    <div className="mt-0.5 shrink-0" aria-hidden="true">
                      {log.status === "Sukses" || log.status === "sukses" ? (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={18} className="text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{log.aksi}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Oleh: <strong className="text-slate-800">{log.pengguna || log.entitas || "Sistem"}</strong> • <span className="text-slate-500">{log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'Baru saja'} WIB</span>
                      </p>
                      {log.status !== "Sukses" && log.status !== "sukses" && (
                        <p className="text-[10px] font-bold text-amber-700 mt-1 bg-amber-50 px-2 py-0.5 rounded inline-block">Status: {log.status}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-500">
                <AlertCircle size={32} className="mb-3 text-slate-300" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-700">Belum ada log terekam.</p>
                <p className="text-xs mt-1 text-center max-w-xs">Aktivitas generasi AI akan muncul di sini secara otomatis.</p>
              </div>
            )}
          </div>
        </section>

        {/* Kolom Kanan: Quick Access & System Health */}
        <div className="space-y-5 md:space-y-6 flex flex-col">
          
          <section aria-labelledby="quick-access" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <header className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 id="quick-access" className={`text-base font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
                <ShieldCheck size={20} className="text-indigo-600" aria-hidden="true" /> Akses Kendali Cepat
              </h2>
            </header>
            <div className="p-4 md:p-5 grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
              <Link href="/dashboard/admin/pengguna" className="block focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl" aria-label="Kelola pengguna dan pendaftaran">
                <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all h-full group">
                  <div className="flex items-center gap-3 mb-2">
                    <Users size={20} className="text-indigo-700 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-slate-900">Manajemen Pengguna</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed hidden md:block">Kelola akses, pendaftaran, dan data pendidik.</p>
                </div>
              </Link>
              <Link href="/dashboard/admin/korpus" className="block focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-xl" aria-label="Kelola korpus dan database AI">
                <div className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all h-full group">
                  <div className="flex items-center gap-3 mb-2">
                    <Database size={20} className="text-emerald-700 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-slate-900">Korpus Data AI</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed hidden md:block">Sinkronisasi dataset bahasa daerah dan rubrik.</p>
                </div>
              </Link>
            </div>
          </section>

          <section aria-labelledby="health-heading" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-grow">
            <header className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 id="health-heading" className={`text-base font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
                <Activity size={20} className="text-blue-600" aria-hidden="true" /> Status Layanan Inti
              </h2>
            </header>
            <div className="p-5 space-y-5">
              
              <div aria-label="Status Firebase Database: Optimal">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><HardDrive size={14} className="text-slate-500" aria-hidden="true"/> Firebase Database</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded" aria-hidden="true">Optimal</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2" role="progressbar" aria-valuenow={95} aria-valuemin={0} aria-valuemax={100} aria-label="Kapasitas database aman">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{width: '95%'}}></div>
                </div>
              </div>
              
              <div aria-label={`Status Mesin LLM AI: ${statusEngine}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Cpu size={14} className="text-slate-500" aria-hidden="true"/> Mesin LLM Utama</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusEngine === 'Online' ? 'text-blue-700 bg-blue-100' : 'text-rose-700 bg-rose-100'}`} aria-hidden="true">
                    {statusEngine}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100} aria-label={statusEngine === 'Online' ? "Mesin menyala dan responsif" : "Mesin mengalami gangguan"}>
                  <div className={`${statusEngine === 'Online' ? 'bg-blue-600' : 'bg-rose-600'} h-2 rounded-full`} style={{width: '100%'}}></div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <Clock size={14} className="text-slate-500" aria-hidden="true" />
                <span className="text-xs text-slate-600 font-medium">Sinkronisasi terakhir: <span className="font-bold">Baru saja</span></span>
              </div>

            </div>
          </section>

        </div>
      </div>
    </motion.main>
  );
}