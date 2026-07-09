"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Clock, CheckCircle2, XCircle, Eye, X, 
  MessageSquare, FileText, User, Calendar,
  BookOpen, Loader2, Edit3, Save, FilePlus2, Info, LayoutTemplate, Cloud, FileSpreadsheet
} from "lucide-react";
import { Teachers } from "next/font/google";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// IMPORT LIBRARY EDITOR SECARA DINAMIS (Mencegah error Next.js SSR)
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

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

export default function StatusKoleksiGuru() {
  const [activeTab, setActiveTab] = useState<'antrean' | 'disetujui' | 'ditolak'>('antrean');
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);
  
  // State Modal & Editor
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");

  // State Simulasi Ekspor Google
  const [isExportingGoogle, setIsExportingGoogle] = useState(false);
  const [googleExportType, setGoogleExportType] = useState<"Docs" | "Sheets" | null>(null);

  // Ref untuk mengambil HTML Dokumen
  const previewRef = useRef<HTMLDivElement>(null);

  // Mengambil data secara REAL-TIME dari koleksi "modul_ajar"
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setUserUid(user.uid);
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

  const handleOpenDoc = (doc: Document) => {
    setSelectedDoc(doc);
    const kontenBersih = doc.konten.replace(/<br\s*\/?>/gi, '\n\n');
  
    setEditValue(kontenBersih);
    setIsEditMode(false);
  };

  // Fungsi Guru Menyimpan Perubahan Dokumen
  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    setIsProcessing(true);
    try {
      const newStatus = selectedDoc.statusValidasi === 'ditolak' ? 'menunggu' : selectedDoc.statusValidasi;

      await updateDoc(doc(db, "modul_ajar", selectedDoc.id), {
        konten: editValue,
        statusValidasi: newStatus || 'menunggu',
        lastEditedAt: serverTimestamp()
      });
      alert("Perubahan dokumen berhasil disimpan!");
      
      setSelectedDoc({ ...selectedDoc, konten: editValue, statusValidasi: newStatus }); 
      setIsEditMode(false);
      if (newStatus === 'menunggu') setActiveTab('antrean'); 
    } catch (error) {
      alert("Gagal menyimpan perubahan.");
    } finally {
      setIsProcessing(false);
    }
  };

  // FUNGSI CUSTOM: Menyisipkan Elemen Tambahan
  const insertPageBreak = () => {
    const pageBreakTag = '\n\n<div id="landscape-break-marker" style="page-break-before:always; clear:both; margin:2rem 0; border-bottom:2px dashed #cbd5e1"></div>\n\n';
    setEditValue(prev => prev + pageBreakTag);
    alert("Page Break ditambahkan di bagian paling bawah. Pindahkan kode tersebut ke posisi yang Anda inginkan.");
  };

  const insertBasicTable = () => {
    const tableTag = '\n\n| Kolom 1 | Kolom 2 | Kolom 3 |\n|---|---|---|\n| Baris 1 | Isi | Isi |\n| Baris 2 | Isi | Isi |\n\n';
    setEditValue(prev => prev + tableTag);
  };

  const insertProsemTable = () => {
    const tableTag = '\n\n| No | Tema / Materi | Sub-Tema | JP | Bulan |\n|---|---|---|---|---|\n| 1 |  |  |  |  |\n| 2 |  |  |  |  |\n\n';
    setEditValue(prev => prev + tableTag);
  };

  // --- TRIK SMART CLIPBOARD KE GOOGLE WORKSPACE ---
  const handleExportToGoogle = async (type: "Docs" | "Sheets") => {
    if (!previewRef.current) return;
    setIsExportingGoogle(true);
    setGoogleExportType(type);
    
    try {
      // 1. Ambil HTML lengkap dari dokumen yang sedang di-preview
      const htmlContent = previewRef.current.innerHTML;
      
      // Bungkus dengan font default agar rapi saat di-paste
      const formattedHtml = `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5;">${htmlContent}</div>`;
      
      // 2. Salin ke memori Clipboard
      const blobHtml = new Blob([formattedHtml], { type: "text/html" });
      const clipboardItem = new window.ClipboardItem({ "text/html": blobHtml });
      await navigator.clipboard.write([clipboardItem]);

      // 3. Jeda sedikit, lalu buka tab baru
      setTimeout(() => {
          setIsExportingGoogle(false);
          setGoogleExportType(null);
          
          alert(`✅ BERHASIL!\n\nFormat dokumen telah tersalin ke memori perangkat (Clipboard).\n\nSilakan tekan CTRL + V (atau CMD + V) pada lembar kosong Google ${type} yang akan terbuka.`);
          
          const targetUrl = type === "Docs" ? "https://docs.new" : "https://sheets.new";
          window.open(targetUrl, '_blank');
      }, 2000);

    } catch (error) {
      console.error("Gagal menyalin ke clipboard:", error);
      setIsExportingGoogle(false);
      setGoogleExportType(null);
      alert("Browser Anda tidak mendukung penyalinan otomatis. Silakan gunakan fitur 'Download Word' sebagai alternatif.");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Waktu tidak diketahui";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const isLandscape = selectedDoc?.tipe === "PROMES" || selectedDoc?.tipe === "PROTA" || selectedDoc?.tipe === "ATP" || selectedDoc?.tipe === "Kisi-kisi Ujian";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 pt-4 px-4 md:px-6 relative">
      
      {/* OVERLAY LOADING GOOGLE WORKSPACE */}
      <AnimatePresence>
        {isExportingGoogle && (
          <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center text-center p-8 bg-white shadow-2xl rounded-3xl border border-slate-200">
              <div className="w-20 h-20 relative flex items-center justify-center mb-5">
                 <Loader2 size={50} className={`${googleExportType === "Docs" ? 'text-blue-500' : 'text-emerald-500'} animate-spin absolute`} />
                 <Cloud size={24} className={`${googleExportType === "Docs" ? 'text-blue-600' : 'text-emerald-600'}`} />
              </div>
              <h3 className={`font-bold text-xl text-slate-800 ${teachersFont.className}`}>Menyiapkan Format Dokumen...</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">Menyalin elemen tabel dan struktur teks ke dalam memori untuk ditempelkan di Google {googleExportType}.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER GURU */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Koleksi & Status Dokumen</h1>
          <p className="text-slate-500 text-[13px] md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Pantau status perangkat ajar yang telah Anda buat. Anda dapat merevisi dan mengedit ulang dokumen secara manual kapan saja.
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

      {/* TABS KONTROL */}
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
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-slate-200">{doc.tipe}</span>
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
                  onClick={() => handleOpenDoc(doc)}
                  className="mt-5 w-full bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={14} /> Tinjau & Edit Dokumen
                </button>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 opacity-70">
              <FileText size={48} className="mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-600">Tidak Ada Dokumen</h3>
              <p className="text-sm mt-1">Belum ada dokumen Anda pada kategori ini.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL TINJAUAN & EDITOR (LAYAR PENUH) */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 20 }} 
              className="bg-white w-full max-w-[1400px] h-full max-h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                    <BookOpen size={20} className="text-blue-600" /> Mode {isEditMode ? "Edit" : "Tinjauan"} Dokumen
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Tipe: {selectedDoc.tipe} • Mapel: {selectedDoc.mapel}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${isEditMode ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                  >
                    {isEditMode ? <Eye size={14}/> : <Edit3 size={14}/>} 
                    {isEditMode ? "Tutup Mode Edit" : "Revisi Dokumen"}
                  </button>
                  <div className="w-px h-6 bg-slate-300 mx-1"></div>
                  <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-rose-600 transition-colors bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <X size={20}/>
                  </button>
                </div>
              </div>

              {/* Area Konten (Split Layout) */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* Bagian Kiri: Area Edit ATAU Preview */}
                <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
                  {isEditMode ? (
                    <div className="flex-1 flex flex-col h-full bg-white relative p-4" data-color-mode="light">
                      {/* TOMBOL SHORTCUT GENERATOR TABEL */}
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button onClick={insertPageBreak} className="px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-amber-200 transition-colors">
                          <FilePlus2 size={14} /> Sisipkan Halaman Baru (Page Break)
                        </button>
                        <button onClick={insertBasicTable} className="px-3 py-1.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-blue-200 transition-colors">
                          <LayoutTemplate size={14} /> Tabel Standar (3x3)
                        </button>
                        <button onClick={insertProsemTable} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-200 transition-colors">
                          <LayoutTemplate size={14} /> Tabel Prosem/Prota
                        </button>
                      </div>
                      
                      {/* EDITOR MENGGUNAKAN MODE LIVE PREVIEW */}
                      <MDEditor
                        value={editValue}
                        onChange={(val) => setEditValue(val || "")}
                        preview="live" // Menampilkan hasil tabel secara visual di layar kanan
                        height="100%"
                        className="flex-1 overflow-hidden rounded-xl border border-slate-300 shadow-sm"
                        textareaProps={{
                          placeholder: "Edit dokumen Anda di sini dengan Markdown..."
                        }}
                      />
                    </div>
                  ) : (
                    // MODE PREVIEW
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      <div ref={previewRef} className={`bg-white shadow-lg border border-slate-300 rounded p-8 md:p-14 mx-auto min-h-full ${isLandscape ? 'w-full max-w-none' : 'max-w-4xl'}`}>
                        <div className="markdown-body">
                          <style>{`
                            .markdown-body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; color: #000; text-align: justify; }
                            @media (max-width: 768px) { .markdown-body table { table-layout: auto !important; min-width: 600px; } .table-wrapper { overflow-x: auto; width: 100%; margin-bottom: 1.5rem; } }
                            .markdown-body table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; word-wrap: break-word; overflow-wrap: break-word; }
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
                                  <table {...props} />
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
                              },
                              div: ({node, id, style, ...props}) => {
                                if (id === "landscape-break-marker") {
                                  return <div style={{ pageBreakBefore: 'always', clear: 'both', margin: '2rem 0', borderBottom: '2px dashed #cbd5e1', position: 'relative' }}><span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F8FAFC] text-slate-400 text-[10px] px-2 font-mono">--- PAGE BREAK (Halaman Baru) ---</span></div>;
                                }
                                return <div id={id} style={style as any} {...props} />;
                              }
                            }}
                          >
                            {editValue.replace(/<br\s*\/?>/gi, '\n\n')}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bagian Kanan: Informasi & Status Untuk Guru */}
                <div className="w-full md:w-[320px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] z-10">
                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    
                    {/* Kotak Info Status & Catatan Kepsek */}
                    <div className={`p-4 rounded-xl mb-6 border ${
                      selectedDoc.statusValidasi === 'disetujui' ? 'bg-emerald-50 border-emerald-200' : 
                      selectedDoc.statusValidasi === 'ditolak' ? 'bg-rose-50 border-rose-200' : 
                      'bg-amber-50 border-amber-200'
                    }`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                        selectedDoc.statusValidasi === 'disetujui' ? 'text-emerald-700' : 
                        selectedDoc.statusValidasi === 'ditolak' ? 'text-rose-700' : 
                        'text-amber-700'
                      }`}>
                        {selectedDoc.statusValidasi === 'ditolak' ? <XCircle size={16}/> : selectedDoc.statusValidasi === 'disetujui' ? <CheckCircle2 size={16}/> : <Clock size={16}/>}
                        Status: {selectedDoc.statusValidasi === 'ditolak' ? 'Revisi Diperlukan' : selectedDoc.statusValidasi || 'Menunggu Review'}
                      </p>
                      <div className="text-xs text-slate-600 leading-relaxed bg-white/60 p-3 rounded-lg border border-white/50">
                        <span className="font-bold block mb-1">Catatan Validator:</span>
                        {selectedDoc.feedback ? (
                          <span className="italic text-slate-800">"{selectedDoc.feedback}"</span>
                        ) : (
                          <span className="text-slate-400">Belum ada catatan.</span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 mt-6">
                      <Cloud size={16} className="text-blue-500"/> Integrasi Google
                    </h4>
                    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                      Merasa editor bawaan kurang leluasa? Anda bisa langsung mengekspor dan merevisi dokumen ini menggunakan aplikasi Google.
                    </p>

                    {/* Tombol Ekspor Khusus Di Halaman Status */}
                    <div className="space-y-2 mb-6">
                       {(selectedDoc.tipe === "PROMES" || selectedDoc.tipe === "PROTA" || selectedDoc.tipe === "Kisi-kisi Ujian" || selectedDoc.tipe === "ATP") ? (
                         <button onClick={() => handleExportToGoogle("Sheets")} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                            <FileSpreadsheet size={16}/> Edit di Google Sheets
                         </button>
                       ) : (
                         <button onClick={() => handleExportToGoogle("Docs")} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                            <FileText size={16}/> Edit di Google Docs
                         </button>
                       )}
                    </div>

                    <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 mt-6">
                      <p className="font-bold text-slate-700 mb-1 flex items-center gap-1.5"><Edit3 size={14}/> Petunjuk Edit Tabel Internal:</p>
                      Untuk mengedit tabel di sini, klik tombol <strong>Tabel Standar</strong> di atas. Layar akan terbelah, ketik isi tabel di sebelah kiri, dan Anda akan melihat hasilnya di sebelah kanan.
                    </div>
                  </div>

                  {/* Tombol Simpan Guru */}
                  <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
                    <button 
                      onClick={handleSaveEdit}
                      disabled={isProcessing || !isEditMode}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${
                        isEditMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />} Simpan Perubahan
                    </button>
                    {!isEditMode && (
                      <p className="text-[10px] text-center text-slate-400 font-medium">Anda sedang dalam Mode Tinjauan (Tidak bisa menyimpan)</p>
                    )}
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