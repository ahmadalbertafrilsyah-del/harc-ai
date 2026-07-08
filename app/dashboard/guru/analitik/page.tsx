"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, TrendingUp, BrainCircuit, Activity, 
  MousePointerClick, RefreshCcw, Loader2, Search, Download, 
  Clock, CheckCircle, FileText
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, doc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AnalitikProses() {
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk Data Real-time KPI (Fokus pada Pengurangan Beban Kerja & Prestasi Siswa)
  const [kpiStats, setKpiStats] = useState({
    rataPrestasi: 0,
    waktuDihemat: 0,
    efektivitasAI: 0
  });
  
  const [analitikData, setAnalitikData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Fetch KPI Kinerja Sistem
    const unsubKpi = onSnapshot(doc(db, "analitik_agregat", "kinerja_sistem"), (docSnap) => {
      if (docSnap.exists()) {
        setKpiStats(docSnap.data() as any);
      } else {
        // PERBAIKAN: Ubah fallback menjadi 0 agar sesuai dengan data asli yang masih kosong
        setKpiStats({
          rataPrestasi: 0, 
          waktuDihemat: 0, 
          efektivitasAI: 0
        });
      }
    });

    // Fetch Tabel Data Prestasi & Interaksi Siswa
    const qAnalitik = query(collection(db, "analitik_siswa"), orderBy("nilaiAkhir", "desc"));
    const unsubAnalitik = onSnapshot(qAnalitik, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnalitikData(data);
      } else {
        // Tampilkan array kosong jika tidak ada data
        setAnalitikData([]); 
      }
      // Hentikan loading terlepas dari ada data atau tidak
      setIsLoading(false);
    }, (error) => {
      console.error("Gagal mengambil data analitik:", error);
      setIsLoading(false);
    });

    return () => {
      unsubKpi();
      unsubAnalitik();
    };
  }, []);

  const filteredData = analitikData.filter(item => 
    (item.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.kelas || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLihatDetail = (nama: string) => {
    alert(`Membuka rekam jejak evaluasi dan perkembangan kognitif untuk siswa: ${nama}.`);
  };

  const handleEksporLaporan = () => {
    if (analitikData.length === 0) {
      alert("Belum ada data analitik untuk diekspor.");
      return;
    }

    // 1. Siapkan Header Kolom Excel
    const headers = ["Nama Siswa", "Kelas", "Nilai Akhir (Prestasi)", "Jumlah Bantuan AI Diminta", "Status Kemandirian"];
    
    // 2. Mapping Data dari Tabel ke Format Baris Excel
    const csvRows = analitikData.map(item => [
      `"${item.nama || "-"}"`,
      `"${item.kelas || "-"}"`,
      item.nilaiAkhir || 0,
      item.petunjuk || 0,
      `"${item.status || "-"}"`
    ]);

    // 3. Gabungkan Header dan Baris Data
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");

    // 4. Buat File Blob dan Trigger Proses Download Otomatis
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_Riset_HARC_AI_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold text-lg text-slate-700 uppercase tracking-widest">Memuat Analitik...</p>
        <p className="text-sm mt-2 font-medium">Menghitung metrik prestasi belajar & efisiensi beban kerja</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-10 px-4 md:px-6">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Analitik Prestasi & Efisiensi</h1>
          <p className="text-slate-500 text-[13px] md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Pantau peningkatan capaian akademik siswa dan pantau seberapa efektif model AI mereduksi beban kerja evaluasi Anda.
          </p>
        </div>
        <button 
          onClick={handleEksporLaporan}
          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-blue-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
        >
          <Download size={16} /> Ekspor Data Riset
        </button>
      </div>

      {/* Baris Metrik KPI Utama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        
        {/* Metrik 1: Prestasi Belajar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Rata-rata Prestasi</h3>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shadow-sm border border-emerald-100"><TrendingUp size={18} /></div>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black text-slate-800 ${teachersFont.className}`}>{kpiStats.rataPrestasi}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">/ 100</span>
            </div>
            <p className="text-xs text-emerald-600 mt-3 font-medium flex items-center gap-1">
              <CheckCircle size={12}/> Peningkatan signifikan pasca-AI
            </p>
          </div>
        </div>

        {/* Metrik 2: Reduksi Beban Kerja */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Waktu Koreksi Dihemat</h3>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-blue-100"><Clock size={18} /></div>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black text-slate-800 ${teachersFont.className}`}>{kpiStats.waktuDihemat}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">Jam / Minggu</span>
            </div>
            <p className="text-xs text-blue-600 mt-3 font-medium flex items-center gap-1">
              <RefreshCcw size={12}/> Automasi evaluasi formatif aktif
            </p>
          </div>
        </div>

        {/* Metrik 3: Efektivitas Scaffolding AI */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Efektivitas Bantuan AI</h3>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-sm border border-indigo-100"><BrainCircuit size={18} /></div>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-black text-slate-800 ${teachersFont.className}`}>{kpiStats.efektivitasAI}%</span>
            </div>
            <p className="text-xs text-indigo-600 mt-3 font-medium flex items-center gap-1">
              <MousePointerClick size={12}/> Siswa sukses setelah diberi petunjuk
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Detail Interaksi & Prestasi Siswa */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8 flex flex-col min-h-[400px]">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
            <Activity size={18} className="text-blue-600" /> Matriks Capaian Siswa
          </h3>
          <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-2 rounded-xl w-full sm:w-72 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau kelas..." 
              className="bg-transparent border-none outline-none text-xs w-full text-slate-700 font-medium" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="px-6 py-4 text-center">Nama Siswa</th>
                <th className="px-6 py-4 text-center">Nilai Akhir (Prestasi)</th>
                <th className="px-6 py-4 text-center">Bantuan AI (Scaffolding)</th>
                <th className="px-6 py-4 text-center">Status Kemandirian</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <AnimatePresence>
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <motion.tr 
                      key={item.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-sm">{item.nama}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{item.kelas}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-black ${item.nilaiAkhir >= 80 ? 'text-emerald-600' : item.nilaiAkhir >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                            {item.nilaiAkhir}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${item.petunjuk > 5 ? 'bg-amber-400' : 'bg-blue-500'}`} 
                              style={{ width: `${Math.min((item.petunjuk / 10) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-600">{item.petunjuk}x Diminta</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
                          item.status === "Mandiri" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          item.status === "Berkembang" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleLihatDetail(item.nama)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg"
                        >
                          Detail Evaluasi
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-bold text-sm">Belum Ada Data Evaluasi</p>
                      <p className="text-slate-400 text-xs mt-1">Data capaian belajar akan muncul setelah siswa mengerjakan asesmen AI.</p>
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