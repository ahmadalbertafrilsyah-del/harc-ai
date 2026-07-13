"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Target, BrainCircuit, Activity, AlertCircle, Loader2, Info } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AnalitikGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [dataSiswa, setDataSiswa] = useState<any[]>([]);
  const [statistik, setStatistik] = useState({ rataNilai: 0, totalSiswa: 0, rataBantuanAI: 0, persentaseMandiri: 0, persentaseBerkembang: 0, persentasePerluBimbingan: 0 });

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => { if (user) { setUserUid(user.uid); fetchAnalitik(); } else { setIsLoading(false); } });
  }, []);

  const fetchAnalitik = () => {
    const q = query(collection(db, "jawaban_siswa"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const validData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => item !== null);
        setDataSiswa(validData); kalkulasiStatistik(validData);
      } catch (error) {} finally { setIsLoading(false); }
    });
    return unsubscribe;
  };

  const kalkulasiStatistik = (data: any[]) => {
    if (data.length === 0) return;
    let totalNilai = 0, totalBantuan = 0, countMandiri = 0, countBerkembang = 0, countBimbingan = 0;
    data.forEach(item => {
      totalNilai += item.nilai || 0;
      totalBantuan += item.metadataAnalitik?.totalBantuanAI || 0;
      const status = item.metadataAnalitik?.statusKemandirian || "Selesai";
      if (status === "Mandiri") countMandiri++; else if (status === "Berkembang") countBerkembang++; else if (status === "Perlu Pendampingan") countBimbingan++;
    });
    setStatistik({
      rataNilai: Math.round(totalNilai / data.length), totalSiswa: data.length, rataBantuanAI: parseFloat((totalBantuan / data.length).toFixed(1)),
      persentaseMandiri: Math.round((countMandiri / data.length) * 100), persentaseBerkembang: Math.round((countBerkembang / data.length) * 100), persentasePerluBimbingan: Math.round((countBimbingan / data.length) * 100)
    });
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`max-w-6xl mx-auto space-y-6 pb-20 ${teachersFont.className}`}>
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2"><Activity className="text-blue-600" /> Analitik Proses Berorientasi Kemandirian</h1>
        <p className="text-slate-600 text-sm mt-1.5 max-w-3xl leading-relaxed">Sesuai kerangka [x-AI], dasbor ini tidak hanya menampilkan nilai akhir, tetapi melacak jejak mediasi (scaffolding) dan tingkat ketergantungan peserta didik terhadap AI.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div className="flex items-center gap-3 text-slate-500 mb-4"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Target size={20}/></div><span className="font-bold text-sm uppercase tracking-wider">Rata-rata Nilai</span></div><p className="text-4xl font-bold text-slate-800">{statistik.rataNilai}</p></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div className="flex items-center gap-3 text-slate-500 mb-4"><div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><BrainCircuit size={20}/></div><span className="font-bold text-sm uppercase tracking-wider">Intervensi AI</span></div><p className="text-4xl font-bold text-slate-800 flex items-end gap-2">{statistik.rataBantuanAI} <span className="text-sm font-medium text-slate-500 mb-1">Kali/Siswa</span></p></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div className="flex items-center gap-3 text-slate-500 mb-4"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20}/></div><span className="font-bold text-sm uppercase tracking-wider">Tingkat Kemandirian</span></div><p className="text-4xl font-bold text-emerald-600">{statistik.persentaseMandiri}%</p></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div className="flex items-center gap-3 text-slate-500 mb-4"><div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div><span className="font-bold text-sm uppercase tracking-wider">Total Partisipan</span></div><p className="text-4xl font-bold text-slate-800">{statistik.totalSiswa}</p></div>
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