"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Clock, CheckCircle2, XCircle, FileText, User } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc, orderBy } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function BahanAjarLembaga() {
  const [dokumenInstansi, setDokumenInstansi] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [namaInstansi, setNamaInstansi] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const instansi = docSnap.data().instansi || docSnap.data().namaInstansi;
            setNamaInstansi(instansi);

            if (instansi) {
              // Langkah 1: Cari semua UID Guru yang ada di instansi ini
              const qGuru = query(collection(db, "users"), where("role", "==", "guru"), where("instansi", "==", instansi));
              const unsubGuru = onSnapshot(qGuru, (guruSnap) => {
                const guruIds = guruSnap.docs.map(g => g.id);

                // Langkah 2: Tarik semua modul ajar, lalu filter berdasarkan UID Guru tadi
                const qModul = query(collection(db, "modul_ajar"), orderBy("createdAt", "desc"));
                const unsubModul = onSnapshot(qModul, (modulSnap) => {
                  const semuaModul = modulSnap.docs.map(m => ({ id: m.id, ...m.data() } as any));
                  
                  // Filter lokal: Hanya ambil modul yang dibuat oleh guru dari instansi ini
                  const modulInstansiIni = semuaModul.filter(modul => guruIds.includes(modul.userId));
                  setDokumenInstansi(modulInstansiIni);
                });
                return () => unsubModul();
              });
              return () => unsubGuru();
            }
          }
        });
        return () => unsubProfil();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const filteredDocs = dokumenInstansi.filter(doc => 
    (doc.mapel || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.tipe || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.namaGuru || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Waktu tidak diketahui";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Produksi Bahan Ajar</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Kumpulan modul, bank soal, dan perangkat ajar yang telah di-<i>generate</i> oleh pendidik di lembaga Anda.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-2.5 rounded-xl w-full md:w-72 shadow-sm">
          <Search size={16} className="text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mapel, tipe, atau guru..." 
            className="bg-transparent border-none outline-none text-sm w-full font-medium text-slate-700" 
          />
        </div>
      </div>

      {/* Grid Dokumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
        <AnimatePresence mode="popLayout">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
                key={doc.id} 
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-purple-200">
                    {doc.tipe}
                  </span>
                  {doc.statusValidasi === 'disetujui' && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1"><CheckCircle2 size={12}/> Disetujui</span>}
                  {doc.statusValidasi === 'ditolak' && <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1"><XCircle size={12}/> Revisi</span>}
                  {(!doc.statusValidasi || doc.statusValidasi === 'menunggu') && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1"><Clock size={12}/> Menunggu</span>}
                </div>
                
                <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-2 mb-2">
                  {doc.materi || doc.topik || "Dokumen Tanpa Judul"}
                </h3>
                
                <div className="space-y-1.5 mt-auto pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 flex items-center gap-2"><BookOpen size={12} className="text-slate-400"/> {doc.mapel} - Kelas {doc.kelas}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-2"><User size={12} className="text-slate-400"/> Oleh: {doc.namaGuru || "Anonim"}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-right">
                  Dibuat pada: {formatDate(doc.createdAt)}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 opacity-70">
              <FileText size={48} className="mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-600">Belum Ada Dokumen</h3>
              <p className="text-sm mt-1">Guru di instansi Anda belum melakukan generate dokumen.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}