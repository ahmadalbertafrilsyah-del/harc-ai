"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, AlertCircle, ChevronRight, FileWarning, Coins, Activity, 
  CheckCircle2, Loader2, Sparkles, BrainCircuit, ArrowRight, BookOpen 
} from "lucide-react";
import { Teachers } from "next/font/google";
import Link from "next/link";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, doc, deleteDoc, orderBy, where } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function BerandaGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [guruNama, setGuruNama] = useState("");
  const [waktuSapaan, setWaktuSapaan] = useState("Halo");
  
  const [stats, setStats] = useState({
    siswaAktif: 0,
    indeksKesantunan: 0,
    tokenAI: 0,
    rataRataKelas: 0
  });
  
  const [antrean, setAntrean] = useState<any[]>([]);
  const [dataStatistik, setDataStatistik] = useState<any[]>([]);

  useEffect(() => {
    const jam = new Date().getHours();
    if (jam < 11) setWaktuSapaan("Selamat Pagi");
    else if (jam < 15) setWaktuSapaan("Selamat Siang");
    else if (jam < 18) setWaktuSapaan("Selamat Sore");
    else setWaktuSapaan("Selamat Malam");

    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubStats = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const npsn = data.npsn || data.instansi;
            
            setGuruNama(data.nama || "Pendidik");

            setStats(prev => ({
              ...prev,
              indeksKesantunan: data.indeksKesantunan || 0,
              tokenAI: data.aiTokens || 0,
              rataRataKelas: data.rataRataKelas || 0
            }));

            if (npsn) {
              const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn));
              onSnapshot(qSiswa, (siswaSnap) => {
                setStats(prev => ({ ...prev, siswaAktif: siswaSnap.size }));
              });
            }
          }
        });

        const qAntrean = query(collection(db, "antrean_validasi"), orderBy("timestamp", "desc"));
        const unsubAntrean = onSnapshot(qAntrean, (snapshot) => {
          setAntrean(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const qGrafik = query(collection(db, "grafik_nilai"), orderBy("urutanBulan", "asc"));
        const unsubGrafik = onSnapshot(qGrafik, (snapshot) => {
          setDataStatistik(snapshot.docs.map(d => d.data()));
          setIsLoading(false); 
        });

        return () => { unsubStats(); unsubAntrean(); unsubGrafik(); };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handlePeriksaCepat = async (id: string) => {
    setAntrean(antrean.filter(item => item.id !== id));
    try {
      await deleteDoc(doc(db, "antrean_validasi", id));
    } catch (error) {
      console.error("Gagal memvalidasi:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500" role="status">
        <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-bold text-slate-700">Menyiapkan Ruang Kerja...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-5 pb-6">
      
      {/* HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 to-indigo-800 rounded-2xl p-5 md:p-8 text-white shadow-md">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-100 text-[10px] font-bold mb-3 uppercase tracking-wider backdrop-blur-sm">
              <Sparkles size={12} className="text-blue-300" /> HARC-AI Workspace
            </span>
            
            <p className="text-blue-200 text-xs md:text-sm font-medium">{waktuSapaan},</p>
            <h1 className={`text-2xl md:text-3xl font-bold text-white mb-2 ${teachersFont.className}`}>
              {guruNama}
            </h1>
            
            <p className="text-blue-100 text-xs md:text-sm leading-relaxed opacity-90">
              Sistem mendeteksi <strong className="text-white underline">{antrean.length} tugas</strong> menunggu tinjauan Anda hari ini. Gunakan instrumen cerdas AI untuk evaluasi cepat.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3 rounded-xl text-center hidden lg:block">
              <p className="text-[9px] text-blue-200 uppercase tracking-wider font-bold mb-0.5">Kapasitas Token AI</p>
              <p className="text-lg font-bold text-amber-400 flex items-center justify-center gap-1.5">
                <Coins size={16} />
                {stats.tokenAI >= 1000 ? `${(stats.tokenAI / 1000).toFixed(1)}K` : stats.tokenAI}
              </p>
            </div>
            
            <div className="flex gap-2 w-full">
              <Link href="/dashboard/guru/asesmen" className="flex-1 sm:flex-none bg-white text-blue-900 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5 text-center active:scale-95">
                <BrainCircuit size={15} /> Asesmen
              </Link>
              <Link href="/dashboard/guru/kelas" className="flex-1 sm:flex-none bg-blue-800/60 hover:bg-blue-800 border border-blue-400/30 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-center active:scale-95">
                <BookOpen size={15} /> Kelas
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KARTU STATISTIK */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Total Siswa" value={stats.siswaAktif.toString()} icon={Users} color="blue" trend="Via NPSN" delay={0.1} />
        <StatCard title="Tugas Tertunda" value={antrean.length.toString()} icon={AlertCircle} color="amber" highlight={antrean.length > 0} trend={antrean.length === 0 ? "Tuntas" : "Perlu Tinjauan"} delay={0.2} />
        <StatCard title="Kesantunan" value={`${stats.indeksKesantunan}%`} icon={Activity} color="emerald" trend="Rata Kelas" delay={0.3} />
        <StatCard title="Sisa Token" value={stats.tokenAI.toLocaleString('id-ID')} icon={Coins} color="indigo" trend="Siklus Aktif" delay={0.4} />
      </div>

      {/* GRID KONTEN BAWAH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        
        {/* GRAFIK ANALITIK */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
            <div>
              <h3 className={`text-base font-bold text-slate-800 ${teachersFont.className}`}>Tren Performa Kelas</h3>
              <p className="text-xs text-slate-400 mt-0.5">Korelasi nilai siswa dengan bantuan AI.</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Nilai</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> AI</span>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[250px]">
            {dataStatistik.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataStatistik} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dx={-8} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '10px 14px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="nilai" name="Nilai" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNilai)" />
                  <Area type="monotone" dataKey="intervensiAI" name="Bantuan AI" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAI)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 py-10">
                <Activity size={32} className="text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-600">Belum ada data analitik</span>
              </div>
            )}
          </div>
        </div>

        {/* ANTREAN TUGAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden max-h-[420px]">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className={`text-sm font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <FileWarning size={16} className="text-amber-500" /> Tinjauan Tugas
            </h3>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{antrean.length} Item</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            <AnimatePresence>
              {antrean.length > 0 ? (
                antrean.map((item) => (
                  <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs truncate">{item.nama}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold uppercase">{item.kelas}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{item.tugas}</p>
                    <button onClick={() => handlePeriksaCepat(item.id)} className="w-full bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 py-2 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1 active:scale-95">
                      <CheckCircle2 size={14} /> Selesai
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                  <p className="text-xs font-bold text-slate-800">Semua Tugas Tuntas!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tidak ada antrean tugas saat ini.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, highlight, trend, delay }: any) {
  const colorStyles: any = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600"
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className={`bg-white p-4 md:p-5 rounded-2xl border ${highlight ? 'border-amber-300 ring-2 ring-amber-50' : 'border-slate-200'} shadow-sm relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-xl ${colorStyles[color]}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{trend}</span>
      </div>
      
      <div>
        <h3 className={`text-xl md:text-2xl font-black text-slate-800 mb-0.5 tracking-tight ${teachersFont.className}`}>{value}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      </div>
    </motion.div>
  );
}