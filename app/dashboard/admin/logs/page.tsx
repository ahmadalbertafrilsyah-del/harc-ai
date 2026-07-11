"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Trash2, Search, AlertTriangle, 
  CheckCircle2, Clock, Zap, ShieldAlert, Loader2 
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, getDocs } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenLogs() {
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Tarik Data Log Real-time
  useEffect(() => {
    const qLog = query(collection(db, "ai_logs"), orderBy("timestamp", "desc"));
    const unsubLog = onSnapshot(qLog, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      setIsLoading(false);
    });

    return () => unsubLog();
  }, []);

  // 2. Fungsi Hapus 1 Log
  const hapusLogTunggal = async (id: string) => {
    if (confirm("Hapus log ini dari database?")) {
      try {
        await deleteDoc(doc(db, "ai_logs", id));
      } catch (error) {
        alert("Gagal menghapus log.");
      }
    }
  };

  // 3. Fungsi Sapu Bersih Semua Log (Mencegah Database Membengkak)
  const bersihkanSemuaLog = async () => {
    if (logs.length === 0) return;
    
    const konfirmasi = confirm(
      "PERINGATAN BAHAYA!\n\nAnda akan menghapus SEMUA riwayat aktivitas AI dari database secara permanen untuk mengosongkan ruang penyimpanan.\n\nLanjutkan?"
    );

    if (konfirmasi) {
      setIsDeletingAll(true);
      try {
        // Ambil semua dokumen di koleksi ai_logs
        const q = query(collection(db, "ai_logs"));
        const snapshot = await getDocs(q);
        
        // Hapus satu per satu secara paralel (Aman untuk skala R&D)
        const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "ai_logs", document.id)));
        await Promise.all(deletePromises);
        
        alert("Pembersihan selesai! Kapasitas database telah dilonggarkan.");
      } catch (error) {
        console.error("Gagal membersihkan log:", error);
        alert("Terjadi kesalahan saat membersihkan database.");
      } finally {
        setIsDeletingAll(false);
      }
    }
  };

  // Filter Pencarian
  const filteredLogs = logs.filter(log => 
    (log.pengguna || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.aksi || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold uppercase tracking-widest text-slate-700">Memuat Log Sistem...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6 pb-10">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Log Sistem</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Pantau aktivitas *generate* AI dari seluruh pendidik. Bersihkan log secara berkala untuk menjaga performa dan kapasitas *database* Firebase Anda.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari nama guru atau aksi..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-indigo-500 outline-none shadow-sm"
            />
          </div>
          <button 
            onClick={bersihkanSemuaLog} 
            disabled={isDeletingAll || logs.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
          >
            {isDeletingAll ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />} 
            Hapus
          </button>
        </div>
      </div>

      {/* Ringkasan Status */}
      <div className="flex items-center gap-4 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
        <ShieldAlert size={24} className="text-indigo-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-indigo-900">Total Terekam: {logs.length} Aktivitas</p>
          <p className="text-xs text-indigo-700 mt-0.5">Semakin banyak log yang tersimpan, semakin besar ukuran pembacaan database. Lakukan pembersihan rutin.</p>
        </div>
      </div>

      {/* Tabel Log */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="px-6 py-4 text-center">Waktu</th>
                <th className="px-6 py-4 text-center">Pengguna</th>
                <th className="px-6 py-4 text-center">Aksi</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Latensi API</th>
                <th className="px-6 py-4 text-center">Token AI</th>
                <th className="px-6 py-4 text-center">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <motion.tr 
                      key={log.id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-800">
                          {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '-'} WIB
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-indigo-700">{log.pengguna || "Anonim"}</p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{log.role || "Sistem"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className="text-slate-400 shrink-0"/>
                          <span className="text-sm font-medium text-slate-700">{log.aksi}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
                          (log.status === "Sukses" || log.status === "sukses") 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {(log.status === "Sukses" || log.status === "sukses") ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600">
                          <Clock size={14} className="text-slate-400"/>
                          {log.latensi ? `${(log.latensi / 1000).toFixed(1)}s` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-amber-600">
                          <Zap size={14} className="text-amber-500"/>
                          {log.tokenDipakai ? log.tokenDipakai.toLocaleString('id-ID') : 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => hapusLogTunggal(log.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Log"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Activity size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-bold text-sm">Tidak Ada Log</p>
                      <p className="text-slate-400 text-xs mt-1">Database log saat ini dalam keadaan bersih.</p>
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