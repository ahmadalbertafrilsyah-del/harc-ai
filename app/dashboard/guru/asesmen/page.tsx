"use client";

export const maxDuration = 240;

import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, FileQuestion, BarChart4, MessageSquareHeart, 
  BrainCircuit, Loader2, Sparkles, Save, Globe, ListOrdered,
  History, Coins, X, Trash2, FileDown, Printer, Cloud, FileSpreadsheet,
  CheckCircle2, BookOpen, Bot
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, FormEvent, useRef } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp, onSnapshot, doc, query, where, orderBy, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ModulAsesmenGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"generator" | "analisis" | "feedback">("generator");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pendidik");
  const [aiTokens, setAiTokens] = useState(0);
  
  // === STATE GENERATOR AI CBT ===
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [docId, setDocId] = useState(""); 
  const [hasil, setHasil] = useState("");

  const [formData, setFormData] = useState({
    mapel: "",
    fase: "",
    kelas: "",
    kompetensiDasar: "",
    jenisUjian: "Ulangan Harian",
    tingkatKesulitan: "Campuran (Proporsional)",
    dimensiXAI: ["Linguistik", "Sosiolinguistik", "Budaya"] 
  });

  // Komposisi Soal
  const [opsiPG, setOpsiPG] = useState("A - D (4 Opsi)");
  const [jmlPG, setJmlPG] = useState("10"); 
  const [jmlBenarSalah, setJmlBenarSalah] = useState("0"); 
  const [jmlMenjodohkan, setJmlMenjodohkan] = useState("0"); 
  const [jmlIsianSingkat, setJmlIsianSingkat] = useState("0"); 
  const [jmlUraian, setJmlUraian] = useState("5"); 

  // State Riwayat & Export
  const [showKoleksi, setShowKoleksi] = useState(false);
  const [riwayatAsesmen, setRiwayatAsesmen] = useState<any[]>([]);
  const [isExportingGoogle, setIsExportingGoogle] = useState(false);
  const [googleExportType, setGoogleExportType] = useState<"Docs" | "Sheets" | null>(null);
  
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) { 
        setUserUid(user.uid); 
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserName(docSnap.data().nama || "Pendidik");
            setAiTokens(docSnap.data().aiTokens || 0);
          }
        });

        // Fetch Riwayat Asesmen
        const qRiwayat = query(collection(db, "modul_ajar"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        onSnapshot(qRiwayat, (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter((d: any) => d.tipe.includes("Asesmen") || d.tipe.includes("Bank Soal") || d.tipe.includes("Kisi"));
          setRiwayatAsesmen(data);
        });

        setIsLoading(false); 
      } 
      else { window.location.href = "/login"; }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleToggleDimensi = (dimensi: string) => {
    setFormData(prev => {
      const isSelected = prev.dimensiXAI.includes(dimensi);
      if (isSelected) return { ...prev, dimensiXAI: prev.dimensiXAI.filter(d => d !== dimensi) };
      return { ...prev, dimensiXAI: [...prev.dimensiXAI, dimensi] };
    });
  };

  const handleGenerateAI = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid) return;
    if (formData.dimensiXAI.length === 0) return alert("Pilih minimal satu dimensi [x-AI] untuk diujikan.");
    if (aiTokens <= 0) return alert("Sisa Token AI Anda habis.");
    
    setIsGenerating(true);
    setHasil("");
    setDocId("");
    
    // MENYUSUN PROMPT KOMPLEKS UNTUK CBT & KISI-KISI
    let instruksiDimensi = formData.dimensiXAI.map(d => {
      if (d === "Linguistik") return "- Linguistik: Ketepatan makna, kosakata, dan struktur kalimat.";
      if (d === "Sosiolinguistik") return "- Sosiolinguistik: Kesesuaian tingkat tutur (Ngoko/Krama), sapaan, dan konteks sosial.";
      if (d === "Budaya") return "- Budaya: Interpretasi budaya lokal, sejarah, atau makna filosofis peribahasa setempat.";
      return "";
    }).join("\n");

    let systemPrompt = `Anda adalah Evaluator Akademik Ahli di Indonesia. 
    Buatlah INSTRUMEN ASESMEN resmi menggunakan format Markdown akademis baku dan tabel bergaris yang sangat formal.\n\n`;
    
    systemPrompt += `IDENTITAS UJIAN:\n- Jenis Ujian: ${formData.jenisUjian}\n- Mata Pelajaran: ${formData.mapel}\n- Fase/Kelas: ${formData.fase}/${formData.kelas}\n- Materi/Topik: ${formData.kompetensiDasar}\n- Tingkat Kesukaran: ${formData.tingkatKesulitan}\n\n`;
    
    systemPrompt += `KOMPOSISI SOAL:\n`;
    if (Number(jmlPG) > 0) systemPrompt += `- Pilihan Ganda (Opsi ${opsiPG}): ${jmlPG} butir.\n`;
    if (Number(jmlBenarSalah) > 0) systemPrompt += `- Benar/Salah: ${jmlBenarSalah} butir.\n`;
    if (Number(jmlMenjodohkan) > 0) systemPrompt += `- Menjodohkan: ${jmlMenjodohkan} butir.\n`;
    if (Number(jmlIsianSingkat) > 0) systemPrompt += `- Isian Singkat: ${jmlIsianSingkat} butir.\n`;
    if (Number(jmlUraian) > 0) systemPrompt += `- Uraian/Essay: ${jmlUraian} butir.\n\n`;

    systemPrompt += `ATURAN DIMENSI [x-AI] (Soal wajib menyebar merata pada aspek berikut):\n${instruksiDimensi}\n\n`;

    systemPrompt += `ATURAN FORMAT OUTPUT WAJIB (Ikuti Urutan Hirarki Ini Secara Eksak):\n`;
    systemPrompt += `--- \n`;
    systemPrompt += `A. BUTIR SOAL\n`;
    systemPrompt += `(Tuliskan seluruh butir soal. PENTING: Untuk soal Pilihan Ganda, WAJIB pisahkan opsi jawaban A, B, C, D, E ke baris baru secara menurun ke bawah menggunakan list bullet/numbering, JANGAN DIGABUNGKAN dalam satu baris paragraf).\n\n`;
    systemPrompt += `B. KUNCI JAWABAN DAN PEDOMAN PENSKORAN\n`;
    systemPrompt += `(Sajikan tabel Kunci Jawaban. WAJIB tambahkan keterangan ringkas di bawah tabel: "Keterangan: Gunakan rubrik penskoran ini sebagai acuan deteksi AI Vision saat koreksi LJK").\n\n`;
    systemPrompt += `C. KISI-KISI PENULISAN SOAL\n`;
    systemPrompt += `(Letakkan kisi-kisi di bagian paling bawah dokumen ini dalam bentuk TABEL formal dengan kolom: No | Capaian Pembelajaran | Materi | Indikator Soal | Level Kognitif | Bentuk Soal)\n`;
    systemPrompt += `---`;

    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          model: "gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Buatkan dokumen Asesmen (Soal, Kunci Jawaban, dan Kisi-kisi di bawah) secara lengkap sekarang." }
          ]
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        setHasil(data.choices[0].message.content);
        
        if (data.usage && data.usage.total_tokens > 0) {
          await addDoc(collection(db, "ai_logs"), {
            aksi: `Generate Asesmen ${formData.jenisUjian}`, pengguna: userName, role: "guru", status: "Sukses",
            tokenDipakai: data.usage.total_tokens, timestamp: serverTimestamp()
          });
        }
      } else {
        throw new Error(data.error?.message || "Gagal mendapatkan respons AI.");
      }
    } catch (error: any) {
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!userUid || !hasil) return;
    setIsSaving(true);
    try {
      if (docId) {
        await updateDoc(doc(db, "modul_ajar", docId), { konten: hasil });
        alert("Pembaruan instrumen asesmen berhasil disimpan!");
      } else {
        const docRef = await addDoc(collection(db, "modul_ajar"), {
          userId: userUid,
          mapel: formData.mapel,
          kelas: formData.kelas,
          topik: formData.kompetensiDasar,
          tipe: `Bank Soal: ${formData.jenisUjian}`,
          konten: hasil,
          statusValidasi: "menunggu", 
          createdAt: serverTimestamp()
        });
        setDocId(docRef.id);
        alert("Berhasil disimpan! Dokumen kini berada dalam antrean Validasi Lembaga dan siap diimpor di menu Kelas.");
      }
    } catch (error) {
      alert("Gagal menyimpan dokumen.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- FITUR RIWAYAT ---
  const handleOpenRiwayat = (riwayat: any) => {
    setFormData(prev => ({
      ...prev,
      mapel: riwayat.mapel || prev.mapel,
      kelas: riwayat.kelas || prev.kelas,
      kompetensiDasar: riwayat.topik || prev.kompetensiDasar,
    }));
    setHasil(riwayat.konten); 
    setDocId(riwayat.id);
    setShowKoleksi(false);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const hapusRiwayat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm("Yakin ingin menghapus dokumen asesmen ini?")) {
      await deleteDoc(doc(db, "modul_ajar", id));
      if (docId === id) { setHasil(""); setDocId(""); }
    }
  };

  // --- FITUR EXPORT ---
  const handleExportToGoogle = async (type: "Docs" | "Sheets") => {
    if (!pdfRef.current) return;
    setIsExportingGoogle(true);
    setGoogleExportType(type);
    
    try {
      const htmlContent = pdfRef.current.innerHTML;
      const formattedHtml = `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5;">${htmlContent}</div>`;
      
      const blobHtml = new Blob([formattedHtml], { type: "text/html" });
      const clipboardItem = new window.ClipboardItem({ "text/html": blobHtml });
      await navigator.clipboard.write([clipboardItem]);

      setTimeout(() => {
          setIsExportingGoogle(false); setGoogleExportType(null);
          alert(`✅ BERHASIL!\n\nFormat dokumen telah tersalin ke memori perangkat (Clipboard).\n\nSilakan tekan CTRL + V pada lembar kosong Google ${type} yang akan terbuka.`);
          window.open(type === "Docs" ? "https://docs.new" : "https://sheets.new", '_blank');
      }, 2000);
    } catch (error) {
      setIsExportingGoogle(false); setGoogleExportType(null);
      alert("Browser Anda tidak mendukung penyalinan otomatis. Gunakan tombol 'Download Word'.");
    }
  };

  const handleDownloadWord = () => {
    if (!pdfRef.current) return;
    const printNode = pdfRef.current.cloneNode(true) as HTMLElement;
    
    const tables = printNode.querySelectorAll('table');
    tables.forEach(table => {
      const ths = table.querySelectorAll('th');
      ths.forEach((th) => {
        const text = th.innerText.trim().toLowerCase();
        if (text === 'no' || text === 'no.') { th.style.width = '5%'; } 
        else if (text.includes('capaian') || text.includes('materi') || text.includes('indikator')) { th.style.width = '20%'; } 
      });
    });

    let printHtml = printNode.innerHTML.replace(/class="markdown-body"/g, '');
    const cssOrientation = `@page WordSection1 { size: 595.3pt 841.9pt; margin: 2.54cm; } div.WordSection1 { page: WordSection1; }`;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Asesmen</title><style>${cssOrientation} body, p, li, td, th, h1, h2, h3, h4, div { font-family: 'Times New Roman', serif !important; font-size: 11pt !important; color: black !important; line-height: 1.5; text-align: justify; } h1 { font-size: 14pt !important; font-weight: bold !important; margin-bottom: 12pt; text-align: center; text-transform: uppercase; } h2, h3 { font-size: 12pt !important; font-weight: bold !important; margin-top: 12pt; margin-bottom: 6pt; text-align: left; } table { width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 15pt; border: 1pt solid black !important; word-wrap: break-word; overflow-wrap: break-word; } td, th { border: 1pt solid black !important; padding: 4pt 8pt; vertical-align: top; text-align: left; } th { background-color: #f2f2f2; font-weight: bold !important; text-align: center; } p { margin-bottom: 10pt; } li { margin-bottom: 6pt; text-align: justify; }</style></head><body><div class="WordSection1">${printHtml}</div></body></html>`;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header);
    const fileDownload = document.createElement("a"); document.body.appendChild(fileDownload); 
    fileDownload.href = source; fileDownload.download = `Asesmen_${formData.mapel || 'Dokumen'}.doc`.replace(/[^a-zA-Z0-9.\-_]/g, "_"); fileDownload.click(); document.body.removeChild(fileDownload);
  };

  const handlePrintPDF = () => {
    if (!pdfRef.current) return;
    const printContent = pdfRef.current.innerHTML;
    const iframe = document.createElement("iframe"); 
    iframe.style.position = "absolute"; iframe.style.top = "-9999px"; iframe.style.left = "-9999px"; iframe.style.width = "210mm"; iframe.style.height = "100vh"; 
    document.body.appendChild(iframe); 
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`<html><head><title>Cetak PDF</title><style>@page { size: A4 portrait; margin: 1.5cm; } body { font-family: 'Times New Roman', serif !important; font-size: 11pt !important; line-height: 1.5 !important; color: #000; text-align: justify; } h1 { text-align: center; font-size: 14pt; margin-bottom: 2rem; font-weight: bold; text-transform: uppercase; } table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; border: 1pt solid #000; word-wrap: break-word; overflow-wrap: break-word; } th, td { border: 1pt solid #000; padding: 6px 8px; text-align: left; vertical-align: top; } th { background-color: #f1f5f9; font-weight: bold; text-align: center; } tr { page-break-inside: avoid; } h2, h3 { page-break-after: avoid; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; text-align: left; } ul, ol { margin-left: 20px; margin-bottom: 10px; } li { margin-bottom: 6px; text-align: justify; } p { margin-bottom: 10px; }</style></head><body>${printContent}</body></html>`);
    iframe.contentWindow?.document.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
  };

  const sanitasiHasil = hasil.replace(/<br\s*\/?>/gi, '\n\n');

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-600" /></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-10 pt-4 px-4 md:px-6">
      
      {/* OVERLAY LOADING GOOGLE WORKSPACE */}
      <AnimatePresence>
        {isExportingGoogle && (
          <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
            <div className="flex flex-col items-center text-center p-8 bg-white shadow-2xl rounded-3xl border border-slate-200">
              <Loader2 size={50} className={`animate-spin mb-5 ${googleExportType === "Docs" ? 'text-blue-500' : 'text-emerald-500'} absolute`} />
              <Cloud size={24} className={`${googleExportType === "Docs" ? 'text-blue-600' : 'text-emerald-600'}`} />
              <h3 className={`font-bold text-xl text-slate-800 ${teachersFont.className} mt-6`}>Menyiapkan Format...</h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER UTAMA */}
      <header className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
            <Target className="text-blue-600" /> Pusat Asesmen & Evaluasi
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Pusat pembuatan Kisi-kisi, Bank Soal CBT, dan Kunci Jawaban. Rancang instrumen terintegrasi dengan dimensi sosiokultural daerah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowKoleksi(true)} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all whitespace-nowrap">
            <History size={14} /> Koleksi
          </button>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            <Coins size={14} className="text-amber-500" /> Token AI: {aiTokens.toLocaleString('id-ID')}
          </div>
        </div>
      </header>

      {/* MODAL RIWAYAT (KOLEKSI) */}
      <AnimatePresence>
        {showKoleksi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <History size={18} className="text-blue-600" /> Koleksi Asesmen Saya
                </h3>
                <button onClick={() => setShowKoleksi(false)} className="text-slate-400 hover:text-rose-600 transition-colors p-1"><X size={18}/></button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {riwayatAsesmen.length > 0 ? (
                    riwayatAsesmen.map(riwayat => (
                      <div key={riwayat.id} onClick={() => handleOpenRiwayat(riwayat)} className={`flex flex-col p-4 rounded-lg border transition-all cursor-pointer group ${docId === riwayat.id ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{riwayat.tipe}</span>
                          <button onClick={(e) => hapusRiwayat(e, riwayat.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={14}/></button>
                        </div>
                        <span className="font-bold text-slate-800 text-sm leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">{riwayat.topik || "Tanpa Judul"}</span>
                        <span className="text-[11px] font-medium text-slate-500 mt-3 border-t border-slate-100 pt-2">{riwayat.mapel} • Kelas {riwayat.kelas}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-1 sm:col-span-2 text-center py-12 opacity-70">
                      <FileQuestion size={40} className="mx-auto text-slate-300 mb-3"/>
                      <p className="text-sm text-slate-500 font-medium">Anda belum menyimpan instrumen asesmen apapun.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TABS NAVIGASI */}
      <nav className="flex flex-wrap border-b border-slate-200">
        <button onClick={() => setActiveTab("generator")} className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "generator" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><Sparkles size={18} /> 1. Generator Asesmen & Kisi-kisi</button>
        <button onClick={() => setActiveTab("analisis")} className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "analisis" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><BarChart4 size={18} /> 2. Analisis Butir Soal</button>
        <button onClick={() => setActiveTab("feedback")} className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "feedback" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><MessageSquareHeart size={18} /> 3. Feedback Otomatis</button>
      </nav>

      {activeTab === "generator" && (
        <div className="flex flex-col gap-8">
          
          {/* --- BAGIAN ATAS: FORM PARAMETER --- */}
          <div className="w-full bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
              <FileQuestion size={22} className="text-slate-800" />
              <h2 className={`text-lg font-bold text-slate-800 tracking-wide uppercase ${teachersFont.className}`}>Parameter Asesmen</h2>
            </div>

            <form onSubmit={handleGenerateAI} className="space-y-6">
              
              {/* INPUT IDENTITAS & DIMENSI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Kolom Kiri: Kurikulum */}
                <div className="bg-slate-50/80 p-6 rounded-xl border border-slate-200 space-y-4 h-full">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fase / Kelas</label>
                      <input type="text" required placeholder="Cth: Fase D / VII" value={formData.fase} onChange={e => setFormData({...formData, fase: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Mata Pelajaran</label>
                      <input type="text" required placeholder="Cth: Bahasa Jawa" value={formData.mapel} onChange={e => setFormData({...formData, mapel: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 shadow-sm" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kompetensi Dasar (KD) / Topik</label>
                    <textarea required rows={3} placeholder="Tuliskan materi atau KD yang akan diujikan..." value={formData.kompetensiDasar} onChange={e => setFormData({...formData, kompetensiDasar: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm font-medium outline-none focus:border-blue-500 shadow-sm resize-none"></textarea>
                  </div>
                </div>

                {/* Kolom Kanan: Dimensi x-AI */}
                <div className="bg-blue-50/30 p-6 rounded-xl border border-blue-100 space-y-4 h-full">
                  <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-widest mb-1.5">Integrasi Dimensi [x-AI]</label>
                  <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">Pilih aspek budaya dan linguistik yang ingin diuji secara simultan di dalam soal.</p>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all shadow-sm ${formData.dimensiXAI.includes("Linguistik") ? 'bg-white border-blue-400' : 'bg-slate-50/50 hover:bg-white border-slate-200'}`}>
                      <input type="checkbox" checked={formData.dimensiXAI.includes("Linguistik")} onChange={() => handleToggleDimensi("Linguistik")} className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer" />
                      <div><p className="text-xs font-bold text-slate-700">Linguistik</p><p className="text-[10px] text-slate-500 mt-0.5">Tata bahasa, ejaan, & kosakata.</p></div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all shadow-sm ${formData.dimensiXAI.includes("Sosiolinguistik") ? 'bg-white border-emerald-400' : 'bg-slate-50/50 hover:bg-white border-slate-200'}`}>
                      <input type="checkbox" checked={formData.dimensiXAI.includes("Sosiolinguistik")} onChange={() => handleToggleDimensi("Sosiolinguistik")} className="mt-0.5 w-4 h-4 text-emerald-600 rounded cursor-pointer" />
                      <div><p className="text-xs font-bold text-slate-700">Sosiolinguistik</p><p className="text-[10px] text-slate-500 mt-0.5">Tingkat tutur (Ngoko/Krama) & Kesantunan.</p></div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all shadow-sm ${formData.dimensiXAI.includes("Budaya") ? 'bg-white border-amber-400' : 'bg-slate-50/50 hover:bg-white border-slate-200'}`}>
                      <input type="checkbox" checked={formData.dimensiXAI.includes("Budaya")} onChange={() => handleToggleDimensi("Budaya")} className="mt-0.5 w-4 h-4 text-amber-600 rounded cursor-pointer" />
                      <div><p className="text-xs font-bold text-slate-700">Interpretasi Budaya Lokal</p><p className="text-[10px] text-slate-500 mt-0.5">Makna tradisi & peribahasa setempat.</p></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* INPUT KOMPOSISI SOAL */}
              <div className="pt-6 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><ListOrdered size={16}/> Komposisi Instrumen Soal</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Jenis Ujian</label>
                    <select value={formData.jenisUjian} onChange={e => setFormData({...formData, jenisUjian: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500">
                      <option>Ulangan Harian</option><option>Asesmen Formatif</option><option>Sumatif Tengah Semester</option><option>Sumatif Akhir Semester</option><option>Try Out</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tingkat Kesulitan</label>
                    <select value={formData.tingkatKesulitan} onChange={e => setFormData({...formData, tingkatKesulitan: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500">
                      <option>Campuran (Proporsional)</option><option>HOTS (Tingkat Tinggi)</option><option>MOTS (Tingkat Sedang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Pilihan Ganda (Opsi)</label>
                    <select value={opsiPG} onChange={e => setOpsiPG(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-blue-500"><option>A - D (4 Opsi)</option><option>A - E (5 Opsi)</option></select>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-center"><label className="block text-[10px] font-bold text-slate-600 mb-1.5">PG</label><input type="number" min="0" value={jmlPG} onChange={(e) => setJmlPG(e.target.value)} className="w-full text-center py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 shadow-sm" /></div>
                  <div className="text-center"><label className="block text-[10px] font-bold text-slate-600 mb-1.5">B/S</label><input type="number" min="0" value={jmlBenarSalah} onChange={(e) => setJmlBenarSalah(e.target.value)} className="w-full text-center py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 shadow-sm" /></div>
                  <div className="text-center"><label className="block text-[10px] font-bold text-slate-600 mb-1.5">Jodohkan</label><input type="number" min="0" value={jmlMenjodohkan} onChange={(e) => setJmlMenjodohkan(e.target.value)} className="w-full text-center py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 shadow-sm" /></div>
                  <div className="text-center"><label className="block text-[10px] font-bold text-slate-600 mb-1.5">Isian</label><input type="number" min="0" value={jmlIsianSingkat} onChange={(e) => setJmlIsianSingkat(e.target.value)} className="w-full text-center py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 shadow-sm" /></div>
                  <div className="text-center"><label className="block text-[10px] font-bold text-slate-600 mb-1.5">Esai</label><input type="number" min="0" value={jmlUraian} onChange={(e) => setJmlUraian(e.target.value)} className="w-full text-center py-2 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 shadow-sm" /></div>
                </div>
              </div>

              <button type="submit" disabled={isGenerating} className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95">
                {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <BrainCircuit size={20}/>}
                {isGenerating ? "Menyusun Butir Soal & Kisi-kisi..." : "Generate Instrumen Asesmen AI"}
              </button>
            </form>
          </div>

          {/* --- BAGIAN BAWAH: KANVAS TINJAUAN --- */}
          <div className="w-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] lg:min-h-[800px]">
            
            <div className="px-5 md:px-8 py-5 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white border border-slate-300 rounded-md flex items-center justify-center shadow-sm"><BookOpen size={24} className="text-slate-700"/></div>
                <div>
                  <h2 className={`font-bold text-slate-800 text-xl tracking-wide uppercase ${teachersFont.className}`}>Kanvas Tinjauan</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Siap Edit & Ekspor</p>
                </div>
              </div>
              
              {hasil && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button onClick={handleDownloadWord} className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-300 shadow-sm"><FileDown size={16}/> Word (.doc)</button>
                  <button onClick={() => handleExportToGoogle("Docs")} className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors border border-blue-200 shadow-sm"><Cloud size={16}/> G-Docs</button>
                  <button onClick={handlePrintPDF} className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-300 shadow-sm"><Printer size={16}/> PDF</button>
                  
                  <button onClick={handleSaveToDatabase} disabled={isSaving} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70 ml-2">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} {docId ? "Perbarui" : "Ajukan Validasi"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-10 relative custom-scrollbar">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-10">
                  <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full border-t-transparent animate-spin"></div>
                    <Bot size={28} className="text-slate-800 animate-pulse" />
                  </div>
                  <p className="font-bold text-slate-800 text-xl uppercase tracking-widest">Menyusun Soal & Kisi-Kisi...</p>
                  <p className="text-sm text-slate-500 mt-2 font-medium text-center max-w-sm">AI sedang memastikan keselarasan sosiokultural pada setiap butir soal.</p>
                </div>
              ) : hasil ? (
                <div className="bg-white shadow-xl border border-slate-300 p-8 md:p-14 mx-auto rounded min-h-full max-w-4xl overflow-x-auto">
                  <div ref={pdfRef} className="markdown-body">
                    <style>{`
                      .markdown-body { font-family: 'Times New Roman', serif !important; font-size: 14px; line-height: 1.6 !important; color: #000; } 
                      @media (min-width: 768px) { .markdown-body { font-size: 12pt; } }
                      
                      .markdown-body p { margin-bottom: 0.8rem; text-align: justify; }
                      
                      @media (max-width: 768px) {
                        .markdown-body table { table-layout: auto !important; min-width: 600px; }
                        .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; margin-bottom: 1.5rem; }
                      }
                      
                      .markdown-body table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; table-layout: auto; word-wrap: break-word; overflow-wrap: break-word; } 
                      .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 6px 10px; text-align: left; vertical-align: top; overflow-wrap: break-word; word-wrap: break-word; } 
                      .markdown-body th { background-color: #f8fafc; font-weight: bold; text-align: center; } 
                      .markdown-body tr { page-break-inside: avoid; } 
                      
                      .markdown-body h1 { font-size: 1.25em; font-weight: bold; text-align: center; margin-bottom: 1.5rem; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; } 
                      .markdown-body h2 { font-size: 1.1em; margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: bold; text-transform: uppercase; } 
                      .markdown-body h3 { font-size: 1em; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; } 
                      .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 1rem; margin-top: 0.5rem; text-align: justify; }
                      .markdown-body li { margin-bottom: 0.5rem; text-align: justify; }
                    `}</style>

                    <div style={{ textAlign: 'center', borderBottom: '3px solid black', paddingBottom: '12px', marginBottom: '24px' }}>
                      <h1 style={{ fontSize: '1.25em', fontWeight: 'bold', textTransform: 'uppercase', color: 'black', margin: '0 0 5px 0' }}>DOKUMEN INSTRUMEN ASESMEN</h1>
                      <p style={{ fontSize: '1em', margin: 0, fontWeight: 'bold' }}>{formData.jenisUjian} - {formData.mapel}</p>
                      <p style={{ fontSize: '1em', margin: 0 }}>Fase / Kelas: {formData.fase} / {formData.kelas}</p>
                    </div>

                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                         table: ({node, ...props}) => <div className="table-wrapper my-6"><table {...props} /></div>,
                         th: ({node, children, ...props}) => {
                           const text = String(children).toLowerCase().trim();
                           let width = 'auto';
                           if (text === 'no' || text === 'no.') width = '5%';
                           else if (text.includes('capaian') || text.includes('materi') || text.includes('indikator')) width = '20%';
                           return <th style={{ width }} className="bg-slate-100 font-bold p-3 border border-slate-400 text-center uppercase text-[11px] tracking-wider" {...props}>{children}</th>;
                         },
                         td: ({node, children, ...props}) => <td className="p-3 border border-slate-400 align-top text-sm" {...props}>{children}</td>,
                         h1: ({node, children, ...props}) => <h1 className="font-bold text-lg uppercase border-b-2 border-black pb-3 mb-6 mt-8" {...props}>{children}</h1>,
                         h2: ({node, children, ...props}) => <h2 className="font-bold text-base uppercase mt-8 mb-3 text-slate-800" {...props}>{children}</h2>,
                         h3: ({node, children, ...props}) => <h3 className="font-bold text-sm mt-6 mb-2 text-slate-800" {...props}>{children}</h3>,
                      }}
                    >
                      {sanitasiHasil}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                  <Globe size={48} className="mb-4 opacity-30 text-slate-400"/>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Kanvas Kosong</p>
                  <p className="text-xs mt-2 text-center max-w-sm">Tentukan parameter di atas. Sistem AI akan menyusun instrumen penilaian komprehensif untuk Anda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "analisis" && (<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 text-center text-slate-400"><p className="font-bold">Modul Analisis Butir Soal</p></div>)}
      {activeTab === "feedback" && (<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 text-center text-slate-400"><p className="font-bold">Generator Feedback Otomatis</p></div>)}
    </motion.main>
  );
}