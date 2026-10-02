"use client";

import PanelBeliToken from "@/components/token/PanelBeliToken";

export default function BeliTokenSiswaPage() {
  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Beli Token AI</h1>
        <p className="text-sm text-slate-500">
          Tambah kuota token untuk Asisten AI dan fitur belajar lainnya.
        </p>
      </div>
      <PanelBeliToken role="siswa" />
    </div>
  );
}
