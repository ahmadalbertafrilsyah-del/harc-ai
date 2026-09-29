"use client";

/**
 * Kumpulan komponen animasi pemuatan yang seragam di seluruh dashboard.
 *
 * Tujuannya satu bahasa visual: spinner, kerangka (skeleton), overlay proses,
 * dan indikator "AI sedang mengetik" yang konsisten — bukan lagi beragam
 * spinner ad-hoc di tiap halaman.
 */

import { Loader2, Bot } from "lucide-react";

/** Spinner kecil sebaris dengan label opsional. */
export function Spinner({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-slate-500 ${className}`}>
      <Loader2 size={16} className="animate-spin" />
      {label && <span className="text-xs font-bold">{label}</span>}
    </span>
  );
}

/** Pemuatan satu halaman penuh, dipakai sebagai fallback awal. */
export function MemuatHalaman({ label = "Memuat..." }: { label?: string }) {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center" role="status" aria-label={label}>
      <span className="relative w-14 h-14 flex items-center justify-center mb-4">
        <span className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
        <span className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin" />
      </span>
      <p className="text-xs font-bold text-slate-600">{label}</p>
    </div>
  );
}

/** Baris-baris kerangka konten. */
export function Kerangka({ baris = 3, className = "" }: { baris?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-2.5 ${className}`} role="status" aria-label="Memuat">
      {Array.from({ length: baris }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 rounded-full bg-slate-200"
          style={{ width: `${90 - (i % 3) * 18}%` }}
        />
      ))}
    </div>
  );
}

/** Kartu kerangka untuk grid. */
export function KerangkaKartu({ jumlah = 3, tinggi = 132 }: { jumlah?: number; tinggi?: number }) {
  return (
    <>
      {Array.from({ length: jumlah }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-slate-200 animate-pulse" style={{ height: tinggi }} />
      ))}
    </>
  );
}

/**
 * Overlay proses AI di atas kanvas dokumen.
 * `progres` opsional (mis. pembuatan gambar bertahap) ditampilkan sebagai bilah.
 */
export function OverlayProses({
  judul,
  keterangan,
  progres,
}: {
  judul: string;
  keterangan?: string;
  progres?: { selesai: number; total: number } | null;
}) {
  const persen = progres && progres.total > 0 ? Math.round((progres.selesai / progres.total) * 100) : null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/92 backdrop-blur-sm px-6 text-center">
      <span className="relative w-16 h-16 flex items-center justify-center mb-5">
        <span className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <span className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <Bot size={22} className="text-blue-700" />
      </span>
      <p className="font-bold text-slate-800 text-sm sm:text-base uppercase tracking-widest">{judul}</p>
      {keterangan && <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">{keterangan}</p>}
      {persen !== null && (
        <div className="w-52 h-1.5 rounded-full bg-slate-200 overflow-hidden mt-4">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${persen}%` }} />
        </div>
      )}
    </div>
  );
}

/** Tiga titik "AI sedang mengetik". */
export function TitikMengetik({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex gap-1.5 items-center ${className}`} aria-label="AI sedang mengetik">
      {[0, 0.2, 0.4].map((d) => (
        <span
          key={d}
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </span>
  );
}
