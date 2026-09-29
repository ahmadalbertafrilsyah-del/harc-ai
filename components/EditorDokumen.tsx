"use client";

/**
 * Editor dokumen WYSIWYG bergaya Word/Google Docs.
 *
 * Guru mengetik langsung di atas halaman dokumen yang sudah terformat, dengan
 * toolbar lengket (heading, tebal/miring/garis bawah, perataan, daftar, tabel,
 * gambar, pemisah halaman, undo/redo). Teks yang diseleksi dapat diperbaiki
 * sebagian oleh AI lewat /api/perbaiki tanpa menyusun ulang seluruh dokumen.
 *
 * Editor bekerja pada HTML. Isi masuk lewat `htmlAwal` dan keluar lewat
 * `onSimpan(html)`. Alur cetak/ekspor di halaman pemanggil membaca HTML yang
 * sama, sehingga hasil edit tampil persis saat dicetak.
 */

import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Undo2, Redo2, Table2, ImagePlus,
  SeparatorHorizontal, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles,
  X, Save, Loader2, Type, Wand2, Link2,
} from "lucide-react";

import { getAuth } from "firebase/auth";
import { bersihkanSvg } from "@/lib/gambarAjar";

const AKSI_AI: { id: string; label: string }[] = [
  { id: "perjelas", label: "Perjelas & perkaya" },
  { id: "ringkas", label: "Ringkas" },
  { id: "tata_bahasa", label: "Perbaiki tata bahasa" },
  { id: "formal", label: "Bahasa lebih formal" },
  { id: "contoh", label: "Tambah contoh" },
  { id: "hots", label: "Naikkan ke HOTS" },
  { id: "mudah", label: "Sederhanakan bahasa" },
];

type Props = {
  buka: boolean;
  htmlAwal: string;
  judul?: string;
  menyimpan?: boolean;
  gambarMapel?: string;
  gambarJenjang?: string;
  onTutup: () => void;
  onSimpan: (html: string) => void;
};

