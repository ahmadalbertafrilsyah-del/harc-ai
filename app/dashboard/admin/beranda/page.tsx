"use client";

import { motion } from "framer-motion";
import { 
  Users, Server, BrainCircuit, Activity, AlertTriangle, 
  CheckCircle2, Loader2, Database, ShieldCheck, AlertCircle, 
  BellRing, ArrowRight, Zap, Clock, HardDrive, Cpu, Check
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import Link from "next/link";

import { db } from "@/lib/firebase"; 
import { doc, collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function BerandaAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState("");
  
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
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 size={40} className="text-indigo-600 mb-4" aria-hidden="true" />
        </motion.div>
        <p className="font-bold text-lg text-slate-800">Memuat Sistem...</p>
        <p className="text-xs text-slate-500 mt-1">Menghubungkan ke database utama</p>
      </div>
    );
  }

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* HEADER DESKTOP */}
      <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Ikhtisar Sistem Admin</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Terhubung ke Database • {currentDate}
          </p>
        </div>
        <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-2 shadow-sm">
          <Server size={14} /> Sinkronisasi Real-time Aktif
        </div>
      </header>

      {/* HEADER MOBILE (App-Like Style) */}
      <div className="md:hidden bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Status Server</span>
        <h2 className={`text-2xl font-bold mt-1 ${teachersFont.className}`}>{statusEngine} & Responsif</h2>
        <div className="mt-3 flex items-center gap-2 bg-white/15 w-fit px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
          <Check size={14} className="text-emerald-400" /> Sistem Normal
        </div>
      </div>

      {/* BANNER NOTIFIKASI PENGJUAN */}
      {pengajuanPending > 0 && (
        <motion.section initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-900">Persetujuan Akun Pending</h2>
              <p className="text-xs text-amber-800 mt-0.5">
                Terdapat <strong className="font-bold text-amber-950 underline">{pengajuanPending} pendaftar</strong> menunggu validasi akses.
              </p>
            </div>
          </div>
          <Link href="/dashboard/admin/pengguna" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
              Tinjau Sekarang <ArrowRight size={14} />
            </button>
          </Link>
        </motion.section>
      )}

      {/* METRIK UTAMA: DESKTOP (Grid Standar) */}
      <section className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pendidik</p>
              <h3 className={`text-3xl font-black text-slate-800 mt-1 ${teachersFont.className}`}>{systemStats.totalGuru}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Users size={20} /></div>
          </div>
          <p className="text-xs text-slate-500">Akun aktif terdaftar</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peserta Didik</p>
              <h3 className={`text-3xl font-black text-slate-800 mt-1 ${teachersFont.className}`}>{systemStats.totalSiswa}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={20} /></div>
          </div>
          <p className="text-xs text-slate-500">Siswa tersinkronisasi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Modul</p>
              <h3 className={`text-3xl font-black text-slate-800 mt-1 ${teachersFont.className}`}>{systemStats.totalModul}</h3>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><Database size={20} /></div>
          </div>
          <p className="text-xs text-slate-500">Digenerate otomatis AI</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
          <div className="flex justify-between items-start mb-3 pl-2">
            <div>
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Token AI Terpakai</p>
              <h3 className={`text-3xl font-black text-slate-800 mt-1 ${teachersFont.className}`}>
                {systemStats.aiTokens >= 1000000 ? `${(systemStats.aiTokens / 1000000).toFixed(1)}M` : systemStats.aiTokens.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><BrainCircuit size={20} /></div>
          </div>
          <p className="text-xs text-slate-500 pl-2">Kapasitas API aktif</p>
        </div>
      </section>

      {/* METRIK UTAMA: MOBILE (Swipeable Cards ala App) */}
      <div className="md:hidden">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Metrik Utama</h3>
        <div className="flex overflow-x-auto gap-3 pb-2 snap-x scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          <div className="snap-start shrink-0 w-36 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600"><Users size={18} /></div>
            <div>
              <p className={`text-2xl font-black text-slate-800 ${teachersFont.className}`}>{systemStats.totalGuru}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendidik</p>
            </div>
          </div>
          <div className="snap-start shrink-0 w-36 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600"><Users size={18} /></div>
            <div>
              <p className={`text-2xl font-black text-slate-800 ${teachersFont.className}`}>{systemStats.totalSiswa}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Siswa</p>
            </div>
          </div>
          <div className="snap-start shrink-0 w-36 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600"><Database size={18} /></div>
            <div>
              <p className={`text-2xl font-black text-slate-800 ${teachersFont.className}`}>{systemStats.totalModul}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modul</p>
            </div>
          </div>
          <div className="snap-start shrink-0 w-40 bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 pl-0.5"><BrainCircuit size={18} /></div>
            <div className="pl-0.5">
              <p className={`text-xl font-black text-slate-800 ${teachersFont.className}`}>
                {systemStats.aiTokens >= 1000000 ? `${(systemStats.aiTokens / 1000000).toFixed(1)}M` : systemStats.aiTokens.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Token AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS MOBILE */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        <Link href="/dashboard/admin/pengguna" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 active:scale-95 transition-transform">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
          <div>
            <p className="text-xs font-bold text-slate-800">Pengguna</p>
            <p className="text-[10px] text-slate-400">Kelola akun</p>
          </div>
        </Link>
        <Link href="/dashboard/admin/korpus" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 active:scale-95 transition-transform">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Database size={20} /></div>
          <div>
            <p className="text-xs font-bold text-slate-800">Korpus AI</p>
            <p className="text-[10px] text-slate-400">Database teks</p>
          </div>
        </Link>
      </div>

      {/* LOG AKTIVITAS & KESEHATAN SISTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LOG SISTEM */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden lg:col-span-2">
          <header className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className={`text-sm md:text-base font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
              <Activity size={18} className="text-indigo-600" /> Log Aktivitas AI Terbaru
            </h2>
            <Link href="/dashboard/admin/logs" className="text-xs font-bold text-indigo-600 hover:underline">
              Lihat Semua
            </Link>
          </header>
          
          <div className="p-2 flex-1">
            {aktivitasTerbaru.length > 0 ? (
              <ul className="divide-y divide-slate-50">
                {aktivitasTerbaru.map((log: any) => (
                  <li key={log.id} className="p-3.5 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.status === "Sukses" || log.status === "sukses" ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {log.status === "Sukses" || log.status === "sukses" ? <Check size={16} strokeWidth={3} /> : <AlertTriangle size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{log.aksi}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">Oleh: <span className="text-slate-600 font-medium">{log.pengguna || "Sistem"}</span></p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'Baru saja'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <AlertCircle size={32} className="mb-2 opacity-50" />
                <p className="text-xs font-medium">Belum ada aktivitas terekam.</p>
              </div>
            )}
          </div>
        </section>

        {/* STATUS LAYANAN (DESKTOP) */}
        <div className="hidden lg:flex flex-col space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <header className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className={`text-base font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
                <Activity size={18} className="text-blue-600" /> Status Layanan Inti
              </h2>
            </header>
            <div className="p-5 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><HardDrive size={14} className="text-slate-400"/> Firebase Database</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1"><Check size={10} strokeWidth={3}/> Optimal</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{width: '95%'}}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Cpu size={14} className="text-slate-400"/> Mesin LLM Utama</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1"><Check size={10} strokeWidth={3}/> {statusEngine}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '100%'}}></div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 text-slate-400 text-xs">
                <Clock size={14} />
                <span>Sinkronisasi otomatis aktif</span>
              </div>
            </div>
          </section>
        </div>

      </div>
    </motion.main>
  );
}