"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { LogoBrand } from "@/components/Memuat";

export default function HalamanOffline() {
  return (
    <main className="min-h-[100dvh] bg-[#f8fafc] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-900/5 p-7 sm:p-9 text-center space-y-5">
        <div className="flex items-center justify-center gap-3">
          <LogoBrand size={48} />
        </div>

        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
          <WifiOff size={26} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-slate-900">Koneksi Internet Terputus</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            HARC-AI memerlukan koneksi internet untuk menyinkronkan perangkat ajar, soal CBT, dan nilai terbaru Anda.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full min-h-[46px] bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <RefreshCw size={16} /> Coba Muat Ulang
        </button>
      </div>
    </main>
  );
}
