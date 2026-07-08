"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, BrainCircuit, Activity, 
  Loader2, Search, Download, Clock, CheckCircle, FileText, Landmark
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, doc, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AnalitikLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [namaInstansi, setNamaInstansi] = useState("");
  
  const [kpiStats, setKpiStats] = useState({
    rataPrestasi: 0,
    waktuDihemat: 0,
    efektivitasAI: 0
  });
  
  const [analitikSiswa, setAnalitikSiswa] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const npsn = data.npsn || data.instansi; // Kunci Relasi (NPSN)
            setNamaInstansi(data.namaLembaga || data.namaInstansi || `NPSN: ${npsn}`);

            if (npsn) {
              const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn));
              const unsubSiswa = onSnapshot(qSiswa, (siswaSnap) => {
                const dataSiswa = siswaSnap.docs.map(s => ({ id: s.id, ...s.data() } as any));
                const idsSiswa = dataSiswa.map(s => s.id);

                if (idsSiswa.length === 0) {
                  setAnalitikSiswa([]);
                  setKpiStats({ rataPrestasi: 0, waktuDihemat: 0, efektivitasAI: 0 });
                  setIsLoading(false);
                  return;
                }

                const unsubAnalitik = onSnapshot(collection(db, "analitik_siswa"), (analitikSnap) => {
                  const semuaAnalitik = analitikSnap.docs.map(a => ({ id: a.id, ...a.data() } as any));
                  
                  const analitikInstansi = semuaAnalitik
                    .filter(a => idsSiswa.includes(a.userId || a.id))
                    .map(a => {
                      const mSiswa = dataSiswa.find(s => s.id === (a.userId || a.id));
                      return { ...a, namaLengkap: mSiswa ? mSiswa.nama : (a.nama || "Siswa Anonim") }; 
                    });
                  
                  setAnalitikSiswa(analitikInstansi);

                  if (analitikInstansi.length > 0) {
                    const totalNilai = analitikInstansi.reduce((sum, curr) => sum + (Number(curr.nilaiAkhir) || 0), 0);
                    const totalPetunjuk = analitikInstansi.reduce((sum, curr) => sum + (Number(curr.petunjuk) || 0), 0);
                    
                    setKpiStats({
                      rataPrestasi: Math.round(totalNilai / analitikInstansi.length),
                      waktuDihemat: analitikInstansi.length * 1.5, 
                      efektivitasAI: Math.max(100 - (totalPetunjuk * 2), 0)
                    });
                  } else {
                    setKpiStats({ rataPrestasi: 0, waktuDihemat: 0, efektivitasAI: 0 });
                  }
                  setIsLoading(false);
                });
                return () => unsubAnalitik();
              });
              return () => unsubSiswa();
            } else {
              setIsLoading(false);
            }
          }
        });
        return () => unsubProfil();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const filteredData = analitikSiswa.filter(item => 
    (item.namaLengkap || item.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.kelas || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEksporLaporan = () => {
    if (analitikSiswa.length === 0) {
      alert("Belum ada data analitik untuk diekspor.");
      return;
    }

    const headers = ["Nama Siswa", "Kelas", "Nilai Akhir (Prestasi)", "Jumlah Bantuan AI Diminta", "Status Kemandirian"];
    const csvRows = analitikSiswa.map(item => [
      `"${item.namaLengkap || item.nama || "-"}"`,
      `"${item.kelas || "-"}"`,
      item.nilaiAkhir || 0,
      item.petunjuk || 0,
      `"${item.status || "-"}"`
    ]);

    const csvContent = [headers.join(","), ...csvRows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Riset_${namaInstansi.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-purple-500">
        <Loader2 size={40} className="animate-spin text-purple-600 mb-4" />
        <p className="font-bold text-lg text-slate-700 uppercase tracking-widest">Mengkalkulasi Data...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-10 px-4 md:px-6">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Laporan Analitik Instansi</h1>
          <p className="text-slate-500 text-[13px] md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Ringkasan performa akademik dan tingkat efisiensi beban kerja tenaga pendidik di <strong className="text-purple-700">{namaInstansi}</strong>.
          </p>
        </div>
        <button 
          onClick={handleEksporLaporan}
          className="bg-white border border-slate-300 text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
        >
          <Download size={16} /> Unduh Rekap CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Rata-rata Prestasi</h3>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shadow-sm border border-emerald-100"><TrendingUp size={18} /></div>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black text-slate-800 ${teachersFont.className}`}>{kpiStats.rataPrestasi}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">/ 100</span>
            </div>
            <p className="text-xs text-emerald-600 mt-3 font-medium flex items-center gap-1"><CheckCircle size={12}/> Seluruh Siswa Aktif</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Efisiensi Kinerja</h3>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shadow-sm border border-purple-100"><Clock size={18} /></div>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black text-slate-800 ${teachersFont.className}`}>{kpiStats.waktuDihemat}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">Jam Dihemat</span>
            </div>
            <p className="text-xs text-purple-600 mt-3 font-medium flex items-center gap-1"><Landmark size={12}/> Total beban kerja tereduksi</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Kemandirian Siswa</h3>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-blue-100"><BrainCircuit size={18} /></div>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black text-slate-800 ${teachersFont.className}`}>{kpiStats.efektivitasAI}%</span>
            </div>
            <p className="text-xs text-blue-600 mt-3 font-medium flex items-center gap-1">Tingkat keberhasilan pemahaman</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8 flex flex-col min-h-[400px]">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
            <Activity size={18} className="text-purple-600" /> Detail Evaluasi Siswa
          </h3>
          <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-2 rounded-xl w-full sm:w-72 shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa..." 
              className="bg-transparent border-none outline-none text-xs w-full text-slate-700 font-medium" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="px-6 py-4 whitespace-nowrap">Nama Siswa</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Nilai Akhir</th>
                <th className="px-6 py-4 whitespace-nowrap">Bantuan AI (Scaffolding)</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <AnimatePresence>
                {filteredData.length > 0 ? (
                  filteredData.map((item, idx) => (
                    <motion.tr key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-slate-800 text-sm">{item.namaLengkap || item.nama}</p>
                        <p className="text-[11px] text-slate-500">{item.kelas}</p>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`text-base font-black ${item.nilaiAkhir >= 80 ? 'text-emerald-600' : item.nilaiAkhir >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                          {item.nilaiAkhir || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${item.petunjuk > 5 ? 'bg-amber-400' : 'bg-purple-500'}`} style={{ width: `${Math.min(((item.petunjuk||0) / 10) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-600">{(item.petunjuk||0)}x Diminta</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
                          item.status === "Mandiri" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          item.status === "Berkembang" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {item.status || "-"}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-bold text-sm">Belum Ada Data</p>
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