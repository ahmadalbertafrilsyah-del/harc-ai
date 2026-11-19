"use client";

/**
 * Kumpulan komponen animasi pemuatan yang seragam di seluruh dashboard.
 *
 * Menggunakan logo resmi (/logo.png) dengan animasi orbit & shimmer agar
 * seluruh dashboard memiliki identitas visual yang konsisten dan modern.
 */

import { Loader2 } from "lucide-react";

/** Lencana logo resmi dari /public/logo.png untuk header & sidebar. */
export function LogoBrand({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-white p-0.5 shadow-sm border border-slate-200/80 shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Logo Mahatma Academy HARC-AI"
        loading="eager"
        decoding="sync"
        className="w-full h-full object-contain scale-[1.08]"
      />
    </span>
  );
}

/** Medali animasi orbital logo HARC-AI untuk loading & overlay proses. */
function MedaliLogoAnimasi({ ukuran = "md" }: { ukuran?: "sm" | "md" | "lg" }) {
  const dim = {
    sm: { box: "w-16 h-16", medali: "w-12 h-12 p-1" },
    md: { box: "w-24 h-24", medali: "w-16 h-16 p-1.5" },
    lg: { box: "w-28 h-28", medali: "w-20 h-20 p-2" },
  }[ukuran];

  return (
    <div className={`relative ${dim.box} flex items-center justify-center select-none`}>
      {/* Aura cahaya lembut di belakang logo */}
      <span
        className="absolute inset-1 rounded-full bg-gradient-to-tr from-emerald-500/25 via-amber-400/25 to-blue-500/25 blur-lg animate-pulse"
        aria-hidden="true"
      />

      {/* Cincin orbit luar (searah jarum jam) */}
      <span
        className="absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-emerald-600 border-r-amber-500/80 harc-orbit-slow"
        aria-hidden="true"
      />

      {/* Cincin orbit dalam (berlawanan arah jarum jam) */}
      <span
        className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-500/35 border-b-amber-500 harc-orbit-reverse"
        aria-hidden="true"
      />

      {/* Medali putih berisi logo resmi */}
      <span
        className={`relative ${dim.medali} rounded-2xl bg-white shadow-lg shadow-slate-900/10 border border-slate-100 flex items-center justify-center overflow-hidden harc-logo-float`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="HARC-AI"
          loading="eager"
          decoding="sync"
          className="w-full h-full object-contain scale-[1.06]"
        />
      </span>
    </div>
  );
}

/** Spinner kecil sebaris dengan label opsional. */
export function Spinner({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-slate-500 ${className}`}>
      <Loader2 size={16} className="animate-spin" />
      {label && <span className="text-xs font-bold">{label}</span>}
    </span>
  );
}

/** Pemuatan satu halaman penuh dengan animasi logo HARC-AI. */
export function MemuatHalaman({
  label = "Memuat...",
  subLabel,
  className = "",
}: {
  label?: string;
  subLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`w-full min-h-[65dvh] flex flex-col items-center justify-center px-4 text-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <MedaliLogoAnimasi ukuran="md" />

      <p className="mt-5 text-sm sm:text-base font-bold text-slate-800 tracking-tight">{label}</p>
      {subLabel && <p className="text-xs text-slate-500 mt-1 max-w-xs">{subLabel}</p>}

      {/* Bilah shimmer halus */}
      <div className="mt-4 w-36 h-1.5 rounded-full bg-slate-200/80 overflow-hidden relative" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 harc-shimmer" />
      </div>
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
 * Overlay proses AI di atas kanvas dokumen dengan animasi logo.
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
      <MedaliLogoAnimasi ukuran="md" />
      <p className="mt-5 font-bold text-slate-800 text-sm sm:text-base uppercase tracking-widest">{judul}</p>
      {keterangan && <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">{keterangan}</p>}
      {persen !== null ? (
        <div className="w-52 h-1.5 rounded-full bg-slate-200 overflow-hidden mt-4">
          <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${persen}%` }} />
        </div>
      ) : (
        <div className="mt-4 w-40 h-1.5 rounded-full bg-slate-200/80 overflow-hidden relative" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 harc-shimmer" />
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
