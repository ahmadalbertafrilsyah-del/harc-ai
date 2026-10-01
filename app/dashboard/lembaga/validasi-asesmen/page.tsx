"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet, Search, Eye, X, Loader2, Inbox, Clock,
  BookOpen, User, CheckCircle2, XCircle, Stamp,
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import { MemuatHalaman } from "@/components/Memuat";
import { useKopLembaga, kopTerisi } from "@/lib/kop";
import KopSurat from "@/components/KopSurat";
import { bersihkanSvg } from "@/lib/gambarAjar";
import { tandaiTervalidasiBank } from "@/lib/bankBersama";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface Dok {
  id: string;
  userId?: string;
  namaGuru?: string;
  pembuat?: string;
  tipe?: string;
  mapel?: string;
  kelas?: string;
  topik?: string;
  materi?: string;
  konten?: string;
  kontenHtml?: string;
  createdAt?: any;
}

export default function ValidasiAsesmenLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [npsn, setNpsn] = useState("");
  const [pending, setPending] = useState<Dok[]>([]);
  const [cari, setCari] = useState("");
  const [dipilih, setDipilih] = useState<Dok | null>(null);
  const [catatan, setCatatan] = useState("");
  const [proses, setProses] = useState(false);

  const { kop } = useKopLembaga(npsn);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(getAuth(), async (user) => {
      if (!user) { setIsLoading(false); return; }

      // Ambil NPSN lembaga untuk membatasi dokumen HANYA dari sekolah ini
      let npsnLembaga = "";
      try {
        const profil = await getDoc(doc(db, "users", user.uid));
        npsnLembaga = profil.exists() ? (profil.data().npsn || profil.data().instansi || "") : "";
      } catch { /* abaikan */ }
      setNpsn(npsnLembaga);

      if (!npsnLembaga) {
        setPending([]);
        setIsLoading(false);
        return;
      }

      // Daftar guru se-instansi (kunci filter agar tidak bocor lintas sekolah)
      let unsubDoc: (() => void) | null = null;
      const unsubGuru = onSnapshot(
        query(collection(db, "users"), where("role", "==", "guru"), where("npsn", "==", npsnLembaga)),
        (guruSnap) => {
          const guruIds = new Set(guruSnap.docs.map((g) => g.id));
          if (unsubDoc) { unsubDoc(); unsubDoc = null; }
          unsubDoc = onSnapshot(
            query(collection(db, "modul_ajar"), where("statusValidasi", "==", "menunggu")),
            (snap) => {
              const semua = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Dok);
              // Batasi ke dokumen milik guru instansi ini (atau yang ber-npsn sama)
              setPending(semua.filter((m: any) => guruIds.has(m.userId) || m.npsn === npsnLembaga));
              setIsLoading(false);
            }
          );
        }
      );

      return () => { if (unsubDoc) unsubDoc(); unsubGuru(); };
    });
    return () => unsubAuth();
  }, []);

  const validasi = async (d: Dok, aksi: "setuju" | "tolak") => {
    setProses(true);
    try {
      await updateDoc(doc(db, "modul_ajar", d.id), {
        statusValidasi: aksi === "setuju" ? "disetujui" : "ditolak",
        feedback: catatan.trim() || (aksi === "setuju" ? "Disetujui tanpa catatan." : "Perlu perbaikan."),
        divalidasiPada: serverTimestamp(),
      });
      if (aksi === "setuju") {
        // Tandai entri Bank Bersama sebagai tervalidasi bila cocok.
        void tandaiTervalidasiBank(d.tipe || "", d.mapel || "", d.materi || d.topik || "");
      }
      setDipilih(null);
      setCatatan("");
    } catch (error) {
      console.error("Gagal memvalidasi:", error);
      alert("Gagal menyimpan keputusan validasi.");
    } finally {
      setProses(false);
    }
  };

  const terfilter = pending.filter((d) => {
    const c = cari.toLowerCase();
    return !c || (d.mapel || "").toLowerCase().includes(c) || (d.tipe || "").toLowerCase().includes(c) || (d.materi || d.topik || "").toLowerCase().includes(c);
  });

  const isLanskap = dipilih ? ["PROMES", "PROTA", "ATP"].includes(dipilih.tipe || "") : false;

  if (isLoading) return <MemuatHalaman label="Memuat antrean validasi..." />;

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto w-full space-y-4 md:space-y-5 pb-4">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
            <FileSpreadsheet className="text-purple-600 shrink-0" size={24} /> Validasi Perangkat Guru
          </h1>
          <p className="text-slate-500 text-[12px] sm:text-sm mt-1.5 leading-relaxed">
            Tinjau dan setujui perangkat ajar serta instrumen asesmen yang diajukan guru sebelum digunakan.
          </p>
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari mapel / tipe / materi..."
            className="w-full min-h-[42px] pl-9 pr-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 shadow-sm"
          />
        </div>
      </header>

      <div className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg">
          <Clock size={13} /> {pending.length} menunggu tinjauan
        </span>
      </div>

      {terfilter.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Inbox size={44} className="mb-3 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-600">Tidak ada antrean</h3>
          <p className="text-[12px] text-slate-400 mt-1">Semua perangkat guru sudah ditinjau.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {terfilter.map((d) => (
            <article key={d.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-purple-300 transition-colors flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 truncate">{d.tipe || "Dokumen"}</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded flex items-center gap-1 shrink-0"><Clock size={11} /> Menunggu</span>
              </div>
              <h3 className="font-bold text-slate-800 text-[14px] leading-snug line-clamp-2 mb-3 flex-1">{d.materi || d.topik || "Tanpa Judul"}</h3>
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5"><BookOpen size={12} className="text-slate-400" /> {d.mapel} {d.kelas && `• ${d.kelas}`}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><User size={12} /> {d.namaGuru || d.pembuat || "Guru"}</p>
              </div>
              <button
                onClick={() => { setDipilih(d); setCatatan(""); }}
                className="mt-3.5 w-full min-h-[42px] bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Eye size={14} /> Tinjau Dokumen
              </button>
            </article>
          ))}
        </div>
      )}

      {/* MODAL TINJAUAN */}
      <AnimatePresence>
        {dipilih && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="bg-white w-full sm:max-w-5xl h-[92vh] sm:h-[88vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center gap-2 p-3 sm:p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 truncate flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-purple-600 shrink-0" /> {dipilih.materi || dipilih.topik}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{dipilih.tipe} • {dipilih.mapel} • oleh {dipilih.namaGuru || dipilih.pembuat || "Guru"}</p>
                </div>
                <button onClick={() => setDipilih(null)} aria-label="Tutup" className="min-h-[38px] w-10 flex items-center justify-center text-slate-500 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shrink-0"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 p-3 sm:p-6">
                <div className={`bg-white shadow-lg border border-slate-300 rounded p-5 sm:p-10 md:p-14 mx-auto ${isLanskap ? "w-full" : "max-w-4xl"}`}>
                  <div className="markdown-body">
                    <style>{gaya}</style>
                    {dipilih.kontenHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: bersihkanSvg(dipilih.kontenHtml) }} />
                    ) : (
                      <>
                        {kopTerisi(kop) && <KopSurat kop={kop} judulDokumen={dipilih.tipe?.toUpperCase()} subJudul={`${dipilih.mapel}${dipilih.kelas ? ` — ${dipilih.kelas}` : ""}`} />}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            table: ({ ...props }) => <div className="table-wrapper"><table {...props} /></div>,
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

              {/* Aksi validasi */}
              <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4 space-y-2.5">
                <input
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan untuk guru (opsional saat menyetujui, disarankan saat menolak)..."
                  className="w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-[13px] outline-none focus:border-purple-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => validasi(dipilih, "tolak")}
                    disabled={proses}
                    className="flex-1 min-h-[46px] bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    {proses ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Perlu Revisi
                  </button>
                  <button
                    onClick={() => validasi(dipilih, "setuju")}
                    disabled={proses}
                    className="flex-1 min-h-[46px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    {proses ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Setujui (ACC)
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                  <Stamp size={12} /> Dokumen yang disetujui otomatis ditandai tervalidasi di Bank Bersama.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

const gaya = `
  .markdown-body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.6; color: #000; text-align: justify; }
  @media (min-width: 768px) { .markdown-body { font-size: 12pt; } }
  .markdown-body p { margin-bottom: .7rem; }
  .markdown-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 6px 10px; text-align: left; vertical-align: top; }
  .markdown-body th { background: #f2f2f2; font-weight: bold; text-align: center; }
  .markdown-body h1 { text-align: center; font-size: 1.2em; font-weight: bold; text-transform: uppercase; margin-bottom: 1.2rem; }
  .markdown-body h2 { font-weight: bold; text-transform: uppercase; margin: 1.2rem 0 .5rem; }
  .markdown-body ul, .markdown-body ol { padding-left: 22px; margin-bottom: 1rem; }
  .markdown-body img, .markdown-body svg { max-width: 100%; height: auto; display: block; margin: 10px auto; }
  .table-wrapper { overflow-x: auto; width: 100%; margin-bottom: 1rem; }
  @media (max-width: 768px) { .markdown-body table { min-width: 520px; } }
  .kop-surat table, .kop-surat td, .header-table td, .header-table th, .sig-table td, .sig-table th { border: none !important; }
`;
