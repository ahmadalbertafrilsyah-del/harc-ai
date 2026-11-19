"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BellRing, X } from "lucide-react";
import { kirimNotifikasiPwa, mintaIzinNotifikasi, tampilkanNotifikasi } from "@/lib/notifikasiPwa";

const KUNCI_TUNDA = "harc-notif-tunda";

/** Mendaftarkan service worker PWA serta menawarkan aktivasi notifikasi pada aplikasi terinstal. */
export default function PwaBootstrap() {
  const pathname = usePathname();
  const [tampilPrompt, setTampilPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname?.startsWith("/dashboard")) {
      setTampilPrompt(false);
      return;
    }
    if (!("Notification" in window) || Notification.permission !== "default") {
      setTampilPrompt(false);
      return;
    }
    try {
      if (localStorage.getItem(KUNCI_TUNDA) === "1") return;
    } catch { /* abaikan */ }

    const timer = window.setTimeout(() => setTampilPrompt(true), 1200);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const aktifkan = async () => {
    const hasil = await mintaIzinNotifikasi();
    setTampilPrompt(false);
    if (hasil === "granted") {
      tampilkanNotifikasi({
        tipe: "sukses",
        judul: "Notifikasi Aplikasi Aktif",
        pesan: "Kamu akan menerima pemberitahuan asesmen, validasi modul, dan pembaruan penting langsung di HP.",
      });
      void kirimNotifikasiPwa({
        judul: "Notifikasi HARC-AI Aktif",
        isi: "Pemberitahuan tugas, asesmen, dan validasi perangkat ajar siap diterima.",
        url: pathname || "/dashboard",
      });
    } else if (hasil === "denied") {
      tampilkanNotifikasi({
        tipe: "error",
        judul: "Izin Notifikasi Ditolak",
        pesan: "Aktifkan izin notifikasi melalui pengaturan situs/aplikasi di browser HP bila ingin menerimanya.",
      });
    }
  };

  const tunda = () => {
    setTampilPrompt(false);
    try {
      localStorage.setItem(KUNCI_TUNDA, "1");
    } catch { /* abaikan */ }
  };

  if (!tampilPrompt) return null;

  return (
    <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-5 left-1/2 -translate-x-1/2 md:left-auto md:right-5 md:translate-x-0 z-50 w-[calc(100%-1.5rem)] max-w-sm">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-xl p-3.5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <BellRing size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-tight">Aktifkan Notifikasi Aplikasi</p>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
            Terima info asesmen baru &amp; validasi modul langsung di HP.
          </p>
        </div>
        <button
          type="button"
          onClick={aktifkan}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shrink-0 transition-colors"
        >
          Aktifkan
        </button>
        <button
          type="button"
          onClick={tunda}
          className="p-1 text-slate-400 hover:text-white rounded-lg shrink-0"
          aria-label="Nanti saja"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
