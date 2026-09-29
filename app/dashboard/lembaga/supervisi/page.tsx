"use client";

import { motion } from "framer-motion";
import {
  ClipboardCheck, CalendarDays, Search, CheckCircle2, Loader2, BookOpen,
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

const waktuMs = (j: any) => {
  const t = j.timestamp;
  if (!t) return j.tanggal ? new Date(j.tanggal).getTime() : 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (t.seconds) return t.seconds * 1000;
  return typeof t === "number" ? t : 0;
};

export default function SupervisiKBMLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [jurnalList, setJurnalList] = useState<any[]>([]);
  const [guruMap, setGuruMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(getAuth(), async (user) => {
      if (!user) { setIsLoading(false); return; }

      let npsn = "";
      try {
        const profil = await getDoc(doc(db, "users", user.uid));
        npsn = profil.exists() ? (profil.data().npsn || profil.data().instansi || "") : "";
      } catch { /* abaikan */ }

      if (!npsn) { setJurnalList([]); setIsLoading(false); return; }

      let unsubJurnal: (() => void) | null = null;
      const unsubGuru = onSnapshot(
        query(collection(db, "users"), where("role", "==", "guru"), where("npsn", "==", npsn)),
        (guruSnap) => {
          const peta: Record<string, string> = {};
          const ids = new Set<string>();
          guruSnap.docs.forEach((g) => { peta[g.id] = g.data().nama || "Guru"; ids.add(g.id); });
          setGuruMap(peta);

          if (unsubJurnal) { unsubJurnal(); unsubJurnal = null; }
          unsubJurnal = onSnapshot(collection(db, "jurnal_kbm"), (snap) => {
            const data = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as any))
              .filter((j) => ids.has(j.guruId))
              .sort((a, b) => waktuMs(b) - waktuMs(a));
            setJurnalList(data);
            setIsLoading(false);
          });
        }
      );

      return () => { if (unsubJurnal) unsubJurnal(); unsubGuru(); };
    });
    return () => unsubAuth();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jurnalList;
    return jurnalList.filter((j) => {
      const nama = (guruMap[j.guruId] || j.namaGuru || "").toLowerCase();
      return nama.includes(q) || (j.mapel || "").toLowerCase().includes(q) || (j.materi || "").toLowerCase().includes(q);
    });
  }, [jurnalList, guruMap, searchQuery]);

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-purple-600" aria-hidden="true" /></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto w-full space-y-5 md:space-y-6 pb-10">

      <header className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2.5 leading-tight ${teachersFont.className}`}>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-100 shrink-0"><ClipboardCheck size={22} aria-hidden="true" /></span>
            Supervisi Akademik
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl leading-relaxed">
            Pantau kedisiplinan administratif pendidik. Jurnal KBM yang diisi guru se-instansi ditinjau secara real-time di sini.
          </p>
        </div>
      </header>

      {/* Filter & Pencarian */}
      <section aria-label="Kontrol Pencarian" className="flex flex-col sm:flex-row gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
          <input
            type="text" placeholder="Cari nama guru, mapel, atau materi…"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
            aria-label="Cari Jurnal"
          />
        </div>
        <span className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-xs shrink-0">
          <CalendarDays size={16} aria-hidden="true" /> {filtered.length} Jurnal
        </span>
      </section>

      {/* Tabel Jurnal KBM */}
      <section aria-label="Daftar Jurnal Mengajar" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
            <BookOpen size={18} className="text-purple-600" aria-hidden="true" /> Laporan KBM Harian
          </h2>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <caption className="sr-only">Tabel Jurnal Kegiatan Belajar Mengajar Guru</caption>
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th scope="col" className="px-6 py-4">Pendidik &amp; Kelas</th>
                <th scope="col" className="px-6 py-4">Materi Pembelajaran</th>
                <th scope="col" className="px-6 py-4 text-center">Tanggal</th>
                <th scope="col" className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((jurnal) => (
                  <tr key={jurnal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{guruMap[jurnal.guruId] || jurnal.namaGuru || "Guru"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Mapel: {jurnal.mapel || "-"} • Kelas: {jurnal.kelas || jurnal.namaKelas || "Umum"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700 line-clamp-2 max-w-md">{jurnal.materi || "-"}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-600 whitespace-nowrap">
                      {jurnal.tanggal || (waktuMs(jurnal) ? new Date(waktuMs(jurnal)).toLocaleDateString("id-ID") : "-")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                        <CheckCircle2 size={12} aria-hidden="true" /> Terekam
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <ClipboardCheck size={40} className="mx-auto text-slate-300 mb-3" aria-hidden="true" />
                    <p className="text-slate-600 font-bold text-sm">{searchQuery ? "Tidak ada jurnal yang cocok" : "Belum ada jurnal KBM"}</p>
                    <p className="text-slate-400 text-xs mt-1">{searchQuery ? "Coba kata kunci lain." : "Jurnal akan muncul setelah guru mengisi laporan mengajar."}</p>
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
