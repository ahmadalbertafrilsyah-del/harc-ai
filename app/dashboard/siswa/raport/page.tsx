"use client";

import { motion } from "framer-motion";
import { BarChart, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function RaportSiswa() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      return onSnapshot(doc(db, "analitik_siswa", auth.currentUser.uid), (snap) => {
        if (snap.exists()) setData(snap.data());
        setIsLoading(false);
      });
    }
  }, []);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin"/></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-3xl border shadow-sm">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><BarChart className="text-blue-600"/> Raport Digital AI</h2>
        
        {data ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center p-6 bg-blue-50 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-blue-700">Nilai Rata-rata Akhir</p>
                <h3 className="text-5xl font-black text-blue-900">{data.nilaiAkhir}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-700">Status Kemandirian</p>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">{data.status}</span>
              </div>
            </div>
            {/* Tambahkan komponen grafik jika perlu */}
          </div>
        ) : (
          <p className="text-center text-slate-500">Belum ada data raport yang ter-generate oleh sistem.</p>
        )}
      </div>
    </motion.div>
  );
}