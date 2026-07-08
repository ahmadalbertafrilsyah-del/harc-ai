"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Clock, CheckCircle2, XCircle, FileText, User, X, Loader2, Save } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc, orderBy, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function BahanAjarLembaga() {
  const [dokumenInstansi, setDokumenInstansi] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State Modal Validasi & Preview
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const npsn = data.npsn || data.instansi;

            if (npsn) {
              const qGuru = query(collection(db, "users"), where("role", "==", "guru"), where("npsn", "==", npsn));
              const unsubGuru = onSnapshot(qGuru, (guruSnap) => {
                const guruIds = guruSnap.docs.map(g => g.id);
                if (guruIds.length === 0) { setDokumenInstansi([]); return; }

                const qModul = query(collection(db, "modul_ajar"), orderBy("createdAt", "desc"));
                const unsubModul = onSnapshot(qModul, (modulSnap) => {
                  const semuaModul = modulSnap.docs.map(m => ({ id: m.id, ...m.data() } as any));
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

  const handleValidasi = async (status: 'disetujui' | 'ditolak') => {
    if (!selectedDoc) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "modul_ajar", selectedDoc.id), {
        statusValidasi: status,
        feedback: feedback
      });
      alert(`Dokumen berhasil ${status === 'disetujui' ? 'Disetujui' : 'Ditolak'}`);
      setSelectedDoc(null);
      setFeedback("");
    } catch (e) {
      alert("Gagal memperbarui status.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 pb-16 px-4 md:px-6">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Produksi Bahan Ajar</h1>
          <p className="text-slate-500 text-sm">Review, baca, dan validasi modul ajar pendidik.</p>
        </div>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari..." className="bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm w-full md:w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {dokumenInstansi.filter(d => d.materi?.toLowerCase().includes(searchQuery.toLowerCase())).map((doc) => (
          <div key={doc.id} onClick={() => { setSelectedDoc(doc); setFeedback(doc.feedback || ""); }} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all">
             <div className="flex justify-between items-center mb-3">
               <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded">{doc.tipe}</span>
               {doc.statusValidasi === 'disetujui' ? <CheckCircle2 size={16} className="text-emerald-500"/> : 
                doc.statusValidasi === 'ditolak' ? <XCircle size={16} className="text-rose-500"/> : <Clock size={16} className="text-amber-500"/>}
             </div>
             <h3 className="font-bold text-slate-800 text-sm mb-1">{doc.materi || "Tanpa Judul"}</h3>
             <p className="text-[11px] text-slate-500">{doc.namaGuru} • {doc.mapel}</p>
          </div>
        ))}
      </div>

      {/* MODAL PREVIEW & VALIDASI */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-bold text-lg">Preview & Validasi Dokumen</h2>
                <button onClick={() => setSelectedDoc(null)}><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                <div className="prose max-w-none bg-white p-8 border rounded-lg shadow-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedDoc.konten}</ReactMarkdown>
                </div>
              </div>

              <div className="p-6 border-t bg-white">
                <textarea 
                  value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Berikan catatan revisi atau komentar untuk guru..."
                  className="w-full p-3 bg-slate-50 border rounded-lg text-sm mb-4 outline-none" rows={3}
                />
                <div className="flex gap-3">
                  <button onClick={() => handleValidasi('ditolak')} disabled={isSaving} className="flex-1 border border-rose-600 text-rose-600 py-2.5 rounded-lg font-bold text-sm hover:bg-rose-50">Tolak / Revisi</button>
                  <button onClick={() => handleValidasi('disetujui')} disabled={isSaving} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold text-sm">Setujui Modul</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}