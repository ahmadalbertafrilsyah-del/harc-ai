"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Clock, CheckCircle2, XCircle, Eye, X, Calendar, BookOpen,
  Loader2, Pencil, Cloud, FileDown, Printer, Stamp, Inbox, FileSpreadsheet,
} from "lucide-react";
import { Teachers } from "next/font/google";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, where, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import KopSurat from "@/components/KopSurat";
import EditorDokumen from "@/components/EditorDokumen";
import { MemuatHalaman } from "@/components/Memuat";
import { useKopLembaga, kopTerisi } from "@/lib/kop";
import { bersihkanSvg } from "@/lib/gambarAjar";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface Dokumen {
  id: string;
  userId: string;
  tipe: string;
  mapel: string;
  kelas: string;
  fase?: string;
  topik: string;
  materi: string;
  tahunPelajaran?: string;
  createdAt: any;
  statusValidasi?: "menunggu" | "disetujui" | "ditolak";
  konten: string;
  kontenHtml?: string;
  feedback?: string;
}

type Tab = "antrean" | "disetujui" | "ditolak";

const TIPE_LANSKAP = ["PROMES", "PROTA", "ATP", "Kisi-kisi Ujian"];

export default function StatusKoleksiGuru() {
  const [activeTab, setActiveTab] = useState<Tab>("antrean");
  const [cari, setCari] = useState("");
  const [dokumen, setDokumen] = useState<Dokumen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [npsn, setNpsn] = useState("");

  const [dipilih, setDipilih] = useState<Dokumen | null>(null);
  const [editorBuka, setEditorBuka] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [isExportingGoogle, setIsExportingGoogle] = useState(false);
  const [googleType, setGoogleType] = useState<"Docs" | "Sheets" | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const { kop } = useKopLembaga(npsn);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (user) => {
      if (!user) { setIsLoading(false); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setNpsn(snap.data().npsn || snap.data().instansi || "");

      const q = query(collection(db, "modul_ajar"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      const unsubDocs = onSnapshot(q, (s) => {
        setDokumen(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Dokumen));
        setIsLoading(false);
      });
      return () => unsubDocs();
    });
    return () => unsub();
  }, []);

  const hitung = (tab: Tab) =>
    dokumen.filter((d) => {
      const st = d.statusValidasi || "menunggu";
      return tab === "antrean" ? st === "menunggu" : st === tab;
    }).length;

  const terfilter = dokumen.filter((d) => {
    const st = d.statusValidasi || "menunggu";
    const cocokTab = activeTab === "antrean" ? st === "menunggu" : st === activeTab;
    const c = cari.toLowerCase();
    const cocokCari = !c || (d.mapel || "").toLowerCase().includes(c) || (d.tipe || "").toLowerCase().includes(c) || (d.materi || d.topik || "").toLowerCase().includes(c);
    return cocokTab && cocokCari;
  });

  const isLanskap = dipilih ? TIPE_LANSKAP.includes(dipilih.tipe) : false;

  const simpanEdit = async (html: string) => {
    if (!dipilih) return;
    setMenyimpan(true);
    try {
      const statusBaru = dipilih.statusValidasi === "ditolak" ? "menunggu" : dipilih.statusValidasi || "menunggu";
      await updateDoc(doc(db, "modul_ajar", dipilih.id), {
        kontenHtml: html,
        statusValidasi: statusBaru,
        lastEditedAt: serverTimestamp(),
      });
      setDipilih({ ...dipilih, kontenHtml: html, statusValidasi: statusBaru });
      setEditorBuka(false);
      if (statusBaru === "menunggu") setActiveTab("antrean");
    } catch {
      alert("Gagal menyimpan perubahan.");
    } finally {
      setMenyimpan(false);
    }
  };

  const exportGoogle = async (type: "Docs" | "Sheets") => {
    if (!previewRef.current) return;
    setIsExportingGoogle(true);
    setGoogleType(type);
    try {
      const html = `<div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5">${previewRef.current.innerHTML}</div>`;
      await navigator.clipboard.write([new window.ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) })]);
      setTimeout(() => {
        setIsExportingGoogle(false);
        setGoogleType(null);
        alert(`✅ Format tersalin. Tekan CTRL + V pada lembar Google ${type}.`);
        window.open(type === "Docs" ? "https://docs.new" : "https://sheets.new", "_blank");
      }, 1500);
    } catch {
      setIsExportingGoogle(false);
      setGoogleType(null);
      alert("Browser tidak mendukung penyalinan otomatis. Gunakan tombol Word.");
    }
  };

  const unduhWord = () => {
    if (!previewRef.current) return;
    const isi = previewRef.current.innerHTML;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Dokumen</title><style>@page WordSection1{size:${isLanskap ? "841.9pt 595.3pt" : "595.3pt 841.9pt"};margin:2.54cm}div.WordSection1{page:WordSection1}body,p,li,td,th,h1,h2,h3,h4,div{font-family:'Times New Roman',serif!important;font-size:11pt!important;color:black!important;line-height:1.5;text-align:justify}h1{font-size:14pt!important;font-weight:bold!important;text-align:center;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin:10pt 0;border:1pt solid black!important}td,th{border:1pt solid black!important;padding:4pt 8pt;vertical-align:top}th{background:#f2f2f2;font-weight:bold!important;text-align:center}img,svg{max-width:100%;height:auto}.kop-surat table,.kop-surat td,.header-table td,.header-table th,.sig-table td,.sig-table th{border:none!important}</style></head><body><div class="WordSection1">${isi}</div></body></html>`;
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = "data:application/vnd.ms-word;charset=utf-8," + encodeURIComponent(header);
    a.download = `${dipilih?.tipe || "Dokumen"}_${dipilih?.mapel || ""}.doc`.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    a.click();
    document.body.removeChild(a);
  };

  const cetakPDF = () => {
    if (!previewRef.current) return;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;top:-9999px;left:-9999px;width:210mm;height:100vh";
    document.body.appendChild(iframe);
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`<html><head><title>Cetak</title><style>@page{size:A4 ${isLanskap ? "landscape" : "portrait"};margin:1.6cm}body{font-family:'Times New Roman',serif!important;font-size:11pt!important;line-height:1.5!important;color:#000;text-align:justify}h1{text-align:center;font-size:14pt;font-weight:bold;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin:1rem 0;border:1pt solid #000}th,td{border:1pt solid #000;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f2f2f2;font-weight:bold;text-align:center}tr{page-break-inside:avoid}img,svg{max-width:100%;height:auto}.kop-surat table,.kop-surat td,.header-table td,.header-table th,.sig-table td,.sig-table th{border:none!important}</style></head><body>${previewRef.current.innerHTML}</body></html>`);
    iframe.contentWindow?.document.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
  };

  const tglTeks = (t: any) =>
    t?.seconds ? new Date(t.seconds * 1000).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

  if (isLoading) return <MemuatHalaman label="Memuat koleksi dokumen..." />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto w-full space-y-4 md:space-y-5 pb-4">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Koleksi & Status Dokumen</h1>
          <p className="text-slate-500 text-[12px] sm:text-sm mt-1.5 leading-relaxed">
            Pantau status perangkat ajar Anda, revisi kapan saja dengan editor seperti Word, dan ekspor ke Word/PDF/Google.
          </p>
        </div>
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari mapel, tipe, atau materi..."
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            className="w-full min-h-[42px] pl-9 pr-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
          />
        </div>
      </header>

      {/* RINGKASAN */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <KartuStat ikon={Clock} label="Ditinjau" nilai={hitung("antrean")} nuansa="amber" />
        <KartuStat ikon={CheckCircle2} label="Disetujui" nilai={hitung("disetujui")} nuansa="emerald" />
        <KartuStat ikon={XCircle} label="Perlu Revisi" nilai={hitung("ditolak")} nuansa="rose" />
      </div>

      {/* TABS */}
      <nav className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200">
          {([["antrean", "Sedang Ditinjau", Clock], ["disetujui", "Disetujui", CheckCircle2], ["ditolak", "Perlu Revisi", XCircle]] as const).map(([id, label, Ikon]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`shrink-0 min-h-[44px] px-3.5 text-[12px] font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Ikon size={15} /> {label}
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{hitung(id)}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* DAFTAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <AnimatePresence mode="popLayout">
          {terfilter.length > 0 ? (
            terfilter.map((d) => (
              <motion.article
                layout
                key={d.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
              >
                <div className="flex justify-between items-start gap-2 mb-2.5">
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 truncate">{d.tipe}</span>
                  <LencanaStatus status={d.statusValidasi} />
                </div>
                <h3 className="font-bold text-slate-800 text-[14px] leading-snug line-clamp-2 mb-3 flex-1">
                  {d.materi || d.topik || "Dokumen Tanpa Judul"}
                </h3>
                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5"><BookOpen size={12} className="text-slate-400" /> {d.mapel} {d.kelas && `• ${d.kelas}`}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5"><Calendar size={12} /> {tglTeks(d.createdAt)}</p>
                </div>
                <button
                  onClick={() => setDipilih(d)}
                  className="mt-3.5 w-full min-h-[42px] bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={14} /> Tinjau & Revisi
                </button>
              </motion.article>
            ))
          ) : (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
              <Inbox size={44} className="mb-3 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-600">Tidak ada dokumen</h3>
              <p className="text-[12px] text-slate-400 mt-1">Belum ada dokumen pada kategori ini.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL TINJAUAN */}
      <AnimatePresence>
        {dipilih && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="bg-white w-full sm:max-w-6xl h-[92vh] sm:h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header modal */}
              <div className="flex justify-between items-center gap-2 p-3 sm:p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate">
                    <BookOpen size={17} className="text-blue-600 shrink-0" /> {dipilih.materi || dipilih.topik || "Dokumen"}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{dipilih.tipe} • {dipilih.mapel} {dipilih.kelas}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditorBuka(true)}
                    className="min-h-[38px] px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Pencil size={14} /> Revisi
                  </button>
                  <button onClick={() => setDipilih(null)} aria-label="Tutup" className="min-h-[38px] w-10 flex items-center justify-center text-slate-500 hover:text-rose-600 bg-white border border-slate-200 rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Preview */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 p-3 sm:p-6">
                  <div
                    ref={previewRef}
                    className={`bg-white shadow-lg border border-slate-300 rounded p-5 sm:p-10 md:p-14 mx-auto ${isLanskap ? "w-full" : "max-w-4xl"}`}
                  >
                    <div className="markdown-body">
                      <style>{gayaPreview}</style>
                      {dipilih.kontenHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: bersihkanSvg(dipilih.kontenHtml) }} />
                      ) : (
                        <>
                          {kopTerisi(kop) && (
                            <KopSurat kop={kop} judulDokumen={dipilih.tipe?.toUpperCase()} subJudul={`${dipilih.mapel}${dipilih.kelas ? ` — ${dipilih.kelas}` : ""}`} />
                          )}
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              table: ({ ...props }) => <div className={isLanskap ? "w-full overflow-x-auto" : "table-wrapper"}><table {...props} /></div>,
                              /* eslint-disable-next-line @next/next/no-img-element */
                              img: ({ ...props }) => <img {...props} alt={props.alt || ""} loading="lazy" />,
                            }}
                          >
                            {bersihkanSvg(dipilih.konten || "").replace(/<br\s*\/?>(\n)?/gi, "\n")}
                          </ReactMarkdown>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sisi info */}
                <aside className="w-full lg:w-[320px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0">
                  <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar space-y-5">
                    <div className={`p-3.5 rounded-xl border ${
                      dipilih.statusValidasi === "disetujui" ? "bg-emerald-50 border-emerald-200" :
                      dipilih.statusValidasi === "ditolak" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"
                    }`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
                        dipilih.statusValidasi === "disetujui" ? "text-emerald-700" :
                        dipilih.statusValidasi === "ditolak" ? "text-rose-700" : "text-amber-700"
                      }`}>
                        {dipilih.statusValidasi === "ditolak" ? <XCircle size={14} /> : dipilih.statusValidasi === "disetujui" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                        {dipilih.statusValidasi === "ditolak" ? "Perlu Revisi" : dipilih.statusValidasi || "Menunggu Tinjauan"}
                      </p>
                      <div className="text-[12px] text-slate-700 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-white/60">
                        <span className="font-bold block mb-1">Catatan Validator:</span>
                        {dipilih.feedback ? <span className="italic">&ldquo;{dipilih.feedback}&rdquo;</span> : <span className="text-slate-400">Belum ada catatan.</span>}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Stamp size={13} /> Ekspor Dokumen
                      </p>
                      <div className="space-y-2">
                        {isLanskap ? (
                          <TombolAksi onClick={() => exportGoogle("Sheets")} ikon={FileSpreadsheet} label="Edit di Google Sheets" nuansa="emerald" />
                        ) : (
                          <TombolAksi onClick={() => exportGoogle("Docs")} ikon={Cloud} label="Edit di Google Docs" nuansa="blue" />
                        )}
                        <TombolAksi onClick={unduhWord} ikon={FileDown} label="Unduh Word (.doc)" />
                        <TombolAksi onClick={cetakPDF} ikon={Printer} label="Cetak / Simpan PDF" />
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      Tekan <span className="font-bold text-slate-700">Revisi</span> untuk menyunting dokumen seperti di Word: format teks, tabel, gambar, dan perbaikan sebagian dengan AI. Dokumen yang direvisi dari status &ldquo;Perlu Revisi&rdquo; otomatis diajukan ulang.
                    </div>
                  </div>
                </aside>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY EKSPOR GOOGLE */}
      <AnimatePresence>
        {isExportingGoogle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-white/85 backdrop-blur-sm p-4">
            <div className="flex flex-col items-center text-center p-6 bg-white shadow-2xl rounded-2xl border border-slate-200 max-w-sm">
              <Loader2 size={40} className={`animate-spin mb-4 ${googleType === "Docs" ? "text-blue-500" : "text-emerald-500"}`} />
              <h3 className={`font-bold text-base text-slate-800 ${teachersFont.className}`}>Menyiapkan Format...</h3>
              <p className="text-xs text-slate-500 mt-2">Menyalin dokumen ke memori untuk ditempel ke Google {googleType}.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDITOR WYSIWYG */}
      {dipilih && (
        <EditorDokumen
          buka={editorBuka}
          htmlAwal={editorBuka ? (previewRef.current?.innerHTML || "").replace(/<style[\s\S]*?<\/style>/gi, "") : ""}
          judul={`Revisi ${dipilih.tipe}`}
          menyimpan={menyimpan}
          gambarMapel={dipilih.mapel}
          gambarJenjang={dipilih.kelas}
          onTutup={() => setEditorBuka(false)}
          onSimpan={simpanEdit}
        />
      )}
    </motion.div>
  );
}

/* ---------------------------------- UI ---------------------------------- */

const gayaPreview = `
  .markdown-body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.6; color: #000; text-align: justify; }
  @media (min-width: 768px) { .markdown-body { font-size: 12pt; } }
  .markdown-body p { margin-bottom: .7rem; }
  .markdown-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; word-wrap: break-word; }
  .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 6px 10px; text-align: left; vertical-align: top; }
  .markdown-body th { background: #f2f2f2; font-weight: bold; text-align: center; }
  .markdown-body h1 { text-align: center; font-size: 1.2em; font-weight: bold; margin-bottom: 1.2rem; text-transform: uppercase; }
  .markdown-body h2 { font-weight: bold; font-size: 1.06em; margin: 1.2rem 0 .5rem; text-transform: uppercase; }
  .markdown-body h3 { font-weight: bold; margin: 1rem 0 .4rem; }
  .markdown-body ul, .markdown-body ol { padding-left: 22px; margin-bottom: 1rem; }
  .markdown-body li { margin-bottom: .3rem; }
  .markdown-body img, .markdown-body svg { max-width: 100%; height: auto; display: block; margin: 10px auto; }
  .table-wrapper { overflow-x: auto; width: 100%; margin-bottom: 1rem; }
  @media (max-width: 768px) { .markdown-body table { min-width: 520px; } }
  .kop-surat table, .kop-surat td, .header-table td, .header-table th, .sig-table td, .sig-table th { border: none !important; }
`;

function KartuStat({ ikon: Ikon, label, nilai, nuansa }: { ikon: any; label: string; nilai: number; nuansa: "amber" | "emerald" | "rose" }) {
  const gaya = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  }[nuansa];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex items-center gap-3">
      <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 ${gaya}`}>
        <Ikon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-lg sm:text-xl font-black text-slate-800 leading-none">{nilai}</p>
        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function LencanaStatus({ status }: { status?: string }) {
  if (status === "disetujui") return <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0"><CheckCircle2 size={11} /> Disetujui</span>;
  if (status === "ditolak") return <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0"><XCircle size={11} /> Revisi</span>;
  return <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0"><Clock size={11} /> Menunggu</span>;
}

function TombolAksi({ onClick, ikon: Ikon, label, nuansa = "netral" }: { onClick: () => void; ikon: any; label: string; nuansa?: "netral" | "blue" | "emerald" }) {
  const gaya = {
    netral: "bg-white hover:bg-slate-50 text-slate-700 border-slate-300",
    blue: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200",
  }[nuansa];
  return (
    <button onClick={onClick} className={`w-full min-h-[44px] px-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 border transition-colors ${gaya}`}>
      <Ikon size={15} /> {label}
    </button>
  );
}
