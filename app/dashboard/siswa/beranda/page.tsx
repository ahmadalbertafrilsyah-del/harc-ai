"use client";

import { motion } from "framer-motion";
import {
  BookOpen, Target, Sparkles, TrendingUp, Loader2, ArrowRight, Activity,
  GraduationCap, ClipboardList, Award, CalendarDays, ChevronRight, type LucideIcon,
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import Link from "next/link";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

function sapaan() {
  const j = new Date().getHours();
  if (j < 11) return "Selamat pagi";
  if (j < 15) return "Selamat siang";
  if (j < 18) return "Selamat sore";
  return "Selamat malam";
}

type Kelas = { id: string; nama?: string; mapel?: string; guruId?: string };
type Riwayat = { id: string; idUjian?: string; judulUjian?: string; kelas?: string; nilai?: number; timestamp?: any };
type Ujian = { id: string; kelasId?: string; pengaturan?: { judul?: string; jenisUjian?: string; waktuMenit?: number } };

const waktuMs = (t: any) => {
  try {
    if (!t) return 0;
    if (typeof t.toMillis === "function") return t.toMillis();
    if (t.seconds) return t.seconds * 1000;
    if (typeof t === "number") return t;
  } catch { /* abaikan */ }
  return 0;
};

export default function BerandaSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [profil, setProfil] = useState<any>({});
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [semuaUjian, setSemuaUjian] = useState<Ujian[]>([]);
  const [waktuSapaan] = useState(sapaan);

  // Profil & kelas yang diikuti
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(getAuth(), (user) => {
      if (!user) { setIsLoading(false); return; }

      const unsubProfil = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setProfil(snap.data());
      });

      const unsubKelas = onSnapshot(
        query(collection(db, "manajemen_kelas"), where("peserta", "array-contains", user.uid)),
        (snap) => {
          setKelas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Kelas)));
          setIsLoading(false);
        }
      );

      const unsubRiwayat = onSnapshot(
        query(collection(db, "jawaban_siswa"), where("uid", "==", user.uid)),
        (snap) => setRiwayat(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Riwayat)))
      );

      return () => { unsubProfil(); unsubKelas(); unsubRiwayat(); };
    });
    return () => unsubAuth();
  }, []);

  // Asesmen di seluruh kelas yang diikuti (untuk menghitung tugas aktif)
  useEffect(() => {
    const ids = kelas.map((k) => k.id).slice(0, 10); // batas Firestore untuk "in"
    if (ids.length === 0) { setSemuaUjian([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "bank_soal"), where("kelasId", "in", ids)),
      (snap) => setSemuaUjian(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ujian)))
    );
    return () => unsub();
  }, [kelas]);

  const idSelesai = useMemo(() => new Set(riwayat.map((r) => r.idUjian)), [riwayat]);

  const rataRata = useMemo(() => {
    const nilai = riwayat.map((r) => Number(r.nilai)).filter((n) => !Number.isNaN(n));
    if (nilai.length === 0) return null;
    return Math.round(nilai.reduce((a, b) => a + b, 0) / nilai.length);
  }, [riwayat]);

  const tugasAktif = useMemo(
    () => semuaUjian.filter((u) => !idSelesai.has(u.id)),
    [semuaUjian, idSelesai]
  );

  const riwayatTerbaru = useMemo(
    () => [...riwayat].sort((a, b) => waktuMs(b.timestamp) - waktuMs(a.timestamp)).slice(0, 4),
    [riwayat]
  );

  const namaKelasById = useMemo(() => {
    const m = new Map<string, string>();
    kelas.forEach((k) => m.set(k.id, k.nama || "Kelas"));
    return m;
  }, [kelas]);

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 size={38} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto w-full space-y-5 md:space-y-6 pb-4"
    >
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#064e3b] via-emerald-900 to-slate-900 text-white shadow-lg shadow-emerald-950/10 border border-emerald-900/40">
        <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:22px_22px]" aria-hidden="true" />

        <div className="relative z-10 p-5 sm:p-7 lg:p-9 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="min-w-0 lg:max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-emerald-100 text-[10px] sm:text-[11px] font-bold tracking-wide backdrop-blur-sm">
              <GraduationCap size={13} className="text-emerald-300" />
              <span className="truncate">{profil.kelas || "Kelas belum diatur"}</span>
            </span>

            <p className="text-emerald-200/80 text-xs sm:text-sm font-medium mt-3">{waktuSapaan},</p>
            <h1 className={`text-2xl sm:text-3xl lg:text-[34px] font-bold text-white leading-tight break-words ${teachersFont.className}`}>
              {profil.nama || "Pelajar"}
            </h1>

            <p className="text-emerald-100/85 text-[12.5px] sm:text-sm leading-relaxed mt-2.5">
              {tugasAktif.length > 0 ? (
                <>
                  Terdapat <strong className="text-white font-bold">{tugasAktif.length} asesmen</strong> yang menantimu.
                  Selesaikan untuk menambah wawasan dan poin belajarmu.
                </>
              ) : (
                <>Semua asesmen telah kamu selesaikan. Teruslah menjaga semangat belajar yang baik.</>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 mt-4">
              <Link
                href="/dashboard/siswa/ruang-kelas"
                className="min-h-[42px] bg-white text-emerald-800 hover:bg-emerald-50 px-4 rounded-xl font-bold text-[13px] shadow-sm transition-colors flex items-center gap-1.5 active:scale-[0.97]"
              >
                <BookOpen size={16} /> Masuk Ruang Kelas
              </Link>
              <Link
                href="/dashboard/siswa/raport"
                className="min-h-[42px] bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 rounded-xl font-bold text-[13px] transition-colors flex items-center gap-1.5 active:scale-[0.97]"
              >
                <Award size={16} /> Lihat Raport
              </Link>
            </div>
          </div>

          {/* Kartu XP */}
          <div className="shrink-0 w-full lg:w-auto">
            <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-4 text-center backdrop-blur-sm min-w-[150px]">
              <Sparkles size={24} className="mx-auto text-amber-300 mb-1.5" />
              <p className="text-[10px] text-emerald-100/80 uppercase tracking-widest font-bold">Total Poin</p>
              <p className={`text-3xl font-black text-amber-300 leading-none mt-1 ${teachersFont.className}`}>
                {profil.xpPoints || 0}<span className="text-sm font-bold text-amber-200/80 ml-0.5">XP</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============== STATISTIK ============== */}
      <section aria-label="Ringkasan belajar" className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Kelas Diikuti" value={kelas.length} icon={BookOpen} tone="emerald" info="Terdaftar" delay={0.05} />
        <StatCard
          title="Tugas Aktif" value={tugasAktif.length} icon={Target} tone="amber"
          info={tugasAktif.length === 0 ? "Tuntas" : "Perlu dikerjakan"} highlight={tugasAktif.length > 0} delay={0.1}
        />
        <StatCard
          title="Rata-rata Nilai" value={rataRata === null ? "—" : rataRata} icon={TrendingUp} tone="blue"
          info={rataRata === null ? "Belum ada" : rataRata >= 75 ? "Sangat baik" : "Terus tingkatkan"}
          delay={0.15} className="col-span-2 lg:col-span-1"
        />
      </section>

      {/* ============== KONTEN UTAMA ============== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Tugas mendatang */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center gap-2">
            <h2 className={`text-sm font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <ClipboardList size={16} className="text-emerald-600" /> Asesmen yang Perlu Dikerjakan
            </h2>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
              {tugasAktif.length} Aktif
            </span>
          </div>

          <div className="p-3 space-y-2.5">
            {tugasAktif.length > 0 ? (
              tugasAktif.slice(0, 5).map((u) => (
                <Link
                  key={u.id}
                  href="/dashboard/siswa/ruang-kelas"
                  className="relative flex items-center gap-3 p-3 pl-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group"
                >
                  <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-emerald-500/70" aria-hidden="true" />
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Activity size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 text-[13px] truncate">{u.pengaturan?.judul || "Asesmen"}</h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {namaKelasById.get(u.kelasId || "") || "Kelas"} · {u.pengaturan?.jenisUjian || "Tugas"} · {u.pengaturan?.waktuMenit || 60} menit
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <span className="p-3 rounded-full bg-emerald-50 mb-3">
                  <Award size={26} className="text-emerald-600" />
                </span>
                <p className="text-xs font-bold text-slate-800">Tidak ada asesmen tertunda</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Semua tugas sudah kamu selesaikan. Kerja bagus!</p>
              </div>
            )}
          </div>
        </section>

        {/* Aktivitas terakhir */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
            <h2 className={`text-sm font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <CalendarDays size={16} className="text-blue-600" /> Nilai Terbaru
            </h2>
          </div>

          <div className="p-3 space-y-2">
            {riwayatTerbaru.length > 0 ? (
              riwayatTerbaru.map((r) => {
                const n = Math.round(Number(r.nilai) || 0);
                const warna = n >= 75 ? "text-emerald-600" : n >= 60 ? "text-amber-500" : "text-rose-600";
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-[12.5px] truncate">{r.judulUjian || "Asesmen"}</p>
                      <p className="text-[10.5px] text-slate-400 truncate">{r.kelas || "Umum"}</p>
                    </div>
                    <span className={`text-lg font-black tabular-nums shrink-0 ${warna} ${teachersFont.className}`}>{n}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Award size={26} className="text-slate-300 mb-2" />
                <p className="text-[11px] font-bold text-slate-600">Belum ada nilai</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">Selesaikan asesmen untuk melihat hasilnya.</p>
              </div>
            )}
            <Link
              href="/dashboard/siswa/raport"
              className="mt-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
            >
              Lihat semua di Raport <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

/* ---------------------------------- UI ---------------------------------- */

const toneStyles: Record<string, { icon: string; accent: string; dot: string }> = {
  emerald: { icon: "bg-emerald-50 text-emerald-600 ring-emerald-100", accent: "from-emerald-500/70", dot: "bg-emerald-500" },
  amber: { icon: "bg-amber-50 text-amber-600 ring-amber-100", accent: "from-amber-500/70", dot: "bg-amber-500" },
  blue: { icon: "bg-blue-50 text-blue-600 ring-blue-100", accent: "from-blue-500/70", dot: "bg-blue-500" },
};

function StatCard({
  title, value, icon: Icon, tone, info, highlight, delay, className = "",
}: {
  title: string; value: number | string; icon: LucideIcon; tone: string;
  info: string; highlight?: boolean; delay: number; className?: string;
}) {
  const c = toneStyles[tone] ?? toneStyles.emerald;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className={`group relative overflow-hidden bg-white p-4 md:p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        highlight ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"
      } ${className}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent ${c.accent}`} aria-hidden="true" />
      <div className="flex justify-between items-start gap-2 mb-3">
        <span className={`p-2.5 rounded-xl shrink-0 ring-1 ${c.icon}`}>
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-[62%]">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${highlight ? "bg-amber-500" : c.dot}`} aria-hidden="true" />
          <span className="truncate">{info}</span>
        </span>
      </div>
      <p className={`text-2xl md:text-[28px] font-black text-slate-800 tracking-tight tabular-nums leading-none ${teachersFont.className}`}>
        {value}
      </p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 truncate">{title}</p>
    </motion.div>
  );
}
