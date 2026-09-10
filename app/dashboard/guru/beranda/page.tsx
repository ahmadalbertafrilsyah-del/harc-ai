"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, AlertCircle, FileWarning, Activity, 
  CheckCircle2, Loader2, ArrowRight, BookOpen, Building, Calendar 
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
  const [npsnGuru, setNpsnGuru] = useState("");
  const [namaInstansi, setNamaInstansi] = useState("");
  
  const [stats, setStats] = useState({
    siswaAktif: 0,
    totalKelas: 0,
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
            const npsn = data.npsn || "";
            
            setGuruNama(data.nama || "Pendidik");
            setNpsnGuru(npsn);
            setStats(prev => ({
              ...prev,
              rataRataKelas: data.rataRataKelas || 0
            }));

            if (npsn) {
              const qLembaga = query(collection(db, "users"), where("role", "==", "lembaga"), where("npsn", "==", npsn));
              onSnapshot(qLembaga, (lembagaSnap) => {
                if (!lembagaSnap.empty) {
                   const dataLembaga = lembagaSnap.docs[0].data();
                   setNamaInstansi(dataLembaga.namaLembaga || dataLembaga.namaInstansi || "");
                } else {
                   setNamaInstansi(`NPSN: ${npsn}`);
                }
              });

              const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn));
              onSnapshot(qSiswa, (siswaSnap) => {
                setStats(prev => ({ ...prev, siswaAktif: siswaSnap.size }));
              });
            } else {
              setNamaInstansi(data.instansi || "");
            }
          }
        });

        // 2. Hitung Total Kelas yang Diampu
        const qKelas = query(collection(db, "manajemen_kelas"), where("guruId", "==", user.uid));
        const unsubKelas = onSnapshot(qKelas, (kelasSnap) => {
          setStats(prev => ({ ...prev, totalKelas: kelasSnap.size }));
        });

        // 3. Ambil Antrean Tugas
        const qAntrean = query(collection(db, "antrean_validasi"), orderBy("timestamp", "desc"));
        const unsubAntrean = onSnapshot(qAntrean, (snapshot) => {
          setAntrean(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 4. Ambil Grafik Performa
        const qGrafik = query(collection(db, "grafik_nilai"), orderBy("urutanBulan", "asc"));
        const unsubGrafik = onSnapshot(qGrafik, (snapshot) => {
          setDataStatistik(snapshot.docs.map(d => d.data()));
          setIsLoading(false); 
        });

        return () => { unsubStats(); unsubKelas(); unsubAntrean(); unsubGrafik(); };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handlePeriksaCepat = async (id: string) => {
    setAntrean(antrean.filter(item => item.id !== id));
    try {
      await deleteDoc(doc(db, "antrean_validasi", id));
    } catch (error) {
      console.error("Gagal meninjau tugas:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500" role="status">
        <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-bold text-slate-700">Memuat Portal Akademik...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-5 pb-6">
      
      {/* HERO BANNER - DESAIN FORMAL */}
      <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-5 md:p-8 text-white shadow-md border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold mb-3 tracking-wider">
              <Building size={12} className="text-slate-400" /> 
              {namaInstansi ? `${namaInstansi} (NPSN: ${npsnGuru})` : 'Instansi Belum Terhubung'}
            </span>
            
            <p className="text-slate-400 text-xs md:text-sm font-medium">{waktuSapaan},</p>
            <h1 className={`text-2xl md:text-3xl font-bold text-white mb-2 ${teachersFont.className}`}>
              {guruNama}
            </h1>
            
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed opacity-90">
              Terdapat <strong className="text-white underline">{antrean.length} tugas</strong> menunggu evaluasi Anda hari ini. Silakan periksa melalui modul penugasan atau daftar tinjauan di bawah.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto">
            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-center hidden lg:block">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Tahun Ajaran</p>
              <p className="text-sm font-bold text-slate-200 flex items-center justify-center gap-1.5">
                <Calendar size={14} className="text-blue-400"/> Ganjil 2026/2027
              </p>
            </div>
            
            <div className="flex gap-2 w-full">
              <Link href="/dashboard/guru/asesmen" className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 text-center active:scale-95">
                <FileWarning size={15} /> Evaluasi
              </Link>
              <Link href="/dashboard/guru/kelas" className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-center active:scale-95">
                <BookOpen size={15} /> Data Kelas
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KARTU STATISTIK AKADEMIK */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Total Siswa" value={stats.siswaAktif.toString()} icon={Users} color="blue" trend={npsnGuru || "Global"} delay={0.1} />
        <StatCard title="Total Kelas" value={stats.totalKelas.toString()} icon={BookOpen} color="indigo" trend="Aktif" delay={0.2} />
        <StatCard title="Tugas Tertunda" value={antrean.length.toString()} icon={AlertCircle} color="amber" highlight={antrean.length > 0} trend={antrean.length === 0 ? "Tuntas" : "Perlu Tinjauan"} delay={0.3} />
        <StatCard title="Rata-rata Nilai" value={stats.rataRataKelas.toString()} icon={Activity} color="emerald" trend="Akademik" delay={0.4} />
      </div>

      {/* GRID KONTEN BAWAH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        
        {/* GRAFIK PERKEMBANGAN NILAI */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
            <div>
              <h3 className={`text-base font-bold text-slate-800 ${teachersFont.className}`}>Tren Performa Akademik</h3>
              <p className="text-xs text-slate-400 mt-0.5">Grafik pergerakan nilai rata-rata siswa dalam satu semester.</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600"></div> Nilai Rata-rata</span>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[250px]">
            {dataStatistik.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataStatistik} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-8} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '10px 14px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="nilai" name="Rata-rata Nilai" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNilai)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 py-10">
                <Activity size={32} className="text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-600">Belum ada data analitik semester ini</span>
              </div>
            )}
          </div>
        </div>

        {/* ANTREAN TUGAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden max-h-[420px]">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className={`text-sm font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <FileWarning size={16} className="text-slate-600" /> Tinjauan Tugas
            </h3>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{antrean.length} Berkas</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            <AnimatePresence>
              {antrean.length > 0 ? (
                antrean.map((item) => (
                  <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs truncate">{item.nama}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[9px] font-bold uppercase">{item.kelas}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{item.tugas}</p>
                    <button onClick={() => handlePeriksaCepat(item.id)} className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 py-2 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1 active:scale-95">
                      <CheckCircle2 size={14} /> Tandai Selesai
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
        <span className="text-[9px] text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">{trend}</span>
      </div>
      
      <div>
        <h3 className={`text-xl md:text-2xl font-black text-slate-800 mb-0.5 tracking-tight ${teachersFont.className}`}>{value}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      </div>
    </motion.div>
  );
}