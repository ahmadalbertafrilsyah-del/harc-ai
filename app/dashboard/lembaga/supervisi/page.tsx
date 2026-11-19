"use client";

import { motion } from "framer-motion";
import {
  ClipboardCheck, Search, CheckCircle2, BookOpen, BrainCircuit, Users, Sparkles,
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { MemuatHalaman } from "@/components/Memuat";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

type BarisSupervisi = {
  id: string;
  nama: string;
  spesialisasi: string;
  totalModul: number;
  modulDisetujui: number;
  totalKelas: number;
  totalUjian: number;
};

export default function SupervisiELearningLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [guruList, setGuruList] = useState<any[]>([]);
  const [modulList, setModulList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    let unsubGuru: (() => void) | undefined;
    let unsubExtra: (() => void)[] = [];

    const bersihkanExtra = () => {
      unsubExtra.forEach((fn) => fn());
      unsubExtra = [];
    };

    const chunkIds = (arr: string[], size = 10) => {
      const out: string[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const unsubAuth = onAuthStateChanged(getAuth(), async (user) => {
      unsubGuru?.(); unsubGuru = undefined;
      bersihkanExtra();
      if (!user) { setIsLoading(false); return; }

      let npsn = "";
      try {
        const profil = await getDoc(doc(db, "users", user.uid));
        npsn = profil.exists() ? (profil.data().npsn || profil.data().instansi || "") : "";
      } catch { /* abaikan */ }

      if (cancelled) return;
      if (!npsn) { setGuruList([]); setIsLoading(false); return; }

      unsubGuru = onSnapshot(
        query(collection(db, "users"), where("role", "==", "guru"), where("npsn", "==", npsn)),
        (snap) => {
          const gurus = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setGuruList(gurus);
          bersihkanExtra();

          const guruIds = gurus.map((g) => g.id);
          if (guruIds.length === 0) {
            setModulList([]); setKelasList([]); setUjianList([]);
            setIsLoading(false);
            return;
          }

          const modulBuckets = new Map<number, any[]>();
          const kelasBuckets = new Map<number, any[]>();
          const ujianBuckets = new Map<number, any[]>();
          let unsubUjianList: (() => void)[] = [];

          const chunks = chunkIds(guruIds, 10);
          chunks.forEach((ids, idx) => {
            const uMod = onSnapshot(
              query(collection(db, "modul_ajar"), where("userId", "in", ids)),
              (mSnap) => {
                modulBuckets.set(idx, mSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setModulList(Array.from(modulBuckets.values()).flat());
              }
            );
            const uKel = onSnapshot(
              query(collection(db, "manajemen_kelas"), where("guruId", "in", ids)),
              (kSnap) => {
                kelasBuckets.set(idx, kSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                const semuaKelas = Array.from(kelasBuckets.values()).flat();
                setKelasList(semuaKelas);

                unsubUjianList.forEach((fn) => fn());
                unsubUjianList = [];
                ujianBuckets.clear();
                const kelasIds = semuaKelas.map((k) => k.id);
                if (kelasIds.length === 0) {
                  setUjianList([]);
                  return;
                }
                chunkIds(kelasIds, 10).forEach((kIds, kIdx) => {
                  const uUj = onSnapshot(
                    query(collection(db, "bank_soal"), where("kelasId", "in", kIds)),
                    (uSnap) => {
                      ujianBuckets.set(kIdx, uSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
                      setUjianList(Array.from(ujianBuckets.values()).flat());
                    }
                  );
                  unsubUjianList.push(uUj);
                });
              }
            );
            unsubExtra.push(uMod, uKel, () => unsubUjianList.forEach((fn) => fn()));
          });
          setIsLoading(false);
        }
      );
    });

    return () => {
      cancelled = true;
      unsubAuth();
      unsubGuru?.();
      bersihkanExtra();
    };
  }, []);

  const ringkasanGuru = useMemo<BarisSupervisi[]>(() => {
    const kelasById = new Map<string, string>();
    kelasList.forEach((k) => { if (k.guruId) kelasById.set(k.id, k.guruId); });

    return guruList
      .map((g) => {
        const modulGuru = modulList.filter((m) => m.userId === g.id);
        const kelasGuru = kelasList.filter((k) => k.guruId === g.id);
        const ujianGuru = ujianList.filter((u) => kelasById.get(u.kelasId) === g.id);
        return {
          id: g.id,
          nama: g.nama || "Pendidik",
          spesialisasi: g.spesialisasi || "Guru Mata Pelajaran",
          totalModul: modulGuru.length,
          modulDisetujui: modulGuru.filter((m) => m.statusValidasi === "disetujui").length,
          totalKelas: kelasGuru.length,
          totalUjian: ujianGuru.length,
        };
      })
      .sort((a, b) => (b.totalModul + b.totalUjian) - (a.totalModul + a.totalUjian));
  }, [guruList, modulList, kelasList, ujianList]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ringkasanGuru;
    return ringkasanGuru.filter((r) =>
      r.nama.toLowerCase().includes(q) || r.spesialisasi.toLowerCase().includes(q)
    );
  }, [ringkasanGuru, searchQuery]);

  const totalPerangkat = useMemo(() => ringkasanGuru.reduce((s, r) => s + r.totalModul, 0), [ringkasanGuru]);
  const totalUjianAktif = useMemo(() => ringkasanGuru.reduce((s, r) => s + r.totalUjian, 0), [ringkasanGuru]);

  if (isLoading) return <MemuatHalaman label="Memuat Supervisi E-Learning..." />;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto w-full space-y-5 md:space-y-6 pb-4">

      <header className="border-b border-slate-200 pb-4 md:pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2.5 leading-tight ${teachersFont.className}`}>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-100 shrink-0"><ClipboardCheck size={22} aria-hidden="true" /></span>
            Supervisi Perangkat &amp; E-Learning
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
            Pantau produktivitas pembuatan perangkat ajar (Modul Ajar, RPP, PROTA, PROMES) serta keaktifan evaluasi CBT guru secara real-time.
          </p>
        </div>
      </header>

      {/* Ringkasan Institusi */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={13} className="text-purple-500" /> Guru Aktif
          </p>
          <p className={`text-xl sm:text-3xl font-black text-slate-800 mt-1.5 tabular-nums ${teachersFont.className}`}>{ringkasanGuru.length}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen size={13} className="text-blue-500" /> Perangkat Ajar
          </p>
          <p className={`text-xl sm:text-3xl font-black text-blue-700 mt-1.5 tabular-nums ${teachersFont.className}`}>{totalPerangkat}</p>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BrainCircuit size={13} className="text-emerald-500" /> Soal CBT Aktif
          </p>
          <p className={`text-xl sm:text-3xl font-black text-emerald-700 mt-1.5 tabular-nums ${teachersFont.className}`}>{totalUjianAktif}</p>
        </div>
      </section>

      {/* Pencarian */}
      <section aria-label="Kontrol Pencarian" className="flex flex-col sm:flex-row gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
          <input
            type="text" placeholder="Cari nama pendidik atau mata pelajaran…"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
            aria-label="Cari Pendidik"
          />
        </div>
        <span className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs shrink-0">
          <Sparkles size={15} aria-hidden="true" /> {filtered.length} Pendidik
        </span>
      </section>

      {/* Daftar Supervisi */}
      <section aria-label="Daftar Supervisi Pendidik" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className={`text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
            <BookOpen size={18} className="text-purple-600" aria-hidden="true" /> Portofolio Perangkat &amp; Evaluasi Guru
          </h2>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden p-3 space-y-3 bg-slate-50/30">
          {filtered.length > 0 ? filtered.map((item) => (
            <div key={item.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{item.nama}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.spesialisasi}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border shrink-0 ${
                  item.totalModul + item.totalUjian > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}>
                  <CheckCircle2 size={11} /> {item.totalModul + item.totalUjian > 0 ? "Produktif" : "Belum Ada"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-xs font-black text-slate-800 tabular-nums">{item.totalModul}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Perangkat</p>
                </div>
                <div className="bg-purple-50/60 rounded-lg p-2">
                  <p className="text-xs font-black text-purple-700 tabular-nums">{item.modulDisetujui}</p>
                  <p className="text-[9px] text-purple-600 font-bold uppercase">Tervalidasi</p>
                </div>
                <div className="bg-blue-50/60 rounded-lg p-2">
                  <p className="text-xs font-black text-blue-700 tabular-nums">{item.totalUjian}</p>
                  <p className="text-[9px] text-blue-600 font-bold uppercase">Ujian CBT</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-12 px-4 text-center bg-white rounded-xl border border-slate-200">
              <ClipboardCheck size={36} className="mx-auto text-slate-300 mb-2.5" aria-hidden="true" />
              <p className="text-slate-600 font-bold text-sm">Belum ada data pendidik</p>
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <caption className="sr-only">Tabel Supervisi Perangkat Pembelajaran dan E-Learning Pendidik</caption>
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th scope="col" className="px-6 py-4">Pendidik</th>
                <th scope="col" className="px-6 py-4 text-center">Perangkat Ajar</th>
                <th scope="col" className="px-6 py-4 text-center">Tervalidasi</th>
                <th scope="col" className="px-6 py-4 text-center">Kelas &amp; Ujian CBT</th>
                <th scope="col" className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{item.nama}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.spesialisasi}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-slate-700 tabular-nums">{item.totalModul}</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-purple-700 tabular-nums">{item.modulDisetujui}</td>
                  <td className="px-6 py-4 text-center text-xs font-bold text-slate-600 tabular-nums">
                    {item.totalKelas} Kelas • <span className="text-blue-700">{item.totalUjian} Ujian CBT</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${
                      item.totalModul + item.totalUjian > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}>
                      <CheckCircle2 size={12} aria-hidden="true" /> {item.totalModul + item.totalUjian > 0 ? "Produktif" : "Belum Ada"}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <ClipboardCheck size={40} className="mx-auto text-slate-300 mb-3" aria-hidden="true" />
                    <p className="text-slate-600 font-bold text-sm">Belum ada pendidik terdaftar di institusi ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.main>
  );
}
