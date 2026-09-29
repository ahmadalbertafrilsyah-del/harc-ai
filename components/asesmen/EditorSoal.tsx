"use client";

/**
 * Penyunting butir soal yang memilah pekerjaan per jenis soal.
 *
 * Perbedaan utama dengan editor lama (yang memakai satu daftar campur):
 *  - butir dikelompokkan otomatis menjadi bagian I, II, III, ... sesuai jenis;
 *  - penomoran berlanjut antar bagian seperti naskah ujian sungguhan;
 *  - setiap bagian punya tombol tambah sendiri, ringkasan jumlah dan bobot;
 *  - kolom bobot skor per butir, sehingga total skor dapat dihitung.
 */

import { useState } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Copy, ArrowUp, ArrowDown, KeyRound,
} from "lucide-react";

import {
  kelompokkanSoal, soalBaru, ringkasKomposisi, totalBobot,
  LABEL_TIPE, URUTAN_TIPE, BOBOT_DEFAULT,
  type Soal, type TipeSoal, type OpsiSoal,
} from "@/lib/soal";

type Props = {
  soal: Soal[];
  onUbah: (soal: Soal[]) => void;
  jumlahOpsiPG: number;
};

export default function EditorSoal({ soal, onUbah, jumlahOpsiPG }: Props) {
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const kelompok = kelompokkanSoal(soal);

  const perbarui = (id: string, ubahan: Partial<Soal>) =>
    onUbah(soal.map((s) => (s.id === id ? { ...s, ...ubahan } : s)));

  const tambah = (tipe: TipeSoal) => {
    const baru = soalBaru(tipe, jumlahOpsiPG);
    onUbah([...soal, baru]);
    setTerbuka(baru.id);
  };

  const hapus = (id: string) => {
    if (!confirm("Hapus butir soal ini?")) return;
    onUbah(soal.filter((s) => s.id !== id));
  };

  const gandakan = (s: Soal) => {
    const salinan: Soal = {
      ...s,
      id: `soal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      opsi: s.opsi.map((o) => ({ ...o })),
      pasangan: s.pasangan.map((p) => ({ ...p })),
    };
    const indeks = soal.findIndex((x) => x.id === s.id);
    const hasil = [...soal];
    hasil.splice(indeks + 1, 0, salinan);
    onUbah(hasil);
  };

  /** Memindahkan butir di dalam kelompok jenisnya sendiri. */
  const pindah = (s: Soal, arah: -1 | 1) => {
    const sejenis = soal.filter((x) => x.tipe === s.tipe);
    const posisi = sejenis.findIndex((x) => x.id === s.id);
    const tujuan = posisi + arah;
    if (tujuan < 0 || tujuan >= sejenis.length) return;

    const idA = sejenis[posisi].id;
    const idB = sejenis[tujuan].id;
    const indeksA = soal.findIndex((x) => x.id === idA);
    const indeksB = soal.findIndex((x) => x.id === idB);
    const hasil = [...soal];
    [hasil[indeksA], hasil[indeksB]] = [hasil[indeksB], hasil[indeksA]];
    onUbah(hasil);
  };

  return (
    <div className="space-y-4">
      {/* Ringkasan & tombol tambah per jenis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-800">{soal.length} butir soal</p>
            <p className="text-[11px] text-slate-500 truncate">{ringkasKomposisi(soal)}</p>
          </div>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg shrink-0">
            Total skor {totalBobot(soal)}
          </span>
        </div>

        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tambah butir</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {URUTAN_TIPE.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => tambah(t)}
              className="shrink-0 min-h-[40px] px-3 bg-white border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center gap-1.5 active:scale-[0.97]"
            >
              <Plus size={13} /> {LABEL_TIPE[t]}
            </button>
          ))}
        </div>
      </div>

      {kelompok.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 px-6 text-center">
          <KeyRound size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">Belum ada butir soal</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Tambahkan butir melalui tombol di atas, atau tarik dari Koleksi Asesmen.</p>
        </div>
      ) : (
        kelompok.map((k) => (
          <section key={k.tipe} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-3.5 sm:px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">
                  {k.romawi}. {k.label}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Nomor {k.nomorAwal}–{k.nomorAwal + k.soal.length - 1} • {k.soal.length} butir • bobot {k.totalBobot}
                </p>
              </div>
              <button
                type="button"
                onClick={() => tambah(k.tipe)}
                className="shrink-0 min-h-[36px] px-3 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> Tambah
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {k.soal.map((s, i) => (
                <KartuSoal
                  key={s.id}
                  soal={s}
                  nomor={k.nomorAwal + i}
                  terbuka={terbuka === s.id}
                  onToggle={() => setTerbuka(terbuka === s.id ? null : s.id)}
                  onUbah={(u) => perbarui(s.id, u)}
                  onHapus={() => hapus(s.id)}
                  onGandakan={() => gandakan(s)}
                  onNaik={() => pindah(s, -1)}
                  onTurun={() => pindah(s, 1)}
                  pertamaDiJenis={i === 0}
                  terakhirDiJenis={i === k.soal.length - 1}
                  jumlahOpsiPG={jumlahOpsiPG}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function KartuSoal({
  soal, nomor, terbuka, onToggle, onUbah, onHapus, onGandakan, onNaik, onTurun,
  pertamaDiJenis, terakhirDiJenis, jumlahOpsiPG,
}: {
  soal: Soal; nomor: number; terbuka: boolean;
  onToggle: () => void; onUbah: (u: Partial<Soal>) => void;
  onHapus: () => void; onGandakan: () => void; onNaik: () => void; onTurun: () => void;
  pertamaDiJenis: boolean; terakhirDiJenis: boolean; jumlahOpsiPG: number;
}) {
  const ubahOpsi = (idx: number, teks: string) => {
    const opsi = soal.opsi.map((o, i) => (i === idx ? { ...o, teks } : o));
    onUbah({ opsi });
  };

  const setJumlahOpsi = (jumlah: number) => {
    const huruf = ["A", "B", "C", "D", "E"];
    const opsi: OpsiSoal[] = huruf.slice(0, jumlah).map((id, i) => ({ id, teks: soal.opsi[i]?.teks || "" }));
    const kunci = opsi.some((o) => o.id === soal.kunci) ? soal.kunci : "A";
    onUbah({ opsi, kunci });
  };

  const ubahPasangan = (idx: number, sisi: "kiri" | "kanan", nilai: string) =>
    onUbah({ pasangan: soal.pasangan.map((p, i) => (i === idx ? { ...p, [sisi]: nilai } : p)) });

  const ringkas = soal.pertanyaan.replace(/<[^>]+>/g, " ").trim();

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold flex items-center justify-center border border-blue-100">
          {nomor}
        </span>

        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left">
          <p className={`text-[13px] leading-snug ${ringkas ? "text-slate-800" : "text-slate-400 italic"} line-clamp-2`}>
            {ringkas || "Butir soal masih kosong — ketuk untuk menyunting"}
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Bobot {soal.bobot || BOBOT_DEFAULT[soal.tipe]}
            {soal.tipe === "PG" && soal.kunci ? ` • Kunci ${soal.kunci}` : ""}
            {soal.tipe === "Benar/Salah" && soal.kunci ? ` • Kunci ${soal.kunci}` : ""}
          </p>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={onNaik} disabled={pertamaDiJenis} aria-label="Naikkan" className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-25">
            <ArrowUp size={14} />
          </button>
          <button type="button" onClick={onTurun} disabled={terakhirDiJenis} aria-label="Turunkan" className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-25">
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={onToggle} aria-label={terbuka ? "Tutup" : "Sunting"} className="p-1.5 text-slate-400 hover:text-slate-700">
            {terbuka ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {terbuka && (
        <div className="mt-3 pl-0 sm:pl-8 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pertanyaan</label>
            <textarea
              rows={3}
              value={soal.pertanyaan}
              onChange={(e) => onUbah({ pertanyaan: e.target.value })}
              placeholder="Tulis pertanyaan. Kode <svg>...</svg> dari generator akan tampil sebagai gambar."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
            />
          </div>

          {soal.tipe === "PG" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pilihan Jawaban</label>
                <select
                  value={soal.opsi.length || jumlahOpsiPG}
                  onChange={(e) => setJumlahOpsi(Number(e.target.value))}
                  className="min-h-[34px] px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none"
                >
                  <option value={4}>4 opsi (A–D)</option>
                  <option value={5}>5 opsi (A–E)</option>
                </select>
              </div>
              {(soal.opsi.length ? soal.opsi : []).map((o, idx) => (
                <div key={o.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUbah({ kunci: o.id })}
                    aria-label={`Jadikan ${o.id} kunci jawaban`}
                    className={`shrink-0 w-8 h-8 rounded-lg text-[11px] font-bold border-2 transition-colors ${
                      soal.kunci === o.id ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-500 hover:border-emerald-400"
                    }`}
                  >
                    {o.id}
                  </button>
                  <input
                    type="text"
                    value={o.teks}
                    onChange={(e) => ubahOpsi(idx, e.target.value)}
                    placeholder={`Teks pilihan ${o.id}`}
                    className="flex-1 min-w-0 min-h-[40px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <p className="text-[11px] text-slate-400">Ketuk huruf untuk menandai kunci jawaban.</p>
            </div>
          )}

          {soal.tipe === "Benar/Salah" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kunci Jawaban</label>
              <div className="grid grid-cols-2 gap-2 max-w-xs">
                {["Benar", "Salah"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onUbah({ kunci: v })}
                    className={`min-h-[42px] rounded-xl text-[12px] font-bold border-2 transition-colors ${
                      soal.kunci === v ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {soal.tipe === "Jodohkan" && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pasangan Jawaban</label>
              {soal.pasangan.map((p, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={p.kiri}
                    onChange={(e) => ubahPasangan(idx, "kiri", e.target.value)}
                    placeholder={`Lajur kiri ${idx + 1}`}
                    className="flex-1 min-h-[40px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={p.kanan}
                    onChange={(e) => ubahPasangan(idx, "kanan", e.target.value)}
                    placeholder={`Pasangan benar ${idx + 1}`}
                    className="flex-1 min-h-[40px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => onUbah({ pasangan: soal.pasangan.filter((_, i) => i !== idx) })}
                    aria-label="Hapus pasangan"
                    className="shrink-0 min-h-[40px] px-3 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onUbah({ pasangan: [...soal.pasangan, { kiri: "", kanan: "" }] })}
                className="min-h-[38px] px-3 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-blue-400 flex items-center gap-1.5"
              >
                <Plus size={12} /> Tambah Pasangan
              </button>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pada naskah cetak, lajur kanan diacak otomatis. Urutan di sini adalah kunci jawabannya.
              </p>
            </div>
          )}

          {(soal.tipe === "Isian Singkat" || soal.tipe === "Uraian") && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {soal.tipe === "Isian Singkat" ? "Kunci Jawaban" : "Pedoman Penskoran"}
              </label>
              <textarea
                rows={soal.tipe === "Uraian" ? 3 : 1}
                value={soal.tipe === "Isian Singkat" ? soal.kunci : soal.panduanAI}
                onChange={(e) =>
                  soal.tipe === "Isian Singkat" ? onUbah({ kunci: e.target.value }) : onUbah({ panduanAI: e.target.value })
                }
                placeholder={soal.tipe === "Isian Singkat" ? "Jawaban benar" : "Uraikan aspek yang dinilai dan pembagian skornya"}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500 resize-y"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bobot</label>
              <input
                type="number"
                min={1}
                value={soal.bobot || BOBOT_DEFAULT[soal.tipe]}
                onChange={(e) => onUbah({ bobot: Math.max(1, Number(e.target.value) || 1) })}
                className="w-16 min-h-[38px] px-2 text-center bg-white border border-slate-300 rounded-lg text-[12px] font-bold outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1" />
            <button type="button" onClick={onGandakan} className="min-h-[38px] px-3 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-slate-400 flex items-center gap-1.5">
              <Copy size={12} /> Gandakan
            </button>
            <button type="button" onClick={onHapus} className="min-h-[38px] px-3 bg-white border border-rose-200 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5">
              <Trash2 size={12} /> Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
