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

  useEffect(() => {
    const qLog = query(collection(db, "ai_logs"), orderBy("timestamp", "desc"));
    const unsubLog = onSnapshot(qLog, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      setIsLoading(false);
    });

    return () => unsubLog();
  }, []);

  const hapusLogTunggal = async (id: string) => {
    if (confirm("Hapus log ini dari database?")) {
      try {
        await deleteDoc(doc(db, "ai_logs", id));
      } catch (error) {
        alert("Gagal menghapus log.");
      }
    }
  };

  const bersihkanSemuaLog = async () => {
    if (logs.length === 0) return;
    
    const konfirmasi = confirm(
      "PERINGATAN BAHAYA!\n\nAnda akan menghapus SEMUA riwayat aktivitas AI secara permanen untuk mengosongkan kapasitas database.\n\nLanjutkan?"
    );

    if (konfirmasi) {
      setIsDeletingAll(true);
      try {
        const q = query(collection(db, "ai_logs"));
        const snapshot = await getDocs(q);
        
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

  const filteredLogs = logs.filter(log => 
    (log.pengguna || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.aksi || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500" role="status">
        <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-bold text-slate-700">Memuat Log Sistem...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-5 pb-12">
      
      {/* HEADER DESKTOP */}
      <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Log Sistem</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau aktivitas generate AI dan bersihkan database secara berkala.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari guru atau aksi..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm"
            />
          </div>
          <button 
            onClick={bersihkanSemuaLog} 
            disabled={isDeletingAll || logs.length === 0}
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
          >
            {isDeletingAll ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />} 
            <span>Hapus Semua</span>
          </button>
        </div>
      </header>

      {/* HEADER MOBILE (App-Like Card) */}
      <div className="md:hidden bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Audit Trail</span>
        <h2 className={`text-xl font-bold mt-1 ${teachersFont.className}`}>Log Aktivitas AI</h2>
        <p className="text-xs text-indigo-100 mt-1">Total {logs.length} riwayat tercatat di sistem.</p>
      </div>

      {/* SEARCH & ACTION MOBILE */}
      <div className="md:hidden flex flex-col gap-2.5">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Cari aktivitas atau pengguna..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm"
          />
        </div>
        <button 
          onClick={bersihkanSemuaLog} 
          disabled={isDeletingAll || logs.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
        >
          {isDeletingAll ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />} 
          <span>Sapu Bersih Log</span>
        </button>
      </div>

      {/* RINGKASAN STATUS */}
      <div className="flex items-center gap-3 bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl shadow-sm">
        <ShieldAlert size={20} className="text-indigo-600 shrink-0" />
        <div>
          <p className="text-xs font-bold text-indigo-900">Total Terekam: {logs.length} Aktivitas</p>
          <p className="text-[11px] text-indigo-700 mt-0.5">Lakukan pembersihan secara berkala agar performa database tetap optimal.</p>
        </div>
      </div>

      {/* TABEL / KARTU LOG */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Tampilan Mobile Card */}
        <div className="block md:hidden p-3 space-y-3 bg-slate-50/30">
          <AnimatePresence>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                  <button onClick={() => hapusLogTunggal(log.id)} className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl"><Trash2 size={16} /></button>
                  
                  <div className="pr-8 space-y-2">
                    <div>
                      <p className="text-xs font-bold text-indigo-700">{log.pengguna || "Anonim"}</p>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">{log.role || "Sistem"}</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Activity size={14} className="text-slate-400 shrink-0"/>
                      <span>{log.aksi}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${
                        (log.status === "Sukses" || log.status === "sukses") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {(log.status === "Sukses" || log.status === "sukses") ? <CheckCircle2 size={10}/> : <AlertTriangle size={10}/>}
                        {log.status}
                      </span>

                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                        <Clock size={10}/> {log.latensi ? `${(log.latensi / 1000).toFixed(1)}s` : '-'}
                      </span>

                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                        <Zap size={10}/> {log.tokenDipakai ? log.tokenDipakai.toLocaleString('id-ID') : 0} Token
                      </span>
                    </div>

                    <p className="text-[10px] font-mono text-slate-400 pt-1">
                      {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString('id-ID') : '-'}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Tidak Ada Log</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Tampilan Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-5 py-3.5">Waktu</th>
                <th className="px-5 py-3.5">Pengguna</th>
                <th className="px-5 py-3.5">Aksi</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Latensi API</th>
                <th className="px-5 py-3.5 text-center">Token AI</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <AnimatePresence>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-800">
                          {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '-'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-indigo-700">{log.pengguna || "Anonim"}</p>
                        <p className="text-[10px] uppercase text-slate-400 font-bold mt-0.5">{log.role || "Sistem"}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Activity size={14} className="text-slate-400 shrink-0"/>
                          <span>{log.aksi}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg border ${
                          (log.status === "Sukses" || log.status === "sukses") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {(log.status === "Sukses" || log.status === "sukses") ? <CheckCircle2 size={10}/> : <AlertTriangle size={10}/>}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-medium text-slate-600">
                        {log.latensi ? `${(log.latensi / 1000).toFixed(1)}s` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-amber-600">
                        {log.tokenDipakai ? log.tokenDipakai.toLocaleString('id-ID') : 0}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button onClick={() => hapusLogTunggal(log.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex items-center justify-center">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      Tidak ada log aktivitas ditemukan.
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