"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, BarChart3, Clock, AlertCircle, MessageSquare, Send, Loader2, X, Download, Filter, Search, CheckCircle2 } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

const dapatkanWaktuAman = (item: any) => {
  try {
    if (!item || !item.timestamp) return 0;
    if (typeof item.timestamp.toMillis === 'function') return item.timestamp.toMillis();
    if (item.timestamp.seconds) return item.timestamp.seconds * 1000;
    if (typeof item.timestamp === 'number') return item.timestamp;
    return 0;
  } catch (error) { return 0; }
};

export default function RaportSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [riwayatUjian, setRiwayatUjian] = useState<any[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [profilSiswa, setProfilSiswa] = useState<any>({});

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKelas, setFilterKelas] = useState("Semua");
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);

  // State Modal Sanggahan
  const [selectedRaport, setSelectedRaport] = useState<any | null>(null);
  const [sanggahanText, setSanggahanText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if(snap.exists()) setProfilSiswa(snap.data());
        });
        fetchRiwayatUjian(user.uid);
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchRiwayatUjian = (uid: string) => {
    const q = query(collection(db, "jawaban_siswa"), where("uid", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const dataRiwayat = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          return { idDoc: docSnapshot.id, ...data, judulUjian: data.judulUjian || "Asesmen", kelas: data.kelas || "Umum" };
        }).filter(item => item !== null);
        
        const sortedRiwayat = dataRiwayat.sort((a, b) => dapatkanWaktuAman(b) - dapatkanWaktuAman(a));
        
        // Ekstrak daftar kelas unik untuk filter
        const kelasUnik = Array.from(new Set(sortedRiwayat.map(item => item.kelas)));
        setDaftarKelas(kelasUnik as string[]);
        
        setRiwayatUjian(sortedRiwayat);
      } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
    });
    return unsubscribe;
  };

  const handleAjukanSanggahan = async () => {
    if (!selectedRaport || !sanggahanText.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "jawaban_siswa", selectedRaport.idDoc), {
        sanggahan: { teks: sanggahanText, status: "menunggu_validasi_guru", waktuSanggahan: serverTimestamp() }
      });
      alert("Sanggahan berhasil dikirim!");
      setSelectedRaport({ ...selectedRaport, sanggahan: { teks: sanggahanText, status: "menunggu_validasi_guru" } });
      setSanggahanText("");
    } catch (error) { alert("Gagal mengirim sanggahan."); } finally { setIsSubmitting(false); }
  };

  const handleDownloadExcel = () => {
    if (riwayatUjian.length === 0) return alert("Belum ada data.");
    const headers = ["Mata Pelajaran / Ujian", "Kelas", "Nilai Akhir", "Status Kemandirian", "Umpan Balik Guru/AI"];
    const csvRows = filteredRiwayat.map(item => [
      `"${item.judulUjian}"`, `"${item.kelas}"`, item.nilai ? Math.round(item.nilai) : 0,
      `"${item.metadataAnalitik?.statusKemandirian || "Selesai"}"`, `"${item.feedbackGuru || "-"}"`
    ]);
    const csvContent = [headers.join(","), ...csvRows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `Raport_${profilSiswa.nama || 'Siswa'}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const filteredRiwayat = riwayatUjian.filter(item => {
    const matchesSearch = item.judulUjian.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKelas = filterKelas === "Semua" || item.kelas === filterKelas;
    return matchesSearch && matchesKelas;
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-emerald-500 w-10 h-10"/></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-10 ${teachersFont.className}`}>
      
      {/* Header & Aksi */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Award className="text-emerald-500" size={32} /> Raport & Hasil Belajar
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">Rekapitulasi nilai evaluasi, umpan balik, dan rekam kemandirian belajarmu.</p>
        </div>
        <button onClick={handleDownloadExcel} className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95">
          <Download size={16} /> Unduh Raport (CSV)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input type="text" placeholder="Cari nama ujian..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
        </div>
        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm appearance-none cursor-pointer">
            <option value="Semua">Semua Kelas</option>
            {daftarKelas.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {/* Tabel Data Raport */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="px-6 py-4">Mata Pelajaran / Evaluasi</th>
                <th className="px-6 py-4 text-center">Nilai Akhir</th>
                <th className="px-6 py-4 text-center">Status Kemandirian</th>
                <th className="px-6 py-4">Umpan Balik AI / Guru</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredRiwayat.length > 0 ? (
                  filteredRiwayat.map((raport) => {
                    const nilaiAngka = raport.nilai ? Math.round(raport.nilai) : 0;
                    const statusMandiri = raport.metadataAnalitik?.statusKemandirian || "Selesai";
                    
                    return (
                      <motion.tr key={raport.idDoc} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-sm">{raport.judulUjian}</p>
                          <p className="text-[11px] text-slate-500 mt-1">Kelas: {raport.kelas} • {raport.timestamp ? new Date(dapatkanWaktuAman(raport)).toLocaleDateString('id-ID') : '-'}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xl font-black ${nilaiAngka >= 75 ? 'text-emerald-600' : nilaiAngka >= 60 ? 'text-amber-500' : 'text-rose-600'}`}>
                            {nilaiAngka}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-slate-100 text-slate-600 border-slate-200 inline-block w-max">
                            {statusMandiri}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-600 line-clamp-2 italic w-48 lg:w-64">"{raport.feedbackGuru || "Belum ada umpan balik."}"</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => setSelectedRaport(raport)} className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors w-max">
                            Lihat Detail
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      <BarChart3 size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-sm text-slate-600">Tidak ada data raport ditemukan</p>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL SANGGAHAN */}
      <AnimatePresence>
        {selectedRaport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Detail & Evaluasi</h2>
                  <p className="text-xs text-slate-500 font-medium">{selectedRaport.judulUjian}</p>
                </div>
                <button onClick={() => setSelectedRaport(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <span className="text-sm font-bold text-emerald-800 uppercase">Nilai Akhir:</span>
                  <span className="text-3xl font-black text-emerald-600">{Math.round(selectedRaport.nilai || 0)}</span>
                </div>

                <div>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Umpan Balik Guru / AI</h3>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-slate-700 text-sm leading-relaxed italic">
                    "{selectedRaport?.feedbackGuru || "Sistem dan Guru belum memberikan umpan balik naratif untuk evaluasi ini."}"
                  </div>
                </div>

                {selectedRaport?.sanggahan ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-700 font-bold mb-2 text-sm"><AlertCircle size={16}/> Menunggu Validasi Manual</div>
                    <p className="text-xs text-slate-600 mb-3">Kamu telah mengajukan sanggahan. Guru sedang meninjaunya berdasarkan korpus budaya daerahmu.</p>
                    <div className="p-3 bg-white border border-amber-100 rounded-lg text-sm text-slate-700 italic">"{selectedRaport.sanggahan.teks}"</div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2"><MessageSquare size={16} className="text-purple-600"/> Merasa penilaian kurang tepat?</h3>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">Berikan argumenmu (misal terkait dialek lokal) agar dinilai ulang oleh Guru (Agency Siswa).</p>
                    <textarea 
                      value={sanggahanText} onChange={(e) => setSanggahanText(e.target.value)}
                      placeholder="Contoh: Jawaban saya di nomor 3 menggunakan tingkatan bahasa Krama Inggil..."
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-24 mb-3 shadow-sm"
                    />
                    <button onClick={handleAjukanSanggahan} disabled={!sanggahanText.trim() || isSubmitting} className="w-full md:w-auto float-right px-6 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                      {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} Ajukan Sanggahan
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}