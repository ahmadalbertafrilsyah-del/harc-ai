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

  const isLandscape = selectedDoc?.tipe === "PROMES" || selectedDoc?.tipe === "PROTA" || selectedDoc?.tipe === "Kisi-kisi Ujian" || selectedDoc?.tipe === "ATP";
  const sanitasiHasil = selectedDoc?.konten?.replace(/<br\s*\/?>/gi, '\n\n') || "";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 pb-16 px-4 md:px-6">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Produksi Bahan Ajar</h1>
          <p className="text-slate-500 text-sm mt-1.5">Review, baca, dan validasi modul ajar pendidik.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari..." className="bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm w-full outline-none focus:border-blue-500 shadow-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {dokumenInstansi.filter(d => (d.materi || "").toLowerCase().includes(searchQuery.toLowerCase()) || (d.mapel || "").toLowerCase().includes(searchQuery.toLowerCase())).map((doc) => (
          <div key={doc.id} onClick={() => { setSelectedDoc(doc); setFeedback(doc.feedback || ""); }} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-purple-300">
             <div className="flex justify-between items-center mb-4">
               <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-purple-100 uppercase tracking-widest">{doc.tipe}</span>
               {doc.statusValidasi === 'disetujui' ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100"><CheckCircle2 size={12}/> Tervalidasi</span> : 
                doc.statusValidasi === 'ditolak' ? <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100"><XCircle size={12}/> Revisi</span> : 
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100"><Clock size={12}/> Menunggu</span>}
             </div>
             <h3 className={`font-bold text-slate-800 text-base mb-2 leading-snug line-clamp-2 ${teachersFont.className}`}>{doc.materi || "Dokumen Tanpa Judul"}</h3>
             <div className="pt-3 border-t border-slate-100 flex justify-between items-end mt-auto">
               <div>
                 <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium"><User size={12}/> {doc.namaGuru}</p>
                 <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1"><BookOpen size={12}/> {doc.mapel} - {doc.kelas}</p>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* MODAL PREVIEW & VALIDASI */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-[1200px] shadow-2xl flex flex-col h-[90vh] overflow-hidden">
              
              {/* Header Modal */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className={`font-bold text-lg text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
                    <FileText size={20} className="text-blue-600"/> Preview Dokumen Akademik
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">Oleh: {selectedDoc.namaGuru} | Mapel: {selectedDoc.mapel}</p>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors"><X size={20}/></button>
              </div>
              
              {/* Body Modal (Split: Preview & Form Feedback) */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#f8fafc]">
                
                {/* Area Preview Dokumen (Kiri) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                  <div className={`bg-white shadow-lg border border-slate-300 rounded p-8 md:p-12 mx-auto min-h-full ${isLandscape ? 'w-full max-w-none' : 'max-w-4xl'}`}>
                    <div className="markdown-body">
                      {/* INJECT CSS STYLE YANG SAMA DENGAN GENERATOR GURU */}
                      <style>{`
                        .markdown-body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; color: #000; text-align: justify; }
                        @media (max-width: 768px) { .markdown-body table { table-layout: auto !important; min-width: 600px; } .table-wrapper { overflow-x: auto; width: 100%; margin-bottom: 1.5rem; } }
                        .markdown-body table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; word-wrap: break-word; overflow-wrap: break-word; }
                        .markdown-body table.promes-table { font-size: 9pt !important; table-layout: auto !important; }
                        .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 6px 10px; text-align: left; vertical-align: top; }
                        .markdown-body th { background-color: #f8fafc; font-weight: bold; text-align: center; }
                        .markdown-body h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; font-size: 14pt; font-weight: bold; margin-bottom: 1.5rem; text-transform: uppercase; }
                        .markdown-body h2, .markdown-body h3 { font-weight: bold; margin-bottom: 0.5rem; margin-top: 1.5rem; text-transform: uppercase; }
                        .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 1rem; }
                      `}</style>
                      
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => (
                            <div className={isLandscape ? "w-full overflow-x-auto" : "table-wrapper"}>
                              <table className={isLandscape ? "promes-table" : ""} {...props} />
                            </div>
                          ),
                          th: ({node, children, ...props}) => {
                            const text = String(children).toLowerCase().trim();
                            let width = 'auto'; let whiteSpace = 'normal';
                            if (text === 'no' || text === 'no.') width = '3%';
                            else if (text.includes('tema') && isLandscape) width = '15%';
                            else if (text.includes('sub-tema') && isLandscape) width = '15%';
                            else if (text.includes('pemb. ke-') && isLandscape) width = '5%';
                            else if (text.includes('jp') && isLandscape) width = '3%';
                            else if (text.includes('tema') || text.includes('materi') || text.includes('tujuan')) width = '25%';
                            else if (isLandscape) { whiteSpace = 'nowrap'; } 
                            return <th style={{ width, whiteSpace: whiteSpace as any, padding: isLandscape ? '4px 2px' : '6px 10px' }} {...props}>{children}</th>;
                          },
                          td: ({node, children, ...props}) => {
                            return <td style={{ padding: isLandscape ? '4px 2px' : '6px 10px', fontSize: isLandscape ? '9pt' : 'inherit' }} {...props}>{children}</td>;
                          }
                        }}
                      >
                        {sanitasiHasil}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                {/* Area Form Validasi (Kanan) */}
                <div className="w-full md:w-[320px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0">
                  <div className="p-5 flex-1 overflow-y-auto">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Tindakan Validasi</h3>
                    
                    <label className="block text-xs font-bold text-slate-600 mb-2">Catatan Kepala Sekolah (Opsional)</label>
                    <textarea 
                      value={feedback} 
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Misal: Tolong sesuaikan alokasi waktu pada pertemuan ke-3..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none shadow-sm" 
                      rows={6}
                    />
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Berikan catatan khusus jika dokumen ini perlu direvisi oleh pendidik yang bersangkutan.</p>
                  </div>
                  
                  <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3">
                    <button 
                      onClick={() => handleValidasi('disetujui')} 
                      disabled={isSaving} 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-70"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Setujui Dokumen
                    </button>
                    <button 
                      onClick={() => handleValidasi('ditolak')} 
                      disabled={isSaving} 
                      className="w-full bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin"/> : <XCircle size={16}/>} Kembalikan & Revisi
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}