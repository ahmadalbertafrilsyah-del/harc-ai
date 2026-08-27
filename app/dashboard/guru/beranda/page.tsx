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
    // Tentukan sapaan waktu
    const jam = new Date().getHours();
    if (jam < 11) setWaktuSapaan("Selamat Pagi");
    else if (jam < 15) setWaktuSapaan("Selamat Siang");
    else if (jam < 18) setWaktuSapaan("Selamat Sore");
    else setWaktuSapaan("Selamat Malam");

    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Fetch Profil Guru
        const unsubStats = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const npsn = data.npsn || data.instansi;
            
            // Gunakan NAMA LENGKAP sesuai request
            setGuruNama(data.nama || "Pendidik");

            setStats(prev => ({
              ...prev,
              indeksKesantunan: data.indeksKesantunan || 0,
              tokenAI: data.aiTokens || 0,
              rataRataKelas: data.rataRataKelas || 0
            }));

            // 2. Fetch Total Siswa Berdasarkan NPSN
            if (npsn) {
              const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn));
              onSnapshot(qSiswa, (siswaSnap) => {
                setStats(prev => ({ ...prev, siswaAktif: siswaSnap.size }));
              });
            }
          }
        });

        // 3. Fetch Antrean Tugas
        const qAntrean = query(collection(db, "antrean_validasi"), orderBy("timestamp", "desc"));
        const unsubAntrean = onSnapshot(qAntrean, (snapshot) => {
          setAntrean(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 4. Fetch Grafik
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
      <div className="w-full h-[80vh] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <Loader2 size={48} className="animate-spin text-blue-600 relative z-10" />
        </div>
        <p className="mt-6 font-bold text-slate-600 tracking-widest uppercase text-xs md:text-sm">Menyiapkan Ruang Kerja...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-12 px-4 md:px-6 lg:px-8 pt-4">
      
      {/* HERO BANNER MODERN (Desktop Layout) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-900 rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-blue-900/20">
        {/* Dekorasi Latar Belakang */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-100 text-xs font-bold mb-4 backdrop-blur-md uppercase tracking-wider shadow-inner">
                <Sparkles size={14} className="text-blue-300" /> HARC-AI Workspace
              </span>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-blue-200 text-base md:text-lg font-medium mb-1">{waktuSapaan},</p>
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight ${teachersFont.className}`}>
                {guruNama}
              </h1>
            </motion.div>
            
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-blue-100/90 text-sm md:text-base leading-relaxed max-w-xl">
              Sistem mendeteksi <strong className="text-white bg-white/20 px-2 py-0.5 rounded-md mx-1">{antrean.length} tugas</strong> menunggu tinjauan Anda hari ini. Gunakan instrumen cerdas AI untuk mengevaluasi lebih cepat dan akurat.
            </motion.p>
          </div>
          
          {/* Tombol Aksi di Desktop & Info Token */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto mt-4 lg:mt-0 items-end">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center w-full lg:min-w-[200px] mb-2 hidden lg:block">
              <p className="text-[11px] text-blue-200 uppercase tracking-widest font-bold mb-1">Kapasitas Token AI</p>
              <p className="text-2xl font-black text-amber-400 flex items-center justify-center gap-2">
                <Coins size={20} />
                {stats.tokenAI >= 1000 ? `${(stats.tokenAI / 1000).toFixed(1)}K` : stats.tokenAI}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link href="/dashboard/guru/asesmen" className="w-full sm:w-auto bg-white text-blue-900 px-6 py-3.5 rounded-xl font-bold text-sm shadow-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-center active:scale-95">
                <BrainCircuit size={18} /> Generate Asesmen
              </Link>
              <Link href="/dashboard/guru/kelas" className="w-full sm:w-auto bg-blue-900/50 hover:bg-blue-800/50 border border-blue-400/30 text-white px-6 py-3.5 rounded-xl font-bold text-sm backdrop-blur-sm transition-all flex items-center justify-center gap-2 text-center active:scale-95">
                <BookOpen size={18} /> Ruang Kelas
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* KARTU STATISTIK (Grid Desktop Klasik) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Siswa" value={stats.siswaAktif.toString()} icon={Users} color="blue" trend="Terhubung via NPSN" delay={0.1} />
        <StatCard title="Tugas Tertunda" value={antrean.length.toString()} icon={AlertCircle} color="amber" highlight={antrean.length > 0} trend={antrean.length === 0 ? "Semua Tuntas" : "Perlu Tinjauan"} delay={0.2} />
        <StatCard title="Indeks Kesantunan" value={`${stats.indeksKesantunan}%`} icon={Activity} color="emerald" trend="Rata-rata Kelas" delay={0.3} />
        <StatCard title="Sisa Token AI" value={stats.tokenAI.toLocaleString('id-ID')} icon={Coins} color="indigo" trend="Siklus Aktif" delay={0.4} />
      </div>

      {/* GRID KONTEN BAWAH (Chart & Antrean) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* GRAFIK ANALITIK */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 md:p-8 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className={`text-xl font-bold text-slate-800 ${teachersFont.className}`}>Tren Performa Kelas</h3>
              <p className="text-sm text-slate-500 mt-1">Korelasi rata-rata nilai siswa dengan intensitas penggunaan bantuan AI.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-100">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div> Rata-rata Nilai</span>
              <span className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div> Bantuan AI</span>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[300px]">
            {dataStatistik.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataStatistik} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} 
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }} 
                  />
                  <Area type="monotone" dataKey="nilai" name="Rata-rata Nilai" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNilai)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                  <Area type="monotone" dataKey="intervensiAI" name="Bantuan AI" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAI)" activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Activity size={40} className="text-slate-300 mb-3" />
                <span className="text-sm font-bold text-slate-500">Data analitik belum terkumpul</span>
                <span className="text-xs text-slate-400 mt-1 max-w-[200px] text-center">Grafik akan terisi setelah siswa mulai mengerjakan asesmen.</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ANTREAN TUGAS (Card List Style) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col overflow-hidden max-h-[500px]">
          <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <h3 className={`text-lg font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <FileWarning size={20} className="text-amber-500" /> Tinjauan Tugas
            </h3>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">{antrean.length} Item</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar">
            <AnimatePresence>
              {antrean.length > 0 ? (
                <div className="flex flex-col gap-3 md:gap-4">
                  {antrean.map((item) => (
                    <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0 }} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-800 text-sm truncate">{item.nama}</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold uppercase tracking-wider">{item.kelas}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 mb-4">{item.tugas}</p>
                      <button onClick={() => handlePeriksaCepat(item.id)} className="w-full bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex justify-center items-center gap-1.5 group-hover:bg-slate-900 group-hover:text-white">
                        <CheckCircle2 size={16} /> Tandai Selesai
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-5"><CheckCircle2 size={36} /></div>
                  <p className="text-lg font-bold text-slate-800">Semua Tugas Tuntas!</p>
                  <p className="text-sm text-slate-500 mt-2 max-w-[220px] leading-relaxed">Anda tidak memiliki antrean tugas yang perlu ditinjau hari ini. Waktunya bersantai!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Komponen Reusable untuk Kartu Statistik (Desktop Style)
function StatCard({ title, value, icon: Icon, color, highlight, trend, delay }: any) {
  const colorStyles: any = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600"
  };
  
  const decorationColors: any = {
    blue: "bg-blue-500", amber: "bg-amber-500", emerald: "bg-emerald-500", indigo: "bg-indigo-500"
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className={`w-full bg-white p-5 md:p-6 rounded-3xl border ${highlight ? 'border-amber-300 ring-4 ring-amber-50' : 'border-slate-100'} shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden`}>
      
      {/* Ornamen Sudut (Glassmorphism effect) */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-[2.5] ${decorationColors[color]}`}></div>
      
      <div className="flex justify-between items-start mb-4 md:mb-5 relative z-10">
        <div className={`p-3 rounded-2xl ${colorStyles[color]}`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>
      
      <div className="relative z-10">
        <h3 className={`text-2xl md:text-3xl lg:text-4xl font-black text-slate-800 mb-1 tracking-tight ${teachersFont.className}`}>{value}</h3>
        <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      </div>
      
      <div className="mt-4 md:mt-5 pt-3 md:pt-4 border-t border-slate-50 flex items-center justify-between relative z-10">
        <span className="text-[9px] md:text-[10px] text-slate-500 font-bold bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100 truncate">{trend}</span>
      </div>
    </motion.div>
  );
}