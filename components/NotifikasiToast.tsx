"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { MuatanToast, TipeToast } from "@/lib/notifikasiPwa";

type ItemToast = {
  id: number;
  tipe: TipeToast;
  judul: string;
  pesan: string;
  durasiMs: number;
};

function tebakTipePesan(teks: string): TipeToast {
  const lower = teks.toLowerCase();
  if (/gagal|salah|error|habis|ditolak|tidak ditemukan|tidak valid|kesalahan|kosong|maksimal|harus berupa|izinkan/.test(lower)) {
    return "error";
  }
  if (/berhasil|tersimpan|sukses|disetujui|diperbarui|terkirim|bergabung|terunggah/.test(lower)) {
    return "sukses";
  }
  return "info";
}

function IkonAnimasi({ tipe }: { tipe: TipeToast }) {
  if (tipe === "sukses") {
    return (
      <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
        <motion.span
          initial={{ scale: 0.7, opacity: 0.6 }}
          animate={{ scale: [1, 1.35, 1.45], opacity: [0.55, 0.2, 0] }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute inset-0 rounded-2xl bg-emerald-400"
          aria-hidden="true"
        />
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d="M5 13l4 4L19 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.38, delay: 0.08, ease: "easeOut" }}
          />
        </svg>
      </div>
    );
  }

  if (tipe === "error") {
    return (
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md shadow-rose-500/25 shrink-0">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
          <motion.path d="M12 8v4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />
          <motion.circle cx="12" cy="16" r="0.8" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M12 16v-4M12 8h.01" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
      </svg>
    </div>
  );
}

export default function NotifikasiToast() {
  const [daftar, setDaftar] = useState<ItemToast[]>([]);
  const seqRef = useRef(0);

  const hapus = useCallback((id: number) => {
    setDaftar((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const tambah = useCallback((muatan: MuatanToast) => {
    const teks = String(muatan.pesan || "").replace(/✅\s*/g, "").trim();
    if (!teks) return;
    const tipe: TipeToast = muatan.tipe || tebakTipePesan(teks);
    const judul =
      muatan.judul ||
      (tipe === "sukses" ? "Berhasil Tersimpan" : tipe === "error" ? "Perlu Perhatian" : "Informasi");
    const durasiMs = muatan.durasiMs || (tipe === "error" ? 4600 : 3400);
    const id = ++seqRef.current;

    setDaftar((prev) => [...prev.slice(-2), { id, tipe, judul, pesan: teks, durasiMs }]);
    window.setTimeout(() => hapus(id), durasiMs);
  }, [hapus]);

  useEffect(() => {
    const onCustomToast = (ev: Event) => {
      const detail = (ev as CustomEvent<MuatanToast>).detail;
      if (detail) tambah(detail);
    };
    window.addEventListener("harc:toast", onCustomToast);

    // Ganti dialog alert bawaan browser dengan kotak ACC/notifikasi animasi.
    const alertAsli = window.alert;
    window.alert = (pesan?: any) => {
      tambah({ pesan: String(pesan ?? "") });
    };

    return () => {
      window.removeEventListener("harc:toast", onCustomToast);
      window.alert = alertAsli;
    };
  }, [tambah]);

  return (
    <div
      className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-[120] w-[calc(100%-1.5rem)] max-w-sm pointer-events-none flex flex-col gap-2.5"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence initial={false}>
        {daftar.map((item) => {
          const aksen =
            item.tipe === "sukses"
              ? { border: "border-emerald-200/90", bar: "bg-emerald-500", title: "text-emerald-900" }
              : item.tipe === "error"
                ? { border: "border-rose-200/90", bar: "bg-rose-500", title: "text-rose-900" }
                : { border: "border-blue-200/90", bar: "bg-blue-600", title: "text-slate-900" };

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md border ${aksen.border} shadow-xl shadow-slate-900/10 p-3.5 pr-9 flex items-start gap-3`}
            >
              <IkonAnimasi tipe={item.tipe} />

              <div className="min-w-0 flex-1 pt-0.5">
                <p className={`text-xs font-extrabold tracking-tight ${aksen.title}`}>{item.judul}</p>
                <p className="text-[12px] text-slate-600 leading-snug mt-0.5 whitespace-pre-line break-words">
                  {item.pesan}
                </p>
              </div>

              <button
                type="button"
                onClick={() => hapus(item.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X size={14} />
              </button>

              {/* Bilah waktu otomatis */}
              <motion.span
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: item.durasiMs / 1000, ease: "linear" }}
                className={`absolute bottom-0 left-0 right-0 h-1 origin-left ${aksen.bar}`}
                aria-hidden="true"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
