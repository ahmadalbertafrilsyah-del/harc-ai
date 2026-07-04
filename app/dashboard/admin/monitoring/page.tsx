"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, BrainCircuit, Coins, AlertTriangle, CheckCircle, RefreshCw, Zap, Loader2, ServerCrash, AlertCircle, KeyRound, Save, Eye, EyeOff, Bot, DollarSign } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE REAL-TIME
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, query, orderBy, limit, setDoc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function MonitoringAI() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showKey, setShowKey] = useState(false);
  
  // State 1: Statistik Penggunaan Token
  const [tokenStats, setTokenStats] = useState({
    tokenTerpakai: 0,
    limitBulanan: 2000000,
    statusEngine: "Online"
  });

  // State 2: Konfigurasi AI Dinamis (OpenRouter / Model Kustom)
  const [aiConfig, setAiConfig] = useState({
    apiKey: "",
    modelName: "google/gemini-1.5-flash",
    costPerMillion: 0.35 // Harga per 1 Juta Token (USD)
  });
  
  const [aiLogs, setAiLogs] = useState<any[]>([]);

  useEffect(() => {
    // PULL: Statistik Token
    const unsubStats = onSnapshot(doc(db, "ai_monitoring", "token_stats"), (docSnap) => {
        if (docSnap.exists()) {
          setTokenStats(docSnap.data() as any);
        }
        setIsLoading(false);
      }, (error) => {
        setErrorMessage("Gagal memuat statistik. Pastikan koleksi 'ai_monitoring' sudah dibuat.");
        setIsLoading(false);
      }
    );

    // PULL: Konfigurasi API & Model
    const unsubConfig = onSnapshot(doc(db, "ai_monitoring", "api_config"), (docSnap) => {
      if (docSnap.exists()) {
        setAiConfig(docSnap.data() as any);
      }
    });

    // PULL: Log Aktivitas
    const qLogs = query(collection(db, "ai_logs"), orderBy("timestamp", "desc"), limit(15));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAiLogs(logs);
    });

    return () => {
      unsubStats();
      unsubConfig();
      unsubLogs();
    };
  }, []);

  // Perhitungan Dinamis Real-Time
  const persentaseToken = Math.min((tokenStats.tokenTerpakai / tokenStats.limitBulanan) * 100, 100);
  
  // Hitung Estimasi Biaya USD = (Token Terpakai / 1 Juta) * Harga per 1 Juta
  const estimasiBiayaDinamis = (tokenStats.tokenTerpakai / 1000000) * aiConfig.costPerMillion;

  const getProgressColor = () => {
    if (persentaseToken < 60) return "bg-emerald-500";
    if (persentaseToken < 85) return "bg-amber-500";
    return "bg-red-500 animate-pulse";
  };

  // Fungsi Update Limit Maksimal
  const handleUpdateLimit = async () => {
    const limitBaru = prompt("Masukkan batas Limit Token Bulanan baru:", tokenStats.limitBulanan.toString());
    if (limitBaru && !isNaN(Number(limitBaru))) {
      setIsUpdatingLimit(true);
      try {
        await setDoc(doc(db, "ai_monitoring", "token_stats"), { limitBulanan: Number(limitBaru) }, { merge: true });
      } catch (error) {
        alert("Gagal memperbarui limit. Periksa izin akses Firestore.");
      } finally {
        setIsUpdatingLimit(false);
      }
    }
  };

  // Fungsi Simpan Konfigurasi AI (Key, Model, Harga)
  const handleSaveAiConfig = async () => {
    if (!aiConfig.apiKey.trim() || !aiConfig.modelName.trim()) {
      return alert("API Key dan Nama Model tidak boleh kosong!");
    }
    
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, "ai_monitoring", "api_config"), aiConfig, { merge: true });
      alert("Konfigurasi Model AI dan API Key berhasil diamankan ke Database!");
    } catch (error) {
      alert("Akses ditolak! Anda tidak memiliki izin Administrator.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Menghubungkan ke Engine AI...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-10">
      
      {/* HEADER RESPONSIF */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5 md:pb-6">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Monitoring AI & Kuota Token</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">Pantau biaya API, atur model LLM (OpenRouter), dan evaluasi latensi.</p>
        </div>
        <div className={`px-4 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 w-fit ${tokenStats.statusEngine === 'Online' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {tokenStats.statusEngine === 'Online' ? <Activity size={14} className="shrink-0" /> : <ServerCrash size={14} className="shrink-0" />}
          Engine Status: {tokenStats.statusEngine}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 text-xs md:text-sm font-medium shadow-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* PANEL 1: KREDENSIAL & KONFIGURASI (Responsive Grid) */}
      <div className="bg-white p-5 md:p-8 rounded-xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className={`text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <KeyRound size={20} className="text-amber-500 shrink-0" /> Konfigurasi Engine AI Terpusat
            </h2>
            <p className="text-[11px] md:text-xs text-slate-500 mt-1.5 max-w-xl leading-relaxed">
              Atur API Key, rute model, dan tarif dasar token. Disarankan menggunakan kredensial <b>OpenRouter</b> untuk fleksibilitas perpindahan model tanpa mengubah kode.
            </p>
          </div>
          <button onClick={handleSaveAiConfig} disabled={isSavingConfig} className="w-full md:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95">
            {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Konfigurasi
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {/* Input API Key (Full width on mobile, 12 cols on desktop) */}
          <div className="md:col-span-12">
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">API Key (Rahasia)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><KeyRound size={16} className="text-slate-400" /></div>
              <input 
                type={showKey ? "text" : "password"} 
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({...aiConfig, apiKey: e.target.value})}
                placeholder="sk-or-v1-..." 
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Input Nama Model (Full width on mobile, 8 cols on desktop) */}
          <div className="md:col-span-8">
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Model ID (Routing)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Bot size={16} className="text-slate-400" /></div>
              <input 
                type="text" 
                value={aiConfig.modelName}
                onChange={(e) => setAiConfig({...aiConfig, modelName: e.target.value})}
                placeholder="contoh: google/gemini-1.5-pro" 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Input Harga (Full width on mobile, 4 cols on desktop) */}
          <div className="md:col-span-4">
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tarif per 1 Juta Token</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><DollarSign size={16} className="text-slate-400" /></div>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={aiConfig.costPerMillion}
                onChange={(e) => setAiConfig({...aiConfig, costPerMillion: parseFloat(e.target.value) || 0})}
                placeholder="0.35" 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PANEL 2: METRIK & PROGRESS BAR */}
      <div className="bg-white p-5 md:p-8 rounded-xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-5">
          <div className="flex items-start md:items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-1 md:mt-0">
              <BrainCircuit size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h2 className={`text-lg md:text-xl font-bold text-slate-800 ${teachersFont.className}`}>Alokasi Token Sistem</h2>
              <p className="text-[11px] md:text-sm text-slate-500 mt-1">Siklus penagihan bulan ini berdasarkan pemakaian Engine.</p>
            </div>
          </div>
          <button onClick={handleUpdateLimit} disabled={isUpdatingLimit} className="w-full md:w-auto px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 active:scale-95">
            {isUpdatingLimit ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Ubah Limit Maksimal
          </button>
        </div>

        {/* Visualisasi Progres Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2.5">
            <span className="text-[11px] md:text-sm font-bold text-slate-700 flex items-center gap-1.5 md:gap-2">
              <Coins size={14} className="text-amber-500 md:w-4 md:h-4" /> 
              <span className="hidden sm:inline">Penggunaan </span>
              ({(tokenStats.tokenTerpakai / 1000).toFixed(1)}K / {(tokenStats.limitBulanan / 1000).toFixed(0)}K)
            </span>
            <span className={`text-[11px] md:text-sm font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100 ${persentaseToken > 85 ? 'text-red-600 border-red-100 bg-red-50' : 'text-slate-500'}`}>
              {persentaseToken.toFixed(1)}% Terpakai
            </span>
          </div>
          <div className="w-full h-3 md:h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <motion.div initial={{ width: 0 }} animate={{ width: `${persentaseToken}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full ${getProgressColor()}`} />
          </div>
        </div>

        {/* Grid Estimasi (Stack di HP, Berjajar di Laptop) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
          <div className="col-span-1">
            <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimasi Biaya API</p>
            <p className="text-lg md:text-2xl font-bold text-slate-800">${estimasiBiayaDinamis.toFixed(4)}</p>
          </div>
          <div className="col-span-1">
            <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sisa Token Bulanan</p>
            <p className="text-lg md:text-2xl font-bold text-slate-800 text-emerald-600">
              {Math.max(tokenStats.limitBulanan - tokenStats.tokenTerpakai, 0).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Model Aktif</p>
            <p className="text-xs md:text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg flex items-center gap-2 mt-1 truncate font-mono w-full md:w-fit">
              <Zap size={14} className="text-amber-500 shrink-0" /> <span className="truncate">{aiConfig.modelName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* PANEL 3: LOG API (Hybrid View: Tabel di Laptop, Cards di HP) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-5 md:px-6 py-4 md:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className={`text-sm md:text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
            Traffic API (Real-time Log)
          </h3>
        </div>
        
        {/* TAMPILAN MOBILE (Cards Layout) */}
        <div className="block md:hidden divide-y divide-slate-100">
          <AnimatePresence>
            {aiLogs.length > 0 ? aiLogs.map((log) => (
              <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{log.pengguna}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                       <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : "Baru saja"}</span>
                       • {log.role || 'Pendidik'}
                    </p>
                  </div>
                  <span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold uppercase border border-indigo-100">{log.aksi}</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    {log.status === "Sukses" ? <CheckCircle size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
                    <span className="text-[11px] font-medium text-slate-600">{log.latensi} ms</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">{log.tokenDipakai} tkn</span>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-10 text-slate-500 text-xs font-medium">Belum ada traffic AI yang tercatat.</div>
            )}
          </AnimatePresence>
        </div>

        {/* TAMPILAN DESKTOP (Tabel Layout) */}
        <div className="hidden md:block overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4">Waktu (WIB)</th>
                <th className="px-6 py-4">Pengguna / Pemohon</th>
                <th className="px-6 py-4">Aksi AI</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Konsumsi Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {aiLogs.length > 0 ? aiLogs.map((log) => (
                  <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('id-ID') : "Baru saja"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{log.pengguna}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{log.role || 'Pendidik'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase border border-indigo-100">{log.aksi}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.status === "Sukses" ? <CheckCircle size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
                        <span className="text-xs font-medium text-slate-700">{log.latensi} ms</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-700 font-mono">{log.tokenDipakai} <span className="text-[10px] text-slate-400">tkn</span></span>
                    </td>
                  </motion.tr>
                )) : (
                  <tr><td colSpan={5} className="text-center py-16 text-slate-500">Belum ada traffic AI yang tercatat.</td></tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

      </div>
    </motion.div>
  );
}