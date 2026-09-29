"use client";

/**
 * Lembar Jawaban interaktif untuk pengerjaan daring.
 *
 * Dipakai guru untuk menguji coba naskah sebelum diterbitkan, dan menjadi dasar
 * tampilan yang sama ketika siswa mengerjakan di HP. Tata letaknya mengikuti
 * LJK cetak (terpilah per jenis soal, penomoran berlanjut) agar peserta didik
 * tidak bingung saat berpindah antara ujian daring dan luring.
 */

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, ListChecks, RotateCcw } from "lucide-react";

import {
  kelompokkanSoal, urutkanSoal, acakLajurKanan, BOBOT_DEFAULT,
  type Soal, type KelompokSoal,
} from "@/lib/soal";

export type JawabanPeserta = Record<string, string>;

type Props = {
  soal: Soal[];
  jawaban?: JawabanPeserta;
  onUbah?: (jawaban: JawabanPeserta) => void;
  /** Menampilkan kunci dan penilaian otomatis — untuk pratinjau guru. */
  modeTinjau?: boolean;
  /** Hanya baca, mis. saat memeriksa hasil pekerjaan siswa. */
  terkunci?: boolean;
};

export default function LjkInteraktif({ soal, jawaban, onUbah, modeTinjau = false, terkunci = false }: Props) {
  const [internal, setInternal] = useState<JawabanPeserta>({});
  const terkendali = jawaban !== undefined;
  const isi = terkendali ? jawaban! : internal;

  const kelompok = useMemo(() => kelompokkanSoal(soal), [soal]);
  const terurut = useMemo(() => urutkanSoal(soal), [soal]);

  const setJawaban = (soalId: string, nilai: string) => {
    if (terkunci) return;
    const baru = { ...isi, [soalId]: nilai };
    if (!terkendali) setInternal(baru);
    onUbah?.(baru);
  };

  const terjawab = terurut.filter((s) => (isi[s.id] ?? "").toString().trim() !== "").length;
  const persen = terurut.length ? Math.round((terjawab / terurut.length) * 100) : 0;

  const penilaian = useMemo(() => {
    if (!modeTinjau) return null;
    let benar = 0;
    let skor = 0;
    let skorMaks = 0;
    let objektif = 0;
    terurut.forEach((s) => {
      const bobot = s.bobot || BOBOT_DEFAULT[s.tipe] || 1;
      skorMaks += bobot;

      if (s.tipe === "PG" || s.tipe === "Benar/Salah") {
        objektif++;
        if ((isi[s.id] || "").trim().toLowerCase() === (s.kunci || "").trim().toLowerCase()) {
          benar++;
          skor += bobot;
        }
        return;
      }

      if (s.tipe === "Jodohkan" && s.pasangan.length) {
        objektif++;
        const { hurufJawaban } = acakLajurKanan(s);
        const bagian = (isi[s.id] || "").split("|");
        const cocok = hurufJawaban.filter(
          (h, i) => (bagian[i] || "").trim().toUpperCase() === h
        ).length;
        skor += (bobot * cocok) / s.pasangan.length;
        if (cocok === s.pasangan.length) benar++;
      }
    });
    return { benar, objektif, skor: Math.round(skor * 10) / 10, skorMaks };
  }, [modeTinjau, terurut, isi]);

  if (soal.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-12 px-6 text-center">
        <ListChecks size={30} className="mx-auto text-slate-300 mb-2" />
        <p className="text-xs font-bold text-slate-600">Belum ada butir soal</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Tambahkan soal terlebih dahulu untuk melihat lembar jawaban.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bilah kemajuan — menempel di atas agar terlihat saat menggulir di HP */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[11px] font-bold text-slate-600">
            Terjawab {terjawab} / {terurut.length}
          </p>
          <div className="flex items-center gap-2">
            {penilaian && (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                Objektif benar {penilaian.benar}/{penilaian.objektif} • Skor {penilaian.skor}/{penilaian.skorMaks}
              </span>
            )}
            {!terkunci && terjawab > 0 && (
              <button
                type="button"
                onClick={() => { if (!terkendali) setInternal({}); onUbah?.({}); }}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${persen}%` }} />
        </div>
      </div>

      {kelompok.map((k) => (
        <BagianLjk
          key={k.tipe}
          kelompok={k}
          jawaban={isi}
          onJawab={setJawaban}
          modeTinjau={modeTinjau}
          terkunci={terkunci}
        />
      ))}
    </div>
  );
}

function BagianLjk({
  kelompok, jawaban, onJawab, modeTinjau, terkunci,
}: {
  kelompok: KelompokSoal;
  jawaban: JawabanPeserta;
  onJawab: (id: string, nilai: string) => void;
  modeTinjau: boolean;
  terkunci: boolean;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">
          {kelompok.romawi}. {kelompok.label}
          <span className="ml-1.5 font-semibold text-slate-400 normal-case tracking-normal">
            (No. {kelompok.nomorAwal}–{kelompok.nomorAwal + kelompok.soal.length - 1})
          </span>
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{kelompok.petunjuk}</p>
      </div>

      <div className="divide-y divide-slate-100">
        {kelompok.soal.map((s, i) => (
          <ButirLjk
            key={s.id}
            soal={s}
            nomor={kelompok.nomorAwal + i}
            nilai={jawaban[s.id] || ""}
            onJawab={(v) => onJawab(s.id, v)}
            modeTinjau={modeTinjau}
            terkunci={terkunci}
          />
        ))}
      </div>
    </section>
  );
}

function ButirLjk({
  soal, nomor, nilai, onJawab, modeTinjau, terkunci,
}: {
  soal: Soal; nomor: number; nilai: string;
  onJawab: (v: string) => void; modeTinjau: boolean; terkunci: boolean;
}) {
  const objektif = soal.tipe === "PG" || soal.tipe === "Benar/Salah";
  const benar = modeTinjau && objektif && nilai.trim().toLowerCase() === (soal.kunci || "").trim().toLowerCase();

  const pilihan =
    soal.tipe === "PG"
      ? (soal.opsi.length ? soal.opsi : ["A", "B", "C", "D"].map((id) => ({ id, teks: "" })))
      : soal.tipe === "Benar/Salah"
      ? [{ id: "Benar", teks: "Benar" }, { id: "Salah", teks: "Salah" }]
      : [];

  return (
    <div className="p-3.5 sm:p-4">
      <div className="flex gap-2.5">
        <span
          className={`shrink-0 w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center ${
            nilai ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {nomor}
        </span>
        <div className="min-w-0 flex-1">
          {soal.pertanyaan && (
            <div
              className="text-[13px] text-slate-800 leading-relaxed [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:my-2"
              dangerouslySetInnerHTML={{ __html: soalKeHtml(soal.pertanyaan) }}
            />
          )}

          {/* Pilihan objektif */}
          {pilihan.length > 0 && (
            <div className={`mt-2.5 grid gap-2 ${soal.tipe === "Benar/Salah" ? "grid-cols-2 max-w-xs" : "grid-cols-1"}`}>
              {pilihan.map((o) => {
                const terpilih = nilai === o.id;
                const kunciBenar = modeTinjau && (soal.kunci || "").trim().toLowerCase() === o.id.trim().toLowerCase();
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={terkunci}
                    onClick={() => onJawab(terpilih ? "" : o.id)}
                    className={`min-h-[42px] flex items-center gap-2.5 px-3 rounded-xl border text-left transition-colors ${
                      kunciBenar
                        ? "border-emerald-400 bg-emerald-50"
                        : terpilih
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    } ${terkunci ? "cursor-default" : "active:scale-[0.99]"}`}
                  >
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full border-2 text-[11px] font-bold flex items-center justify-center ${
                        terpilih ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-500"
                      }`}
                    >
                      {o.id.charAt(0)}
                    </span>
                    <span className="text-[12.5px] text-slate-700 leading-snug">{o.teks || o.id}</span>
                    {kunciBenar && <CheckCircle2 size={14} className="ml-auto text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Menjodohkan */}
          {soal.tipe === "Jodohkan" && soal.pasangan.length > 0 && (() => {
            const { kananAcak, hurufJawaban } = acakLajurKanan(soal);
            const hurufOpsi = kananAcak.map((_k, i) => String.fromCharCode(65 + i));
            const bagian = nilai ? nilai.split("|") : [];
            const setHuruf = (idx: number, huruf: string) => {
              const arr = nilai ? nilai.split("|") : [];
              while (arr.length < soal.pasangan.length) arr.push("");
              arr[idx] = huruf;
              onJawab(arr.join("|"));
            };
            return (
              <div className="mt-3 space-y-3">
                {/* Lajur kanan — pilihan jawaban yang harus dipasangkan */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Pilihan Jawaban (Lajur Kanan)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {kananAcak.map((teks, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-white border border-slate-300 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                          {hurufOpsi[i]}
                        </span>
                        <span className="text-[12px] text-slate-700 leading-snug">{teks || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lajur kiri — pernyataan yang dipasangkan lewat pemilih huruf */}
                <div className="space-y-2">
                  {soal.pasangan.map((p, idx) => {
                    const jawab = (bagian[idx] || "").trim().toUpperCase();
                    const kunci = hurufJawaban[idx];
                    const benarItem = jawab === kunci;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 rounded-xl border p-2 pr-2.5 transition-colors ${
                          modeTinjau && jawab
                            ? benarItem
                              ? "border-emerald-300 bg-emerald-50/60"
                              : "border-rose-300 bg-rose-50/60"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <span className="shrink-0 w-5 h-5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="flex-1 min-w-0 text-[12.5px] text-slate-700 leading-snug">{p.kiri || "—"}</span>
                        <select
                          disabled={terkunci}
                          value={jawab}
                          onChange={(e) => setHuruf(idx, e.target.value)}
                          aria-label={`Pasangan untuk nomor ${idx + 1}`}
                          className={`shrink-0 w-16 min-h-[38px] px-2 text-center bg-white border rounded-lg text-[12px] font-bold outline-none focus:border-blue-500 ${
                            jawab ? "border-blue-400 text-slate-800" : "border-slate-300 text-slate-400"
                          } ${terkunci ? "cursor-default appearance-none" : ""}`}
                        >
                          <option value="">—</option>
                          {hurufOpsi.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        {modeTinjau && jawab && (
                          benarItem
                            ? <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                            : <CircleDashed size={15} className="shrink-0 text-rose-500" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {modeTinjau && (
                  <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 leading-relaxed">
                    <b>Kunci jawaban:</b> {hurufJawaban.map((h, i) => `${i + 1}→${h}`).join("  •  ")}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Isian & uraian */}
          {(soal.tipe === "Isian Singkat" || soal.tipe === "Uraian") && (
            <div className="mt-2.5">
              {soal.tipe === "Isian Singkat" ? (
                <input
                  type="text"
                  disabled={terkunci}
                  value={nilai}
                  onChange={(e) => onJawab(e.target.value)}
                  placeholder="Tulis jawaban singkat"
                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <textarea
                  rows={4}
                  disabled={terkunci}
                  value={nilai}
                  onChange={(e) => onJawab(e.target.value)}
                  placeholder="Tulis uraian jawaban"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
                />
              )}
              {modeTinjau && (soal.panduanAI || soal.kunci) && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mt-2 leading-relaxed">
                  <b>Pedoman:</b> {soal.panduanAI || soal.kunci}
                </p>
              )}
            </div>
          )}

          {modeTinjau && objektif && nilai !== "" && (
            <p className={`text-[11px] font-bold mt-2 flex items-center gap-1 ${benar ? "text-emerald-600" : "text-rose-600"}`}>
              {benar ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}
              {benar ? "Jawaban benar" : `Jawaban salah — kunci: ${soal.kunci}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Menyiapkan teks soal untuk ditampilkan: SVG dari AI dipertahankan, tag lain
 * dinetralkan agar markup tak terduga tidak ikut dirender.
 */
function soalKeHtml(teks: string): string {
  const svg: string[] = [];
  const disimpan = teks.replace(/<svg[\s\S]*?<\/svg>/gi, (m) => {
    svg.push(m.replace(/\son[a-z]+\s*=\s*(["'])[^"']*\1/gi, ""));
    return `\u0000SVG${svg.length - 1}\u0000`;
  });
  return disimpan
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>")
    .replace(/\u0000SVG(\d+)\u0000/g, (_m, i) => svg[Number(i)] || "");
}
