"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertCircle, ChevronRight, FileWarning, Coins, Activity, CheckCircle2, Loader2, Sparkles } from "lucide-react";
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
  
  const [stats, setStats] = useState({
    siswaAktif: 0,
    indeksKesantunan: 0,
    tokenAI: 0,
    rataRataKelas: 0
  });
  
  const [antrean, setAntrean] = useState<any[]>([]);
  const [dataStatistik, setDataStatistik] = useState<any[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Fetch Profil Guru untuk dapatkan NPSN & Token AI
        const unsubStats = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const npsn = data.npsn || data.instansi;

            setStats(prev => ({
              ...prev,
              indeksKesantunan: data.indeksKesantunan || 0,
              tokenAI: data.aiTokens || 0,
              rataRataKelas: data.rataRataKelas || 0
            }));

            // 2. Fetch Total Siswa Berdasarkan NPSN secara Real-time
            if (npsn) {
              const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn));
              onSnapshot(qSiswa, (siswaSnap) => {
                setStats(prev => ({ ...prev, siswaAktif: siswaSnap.size }));
              });
            }
          }
        });

        // 3. Fetch Antrean Asli
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
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Menyiapkan Ruang Kerja...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-8 pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Ikhtisar Akademik</h1>
          <p className="text-slate-500 text-sm mt-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sistem terhubung. Data disinkronisasi secara real-time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <StatCard title="Total Siswa" value={stats.siswaAktif.toString()} icon={Users} color="blue" trend="Terhubung via NPSN" />
        <StatCard title="Tugas Tertunda" value={antrean.length.toString()} icon={AlertCircle} color="amber" highlight={antrean.length > 0} trend={antrean.length === 0 ? "Tuntas" : "Perlu tinjauan"} />
        <StatCard title="Indeks Kesantunan" value={`${stats.indeksKesantunan}%`} icon={Activity} color="emerald" trend="Rata-rata kelas" />
        <StatCard title="Sisa Token AI" value={stats.tokenAI.toLocaleString('id-ID')} icon={Coins} color="indigo" trend="Siklus aktif" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className={`text-base font-bold text-slate-800 ${teachersFont.className}`}>Tren Nilai & Intervensi AI</h3>
              <p className="text-xs text-slate-500 mt-1">Korelasi nilai kelas dengan scaffolding AI.</p>
            </div>
          </div>
          
          <div className="flex-1 w-full h-[300px]">
            {dataStatistik.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataStatistik} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ fontWeight: 'bold', color: '#1e293b' }} />
                  <Area type="monotone" dataKey="nilai" name="Rata-rata Nilai" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorNilai)" />
                  <Area type="monotone" dataKey="intervensiAI" name="Bantuan AI" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAI)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium bg-slate-50/50 rounded-lg border border-dashed border-slate-200">Data analitik belum terkumpul.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}><FileWarning size={18} className="text-amber-500" /> Tugas ({antrean.length})</h3>
            <Link href="/dashboard/guru/validasi" className="text-xs font-bold text-blue-600 hover:text-blue-800">Semua <ChevronRight size={14} className="inline -mt-0.5" /></Link>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-0">
            <AnimatePresence>
              {antrean.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-0 md:divide-y md:divide-slate-100">
                  {antrean.map((item) => (
                    <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="p-4 md:p-5 flex flex-col gap-2 bg-slate-50 md:bg-white rounded-xl md:rounded-none border border-slate-100 md:border-none hover:bg-blue-50/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="w-full">
                          <span className="font-bold text-slate-800 text-sm truncate block">{item.nama}</span>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold uppercase">{item.kelas}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-snug line-clamp-2 md:line-clamp-none">{item.tugas}</p>
                      <button onClick={() => handlePeriksaCepat(item.id)} className="w-full mt-auto bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-xs font-medium transition-all active:scale-95 flex justify-center items-center gap-1.5"><CheckCircle2 size={14} /> Selesai</button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center flex flex-col items-center justify-center h-[300px]">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3"><CheckCircle2 size={24} /></div>
                  <p className="text-sm font-bold text-slate-700">Semua tugas tuntas!</p>
                  <p className="text-xs text-slate-500 mt-1">Bagus, tidak ada antrean saat ini.</p>
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
  const colorMap: any = { blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", emerald: "bg-emerald-50 text-emerald-600", indigo: "bg-indigo-50 text-indigo-600" };
  const iconStyle = colorMap[color] || "bg-slate-50 text-slate-600";
  return (
    <div className={`bg-white p-5 rounded-xl border ${highlight ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200/80'} shadow-sm flex flex-col justify-between hover:shadow-md`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <h3 className={`text-3xl font-bold text-slate-800 ${teachersFont.className}`}>{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg ${iconStyle}`}><Icon size={20} /></div>
      </div>
      <div className="text-[11px] text-slate-500 font-medium">{trend}</div>
    </div>
  );
}