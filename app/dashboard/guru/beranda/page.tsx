"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Users, AlertCircle, FileWarning, Activity,
  CheckCircle2, BookOpen, Building, Calendar,
  BrainCircuit, BarChart4, FileCheck2, ChevronRight,
  type LucideIcon
} from "lucide-react";
import { Teachers } from "next/font/google";
import Link from "next/link";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, doc, deleteDoc, orderBy, where } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

type AntreanItem = { id: string; nama?: string; kelas?: string; tugas?: string };
type TitikGrafik = { name?: string; nilai?: number; urutanBulan?: number };

/**
 * Sapaan ditentukan sekali saat komponen dibuat, bukan di dalam effect.
 * Aman dari hydration mismatch karena render pertama selalu berupa skeleton.
 */
function sapaanSaatIni() {
  const jam = new Date().getHours();
  if (jam < 11) return "Selamat Pagi";
  if (jam < 15) return "Selamat Siang";
  if (jam < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export default function BerandaGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [guruNama, setGuruNama] = useState("");
  const [waktuSapaan] = useState(sapaanSaatIni);
  const [npsnGuru, setNpsnGuru] = useState("");
  const [namaInstansi, setNamaInstansi] = useState("");

  const [stats, setStats] = useState({ siswaAktif: 0, totalKelas: 0, rataRataKelas: 0 });
  const [antrean, setAntrean] = useState<AntreanItem[]>([]);
  const [dataStatistik, setDataStatistik] = useState<TitikGrafik[]>([]);

  // Pantau sesi login
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(getAuth(), (user) => {
      setUid(user ? user.uid : null);
      if (!user) setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Data milik guru yang sedang login
  useEffect(() => {
    if (!uid) return;

    const unsubProfil = onSnapshot(doc(db, "users", uid), (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setGuruNama(data.nama || "Pendidik");
      setNpsnGuru(data.npsn || "");
      if (!data.npsn) setNamaInstansi(data.instansi || "");
      setStats((prev) => ({ ...prev, rataRataKelas: data.rataRataKelas || 0 }));
    });

    const unsubKelas = onSnapshot(
      query(collection(db, "manajemen_kelas"), where("guruId", "==", uid)),
      (kelasSnap) => setStats((prev) => ({ ...prev, totalKelas: kelasSnap.size }))
    );

    const unsubAntrean = onSnapshot(
      query(collection(db, "antrean_validasi"), orderBy("timestamp", "desc")),
      (snapshot) => setAntrean(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubGrafik = onSnapshot(
      query(collection(db, "grafik_nilai"), orderBy("urutanBulan", "asc")),
      (snapshot) => {
        setDataStatistik(snapshot.docs.map((d) => d.data() as TitikGrafik));
        setIsLoading(false);
      }
    );

    return () => { unsubProfil(); unsubKelas(); unsubAntrean(); unsubGrafik(); };
  }, [uid]);

  // Data lembaga: hanya dipasang ulang saat NPSN berubah, bukan tiap profil ter-update
  useEffect(() => {
    if (!npsnGuru) return;

    const unsubLembaga = onSnapshot(
      query(collection(db, "users"), where("role", "==", "lembaga"), where("npsn", "==", npsnGuru)),
      (lembagaSnap) => {
        if (!lembagaSnap.empty) {
          const dataLembaga = lembagaSnap.docs[0].data();
          setNamaInstansi(dataLembaga.namaLembaga || dataLembaga.namaInstansi || "");
        } else {
          setNamaInstansi(`NPSN: ${npsnGuru}`);
        }
      }
    );

    const unsubSiswa = onSnapshot(
      query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsnGuru)),
      (siswaSnap) => setStats((prev) => ({ ...prev, siswaAktif: siswaSnap.size }))
    );

    return () => { unsubLembaga(); unsubSiswa(); };
  }, [npsnGuru]);

  const handlePeriksaCepat = async (id: string) => {
    const sebelumnya = antrean;
    setAntrean((prev) => prev.filter((item) => item.id !== id));
    try {
      await deleteDoc(doc(db, "antrean_validasi", id));
    } catch (error) {
      console.error("Gagal meninjau tugas:", error);
      setAntrean(sebelumnya);
    }
  };

  if (isLoading) return <BerandaSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto w-full space-y-4 md:space-y-5 pb-4"
    >
      {/* ============== HERO / SAPAAN ============== */}
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-slate-900 to-slate-900 text-white shadow-lg shadow-slate-900/10 border border-slate-800">
        <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="min-w-0 lg:max-w-xl">
            <span className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-blue-100 text-[10px] sm:text-[11px] font-bold tracking-wide backdrop-blur-sm">
              <Building size={12} className="shrink-0 text-blue-300" />
              <span className="truncate">
                {namaInstansi ? `${namaInstansi}${npsnGuru ? ` · ${npsnGuru}` : ""}` : "Instansi Belum Terhubung"}
              </span>
            </span>

            <p className="text-blue-200/80 text-xs sm:text-sm font-medium mt-3">{waktuSapaan},</p>
            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight break-words ${teachersFont.className}`}>
              {guruNama}
            </h1>

            <p className="text-slate-300 text-[12px] sm:text-sm leading-relaxed mt-2">
              {antrean.length > 0 ? (
                <>
                  Terdapat <strong className="text-white font-bold">{antrean.length} tugas</strong> menunggu evaluasi Anda hari ini.
                </>
              ) : (
                <>Tidak ada tugas yang menunggu evaluasi. Selamat mengajar hari ini.</>
              )}
            </p>

            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-100/90 lg:hidden">
              <Calendar size={13} className="text-blue-300" /> Ganjil 2026/2027
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto lg:shrink-0">
            <div className="hidden lg:block bg-white/10 border border-white/15 px-4 py-3 rounded-2xl text-center backdrop-blur-sm">
              <p className="text-[9px] text-blue-200/80 uppercase tracking-widest font-bold mb-1">Tahun Ajaran</p>
              <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                <Calendar size={14} className="text-blue-300" /> Ganjil 2026/2027
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full lg:w-auto">
              <Link
                href="/dashboard/guru/asesmen"
                className="min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-bold text-xs sm:text-[13px] shadow-sm transition-colors flex items-center justify-center gap-1.5 active:scale-[0.97]"
              >
                <FileWarning size={15} /> Evaluasi
              </Link>
              <Link
                href="/dashboard/guru/kelas"
                className="min-h-[44px] bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 rounded-xl font-bold text-xs sm:text-[13px] transition-colors flex items-center justify-center gap-1.5 active:scale-[0.97]"
              >
                <BookOpen size={15} /> Data Kelas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============== STATISTIK ============== */}
      <section aria-label="Ringkasan akademik" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        <StatCard title="Total Siswa" value={stats.siswaAktif} icon={Users} color="blue" trend={npsnGuru || "Global"} delay={0.05} />
        <StatCard title="Total Kelas" value={stats.totalKelas} icon={BookOpen} color="indigo" trend="Aktif" delay={0.1} />
        <StatCard title="Tugas Tertunda" value={antrean.length} icon={AlertCircle} color="amber" highlight={antrean.length > 0} trend={antrean.length === 0 ? "Tuntas" : "Perlu Tinjauan"} delay={0.15} />
        <StatCard title="Rata-rata Nilai" value={stats.rataRataKelas} icon={Activity} color="emerald" trend="Akademik" delay={0.2} />
      </section>

      {/* ============== AKSI CEPAT (MOBILE) ============== */}
      <nav aria-label="Akses cepat" className="lg:hidden -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
          <QuickAction href="/dashboard/guru/generator" icon={BookOpen} label="Bahan Ajar" />
          <QuickAction href="/dashboard/guru/asesmen" icon={BrainCircuit} label="Asesmen" />
          <QuickAction href="/dashboard/guru/validasi" icon={FileCheck2} label="Validasi" />
          <QuickAction href="/dashboard/guru/analitik" icon={BarChart4} label="Analitik" />
        </div>
      </nav>

      {/* ============== KONTEN UTAMA ============== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Grafik performa */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 md:p-6 flex flex-col">
          <div className="flex flex-wrap justify-between items-start gap-2 mb-4 md:mb-5">
            <div className="min-w-0">
              <h2 className={`text-[15px] sm:text-base font-bold text-slate-800 ${teachersFont.className}`}>Tren Performa Akademik</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Pergerakan nilai rata-rata siswa dalam satu semester.</p>
            </div>
            <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 shrink-0">
              <span className="w-2 h-2 rounded-full bg-blue-600" aria-hidden="true" /> Nilai Rata-rata
            </span>
          </div>

          <div className="flex-1 w-full h-[220px] sm:h-[260px] lg:h-[300px]">
            {dataStatistik.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataStatistik} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} dy={8} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} width={38} />
                  <Tooltip
                    cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", padding: "8px 12px", fontSize: "12px" }}
                  />
                  <Area type="monotone" dataKey="nilai" name="Rata-rata Nilai" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNilai)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <Activity size={30} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum ada data analitik</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Data muncul setelah penilaian semester berjalan.</p>
              </div>
            )}
          </div>
        </section>

        {/* Antrean tinjauan */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden lg:max-h-[420px]">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center gap-2">
            <h2 className={`text-sm font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <FileWarning size={16} className="text-slate-500" /> Tinjauan Tugas
            </h2>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
              {antrean.length} Berkas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 max-h-[60vh] lg:max-h-none">
            <AnimatePresence initial={false}>
              {antrean.length > 0 ? (
                antrean.map((item) => (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.18 }}
                    className="relative p-3 sm:p-3.5 pl-4 bg-white rounded-xl border border-slate-200 space-y-2 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-blue-500/70" aria-hidden="true" />
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-xs sm:text-[13px] truncate">{item.nama}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-bold uppercase shrink-0">
                        {item.kelas}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2">{item.tugas}</p>
                    <button
                      type="button"
                      onClick={() => handlePeriksaCepat(item.id)}
                      className="w-full min-h-[40px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-1.5 active:scale-[0.98]"
                    >
                      <CheckCircle2 size={14} /> Tandai Selesai
                    </button>
                  </motion.article>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <span className="p-3 rounded-full bg-emerald-50 mb-3">
                    <CheckCircle2 size={26} className="text-emerald-600" />
                  </span>
                  <p className="text-xs font-bold text-slate-800">Semua Tugas Tuntas</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tidak ada antrean tinjauan saat ini.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

/* ---------------------------------- UI ---------------------------------- */

const colorStyles: Record<string, { icon: string; accent: string; dot: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600 ring-blue-100", accent: "from-blue-500/70", dot: "bg-blue-500" },
  amber: { icon: "bg-amber-50 text-amber-600 ring-amber-100", accent: "from-amber-500/70", dot: "bg-amber-500" },
  emerald: { icon: "bg-emerald-50 text-emerald-600 ring-emerald-100", accent: "from-emerald-500/70", dot: "bg-emerald-500" },
  indigo: { icon: "bg-indigo-50 text-indigo-600 ring-indigo-100", accent: "from-indigo-500/70", dot: "bg-indigo-500" },
};

function StatCard({
  title, value, icon: Icon, color, highlight, trend, delay,
}: {
  title: string; value: number | string; icon: LucideIcon; color: string;
  highlight?: boolean; trend: string; delay: number;
}) {
  const c = colorStyles[color] ?? colorStyles.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className={`group relative overflow-hidden bg-white p-3 sm:p-4 md:p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        highlight ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"
      }`}
    >
      {/* Aksen gradien halus di sisi atas */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent ${c.accent}`} aria-hidden="true" />

      <div className="flex justify-between items-start gap-2 mb-2.5 md:mb-3">
        <span className={`p-2 sm:p-2.5 rounded-xl shrink-0 ring-1 ${c.icon}`}>
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-[62%]">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${highlight ? "bg-amber-500" : c.dot}`} aria-hidden="true" />
          <span className="truncate">{trend}</span>
        </span>
      </div>

      <p className={`text-xl sm:text-2xl md:text-[26px] font-black text-slate-800 tracking-tight tabular-nums leading-none ${teachersFont.className}`}>
        {value}
      </p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 truncate">{title}</p>
    </motion.div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="snap-start shrink-0 min-h-[44px] flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50/40 active:scale-[0.97] transition-all"
    >
      <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
        <Icon size={14} />
      </span>
      {label}
      <ChevronRight size={14} className="text-slate-300" />
    </Link>
  );
}

function BerandaSkeleton() {
  return (
    <div className="max-w-7xl mx-auto w-full space-y-4 md:space-y-5 animate-pulse" role="status" aria-label="Memuat portal akademik">
      <div className="h-44 sm:h-40 rounded-2xl md:rounded-3xl bg-slate-200" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] sm:h-[124px] rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="lg:col-span-2 h-[300px] sm:h-[360px] rounded-2xl bg-slate-200" />
        <div className="h-[240px] lg:h-[360px] rounded-2xl bg-slate-200" />
      </div>
      <span className="sr-only">Memuat Portal Akademik...</span>
    </div>
  );
}
