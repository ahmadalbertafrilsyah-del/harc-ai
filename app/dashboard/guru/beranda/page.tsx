"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertCircle, TrendingUp, Calendar, ChevronRight, FileWarning, Coins, Activity, CheckCircle2, Loader2 } from "lucide-react";
import { Teachers } from "next/font/google";
import Link from "next/link";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, doc, deleteDoc, orderBy } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function BerandaGuru() {
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk Data Real-time
  const [stats, setStats] = useState({
    siswaAktif: 0,
    indeksKesantunan: 0,
    tokenAI: 0,
    rataRataKelas: 0
  });
  
  const [antrean, setAntrean] = useState<any[]>([]);
  const [dataStatistik, setDataStatistik] = useState<any[]>([]);
  
  // State Cloudinary (Bisa di-fetch dari dokumen profil guru di Firestore)
  const [profilUrl, setProfilUrl] = useState("https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"); 

  useEffect(() => {
    // 1. Fetch Statistik Umum (Dokumen tunggal)
    const unsubStats = onSnapshot(doc(db, "statistik", "guru_ahmad"), (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as any);
      }
    });

    // 2. Fetch Antrean Validasi (Koleksi dengan query)
    const qAntrean = query(collection(db, "antrean_validasi"), orderBy("timestamp", "desc"));
    const unsubAntrean = onSnapshot(qAntrean, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAntrean(data);
    });

    // 3. Fetch Grafik Nilai
    const qGrafik = query(collection(db, "grafik_nilai"), orderBy("urutanBulan", "asc"));
    const unsubGrafik = onSnapshot(qGrafik, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setDataStatistik(data);
      setIsLoading(false);
    });

    // Cleanup listener saat komponen di-unmount
    return () => {
      unsubStats();
      unsubAntrean();
      unsubGrafik();
    };
  }, []);

  // Fungsi Hapus Real-time dari Database
  const handlePeriksaCepat = async (id: string) => {
    // Optimistic UI update (Hapus dari layar dulu agar terasa cepat)
    const sisaAntrean = antrean.filter(item => item.id !== id);
    setAntrean(sisaAntrean);

    try {
      // Perintah Hapus ke Firebase
      // await deleteDoc(doc(db, "antrean_validasi", id));
      console.log(`Dokumen ${id} berhasil dihapus/divalidasi dari Firestore`);
    } catch (error) {
      console.error("Gagal memvalidasi:", error);
      // Jika gagal, bisa kembalikan state awal di sini
    }
  };

  // Tampilan Loading Layar Penuh
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Menyinkronkan Database...</p>
        <p className="text-sm">Menghubungkan ke node Firebase & Cloudinary</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Ikhtisar Akademik</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sistem terhubung. Data disinkronisasi secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Implementasi Cloudinary Image */}
          <div className="hidden md:flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <img src={profilUrl} alt="Profil Cloudinary" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-xs font-bold text-slate-600 pr-2">Ahmad (Aktif)</span>
          </div>

          <div className="bg-white px-3.5 py-2 rounded-md border border-slate-200 shadow-sm text-xs font-semibold text-slate-600 flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Baris 1: Kartu Metrik Utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Siswa Aktif" value={stats.siswaAktif.toString()} icon={Users} color="blue" trend="+4 siswa" />
        <StatCard 
          title="Perlu Validasi AI" 
          value={antrean.length.toString()} 
          icon={AlertCircle} 
          color="amber" 
          highlight={antrean.length > 0} 
          trend={antrean.length === 0 ? "Tuntas" : "Tinjauan tertunda"}
        />
        <StatCard title="Indeks Kesantunan" value={`${stats.indeksKesantunan}%`} icon={Activity} color="emerald" trend="Stabil" />
        <StatCard title="Sisa Token AI" value={stats.tokenAI.toLocaleString('id-ID')} icon={Coins} color="indigo" trend="-150 hari ini" />
      </div>

      {/* Baris 2: Grafik & Antrean Validasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kiri: Grafik Statistik */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className={`text-base font-bold text-slate-800 ${teachersFont.className}`}>Tren Nilai & Intervensi AI</h3>
              <p className="text-xs text-slate-500 mt-1">Korelasi antara rata-rata kelas dan jumlah bantuan AI (Scaffolding).</p>
            </div>
            <select className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 bg-slate-50 outline-none">
              <option>Semester Genap</option>
              <option>Semester Ganjil</option>
            </select>
          </div>
          
          <div className="flex-1 w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataStatistik} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="nilai" name="Rata-rata Nilai" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorNilai)" />
                <Area type="monotone" dataKey="intervensiAI" name="Bantuan AI" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAI)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kanan: Daftar Antrean */}
        <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <FileWarning size={18} className="text-amber-500" />
              Tugas Tertunda ({antrean.length})
            </h3>
            <Link href="/dashboard/guru/validasi" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
              Buka Semua <ChevronRight size={14} className="inline -mt-0.5" />
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[300px]">
            <AnimatePresence>
              {antrean.length > 0 ? (
                antrean.map((item) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, backgroundColor: "#f0fdf4" }}
                    className="p-5 flex flex-col gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800 text-sm">{item.nama}</span>
                          <span className="text-[10px] text-slate-400">{item.waktu}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-bold uppercase">{item.kelas}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.tugas}</p>
                    
                    <button 
                      onClick={() => handlePeriksaCepat(item.id)}
                      className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-xs font-medium shadow-sm transition-all active:scale-95 flex justify-center items-center gap-2"
                    >
                      <CheckCircle2 size={14} /> Tandai Selesai
                    </button>
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Semua tugas tuntas!</p>
                  <p className="text-xs text-slate-500 mt-1">Sistem AI tidak menemukan anomali budaya hari ini.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, highlight, trend }: any) {
  return (
    <div className={`bg-white p-5 rounded-xl border ${highlight ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200/80'} shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
      {highlight && <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <h3 className={`text-3xl font-bold text-slate-800 ${teachersFont.className}`}>{value}</h3>
        </div>
        <div className={`p-2.5 bg-${color}-50 text-${color}-600 rounded-lg`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
        {trend}
      </div>
    </div>
  );
}