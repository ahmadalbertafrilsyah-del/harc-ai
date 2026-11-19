"use client";

import { useState, useEffect } from "react";
import { BellRing, CheckCircle2, Send, AlertTriangle } from "lucide-react";
import { kirimNotifikasiPwa, mintaIzinNotifikasi, tampilkanNotifikasi } from "@/lib/notifikasiPwa";

/** Kartu manajemen & uji notifikasi PWA pada halaman Pengaturan. */
export default function KartuNotifikasiPwa({ urlTujuan = "/dashboard" }: { urlTujuan?: string }) {
  const [status, setStatus] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission);
  }, []);

  const aktifkan = async () => {
    const res = await mintaIzinNotifikasi();
    setStatus(res);
    if (res === "granted") {
      tampilkanNotifikasi({
        tipe: "sukses",
        judul: "Notifikasi Aplikasi Diaktifkan",
        pesan: "Notifikasi akan muncul saat ada pembaruan ujian atau validasi.",
      });
      await kirimNotifikasiPwa({
        judul: "Notifikasi HARC-AI Siap",
        isi: "Aplikasi terhubung dengan notifikasi perangkat Anda.",
        url: urlTujuan,
      });
    } else if (res === "denied") {
      tampilkanNotifikasi({
        tipe: "error",
        judul: "Izin Notifikasi Diblokir",
        pesan: "Buka pengaturan aplikasi/situs di browser HP untuk mengizinkan notifikasi.",
      });
    }
  };

  const ujiNotifikasi = async () => {
    const ok = await kirimNotifikasiPwa({
      judul: "Uji Notifikasi HARC-AI",
      isi: "Notifikasi berjalan normal di aplikasi HP Anda.",
      url: urlTujuan,
    });
    if (ok) {
      tampilkanNotifikasi({
        tipe: "sukses",
        judul: "Notifikasi Uji Terkirim",
        pesan: "Periksa panel notifikasi pada perangkat Anda.",
      });
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5 min-w-0">
        <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
          <BellRing size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2 flex-wrap">
            Notifikasi Aplikasi HP (PWA)
            {status === "granted" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> Aktif
              </span>
            )}
            {status === "denied" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                <AlertTriangle size={11} /> Diblokir
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {status === "unsupported"
              ? "Browser ini belum mendukung Web Notification secara langsung."
              : status === "granted"
                ? "Notifikasi aktif. Anda akan diberi tahu saat ada asesmen baru atau validasi perangkat."
                : status === "denied"
                  ? "Izin notifikasi ditolak. Aktifkan melalui Pengaturan Situs browser atau Info Aplikasi di HP."
                  : "Aktifkan agar pembaruan tugas, asesmen, dan validasi tampil di panel notifikasi HP."}
          </p>
        </div>
      </div>

      <div className="shrink-0 w-full sm:w-auto">
        {status === "granted" ? (
          <button
            type="button"
            onClick={ujiNotifikasi}
            className="w-full sm:w-auto min-h-[42px] px-4 bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Send size={14} /> Uji Notifikasi
          </button>
        ) : status !== "unsupported" ? (
          <button
            type="button"
            onClick={aktifkan}
            className="w-full sm:w-auto min-h-[42px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <BellRing size={14} /> Aktifkan Notifikasi
          </button>
        ) : null}
      </div>
    </div>
  );
}
