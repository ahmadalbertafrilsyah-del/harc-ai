"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Save, Loader2, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function JurnalRefleksi() {
  const [jurnal, setJurnal] = useState("");
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusPesan, setStatusPesan] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      const q = query(
        collection(db, "jurnal_siswa"), 
        where("userId", "==", auth.currentUser.uid), 
        orderBy("timestamp", "desc")
      );
      
      const unsubscribe = onSnapshot(q, (snap) => {
        setRiwayat(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        console.error("Gagal memuat riwayat jurnal:", error);
      });

      return () => unsubscribe();
    }
  }, []);

  const handleSimpan = async () => {
    // Validasi data kosong
    if (!jurnal.trim()) return;
    
    setIsSaving(true);
    setStatusPesan(null);
    
    const auth = getAuth();
    if (!auth.currentUser) {
      setStatusPesan({ tipe: "error", teks: "Sesi tidak valid. Silakan login ulang." });
      setIsSaving(false);
      return;
    }

    // Buat batasan waktu 10 detik
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 10000)
    );

    try {
      // Berlomba: Mana yang lebih cepat selesai, addDoc atau timeout
      await Promise.race([
        addDoc(collection(db, "jurnal_siswa"), {
          userId: auth.currentUser.uid,
          isi: jurnal.trim(),
          timestamp: serverTimestamp()
        }),
        timeoutPromise
      ]);

      setJurnal("");
      setStatusPesan({ tipe: "sukses", teks: "Jurnal refleksi berhasil disimpan!" });
    } catch (error: any) {
      if (error.message === "Timeout") {
        setStatusPesan({ tipe: "error", teks: "Koneksi lambat. Gagal terhubung ke server." });
      } else {
        setStatusPesan({ tipe: "error", teks: "Gagal menyimpan jurnal. Coba lagi nanti." });
      }
    } finally {
      // Membuka kunci tombol kembali apapun hasilnya
      setIsSaving(false);
      
      // Sembunyikan notifikasi setelah 3 detik
      setTimeout(() => setStatusPesan(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-7 pb-20 md:pb-10">
      {/* Header halaman */}
      <div className="flex items-start gap-3.5 border-b border-slate-200 pb-5">
        <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 shrink-0">
          <PenTool size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">Jurnal Refleksi</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-xl leading-relaxed">
            Rekam proses belajarmu setiap hari. Refleksi yang konsisten membantu memahami perkembangan diri secara akademik.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Save size={15} className="text-emerald-600"/> Tulis Refleksi Hari Ini
        </h2>

        {/* Notifikasi Status */}
        <AnimatePresence>
          {statusPesan && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className={`p-4 rounded-xl flex items-center gap-3 mb-4 border ${statusPesan.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}
              role="alert"
            >
              {statusPesan.tipe === 'sukses' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
              <p className="text-sm font-bold">{statusPesan.teks}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea 
          value={jurnal} 
          onChange={(e) => setJurnal(e.target.value)}
          placeholder="Apa yang kamu pelajari hari ini? Apa kesulitanmu?"
          className="w-full h-40 p-4 bg-slate-50 border border-slate-300 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
          disabled={isSaving}
        />
        <div className="flex justify-end">
          <button 
            onClick={handleSimpan} 
            disabled={isSaving || !jurnal.trim()} 
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 
            Simpan Refleksi
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {riwayat.length > 0 && (
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
            <Calendar size={15} className="text-emerald-600" /> Riwayat Refleksi
            <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full normal-case tracking-normal">{riwayat.length} catatan</span>
          </h2>
        )}
        {riwayat.length > 0 ? (
          riwayat.map((item) => (
            <div key={item.id} className="relative bg-white p-5 md:p-6 pl-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md hover:border-emerald-200 transition-all">
              <span className="absolute left-0 top-5 bottom-5 w-1 rounded-full bg-emerald-500/60" aria-hidden="true" />
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 ring-1 ring-emerald-100 shrink-0">
                <Calendar size={22}/>
              </div>
              <div className="min-w-0">
                {/* Mencegah error toDate() jika timestamp lokal masih null/pending */}
                <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                  {item.timestamp ? item.timestamp.toDate().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Baru saja"}
                </p>
                <p className="text-slate-700 text-[14px] leading-relaxed whitespace-pre-wrap">{item.isi}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-slate-300">
            <PenTool size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-sm text-slate-600">Belum ada catatan jurnal</p>
            <p className="text-xs text-slate-400 mt-1">Mulailah menulis refleksi belajarmu hari ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}