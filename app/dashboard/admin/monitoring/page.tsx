"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, BrainCircuit, Coins, AlertTriangle, CheckCircle, RefreshCw, Zap, Loader2, ServerCrash, AlertCircle, Save, Bot, DollarSign, ListFilter } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, query, orderBy, limit, setDoc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function MonitoringAI() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  const [tokenStats, setTokenStats] = useState({
    tokenTerpakai: 0,
    limitBulanan: 2000000,
    statusEngine: "Online"
  });

  // Konfigurasi AI Tanpa API Key
  const [aiConfig, setAiConfig] = useState({
    modelName: "gemini-1.5-flash",
    availableModels: "gemini-1.5-flash, gemini-1.5-pro", 
    costPerMillion: 0.35
  });
  
  const [aiLogs, setAiLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, "ai_monitoring", "token_stats"), (docSnap) => {
        if (docSnap.exists()) setTokenStats(docSnap.data() as any);
        setIsLoading(false);
      }, (error) => {
        setErrorMessage("Gagal memuat statistik. Pastikan koleksi 'ai_monitoring' sudah dibuat.");
        setIsLoading(false);
      }
    );

    const unsubConfig = onSnapshot(doc(db, "ai_monitoring", "api_config"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAiConfig(prev => ({...prev, modelName: data.modelName || prev.modelName, availableModels: data.availableModels || prev.availableModels, costPerMillion: data.costPerMillion || prev.costPerMillion}));
      }
    });

    const qLogs = query(collection(db, "ai_logs"), orderBy("timestamp", "desc"), limit(15));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setAiLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubStats(); unsubConfig(); unsubLogs(); };
  }, []);

  const persentaseToken = Math.min((tokenStats.tokenTerpakai / tokenStats.limitBulanan) * 100, 100);
  const estimasiBiayaDinamis = (tokenStats.tokenTerpakai / 1000000) * aiConfig.costPerMillion;

  const getProgressColor = () => {
    if (persentaseToken < 60) return "bg-emerald-500";
    if (persentaseToken < 85) return "bg-amber-500";
    return "bg-red-500 animate-pulse";
  };

  const handleUpdateLimit = async () => {
    const limitBaru = prompt("Masukkan batas Limit Token Bulanan baru:", tokenStats.limitBulanan.toString());
    if (limitBaru && !isNaN(Number(limitBaru))) {
      setIsUpdatingLimit(true);
      try {
        await setDoc(doc(db, "ai_monitoring", "token_stats"), { limitBulanan: Number(limitBaru) }, { merge: true });
      } catch (error) {
        alert("Gagal memperbarui limit.");
      } finally {
        setIsUpdatingLimit(false);
      }
    }
  };

  const handleSaveAiConfig = async () => {
    if (!aiConfig.modelName.trim()) return alert("Model Default tidak boleh kosong!");
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, "ai_monitoring", "api_config"), aiConfig, { merge: true });
      alert("Konfigurasi Model berhasil diamankan!");
    } catch (error) {
      alert("Akses ditolak! Anda tidak memiliki izin Administrator.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (isLoading) return <div className="w-full h-[70vh] flex justify-center items-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5 md:pb-6">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Monitoring AI & Kuota Token</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Pantau biaya API, atur model LLM, dan evaluasi latensi.</p>
        </div>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className={`text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
              <Bot size={20} className="text-indigo-500 shrink-0" /> Konfigurasi Engine AI Terpusat
            </h2>
            <p className="text-[11px] md:text-xs text-slate-500 mt-1">API Key kini diamankan di dalam environment variabel server.</p>
          </div>
          <button onClick={handleSaveAiConfig} disabled={isSavingConfig} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all">
            {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Konfigurasi
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Model Default (Fallback)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><Bot size={16} className="text-slate-400" /></div>
              <input type="text" value={aiConfig.modelName} onChange={(e) => setAiConfig({...aiConfig, modelName: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" />
            </div>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pilihan Model (Pisahkan dgn koma)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><ListFilter size={16} className="text-slate-400" /></div>
              <input type="text" value={aiConfig.availableModels} onChange={(e) => setAiConfig({...aiConfig, availableModels: e.target.value})} placeholder="gemini-1.5-flash, gemini-1.5-pro" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tarif per 1 Juta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><DollarSign size={16} className="text-slate-400" /></div>
              <input type="number" step="0.01" min="0" value={aiConfig.costPerMillion} onChange={(e) => setAiConfig({...aiConfig, costPerMillion: parseFloat(e.target.value) || 0})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-xl shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-5">
          <div className="flex items-start md:items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><BrainCircuit size={24} /></div>
            <div>
              <h2 className={`text-xl font-bold text-slate-800 ${teachersFont.className}`}>Alokasi Token Sistem</h2>
              <p className="text-sm text-slate-500 mt-1">Siklus penagihan bulan ini.</p>
            </div>
          </div>
        </div>
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2.5">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Coins size={14} className="text-amber-500"/> Penggunaan ({(tokenStats.tokenTerpakai / 1000).toFixed(1)}K / {(tokenStats.limitBulanan / 1000).toFixed(0)}K)</span>
          </div>
          <div className="w-full h-3 md:h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${persentaseToken}%` }} transition={{ duration: 1 }} className={`h-full ${getProgressColor()}`} /></div>
        </div>
      </div>
    </motion.div>
  );
}