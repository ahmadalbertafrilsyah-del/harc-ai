"use client";

import { motion } from "framer-motion";
import { 
  FileSpreadsheet, FileCheck2, Search, Eye, 
  Check, X, AlertCircle, Loader2, BrainCircuit
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ValidasiAsesmenLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [dokumenPending, setDokumenPending] = useState<any[]>([]);

  useEffect(() => {
    // Simulasi Query: Mencari dokumen modul_ajar / asesmen dengan status "menunggu"
    const qDoc = query(collection(db, "modul_ajar"), where("statusValidasi", "==", "menunggu"));
    const unsub = onSnapshot(qDoc, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Data Mockup untuk UI Presentasi
      if (data.length === 0) {
        setDokumenPending([
          { id: "a1", pembuat: "Siti Aminah, M.Pd", tipe: "Kartu Soal AI", topik: "Teks Observasi (PG)", mapel: "B. Indonesia", tanggal: "Baru saja" },
          { id: "a2", pembuat: "Budi Santoso, S.Pd", tipe: "Kisi-kisi Ujian", topik: "Aljabar Linear", mapel: "Matematika", tanggal: "2 Jam lalu" }
        ]);
      } else {
        setDokumenPending(data);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleValidasi = (id: string, aksi: "setuju" | "tolak") => {
    alert(`Dokumen ${id} berhasil di-${aksi === 'setuju' ? 'Setujui (ACC)' : 'Tolak'}. \n\n(Pada integrasi penuh, ini akan mengubah status dokumen di Firestore Firebase dan mengirim notifikasi ke Guru).`);
    setDokumenPending(prev => prev.filter(doc => doc.id !== id));
  };

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-emerald-600"/></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      <header className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`} tabIndex={0}>
            <FileSpreadsheet className="text-emerald-600" aria-hidden="true"/> Validasi Asesmen Pendidik
          </h1>
          <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Tinjau dan setujui (ACC) draf kisi-kisi dan butir soal yang telah dirancang oleh Guru menggunakan bantuan *AI Generator* sebelum digunakan dalam ujian.
          </p>
        </div>
      </header>

      {/* Banner Peringatan */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3" role="alert">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} aria-hidden="true"/>
        <div>
          <h2 className="text-sm font-bold text-amber-900">Antrean Tinjauan</h2>
          <p className="text-xs text-amber-800 mt-1">Terdapat <strong className="font-bold">{dokumenPending.length} dokumen</strong> yang memerlukan stempel persetujuan elektronik Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {dokumenPending.length > 0 ? (
          dokumenPending.map((doc) => (
            <section key={doc.id} aria-label={`Dokumen ${doc.tipe} dari ${doc.pembuat}`} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500" tabIndex={0}>
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0" aria-hidden="true">
                  <BrainCircuit size={24}/>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{doc.topik}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{doc.tipe}</span>
                    <span className="text-xs font-medium text-slate-500">{doc.mapel}</span>
                    <span className="text-xs font-medium text-slate-400 border-l border-slate-200 pl-3">Oleh: <strong className="text-slate-700">{doc.pembuat}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                <button 
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                  aria-label={`Tinjau isi dokumen ${doc.topik}`}
                >
                  <Eye size={16} aria-hidden="true"/> Tinjau
                </button>
                <button 
                  onClick={() => handleValidasi(doc.id, "tolak")}
                  className="flex-none p-2 md:px-4 md:py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                  aria-label={`Tolak dokumen ${doc.topik}`}
                  title="Revisi/Tolak"
                >
                  <X size={18} aria-hidden="true"/> <span className="hidden md:inline ml-1">Revisi</span>
                </button>
                <button 
                  onClick={() => handleValidasi(doc.id, "setuju")}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label={`Setujui dokumen ${doc.topik}`}
                >
                  <Check size={18} aria-hidden="true"/> Setujui (ACC)
                </button>
              </div>

            </section>
          ))
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-center">
            <FileCheck2 size={48} className="text-emerald-200 mb-4" aria-hidden="true"/>
            <p className="text-base font-bold text-slate-700">Semua Dokumen Telah Divalidasi</p>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">Tidak ada antrean dokumen asesmen atau modul ajar yang menunggu persetujuan Anda saat ini.</p>
          </div>
        )}
      </div>

    </motion.main>
  );
}