export default function EditorDokumen({
  buka, htmlAwal, judul = "Edit Dokumen", menyimpan = false,
  gambarMapel, gambarJenjang, onTutup, onSimpan,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const seleksiRef = useRef<Range | null>(null);

  const [menuAI, setMenuAI] = useState(false);
  const [promptKustom, setPromptKustom] = useState("");
  const [sedangAI, setSedangAI] = useState(false);
  const [pesanAI, setPesanAI] = useState<string | null>(null);
  const [dialogGambar, setDialogGambar] = useState(false);

  // Muat konten awal sekali saat editor dibuka (hindari reset caret).
  useEffect(() => {
    if (buka && areaRef.current) {
      areaRef.current.innerHTML = bersihkanSvg(htmlAwal || "<p><br/></p>");
    }
  }, [buka, htmlAwal]);

  // Kunci scroll latar saat editor penuh layar terbuka.
  useEffect(() => {
    if (!buka) return;
    const asal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = asal; };
  }, [buka]);

  if (!buka) return null;

  const fokus = () => areaRef.current?.focus();

  const perintah = (cmd: string, nilai?: string) => {
    fokus();
    document.execCommand(cmd, false, nilai);
  };

  const simpanSeleksi = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      seleksiRef.current = sel.getRangeAt(0).cloneRange();
      return true;
    }
    return false;
  };

  const pulihkanSeleksi = () => {
    const sel = window.getSelection();
    if (sel && seleksiRef.current) {
      sel.removeAllRanges();
      sel.addRange(seleksiRef.current);
    }
  };

  const sisipkanHtml = (html: string) => {
    fokus();
    document.execCommand("insertHTML", false, html);
  };

  const sisipkanTabel = () => {
    const html =
      '<table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr>' +
      '<th style="border:1px solid #000;padding:6px;background:#f2f2f2">Kolom 1</th>' +
      '<th style="border:1px solid #000;padding:6px;background:#f2f2f2">Kolom 2</th>' +
      '<th style="border:1px solid #000;padding:6px;background:#f2f2f2">Kolom 3</th></tr></thead><tbody>' +
      '<tr><td style="border:1px solid #000;padding:6px">&nbsp;</td><td style="border:1px solid #000;padding:6px">&nbsp;</td><td style="border:1px solid #000;padding:6px">&nbsp;</td></tr>' +
      '<tr><td style="border:1px solid #000;padding:6px">&nbsp;</td><td style="border:1px solid #000;padding:6px">&nbsp;</td><td style="border:1px solid #000;padding:6px">&nbsp;</td></tr>' +
      "</tbody></table><p><br/></p>";
    sisipkanHtml(html);
  };

  const sisipkanPageBreak = () =>
    sisipkanHtml(
      '<hr style="page-break-before:always;border:none;border-top:2px dashed #cbd5e1;margin:20px 0" /><p><br/></p>'
    );

  /* ------------------------------ AI SECTION ------------------------------ */

  const jalankanAI = async (mode: string) => {
    pulihkanSeleksi();
    const sel = window.getSelection();
    const teks = sel?.toString().trim();
    if (!teks) {
      setPesanAI("Pilih dulu teks yang ingin diperbaiki.");
      return;
    }
    setSedangAI(true);
    setPesanAI(null);
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/perbaiki", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          teks,
          mode,
          instruksiKustom: mode === "kustom" ? promptKustom : undefined,
          konteks: areaRef.current?.innerText?.slice(0, 1200),
          format: "html",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.hasil) throw new Error(data.error || "Gagal memperbaiki.");

      pulihkanSeleksi();
      // Sisipkan sebagai teks aman: newline → <br>, biarkan tag yang dikembalikan.
      sisipkanHtml(data.hasil.replace(/\n{2,}/g, "<br/><br/>").replace(/\n/g, "<br/>"));
      setMenuAI(false);
      setPromptKustom("");
    } catch (error: any) {
      setPesanAI(error?.message || "Gagal memperbaiki bagian ini.");
    } finally {
      setSedangAI(false);
    }
  };

  const simpan = () => {
    if (areaRef.current) onSimpan(areaRef.current.innerHTML);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex flex-col">
      {/* Bilah judul */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Type size={16} className="text-blue-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 truncate">{judul}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={simpan}
            disabled={menyimpan}
            className="min-h-[38px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
          >
            {menyimpan ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
          <button
            onClick={onTutup}
            aria-label="Tutup editor"
            className="min-h-[38px] w-10 flex items-center justify-center text-slate-500 hover:text-rose-600 bg-white border border-slate-200 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-2 sm:px-3 py-1.5 flex items-center gap-0.5 overflow-x-auto no-scrollbar">
        <select
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => { perintah("formatBlock", e.target.value); e.target.selectedIndex = 0; }}
          className="min-h-[34px] px-2 mr-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 outline-none cursor-pointer shrink-0"
          aria-label="Gaya paragraf"
        >
          <option value="">Gaya</option>
          <option value="p">Teks biasa</option>
          <option value="h1">Judul 1</option>
          <option value="h2">Judul 2</option>
          <option value="h3">Judul 3</option>
        </select>

        <TombolAlat ikon={Bold} label="Tebal" onClick={() => perintah("bold")} />
        <TombolAlat ikon={Italic} label="Miring" onClick={() => perintah("italic")} />
        <TombolAlat ikon={Underline} label="Garis bawah" onClick={() => perintah("underline")} />
        <Pemisah />
        <TombolAlat ikon={AlignLeft} label="Rata kiri" onClick={() => perintah("justifyLeft")} />
        <TombolAlat ikon={AlignCenter} label="Rata tengah" onClick={() => perintah("justifyCenter")} />
        <TombolAlat ikon={AlignRight} label="Rata kanan" onClick={() => perintah("justifyRight")} />
        <TombolAlat ikon={AlignJustify} label="Rata kiri-kanan" onClick={() => perintah("justifyFull")} />
        <Pemisah />
        <TombolAlat ikon={List} label="Daftar butir" onClick={() => perintah("insertUnorderedList")} />
        <TombolAlat ikon={ListOrdered} label="Daftar bernomor" onClick={() => perintah("insertOrderedList")} />
        <TombolAlat ikon={Table2} label="Sisipkan tabel" onClick={sisipkanTabel} />
        <TombolAlat ikon={ImagePlus} label="Sisipkan gambar" onClick={() => setDialogGambar(true)} />
        <TombolAlat ikon={SeparatorHorizontal} label="Pemisah halaman" onClick={sisipkanPageBreak} />
        <Pemisah />
        <TombolAlat ikon={Undo2} label="Batalkan" onClick={() => perintah("undo")} />
        <TombolAlat ikon={Redo2} label="Ulangi" onClick={() => perintah("redo")} />
        <Pemisah />
        <button
          onMouseDown={(e) => { e.preventDefault(); simpanSeleksi(); }}
          onClick={() => { setPesanAI(null); setMenuAI((v) => !v); }}
          className="min-h-[34px] px-3 shrink-0 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
        >
          <Sparkles size={14} /> Perbaiki AI
        </button>
      </div>

      {/* Menu AI */}
      {menuAI && (
        <div className="shrink-0 bg-blue-50/60 border-b border-blue-100 px-3 py-2.5">
          <div className="max-w-3xl mx-auto">
            <p className="text-[11px] font-bold text-blue-800 mb-2 flex items-center gap-1.5">
              <Wand2 size={13} /> Perbaiki teks terpilih dengan AI
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {AKSI_AI.map((a) => (
                <button
                  key={a.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => jalankanAI(a.id)}
                  disabled={sedangAI}
                  className="min-h-[34px] px-3 bg-white border border-blue-200 rounded-lg text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={promptKustom}
                onChange={(e) => setPromptKustom(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Atau tulis instruksi sendiri, mis. 'ubah ke bentuk soal cerita'"
                className="flex-1 min-h-[38px] px-3 bg-white border border-slate-300 rounded-lg text-[12px] outline-none focus:border-blue-500"
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => jalankanAI("kustom")}
                disabled={sedangAI || !promptKustom.trim()}
                className="min-h-[38px] px-4 bg-blue-600 text-white rounded-lg text-[12px] font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {sedangAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Jalankan
              </button>
            </div>
            {pesanAI && <p className="text-[11px] text-rose-600 font-semibold mt-2">{pesanAI}</p>}
            {sedangAI && <p className="text-[11px] text-blue-700 font-semibold mt-2">AI sedang memperbaiki bagian terpilih…</p>}
          </div>
        </div>
      )}

      {/* Halaman dokumen */}
      <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-6 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <div
            ref={areaRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            className="editor-dokumen bg-white shadow-lg border border-slate-300 rounded p-5 sm:p-10 md:p-14 min-h-[60vh] outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Dialog sisip gambar */}
      {dialogGambar && (
        <DialogGambar
          mapel={gambarMapel}
          jenjang={gambarJenjang}
          onTutup={() => setDialogGambar(false)}
          onSisip={(url, ket) => {
            setDialogGambar(false);
            fokus();
            sisipkanHtml(
              `<figure style="text-align:center;margin:12px 0"><img src="${url}" alt="${ket || ""}" style="max-width:100%;height:auto" /><figcaption style="font-size:11px;font-style:italic;color:#475569">${ket || ""}</figcaption></figure><p><br/></p>`
            );
          }}
        />
      )}

      <style>{`
        .editor-dokumen { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; text-align: justify; }
        .editor-dokumen:empty::before { content: 'Mulai mengetik dokumen di sini...'; color: #94a3b8; }
        .editor-dokumen h1 { font-size: 1.2em; font-weight: bold; text-align: center; text-transform: uppercase; margin: 0 0 14px; }
        .editor-dokumen h2 { font-size: 1.08em; font-weight: bold; text-transform: uppercase; margin: 16px 0 7px; }
        .editor-dokumen h3 { font-size: 1em; font-weight: bold; margin: 12px 0 5px; }
        .editor-dokumen p { margin: 0 0 9px; }
        .editor-dokumen table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .editor-dokumen th, .editor-dokumen td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
        .editor-dokumen th { background: #f2f2f2; font-weight: bold; text-align: center; }
        .editor-dokumen ul, .editor-dokumen ol { padding-left: 24px; margin: 0 0 10px; }
        .editor-dokumen li { margin-bottom: 4px; }
        .editor-dokumen img, .editor-dokumen svg { max-width: 100%; height: auto; }
        .editor-dokumen .kop-surat table, .editor-dokumen .header-table td, .editor-dokumen .header-table th, .editor-dokumen .sig-table td, .editor-dokumen .sig-table th { border: none !important; }
      `}</style>
    </div>
  );
}

function TombolAlat({ ikon: Ikon, label, onClick }: { ikon: any; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="min-h-[34px] w-9 shrink-0 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"
    >
      <Ikon size={16} />
    </button>
  );
}

function Pemisah() {
  return <span className="w-px h-5 bg-slate-200 mx-1 shrink-0" />;
}

/** Dialog kecil untuk menyisipkan gambar: buat via AI atau tempel URL. */
function DialogGambar({
  mapel, jenjang, onTutup, onSisip,
}: {
  mapel?: string; jenjang?: string;
  onTutup: () => void; onSisip: (url: string, ket: string) => void;
}) {
  const [tab, setTab] = useState<"ai" | "url">("ai");
  const [deskripsi, setDeskripsi] = useState("");
  const [url, setUrl] = useState("");
  const [membuat, setMembuat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buatGambar = async () => {
    if (!deskripsi.trim()) return;
    setMembuat(true);
    setError(null);
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ deskripsi, mapel, jenjang }),
      });
      const data = await res.json();
      if (!res.ok || !data.dataUrl) throw new Error(data.error || "Gagal membuat gambar.");
      onSisip(data.dataUrl, deskripsi);
    } catch (e: any) {
      setError(e?.message || "Gagal membuat gambar.");
    } finally {
      setMembuat(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onTutup}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ImagePlus size={16} className="text-blue-600" /> Sisipkan Gambar</h4>
          <button onClick={onTutup} aria-label="Tutup" className="text-slate-400 hover:text-rose-600"><X size={16} /></button>
        </div>

        <div className="flex gap-1 p-2 border-b border-slate-100">
          <button onClick={() => setTab("ai")} className={`flex-1 min-h-[36px] rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 ${tab === "ai" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600"}`}>
            <Sparkles size={13} /> Buat dengan AI
          </button>
          <button onClick={() => setTab("url")} className={`flex-1 min-h-[36px] rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 ${tab === "url" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600"}`}>
            <Link2 size={13} /> Dari URL
          </button>
        </div>

        <div className="p-4 space-y-3">
          {tab === "ai" ? (
            <>
              <textarea
                rows={3}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Deskripsikan gambar, mis. 'ilustrasi siklus air di alam'"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500 resize-y"
              />
              {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}
              <button
                onClick={buatGambar}
                disabled={membuat || !deskripsi.trim()}
                className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {membuat ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Buat & Sisipkan
              </button>
              <p className="text-[11px] text-slate-400 leading-relaxed">Untuk diagram presisi (bangun/grafik), lebih baik pakai mode diagram SVG pada generator.</p>
            </>
          ) : (
            <>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://... alamat gambar"
                className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500"
              />
              <button
                onClick={() => url.trim() && onSisip(url.trim(), "")}
                disabled={!url.trim()}
                className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold disabled:opacity-60"
              >
                Sisipkan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
