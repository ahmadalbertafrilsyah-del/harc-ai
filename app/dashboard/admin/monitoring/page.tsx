"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, BrainCircuit, Coins, AlertTriangle, CheckCircle, RefreshCw, Zap, Loader2, ServerCrash, Search, AlertCircle } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE REAL-TIME
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, query, orderBy, limit, updateDoc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function MonitoringAI() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [tokenStats, setTokenStats] = useState({
    tokenTerpakai: 0,
    limitBulanan: 2000000,
    estimasiBiayaUSD: 0,
    statusEngine: "Online"
  });
  
  const [aiLogs, setAiLogs] = useState<any[]>([]);

  useEffect(() => {
    // 1. PULL REAL-TIME: Statistik Token dengan Error Handling
    const unsubStats = onSnapshot(
      doc(db, "ai_monitoring", "token_stats"), 
      (docSnap) => {
        if (docSnap.exists()) {
          setTokenStats(docSnap.data() as any);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error monitoring stats:", error);
        setErrorMessage("Gagal memuat statistik. Pastikan koleksi 'ai_monitoring' sudah dibuat.");
        setIsLoading(false);
      }
    );

    // 2. PULL REAL-TIME: Log Penggunaan AI
    const qLogs = query(collection(db, "ai_logs"), orderBy("timestamp", "desc"), limit(15));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAiLogs(logs);
    });

    return () => {
      unsubStats();
      unsubLogs();
    };
  }, []);

  const persentaseToken = Math.min((tokenStats.tokenTerpakai / tokenStats.limitBulanan) * 100, 100);
  
  const getProgressColor = () => {
    if (persentaseToken < 60) return "bg-emerald-500";
    if (persentaseToken < 85) return "bg-amber-500";
    return "bg-red-500 animate-pulse";
  };

  const handleUpdateLimit = async () => {
    const limitBaru = prompt("Masukkan batas Limit Token Bulanan baru:", tokenStats.limitBulanan.toString());
    if (limitBaru && !isNaN(Number(limitBaru))) {
      setIsUpdating(true);
      try {
        await updateDoc(doc(db, "ai_monitoring", "token_stats"), { limitBulanan: Number(limitBaru) });
      } catch (error) {
        alert("Gagal memperbarui limit. Periksa izin akses Firestore.");
      } finally {
        setIsUpdating(false);
      }
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Monitoring AI & Kuota Token</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau biaya API, batasan limit, dan latensi respons model.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm font-medium">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200/80">
        {/* ... (isi konten monitoring tetap sama seperti kodingan sebelumnya) ... */}
        <div className="text-center py-10">
             <p className="text-slate-500">Dashboard statistik aktif. Pastikan dokumen `ai_monitoring/token_stats` sudah ada di Firestore.</p>
        </div>
      </div>
    </motion.div>
  );
}