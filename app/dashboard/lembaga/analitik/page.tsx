"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, BrainCircuit, Activity,
  Loader2, Search, Download, Users, CheckCircle, FileText, BarChart3,
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, doc, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

type BarisAnalitik = {
  id: string;
  nama: string;
  kelas: string;
  nilaiAkhir: number;
  jumlahUjian: number;
  petunjuk: number;
  status: "Mandiri" | "Berkembang" | "Perlu Pendampingan";
};

const statusDariBantuan = (rata: number): BarisAnalitik["status"] =>
  rata === 0 ? "Mandiri" : rata <= 2 ? "Berkembang" : "Perlu Pendampingan";

export default function AnalitikLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [namaInstansi, setNamaInstansi] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [idsSiswa, setIdsSiswa] = useState<string[]>([]);
  const [petaSiswa, setPetaSiswa] = useState<Record<string, any>>({});
  const [jawaban, setJawaban] = useState<any[]>([]);

  // Profil lembaga + daftar siswa se-instansi (via npsn)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(getAuth(), (user) => {
      if (!user) { setIsLoading(false); return; }
      const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const npsn = data.npsn || data.instansi;
        setNamaInstansi(data.namaLembaga || data.namaInstansi || (npsn ? `NPSN: ${npsn}` : "Instansi"));
        if (!npsn) { setIsLoading(false); return; }

        const unsubSiswa = onSnapshot(
          query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn)),
          (snap) => {
            const peta: Record<string, any> = {};
            snap.docs.forEach((s) => { peta[s.id] = s.data(); });
            setPetaSiswa(peta);
            setIdsSiswa(snap.docs.map((s) => s.id));
          }
        );
        return () => unsubSiswa();
      });
      return () => unsubProfil();
    });
    return () => unsubAuth();
  }, []);

  // Hasil asesmen (sumber data NYATA — sama dengan analitik guru)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "jawaban_siswa"), (snap) => {
      setJawaban(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Agregasi per siswa
  const baris = useMemo<BarisAnalitik[]>(() => {
    if (idsSiswa.length === 0) return [];
    const setIds = new Set(idsSiswa);
    const acc = new Map<string, { nama: string; kelas: string; totalNilai: number; count: number; totalBantuan: number }>();

    jawaban.forEach((j) => {
      const uid = j.uid || j.siswaId;
      if (!uid || !setIds.has(uid)) return;
      const cur = acc.get(uid) || { nama: "", kelas: "", totalNilai: 0, count: 0, totalBantuan: 0 };
      cur.nama = petaSiswa[uid]?.nama || j.nama || cur.nama || "Siswa";
      cur.kelas = petaSiswa[uid]?.kelas || j.kelas || cur.kelas || "-";
      cur.totalNilai += Number(j.nilai) || 0;
      cur.count += 1;
      cur.totalBantuan += Number(j.metadataAnalitik?.totalBantuanAI ?? j.metadataAnalitik?.jumlahBantuanAI ?? 0);
      acc.set(uid, cur);
    });

    return Array.from(acc.entries()).map(([id, v]) => ({
      id,
      nama: v.nama,
      kelas: v.kelas,
      nilaiAkhir: v.count ? Math.round(v.totalNilai / v.count) : 0,
      jumlahUjian: v.count,
      petunjuk: v.totalBantuan,
      status: statusDariBantuan(v.count ? v.totalBantuan / v.count : 0),
    }));
  }, [jawaban, idsSiswa, petaSiswa]);

  const kpi = useMemo(() => {
    const n = baris.length;
    if (n === 0) return { rataPrestasi: 0, partisipan: 0, persenMandiri: 0, mandiri: 0, berkembang: 0, pendampingan: 0 };
    const rataPrestasi = Math.round(baris.reduce((s, r) => s + r.nilaiAkhir, 0) / n);
    const mandiri = baris.filter((r) => r.status === "Mandiri").length;
    const berkembang = baris.filter((r) => r.status === "Berkembang").length;
    const pendampingan = baris.filter((r) => r.status === "Perlu Pendampingan").length;
    return {
      rataPrestasi,
      partisipan: n,
      persenMandiri: Math.round((mandiri / n) * 100),
      mandiri: Math.round((mandiri / n) * 100),
      berkembang: Math.round((berkembang / n) * 100),
      pendampingan: Math.round((pendampingan / n) * 100),
    };
  }, [baris]);

  const filteredData = baris.filter(
    (item) =>
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEksporLaporan = () => {
    if (baris.length === 0) return alert("Belum ada data analitik untuk diekspor.");
    const headers = ["Nama Siswa", "Kelas", "Jumlah Asesmen", "Rata-rata Nilai", "Total Bantuan AI", "Status Kemandirian"];
    const rows = baris.map((item) => [
      `"${item.nama}"`, `"${item.kelas}"`, item.jumlahUjian, item.nilaiAkhir, item.petunjuk, `"${item.status}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Analitik_${namaInstansi.replace(/\s+/g, "_")}_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-purple-600 mb-4" />
        <p className="font-bold text-sm text-slate-500 uppercase tracking-widest">Mengkalkulasi Data…</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto w-full space-y-5 md:space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="min-w-0">
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 leading-tight ${teachersFont.className}`}>Laporan Analitik Instansi</h1>
          <p className="text-slate-500 text-[13px] md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Performa akademik dan tingkat kemandirian belajar siswa di <strong className="text-purple-700">{namaInstansi}</strong>, dirangkum dari hasil asesmen daring.
          </p>
        </div>
        <button
          onClick={handleEksporLaporan}
          className="shrink-0 bg-white border border-slate-300 text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
        >
          <Download size={16} /> Unduh Rekap CSV
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        <KpiCard title="Rata-rata Prestasi" value={kpi.rataPrestasi} suffix="/ 100" icon={TrendingUp}
          note="Nilai rata-rata seluruh asesmen" accent="emerald" />
        <KpiCard title="Total Partisipan" value={kpi.partisipan} suffix="Siswa" icon={Users}
          note="Siswa yang telah mengerjakan asesmen" accent="purple" />
        <KpiCard title="Tingkat Kemandirian" value={`${kpi.persenMandiri}%`} icon={BrainCircuit}
          note="Persentase siswa berkategori Mandiri" accent="blue" />
      </div>

      {/* Distribusi kemandirian */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
        <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 mb-5 ${teachersFont.className}`}>
          <BarChart3 size={18} className="text-purple-600" /> Distribusi Kemandirian Peserta Didik
        </h3>
        <div className="space-y-4">
          <BarDistribusi label="Mandiri (tanpa/sedikit bantuan AI)" persen={kpi.mandiri} warna="bg-emerald-500" teks="text-emerald-700" />
          <BarDistribusi label="Berkembang (bantuan AI moderat)" persen={kpi.berkembang} warna="bg-blue-500" teks="text-blue-700" />
          <BarDistribusi label="Perlu Pendampingan (sangat bergantung AI)" persen={kpi.pendampingan} warna="bg-amber-500" teks="text-amber-700" />
        </div>
        <div className="mt-5 flex items-start gap-2.5 p-3 rounded-xl bg-purple-50 border border-purple-100">
          <BrainCircuit size={15} className="text-purple-600 shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-purple-900/80 leading-relaxed">
            Status kemandirian bersifat <strong>sementara</strong> dan spesifik per asesmen. AI hanya memetakan pola;
            keputusan pedagogis akhir tetap di tangan guru.
          </p>
        </div>
      </div>

      {/* Tabel detail */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
            <Activity size={18} className="text-purple-600" /> Detail Evaluasi Siswa
          </h3>
          <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-2 rounded-xl w-full sm:w-72 shadow-sm focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau kelas…"
              className="bg-transparent border-none outline-none text-xs w-full text-slate-700 font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="px-6 py-4 whitespace-nowrap">Nama Siswa</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Rata-rata Nilai</th>
                <th className="px-6 py-4 whitespace-nowrap">Bantuan AI (Scaffolding)</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <AnimatePresence>
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-slate-800 text-sm">{item.nama}</p>
                        <p className="text-[11px] text-slate-500">{item.kelas} · {item.jumlahUjian} asesmen</p>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`text-base font-black tabular-nums ${item.nilaiAkhir >= 80 ? "text-emerald-600" : item.nilaiAkhir >= 70 ? "text-blue-600" : "text-amber-600"}`}>
                          {item.nilaiAkhir}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${item.petunjuk > 5 ? "bg-amber-400" : "bg-purple-500"}`} style={{ width: `${Math.min((item.petunjuk / 10) * 100, 100)}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 tabular-nums">{item.petunjuk}x</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
                          item.status === "Mandiri" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          item.status === "Berkembang" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-600 font-bold text-sm">Belum ada data asesmen</p>
                      <p className="text-slate-400 text-xs mt-1">Data muncul setelah siswa menyelesaikan asesmen daring.</p>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------------------------- UI ---------------------------------- */

const aksenKpi: Record<string, { bg: string; ic: string; blob: string }> = {
  emerald: { bg: "bg-emerald-50 border-emerald-100", ic: "text-emerald-600", blob: "bg-emerald-500/10" },
  purple: { bg: "bg-purple-50 border-purple-100", ic: "text-purple-600", blob: "bg-purple-500/10" },
  blue: { bg: "bg-blue-50 border-blue-100", ic: "text-blue-600", blob: "bg-blue-500/10" },
};

function KpiCard({ title, value, suffix, icon: Icon, note, accent }: {
  title: string; value: number | string; suffix?: string; icon: any; note: string; accent: string;
}) {
  const a = aksenKpi[accent] ?? aksenKpi.purple;
  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full ${a.blob}`} aria-hidden="true" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
          <div className={`p-2 rounded-lg shadow-sm border ${a.bg} ${a.ic}`}><Icon size={18} /></div>
        </div>
        <div className="flex items-end gap-2">
          <span className={`text-4xl font-black text-slate-800 tabular-nums ${teachersFont.className}`}>{value}</span>
          {suffix && <span className="text-sm font-bold text-slate-400 mb-1">{suffix}</span>}
        </div>
        <p className="text-[11px] text-slate-500 mt-3 font-medium flex items-center gap-1"><CheckCircle size={12} className={a.ic} /> {note}</p>
      </div>
    </div>
  );
}

function BarDistribusi({ label, persen, warna, teks }: { label: string; persen: number; warna: string; teks: string }) {
  return (
    <div>
      <div className="flex justify-between text-[13px] font-bold mb-1.5">
        <span className={teks}>{label}</span>
        <span className="tabular-nums text-slate-700">{persen}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${warna}`} style={{ width: `${persen}%` }} />
      </div>
    </div>
  );
}
