"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Target, BrainCircuit, Activity, Info } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { MemuatHalaman } from "@/components/Memuat";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AnalitikGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [statistik, setStatistik] = useState({ rataNilai: 0, totalSiswa: 0, rataBantuanAI: 0, persentaseMandiri: 0, persentaseBerkembang: 0, persentasePerluBimbingan: 0 });

  useEffect(() => {
    const auth = getAuth();
    let unsubKelas: (() => void) | undefined;
    let unsubJawaban: (() => void) | undefined;

    const kalkulasiStatistik = (data: any[]) => {
      if (data.length === 0) {
        setStatistik({ rataNilai: 0, totalSiswa: 0, rataBantuanAI: 0, persentaseMandiri: 0, persentaseBerkembang: 0, persentasePerluBimbingan: 0 });
        return;
      }
      let totalNilai = 0, totalBantuan = 0, countMandiri = 0, countBerkembang = 0, countBimbingan = 0;
      data.forEach(item => {
        totalNilai += Number(item.nilai) || 0;
        const bantuan = Number(item.metadataAnalitik?.totalBantuanAI ?? item.metadataAnalitik?.jumlahBantuanAI ?? 0);
        totalBantuan += bantuan;
        const status = item.metadataAnalitik?.statusKemandirian || "Selesai";
        if (status === "Mandiri") countMandiri++; else if (status === "Berkembang") countBerkembang++; else if (status === "Perlu Pendampingan") countBimbingan++;
      });
      setStatistik({
        rataNilai: Math.round(totalNilai / data.length), totalSiswa: data.length, rataBantuanAI: parseFloat((totalBantuan / data.length).toFixed(1)),
        persentaseMandiri: Math.round((countMandiri / data.length) * 100), persentaseBerkembang: Math.round((countBerkembang / data.length) * 100), persentasePerluBimbingan: Math.round((countBimbingan / data.length) * 100)
      });
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubKelas?.(); unsubKelas = undefined;
      unsubJawaban?.(); unsubJawaban = undefined;
      if (!user) { setIsLoading(false); return; }

      unsubKelas = onSnapshot(
        query(collection(db, "manajemen_kelas"), where("guruId", "==", user.uid)),
        (kelasSnap) => {
          const namaKelasSet = new Set(kelasSnap.docs.map((k) => k.data().nama).filter(Boolean));
          unsubJawaban?.(); unsubJawaban = undefined;

          if (namaKelasSet.size === 0) {
            kalkulasiStatistik([]);
            setIsLoading(false);
            return;
          }

          unsubJawaban = onSnapshot(query(collection(db, "jawaban_siswa")), (snapshot) => {
            try {
              const validData = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() } as any))
                .filter((item) => namaKelasSet.has(item.kelas));
              kalkulasiStatistik(validData);
            } catch { /* abaikan */ } finally { setIsLoading(false); }
          });
        }
      );
    });

    return () => { unsubAuth(); unsubKelas?.(); unsubJawaban?.(); };
  }, []);

  if (isLoading) return <MemuatHalaman label="Memuat Analitik Kemandirian..." />;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`max-w-6xl mx-auto space-y-5 md:space-y-6 pb-4 ${teachersFont.className}`}>
      <header className="border-b border-slate-200 pb-4 md:pb-5">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2.5"><Activity className="text-blue-600 shrink-0" /> Analitik Proses Berorientasi Kemandirian</h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1.5 max-w-3xl leading-relaxed">Sesuai kerangka [x-AI], dasbor ini tidak hanya menampilkan nilai akhir, tetapi melacak jejak mediasi (scaffolding) dan tingkat ketergantungan peserta didik terhadap AI.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between"><div className="flex items-center gap-2 sm:gap-3 text-slate-500 mb-3 sm:mb-4"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><Target size={18}/></div><span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider leading-tight">Rata-rata Nilai</span></div><p className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 tabular-nums">{statistik.rataNilai}</p></div>
        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between"><div className="flex items-center gap-2 sm:gap-3 text-slate-500 mb-3 sm:mb-4"><div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0"><BrainCircuit size={18}/></div><span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider leading-tight">Intervensi AI</span></div><p className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 flex items-baseline gap-1.5 tabular-nums">{statistik.rataBantuanAI} <span className="text-[11px] sm:text-xs font-medium text-slate-500">Kali/Siswa</span></p></div>
        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between"><div className="flex items-center gap-2 sm:gap-3 text-slate-500 mb-3 sm:mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><TrendingUp size={18}/></div><span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider leading-tight">Kemandirian</span></div><p className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600 tabular-nums">{statistik.persentaseMandiri}%</p></div>
        <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between"><div className="flex items-center gap-2 sm:gap-3 text-slate-500 mb-3 sm:mb-4"><div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0"><Users size={18}/></div><span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider leading-tight">Partisipan</span></div><p className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 tabular-nums">{statistik.totalSiswa}</p></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart3 className="text-blue-500"/> Distribusi Kemandirian Peserta Didik</h3>
        <div className="space-y-6">
          <div><div className="flex justify-between text-sm font-bold mb-2"><span className="text-emerald-700">Mandiri (0 - Sedikit Bantuan AI)</span><span>{statistik.persentaseMandiri}%</span></div><div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-emerald-500 h-4 rounded-full" style={{ width: `${statistik.persentaseMandiri}%` }}></div></div></div>
          <div><div className="flex justify-between text-sm font-bold mb-2"><span className="text-amber-600">Berkembang (Bantuan AI Moderat)</span><span>{statistik.persentaseBerkembang}%</span></div><div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-amber-400 h-4 rounded-full" style={{ width: `${statistik.persentaseBerkembang}%` }}></div></div></div>
          <div><div className="flex justify-between text-sm font-bold mb-2"><span className="text-red-600">Perlu Pendampingan (Sangat Bergantung pada AI)</span><span>{statistik.persentasePerluBimbingan}%</span></div><div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-red-500 h-4 rounded-full" style={{ width: `${statistik.persentasePerluBimbingan}%` }}></div></div></div>
        </div>

        {/* DIMENSI 4: DISCLAIMER LABELING SEMENTARA */}
        <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3 text-sm text-indigo-800">
          <Info className="shrink-0 mt-0.5" size={18}/>
          <div>
            <p className="font-bold mb-1">Peringatan Etika & Validasi (Dimensi Pengawasan Guru):</p>
            <p className="leading-relaxed">Status kemandirian di atas <strong>bersifat sementara</strong> dan spesifik untuk asesmen ini. Dilarang memberikan pelabelan permanen (deterministik) kepada siswa. AI hanya membantu memetakan pola, keputusan pedagogis akhir tetap di tangan Guru berdasarkan korpus budaya lokal.</p>
          </div>
        </div>
      </div>
    </motion.main>
  );
}