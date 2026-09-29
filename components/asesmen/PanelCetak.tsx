"use client";

/**
 * Panel penerbitan naskah: memilih model Lembar Jawaban, mencetak naskah soal,
 * kunci jawaban, dan LJK — serta mencoba lembar jawaban versi daring.
 */

import { useState } from "react";
import { Printer, FileCheck, KeyRound, MonitorSmartphone, Info, ScanLine } from "lucide-react";

import LjkInteraktif from "@/components/LjkInteraktif";
import {
  cetakHtml, htmlKunciJawaban, htmlLembarSoal, htmlLJK,
  DAFTAR_MODEL_LJK, kelompokkanSoal,
  type IdentitasUjian, type ModelLJK, type Soal,
} from "@/lib/soal";
import { type KopLembaga } from "@/lib/kop";

type Props = {
  soal: Soal[];
  identitas: IdentitasUjian;
  kop: KopLembaga;
  /** Data QR pada LJK, dipakai pemindai untuk mengenali ujian. */
  qrData?: string;
};

export default function PanelCetak({ soal, identitas, kop, qrData }: Props) {
  const [model, setModel] = useState<ModelLJK>("bulatan");
  const [barisUraian, setBarisUraian] = useState(4);
  const [tampilDaring, setTampilDaring] = useState(false);

  const kelompok = kelompokkanSoal(soal);
  const adaObjektif = kelompok.some((k) => k.tipe === "PG" || k.tipe === "Benar/Salah");
  const adaSubjektif = kelompok.some((k) => k.tipe !== "PG" && k.tipe !== "Benar/Salah");

  const cetak = (html: string) => {
    if (!cetakHtml(html)) alert("Izinkan pop-up pada browser untuk membuka jendela cetak.");
  };

  /** Model yang tidak akan menghasilkan apa pun untuk komposisi soal saat ini. */
  const modelTidakCocok = (id: ModelLJK) =>
    (id === "uraian" && !adaSubjektif) ||
    (id !== "uraian" && id !== "campuran" && !adaObjektif) ||
    (id === "campuran" && !adaObjektif && !adaSubjektif);

  return (
    <div className="space-y-4">
      {/* Cetak dokumen */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Printer size={16} className="text-slate-500" />
          <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Cetak Dokumen Ujian</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <TombolCetak
            ikon={Printer}
            judul="Naskah Soal"
            keterangan="Terpilah per jenis, bernomor berlanjut, berkop resmi."
            onClick={() => cetak(htmlLembarSoal(soal, identitas, kop))}
          />
          <TombolCetak
            ikon={KeyRound}
            judul="Kunci & Penskoran"
            keterangan="Lembar terpisah untuk pemeriksa."
            onClick={() => cetak(htmlKunciJawaban(soal, identitas, kop))}
          />
          <TombolCetak
            ikon={FileCheck}
            judul="Naskah + Kunci"
            keterangan="Arsip guru, kunci tercetak di bawah tiap butir."
            onClick={() => cetak(htmlLembarSoal(soal, identitas, kop, { sertakanKunci: true }))}
          />
        </div>
      </section>

      {/* Model LJK */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <FileCheck size={16} className="text-slate-500" />
          <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Lembar Jawaban (LJK)</h3>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DAFTAR_MODEL_LJK.map((m) => {
              const nonaktif = modelTidakCocok(m.id);
              const terpilih = model === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={nonaktif}
                  onClick={() => setModel(m.id)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    nonaktif
                      ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                      : terpilih
                      ? "bg-blue-50 border-blue-400"
                      : "bg-white border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <p className="text-[12px] font-bold text-slate-800">{m.nama}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {nonaktif ? "Tidak tersedia untuk komposisi soal saat ini." : m.keterangan}
                  </p>
                </button>
              );
            })}
          </div>

          {(model === "campuran" || model === "uraian") && (
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Baris per soal uraian</label>
              <input
                type="number"
                min={1}
                max={12}
                value={barisUraian}
                onChange={(e) => setBarisUraian(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                className="w-16 min-h-[38px] px-2 text-center bg-white border border-slate-300 rounded-lg text-[12px] font-bold outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => cetak(htmlLJK(model, soal, identitas, kop, { qrData, barisUraian }))}
              className="flex-1 min-h-[46px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            >
              <Printer size={15} /> Cetak LJK Terpilih
            </button>
            <button
              type="button"
              onClick={() => setTampilDaring((v) => !v)}
              className="flex-1 min-h-[46px] bg-white border border-slate-300 text-slate-700 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <MonitorSmartphone size={15} /> {tampilDaring ? "Tutup" : "Coba"} Lembar Daring
            </button>
          </div>

          {qrData && (
            <p className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-relaxed">
              <ScanLine size={13} className="shrink-0 mt-0.5" />
              LJK cetak memuat kode QR ujian agar pemindai pada tab Koreksi langsung mengenali naskah ini.
            </p>
          )}
        </div>
      </section>

      {/* Lembar daring */}
      {tampilDaring && (
        <section className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Ini tampilan yang akan dilihat peserta saat mengerjakan daring — termasuk di layar HP.
              Kunci jawaban ditampilkan karena Anda berperan sebagai guru.
            </p>
          </div>
          <LjkInteraktif soal={soal} modeTinjau />
        </section>
      )}
    </div>
  );
}

function TombolCetak({
  ikon: Ikon, judul, keterangan, onClick,
}: { ikon: any; judul: string; keterangan: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors active:scale-[0.98]"
    >
      <p className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5">
        <Ikon size={14} className="text-blue-600" /> {judul}
      </p>
      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{keterangan}</p>
    </button>
  );
}
