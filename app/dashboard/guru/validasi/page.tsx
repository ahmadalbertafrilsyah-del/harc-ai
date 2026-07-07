"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Clock, CheckCircle2, XCircle, Eye, X, 
  MessageSquare, FileText, User, Calendar, BookOpen
} from "lucide-react";
import { Teachers } from "next/font/google";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface Document {
  id: string;
  userId: string;
  tipe: string;
  mapel: string;
  kelas: string;
  topik: string;
  materi: string;
  namaGuru: string;
  createdAt: any;
  statusValidasi?: 'menunggu' | 'disetujui' | 'ditolak';
  konten: string;
  feedback?: string;
}

export default function StatusValidasiGuru() {
  const [activeTab, setActiveTab] = useState<'antrean' | 'disetujui' | 'ditolak'>('antrean');
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
      }
    });

    const q = query(collection(db, "modul_ajar"), orderBy("createdAt", "desc"));
    const unsubscribeDocs = onSnapshot(q, (snapshot) => {
      const docsData: Document[] = [];
      snapshot.forEach((doc) => {
        docsData.push({ id: doc.id, ...doc.data() } as Document);
      });
      setDocuments(docsData);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDocs();
    };
  }, []);

  // Filter: Hanya tampilkan dokumen milik Guru yang sedang login
  const myDocuments = documents.filter(doc => doc.userId === userUid);

  const filteredDocs = myDocuments.filter(doc => {
    const status = doc.statusValidasi || 'menunggu';
    const matchesTab = (activeTab === 'antrean' && status === 'menunggu') || (status === activeTab);
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (doc.mapel || "").toLowerCase().includes(searchLower) ||
      (doc.tipe || "").toLowerCase().includes(searchLower);

    return matchesTab && matchesSearch;
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Waktu tidak diketahui";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 pt-4 px-4 md:px-6">
      
      {/* HEADER GURU */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Status Validasi Dokumen</h1>
          <p className="text-slate-500 text-[13px] md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Pantau status perangkat ajar yang telah Anda buat. Dokumen yang disetujui siap digunakan, sedangkan yang ditolak memerlukan revisi.
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <input 
            type="text" 
            placeholder="Cari mapel atau tipe dokumen..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-blue-500 outline-none shadow-sm"
          />
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
        </div>
      </div>

      {/* TABS STATUS */}
      <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setActiveTab('antrean')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'antrean' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <Clock size={16} /> Sedang Ditinjau
          <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-[10px] ml-1">
            {myDocuments.filter(d => !d.statusValidasi || d.statusValidasi === 'menunggu').length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('disetujui')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'disetujui' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <CheckCircle2 size={16} /> Disetujui
        </button>
        <button 
          onClick={() => setActiveTab('ditolak')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'ditolak' ? 'border-rose-500 text-rose-700 bg-rose-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <XCircle size={16} /> Perlu Revisi
        </button>
      </div>

      {/* DAFTAR DOKUMEN SAYA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
        <AnimatePresence mode="popLayout">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }} 
                key={doc.id} 
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-slate-200">
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
                  <p className="text-[10px] text-slate-400 flex items-center gap-2"><Calendar size={12} className="text-slate-300"/> {formatDate(doc.createdAt)}</p>
                </div>

                <button 
                  onClick={() => setSelectedDoc(doc)}
                  className="mt-5 w-full bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={14} /> Lihat Detail & Catatan
                </button>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 opacity-70">
              <FileText size={48} className="mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-600">Kosong</h3>
              <p className="text-sm mt-1">Belum ada dokumen Anda pada kategori ini.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL TINJAUAN GURU (HANYA BACA) */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 20 }} 
              className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                    Detail Dokumen {selectedDoc.tipe}
                  </h3>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-rose-600 transition-colors bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                  <X size={20}/>
                </button>
              </div>

              {/* Tampilkan Catatan Revisi jika ada di bagian atas */}
              {selectedDoc.statusValidasi && selectedDoc.statusValidasi !== 'menunggu' && (
                <div className={`m-6 p-4 rounded-xl border flex items-start gap-4 ${selectedDoc.statusValidasi === 'disetujui' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <MessageSquare className={`shrink-0 ${selectedDoc.statusValidasi === 'disetujui' ? 'text-emerald-500' : 'text-rose-500'}`} />
                  <div>
                    <h4 className={`text-sm font-bold uppercase tracking-wider mb-1 ${selectedDoc.statusValidasi === 'disetujui' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      Catatan Kepala Sekolah / Validator
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      {selectedDoc.feedback || "Tidak ada catatan spesifik."}
                    </p>
                  </div>
                </div>
              )}

              {/* Preview Dokumen */}
              <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 custom-scrollbar">
                <div className="bg-white shadow-md border border-slate-200 rounded-xl p-8 max-w-3xl mx-auto min-h-full">
                  <div className="markdown-body">
                    <style>{`
                      .markdown-body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; color: #000; text-align: justify; }
                      .markdown-body table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; word-wrap: break-word; overflow-wrap: break-word; }
                      .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 6px 10px; text-align: left; vertical-align: top; }
                      .markdown-body th { background-color: #f8fafc; font-weight: bold; text-align: center; }
                      .markdown-body h1, .markdown-body h2, .markdown-body h3 { font-weight: bold; margin-bottom: 0.5rem; margin-top: 1.5rem; text-transform: uppercase; }
                      .markdown-body h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; font-size: 16pt; }
                      .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 1rem; }
                    `}</style>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedDoc.konten}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}