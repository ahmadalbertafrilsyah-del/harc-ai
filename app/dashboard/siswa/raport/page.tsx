"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FileText, Award, BarChart3, Clock, AlertCircle, MessageSquare, Send, CheckCircle2, Loader2, X } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

// HELPER SUPER AMAN: Fungsi untuk mengurai timestamp dari Firebase apapun kondisinya
const dapatkanWaktuAman = (item: any) => {
  try {
    if (!item || !item.timestamp) return 0;
    // Jika format asli Firebase (punya method toMillis)
    if (typeof item.timestamp.toMillis === 'function') return item.timestamp.toMillis();
    // Jika format JSON serialized (punya seconds)
    if (item.timestamp.seconds) return item.timestamp.seconds * 1000;
    // Jika format number / millisecond biasa
    if (typeof item.timestamp === 'number') return item.timestamp;
    return 0;
  } catch (error) {
    return 0; // Jika gagal total, anggap saja 0 agar aplikasi tidak crash
  }
};

export default function RaportSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [riwayatUjian, setRiwayatUjian] = useState<any[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);

  // State untuk Modal Sanggahan (Agency Siswa)
  const [selectedRaport, setSelectedRaport] = useState<any | null>(null);
  const [sanggahanText, setSanggahanText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
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
          if (!data) return null;

          return { 
            idDoc: docSnapshot.id, 
            ...data,
            judulUjian: data.judulUjian || "Asesmen Kompetensi", 
            feedbackGuru: data.feedbackGuru || "Belum ada umpan balik naratif dari AI/Guru."
          };
        });
        
        // PROTEKSI MUTLAK: Filter data kosong dan gunakan helper waktu
        const validRiwayat = dataRiwayat.filter((item) => item !== null && item !== undefined);
        const sortedRiwayat = validRiwayat.sort((a, b) => dapatkanWaktuAman(b) - dapatkanWaktuAman(a));

        setRiwayatUjian(sortedRiwayat);
      } catch (error) {
        console.error("Gagal memproses riwayat:", error);
        setRiwayatUjian([]); 
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  };

  const handleAjukanSanggahan = async () => {
    if (!selectedRaport || !sanggahanText.trim()) return;
    setIsSubmitting(true);

    try {
      const docRef = doc(db, "jawaban_siswa", selectedRaport.idDoc);
      
      await updateDoc(docRef, {
        sanggahan: {
          teks: sanggahanText,
          status: "menunggu_validasi_guru",
          waktuSanggahan: serverTimestamp()
        }
      });

      alert("Sanggahan berhasil dikirim! Guru akan meninjau kembali jawaban dan konteks budayamu.");
      
      const updatedRaport = {
        ...selectedRaport,
        sanggahan: { teks: sanggahanText, status: "menunggu_validasi_guru" }
      };
      setSelectedRaport(updatedRaport);
      setSanggahanText("");
    } catch (error) {
      console.error("Gagal mengirim sanggahan:", error);
      alert("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-6 max-w-6xl mx-auto ${teachersFont.className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Award className="text-emerald-500" size={32} /> Raport & Refleksi Belajar
        </h1>
        <p className="text-slate-500 mt-2">Pantau perkembangan nilaimu dan berikan umpan balik terhadap penilaian sistem.</p>
      </div>

      {(riwayatUjian || []).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(riwayatUjian || []).map((raport) => {
            if (!raport) return null; 

            const nilaiAngka = raport.nilai ? Math.round(raport.nilai) : 0;
            const durasiMenit = raport.durasiDetik ? Math.floor(raport.durasiDetik / 60) : 0;
            const bantuanAI = raport.metadataAnalitik?.totalBantuanAI || 0;
            const statusMandiri = raport.metadataAnalitik?.statusKemandirian || "Selesai";

            return (
              <motion.div whileHover={{ y: -5 }} key={raport.idDoc} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className={`h-2 ${nilaiAngka >= 75 ? 'bg-emerald-500' : nilaiAngka >= 60 ? 'bg-amber-400' : 'bg-red-500'}`}></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">
                      {statusMandiri}
                    </span>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${nilaiAngka >= 75 ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {nilaiAngka}
                      </span>
                      <span className="text-sm text-slate-400">/100</span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-lg mb-4 line-clamp-2">{raport.judulUjian}</h3>
                  
                  <div className="space-y-2 text-sm text-slate-500 mb-6 border-t border-slate-100 pt-4">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5"><Clock size={14}/> Waktu Pengerjaan</span>
                      <span className="font-medium text-slate-700">{durasiMenit} Menit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5"><MessageSquare size={14}/> Bantuan AI Diminta</span>
                      <span className="font-medium text-slate-700">{bantuanAI} Kali</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedRaport(raport)}
                    className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                  >
                    <BarChart3 size={16}/> Lihat Detail & Umpan Balik
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-bold text-slate-700">Belum Ada Raport</h3>
          <p className="text-sm text-slate-500 mt-2">Kerjakan asesmen terlebih dahulu untuk melihat hasil belajar di sini.</p>
        </div>
      )}

      {/* MODAL DETAIL & SANGGAHAN AI */}
      <AnimatePresence>
        {selectedRaport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">Detail Evaluasi Asesmen</h2>
                <button onClick={() => setSelectedRaport(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20}/>
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {/* Bagian Umpan Balik */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Umpan Balik Naratif (AI & Guru)</h3>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-slate-700 text-sm leading-relaxed">
                    {selectedRaport?.feedbackGuru || "Belum ada feedback untuk ujian ini."}
                  </div>
                </div>

                {/* Status Sanggahan */}
                {selectedRaport?.sanggahan ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-700 font-bold mb-2">
                      <AlertCircle size={18}/> Menunggu Validasi Manual
                    </div>
                    <p className="text-sm text-slate-600 mb-3">Kamu telah mengajukan sanggahan terhadap penilaian ini. Guru sedang meninjaunya berdasarkan korpus budaya dan argumenmu.</p>
                    <div className="p-3 bg-white border border-amber-100 rounded-lg text-sm text-slate-700 italic">
                      "{selectedRaport.sanggahan.teks}"
                    </div>
                  </div>
                ) : (
                  /* Form Sanggahan (Agency) */
                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                        <MessageSquare size={20}/>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Merasa penilaian AI kurang tepat?</h3>
                        <p className="text-sm text-slate-500 mt-1">Sistem AI mungkin belum sempurna memahami variasi dialek atau konteks budaya lokalmu. Berikan argumenmu agar dinilai ulang oleh Guru.</p>
                      </div>
                    </div>
                    
                    <textarea 
                      value={sanggahanText}
                      onChange={(e) => setSanggahanText(e.target.value)}
                      placeholder="Contoh: Jawaban saya di nomor 3 menggunakan tingkatan bahasa Krama Inggil yang lazim dipakai di daerah saya, mohon dicek ulang..."
                      className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all mb-3 min-h-[120px] outline-none"
                    />
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={handleAjukanSanggahan}
                        disabled={!sanggahanText.trim() || isSubmitting}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                        Ajukan Sanggahan
                      </button>
                    </div>
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