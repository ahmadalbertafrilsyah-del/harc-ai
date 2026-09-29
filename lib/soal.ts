"use client";

/**
 * Model data butir soal, pemilahan per jenis, serta pembangun lembar soal dan
 * Lembar Jawaban Komputer (LJK) yang siap cetak.
 *
 * Dipakai bersama oleh tab E-Ujian (CBT), Koreksi, dan pratinjau LJK interaktif
 * di halaman Asesmen.
 */

import { type KopLembaga } from "@/lib/kop";
import { kopSuratHtml } from "@/components/KopSurat";

export type TipeSoal = "PG" | "Benar/Salah" | "Jodohkan" | "Isian Singkat" | "Uraian";

export type OpsiSoal = { id: string; teks: string };
export type PasanganSoal = { kiri: string; kanan: string };

export type Soal = {
  id: string;
  tipe: TipeSoal;
  pertanyaan: string;
  opsi: OpsiSoal[];
  pasangan: PasanganSoal[];
  kunci: string;
  /** Pedoman penskoran untuk soal yang tidak berkunci tunggal. */
  panduanAI: string;
  bobot: number;
};

/** Urutan baku penyajian jenis soal pada naskah ujian nasional. */
export const URUTAN_TIPE: TipeSoal[] = ["PG", "Benar/Salah", "Jodohkan", "Isian Singkat", "Uraian"];

export const LABEL_TIPE: Record<TipeSoal, string> = {
  PG: "Pilihan Ganda",
  "Benar/Salah": "Benar / Salah",
  Jodohkan: "Menjodohkan",
  "Isian Singkat": "Isian Singkat",
  Uraian: "Uraian",
};

/** Petunjuk pengerjaan baku per jenis soal, dicetak di bawah judul bagian. */
export const PETUNJUK_TIPE: Record<TipeSoal, string> = {
  PG: "Pilihlah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, D, atau E!",
  "Benar/Salah": "Tentukan pernyataan berikut Benar (B) atau Salah (S)!",
  Jodohkan: "Pasangkan pernyataan pada lajur kiri dengan jawaban yang tepat pada lajur kanan!",
  "Isian Singkat": "Isilah titik-titik berikut dengan jawaban yang singkat dan tepat!",
  Uraian: "Jawablah pertanyaan berikut dengan uraian yang jelas dan sistematis!",
};

/** Bobot skor default per jenis, dipakai saat soal baru dibuat. */
export const BOBOT_DEFAULT: Record<TipeSoal, number> = {
  PG: 1,
  "Benar/Salah": 1,
  Jodohkan: 2,
  "Isian Singkat": 2,
  Uraian: 5,
};

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export type KelompokSoal = {
  tipe: TipeSoal;
  label: string;
  romawi: string;
  petunjuk: string;
  soal: Soal[];
  /** Nomor urut soal pertama pada kelompok ini (penomoran berlanjut antar kelompok). */
  nomorAwal: number;
  totalBobot: number;
};

/**
 * Memilah butir soal menurut jenisnya dan menomori ulang secara berurutan.
 *
 * Inilah perbaikan utama dibanding penyusunan lama yang mencampur semua jenis
 * dalam satu daftar: naskah menjadi berbagian (I, II, III, ...) sesuai kaidah
 * penulisan naskah ujian, dan LJK dapat dibentuk per bagian.
 */
export function kelompokkanSoal(daftar: Soal[]): KelompokSoal[] {
  const kelompok: KelompokSoal[] = [];
  let nomor = 1;
  let indeksRomawi = 0;

  for (const tipe of URUTAN_TIPE) {
    const isi = daftar.filter((s) => s.tipe === tipe);
    if (isi.length === 0) continue;

    kelompok.push({
      tipe,
      label: LABEL_TIPE[tipe],
      romawi: ROMAWI[indeksRomawi] || String(indeksRomawi + 1),
      petunjuk: PETUNJUK_TIPE[tipe],
      soal: isi,
      nomorAwal: nomor,
      totalBobot: isi.reduce((t, s) => t + (s.bobot || BOBOT_DEFAULT[tipe]), 0),
    });

    nomor += isi.length;
    indeksRomawi++;
  }

  return kelompok;
}

/** Nomor urut global sebuah soal setelah pemilahan per jenis. */
export function nomorSoal(daftar: Soal[], soalId: string): number {
  let n = 1;
  for (const tipe of URUTAN_TIPE) {
    for (const s of daftar.filter((x) => x.tipe === tipe)) {
      if (s.id === soalId) return n;
      n++;
    }
  }
  return 0;
}

/** Daftar soal terurut sesuai penyajian naskah (bukan urutan input). */
export function urutkanSoal(daftar: Soal[]): Soal[] {
  return URUTAN_TIPE.flatMap((tipe) => daftar.filter((s) => s.tipe === tipe));
}

export function ringkasKomposisi(daftar: Soal[]): string {
  const bagian = URUTAN_TIPE.map((t) => {
    const n = daftar.filter((s) => s.tipe === t).length;
    return n > 0 ? `${n} ${LABEL_TIPE[t]}` : "";
  }).filter(Boolean);
  return bagian.length ? bagian.join(" • ") : "Belum ada butir soal";
}

export function totalBobot(daftar: Soal[]): number {
  return daftar.reduce((t, s) => t + (s.bobot || BOBOT_DEFAULT[s.tipe] || 1), 0);
}

export function soalBaru(tipe: TipeSoal, jumlahOpsi = 4): Soal {
  return {
    id: `soal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tipe,
    pertanyaan: "",
    opsi: tipe === "PG" ? ["A", "B", "C", "D", "E"].slice(0, jumlahOpsi).map((id) => ({ id, teks: "" })) : [],
    pasangan: tipe === "Jodohkan" ? [{ kiri: "", kanan: "" }, { kiri: "", kanan: "" }] : [],
    kunci: tipe === "PG" ? "A" : tipe === "Benar/Salah" ? "Benar" : "",
    panduanAI: "",
    bobot: BOBOT_DEFAULT[tipe],
  };
}

/* ======================================================================
   PARSER: MARKDOWN HASIL GENERATOR AI  ->  BUTIR SOAL TERSTRUKTUR
   ====================================================================== */

function petakanTipe(mentah: string): TipeSoal {
  const t = mentah.trim().toUpperCase();
  if (t === "BS") return "Benar/Salah";
  if (t === "JODOHKAN") return "Jodohkan";
  if (t === "ISIAN") return "Isian Singkat";
  if (t === "URAIAN") return "Uraian";
  return "PG";
}

const REGEX_OPSI = /^(?:[*\-]\s*)?(?:\*\*)?([A-E])[.)](?:\*\*)?\s+(.*)/i;

function barisBersih(teks: string): string[] {
  return teks.split(/\n|<br\s*\/?>/i).map((l) => l.trim()).filter(Boolean);
}

/**
 * Membaca dokumen bertag [SOAL_START]...[SOAL_END] yang dihasilkan Generator
 * Asesmen. Bila tag tidak ditemukan, jatuh ke pembacaan bernomor biasa.
 */
export function parseSoalDariMarkdown(konten: string): Soal[] {
  if (!konten) return [];
  const bertag = parseBertag(konten);
  if (bertag.length > 0) return bertag;
  return parseBernomor(konten);
}

function parseBertag(konten: string): Soal[] {
  const blok = konten.match(/\[SOAL_START\]([\s\S]*?)\[SOAL_END\]/g);
  if (!blok?.length) return [];

  return blok.map((b, index) => {
    const tipe = petakanTipe(b.match(/\[TIPE:(.*?)\]/i)?.[1] || "PG");

    let kunci = "";
    let panduanAI = "";
    const kunciMentah = b.match(/\[KUNCI:([\s\S]*?)\]/i)?.[1]?.trim() || "";
    if (kunciMentah) {
      if (tipe === "PG") kunci = kunciMentah.replace(/[^A-E]/gi, "").charAt(0).toUpperCase() || "A";
      else if (tipe === "Benar/Salah") kunci = kunciMentah.toLowerCase().includes("benar") ? "Benar" : "Salah";
      else if (tipe === "Isian Singkat") kunci = kunciMentah; // jawaban singkat eksak → dapat dinilai otomatis
      else panduanAI = kunciMentah; // Uraian → pedoman penskoran
    }

    const bersih = b
      .replace(/\[SOAL_START\]/gi, "")
      .replace(/\[SOAL_END\]/gi, "")
      .replace(/\[TIPE:.*?\]/gi, "")
      .replace(/\[KUNCI:[\s\S]*?\]/gi, "")
      .trim();

    const { pertanyaan, opsi, pasangan } = uraikanIsi(bersih, tipe);

    return {
      id: `soal_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      tipe, pertanyaan, opsi, pasangan,
      kunci: kunci || (tipe === "PG" ? "A" : ""),
      panduanAI,
      bobot: BOBOT_DEFAULT[tipe],
    };
  });
}

function uraikanIsi(bersih: string, tipe: TipeSoal) {
  const baris = barisBersih(bersih);
  const opsi: OpsiSoal[] = [];
  const pasangan: PasanganSoal[] = [];
  const barisPertanyaan: string[] = [];

  if (tipe === "PG") {
    baris.forEach((line) => {
      const m = line.match(REGEX_OPSI);
      if (m) opsi.push({ id: m[1].toUpperCase(), teks: m[2].trim() });
      else if (opsi.length === 0) barisPertanyaan.push(line);
      else opsi[opsi.length - 1].teks += " " + line;
    });
  } else if (tipe === "Jodohkan") {
    baris.forEach((line) => {
      const garisTabel = /\|[-\s:]+\|/.test(line);
      if (garisTabel) return;

      if (line.includes("|")) {
        const kolom = line.split("|").map((c) => c.trim()).filter(Boolean);
        const kepala = kolom[0]?.toLowerCase() || "";
        if (kolom.length >= 2 && !/pernyataan|kiri|lajur|^no$/.test(kepala)) {
          pasangan.push({
            kiri: kolom[0].replace(/^\d+\.\s*/, ""),
            kanan: kolom[1].replace(/^[A-Z]\.\s*/, ""),
          });
        }
      } else if (line.includes("=") || (line.includes(" - ") && !/^[*\-]\s/.test(line))) {
        const sp = line.split(/\s*=\s*|\s+-\s+/);
        if (sp.length >= 2) {
          pasangan.push({
            kiri: sp[0].trim().replace(/^\d+\.\s*/, ""),
            kanan: sp[1].trim().replace(/^[A-Z]\.\s*/, ""),
          });
        } else barisPertanyaan.push(line);
      } else {
        barisPertanyaan.push(line);
      }
    });
    if (pasangan.length === 0) pasangan.push({ kiri: "", kanan: "" });
  } else {
    barisPertanyaan.push(bersih.replace(/^\d+\.\s*/, "").trim());
  }

  return {
    pertanyaan: barisPertanyaan.join("\n").replace(/^\d+\.\s*/, "").trim(),
    opsi,
    pasangan,
  };
}

/** Cadangan: dokumen tanpa tag, hanya penomoran "1." "2." dan blok kunci jawaban. */
function parseBernomor(konten: string): Soal[] {
  const bagianKunci = konten.match(/(?:Kunci Jawaban|KUNCI JAWABAN|Pedoman Penskoran)[\s\S]*/i)?.[0] || "";
  const badan = bagianKunci ? konten.replace(bagianKunci, "") : konten;

  const regexBlok = /(?:\n|^)(?:\*\*)?(?:[A-Z]\.\s+)?(\d+)\.\s(?:\*\*)?/g;
  const cocok: { num: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  let indeksTerakhir = 0;

  while ((m = regexBlok.exec(badan)) !== null) {
    if (cocok.length > 0) cocok[cocok.length - 1].text = badan.substring(indeksTerakhir, m.index).trim();
    cocok.push({ num: m[1], text: "" });
    indeksTerakhir = regexBlok.lastIndex;
  }
  if (cocok.length > 0) cocok[cocok.length - 1].text = badan.substring(indeksTerakhir).trim();

  return cocok
    .filter((c) => c.text)
    .map((c, index) => {
      const baris = barisBersih(c.text);
      const opsi: OpsiSoal[] = [];
      const barisPertanyaan: string[] = [];

      baris.forEach((line) => {
        const cocokOpsi = line.match(REGEX_OPSI);
        if (cocokOpsi) opsi.push({ id: cocokOpsi[1].toUpperCase(), teks: cocokOpsi[2].trim() });
        else if (opsi.length === 0) barisPertanyaan.push(line);
        else opsi[opsi.length - 1].teks += " " + line;
      });

      const rendah = c.text.toLowerCase();
      let tipe: TipeSoal = "Uraian";
      let pasangan: PasanganSoal[] = [];

      if (opsi.length >= 2) tipe = "PG";
      else if (rendah.includes("benar") && rendah.includes("salah")) tipe = "Benar/Salah";
      else if (rendah.includes("jodohkan") || rendah.includes("pasangkan")) {
        tipe = "Jodohkan";
        pasangan = uraikanIsi(c.text, "Jodohkan").pasangan;
      } else if (rendah.includes("isian") || c.text.includes("....") || c.text.includes("___")) {
        tipe = "Isian Singkat";
      }

      let kunci = tipe === "PG" ? "A" : tipe === "Benar/Salah" ? "Benar" : "";
      let panduanAI = "";
      if (bagianKunci) {
        const regexKunci = new RegExp(`(?:\\n|^|<br\\s*/?>)(?:\\*\\*)?${c.num}\\.(?:\\*\\*)?\\s*(.*)`, "i");
        const mentah = bagianKunci.match(regexKunci)?.[1]?.trim();
        if (mentah) {
          if (tipe === "PG") kunci = mentah.match(/^[A-E]/i)?.[0].toUpperCase() || kunci;
          else if (tipe === "Benar/Salah") kunci = mentah.toLowerCase().includes("benar") ? "Benar" : "Salah";
          else if (tipe === "Isian Singkat") kunci = mentah;
          else panduanAI = mentah;
        }
      }

      return {
        id: `soal_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
        tipe,
        pertanyaan: barisPertanyaan.join("\n").trim(),
        opsi,
        pasangan,
        kunci,
        panduanAI,
        bobot: BOBOT_DEFAULT[tipe],
      };
    });
}

/* ======================================================================
   PEMBANGUN HTML CETAK
   ====================================================================== */

export type IdentitasUjian = {
  judul: string;
  mapel: string;
  kelas: string;
  waktuMenit: number;
  hari?: string;
  tanggal?: string;
  jenisUjian?: string;
};

const GAYA_CETAK = `
  *{box-sizing:border-box}
  body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;color:#000;margin:0;padding:0}
  @page{size:A4 portrait;margin:1.6cm}
  .lembar{max-width:18cm;margin:0 auto}
  .bagian{margin-top:16pt;page-break-inside:auto}
  .judul-bagian{font-weight:bold;text-transform:uppercase;margin-bottom:2pt}
  .petunjuk-bagian{font-style:italic;font-size:11pt;margin-bottom:10pt}
  .butir{margin-bottom:11pt;page-break-inside:avoid}
  .butir-baris{display:flex;gap:7pt;align-items:flex-start}
  .butir-nomor{font-weight:bold;min-width:20pt}
  .opsi{list-style:none;padding-left:27pt;margin:4pt 0 0}
  .opsi li{margin-bottom:2pt}
  .titik-isian{border-bottom:1px dotted #000;display:block;height:16pt;margin-top:6pt}
  table{width:100%;border-collapse:collapse;margin-top:6pt}
  th,td{border:1px solid #000;padding:5pt 7pt;text-align:left;vertical-align:top}
  th{background:#f2f2f2;text-align:center;font-weight:bold}
  svg,img{max-width:100%;height:auto;display:block;margin:6pt auto;page-break-inside:avoid}
  .kaki{margin-top:20pt;text-align:center;font-style:italic;font-size:11pt;border-top:1px solid #000;padding-top:6pt}
  .identitas{border:1px solid #000;padding:8pt;margin-bottom:12pt;font-size:11pt}
  .identitas-baris{display:flex;gap:16pt;flex-wrap:wrap}
  .identitas-baris > div{flex:1;min-width:160pt}
`;

/**
 * Pengacak lajur kanan soal menjodohkan.
 *
 * Wajib deterministik: naskah soal dan kunci jawaban dicetak lewat dua
 * pemanggilan berbeda, sehingga keduanya harus menghasilkan urutan huruf yang
 * sama persis. Benih diambil dari id butir soal.
 */
function benihDariTeks(teks: string): number {
  let h = 2166136261;
  for (let i = 0; i < teks.length; i++) {
    h ^= teks.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mengembalikan lajur kanan yang sudah diacak beserta pemetaan
 * `indeks pasangan asli -> huruf pada naskah`.
 */
export function acakLajurKanan(soal: Soal): { kananAcak: string[]; hurufJawaban: string[] } {
  const n = soal.pasangan.length;
  const urutan = soal.pasangan.map((_p, i) => i);

  // Fisher–Yates dengan PRNG berbenih (mulberry32).
  let benih = benihDariTeks(soal.id || "jodohkan");
  const acak = () => {
    benih |= 0;
    benih = (benih + 0x6d2b79f5) | 0;
    let t = Math.imul(benih ^ (benih >>> 15), 1 | benih);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(acak() * (i + 1));
    [urutan[i], urutan[j]] = [urutan[j], urutan[i]];
  }

  // urutan[posisi] = indeks pasangan asli yang tampil di posisi tersebut.
  const kananAcak = urutan.map((asli) => soal.pasangan[asli].kanan);
  const hurufJawaban: string[] = new Array(n).fill("");
  urutan.forEach((asli, posisi) => {
    hurufJawaban[asli] = String.fromCharCode(65 + posisi);
  });

  return { kananAcak, hurufJawaban };
}

function escHtml(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Teks pertanyaan boleh memuat SVG buatan AI, karena itu tag gambar dibiarkan
 * sementara tag lain di-escape.
 */
function isiSoalHtml(teks: string): string {
  const svg: string[] = [];
  const disimpan = String(teks ?? "").replace(/<svg[\s\S]*?<\/svg>/gi, (m) => {
    svg.push(m);
    return `\u0000SVG${svg.length - 1}\u0000`;
  });
  return escHtml(disimpan)
    .replace(/\n/g, "<br/>")
    .replace(/\u0000SVG(\d+)\u0000/g, (_m, i) => svg[Number(i)] || "");
}

/** Naskah soal lengkap, sudah terpilah per jenis dengan nomor berkelanjutan. */
export function htmlLembarSoal(
  daftar: Soal[],
  identitas: IdentitasUjian,
  kop: KopLembaga,
  opsi: { sertakanKunci?: boolean } = {}
): string {
  const kelompok = kelompokkanSoal(daftar);

  const bagian = kelompok
    .map((k) => {
      const butir = k.soal
        .map((s, i) => {
          const nomor = k.nomorAwal + i;
          let ekstra = "";

          if (s.tipe === "PG" && s.opsi.length) {
            ekstra = `<ul class="opsi">${s.opsi.map((o) => `<li>${escHtml(o.id)}. ${isiSoalHtml(o.teks)}</li>`).join("")}</ul>`;
          } else if (s.tipe === "Benar/Salah") {
            ekstra = `<ul class="opsi"><li>B. Benar</li><li>S. Salah</li></ul>`;
          } else if (s.tipe === "Jodohkan" && s.pasangan.length) {
            // Lajur kanan diacak (deterministik) agar benar-benar menjadi soal menjodohkan.
            const { kananAcak } = acakLajurKanan(s);
            ekstra = `<table><tr><th style="width:8%">No</th><th style="width:46%">Lajur Kiri</th><th style="width:8%">Huruf</th><th>Lajur Kanan</th></tr>${s.pasangan
              .map(
                (p, idx) =>
                  `<tr><td style="text-align:center">${idx + 1}</td><td>${isiSoalHtml(p.kiri)}</td><td style="text-align:center">${String.fromCharCode(65 + idx)}</td><td>${isiSoalHtml(kananAcak[idx] || "")}</td></tr>`
              )
              .join("")}</table>`;
          } else if (s.tipe === "Isian Singkat") {
            ekstra = `<span class="titik-isian"></span>`;
          } else if (s.tipe === "Uraian") {
            ekstra = `<span class="titik-isian"></span><span class="titik-isian"></span><span class="titik-isian"></span>`;
          }

          let kunci = "";
          if (opsi.sertakanKunci) {
            const teksKunci =
              s.tipe === "Jodohkan" && s.pasangan.length
                ? acakLajurKanan(s).hurufJawaban.map((h, idx) => `${idx + 1}-${h}`).join(", ")
                : escHtml(s.kunci || s.panduanAI || "-");
            kunci = `<div style="font-size:10pt;font-style:italic;margin-top:3pt">Kunci: ${teksKunci}</div>`;
          }

          return `<div class="butir"><div class="butir-baris"><span class="butir-nomor">${nomor}.</span><div style="flex:1">${isiSoalHtml(s.pertanyaan)}</div></div>${ekstra}${kunci}</div>`;
        })
        .join("");

      return `<div class="bagian"><div class="judul-bagian">${k.romawi}. ${escHtml(k.label.toUpperCase())} (Nomor ${k.nomorAwal}–${k.nomorAwal + k.soal.length - 1} | Bobot ${k.totalBobot})</div><div class="petunjuk-bagian">${escHtml(k.petunjuk)}</div>${butir}</div>`;
    })
    .join("");

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escHtml(identitas.judul)}</title><style>${GAYA_CETAK}</style></head><body><div class="lembar">
    ${kopSuratHtml(kop, `NASKAH SOAL ${escHtml((identitas.jenisUjian || "UJIAN").toUpperCase())}`, escHtml(identitas.judul))}
    <div class="identitas">
      <div class="identitas-baris">
        <div><b>Mata Pelajaran</b> : ${escHtml(identitas.mapel || "-")}</div>
        <div><b>Kelas</b> : ${escHtml(identitas.kelas || "-")}</div>
      </div>
      <div class="identitas-baris" style="margin-top:4pt">
        <div><b>Hari / Tanggal</b> : ${escHtml(identitas.hari || "...................")} / ${escHtml(identitas.tanggal || "...................")}</div>
        <div><b>Alokasi Waktu</b> : ${identitas.waktuMenit || 60} Menit</div>
      </div>
    </div>
    ${bagian || '<p style="text-align:center;font-style:italic">Belum ada butir soal.</p>'}
    <div class="kaki">— Selamat Mengerjakan —</div>
  </div></body></html>`;
}

/* ----------------------------- MODEL LJK ----------------------------- */

export type ModelLJK = "bulatan" | "silang" | "kompak" | "campuran" | "uraian";

export const DAFTAR_MODEL_LJK: { id: ModelLJK; nama: string; keterangan: string }[] = [
  { id: "bulatan", nama: "Model A — Bulatan", keterangan: "Bulatan hitam klasik, empat kolom. Paling mudah dipindai kamera." },
  { id: "silang", nama: "Model B — Kotak Silang", keterangan: "Kotak bertanda silang (X). Cocok bila sekolah memakai pulpen, bukan pensil 2B." },
  { id: "kompak", nama: "Model C — Kompak", keterangan: "Enam kolom rapat untuk ujian berjumlah soal banyak (di atas 40 butir)." },
  { id: "campuran", nama: "Model D — Objektif + Uraian", keterangan: "Kisi jawaban objektif digabung kolom bergaris untuk uraian dalam satu lembar." },
  { id: "uraian", nama: "Model E — Lembar Uraian", keterangan: "Lembar bergaris polos untuk ujian yang seluruhnya berbentuk uraian." },
];

const GAYA_LJK = `
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#000;margin:0;padding:0}
  @page{size:A4 portrait;margin:1.2cm}
  .lembar{max-width:18cm;margin:0 auto}
  .petunjuk{font-size:9.5pt;border:1px solid #000;padding:8px;margin-bottom:10px;background:#fafafa;line-height:1.5}
  .info{display:flex;gap:10px;margin-bottom:12px}
  .kotak-info{flex:1;border:1px solid #000;padding:8px}
  .baris-info{display:flex;align-items:flex-end;margin-bottom:7px}
  .label-info{width:95px;font-weight:bold;font-size:10pt}
  .garis-info{flex:1;border-bottom:1px dotted #000;height:15px}
  .judul-bagian{font-weight:bold;font-size:11pt;text-align:center;text-transform:uppercase;border:1px solid #000;background:#eee;padding:5px;margin:14px 0 10px}
  .kisi{border:1px solid #000;padding:12px}
  .butir-jwb{break-inside:avoid;display:flex;align-items:center;margin-bottom:7px}
  .nomor-jwb{width:26px;text-align:right;margin-right:7px;font-weight:bold;font-size:10pt}
  .bulat{border:1.4px solid #000;border-radius:50%;width:15px;height:15px;display:inline-flex;align-items:center;justify-content:center;font-size:7.5pt;margin-right:5px}
  .kotak{border:1.4px solid #000;width:15px;height:15px;display:inline-flex;align-items:center;justify-content:center;font-size:7.5pt;margin-right:5px}
  .baris-uraian{border-bottom:1px solid #999;height:22px;width:100%}
  .blok-uraian{margin-bottom:18px;break-inside:avoid}
  .kaki{margin-top:14px;font-size:9pt;text-align:center;font-style:italic}
  .qr{position:absolute;top:0;right:0;width:62px;height:62px}
`;

function kisiJawaban(daftar: Soal[], bentuk: "bulat" | "kotak", kolom: number): string {
  const kelompok = kelompokkanSoal(daftar);
  const objektif = kelompok.filter((k) => k.tipe === "PG" || k.tipe === "Benar/Salah");
  if (objektif.length === 0) return "";

  const isi = objektif
    .map((k) => {
      const butir = k.soal
        .map((s, i) => {
          const nomor = k.nomorAwal + i;
          const huruf = k.tipe === "PG" ? (s.opsi.length ? s.opsi.map((o) => o.id) : ["A", "B", "C", "D"]) : ["B", "S"];
          const sel = huruf.map((h) => `<span class="${bentuk}">${h}</span>`).join("");
          return `<div class="butir-jwb"><span class="nomor-jwb">${nomor}.</span>${sel}</div>`;
        })
        .join("");
      return `<div style="break-inside:avoid"><div style="font-weight:bold;font-size:9.5pt;margin:4px 0 6px;text-transform:uppercase">${k.romawi}. ${escHtml(k.label)}</div>${butir}</div>`;
    })
    .join("");

  return `<div class="kisi" style="column-count:${kolom};column-gap:18px">${isi}</div>`;
}

function blokUraian(daftar: Soal[], barisPerSoal = 4): string {
  const kelompok = kelompokkanSoal(daftar).filter((k) => k.tipe !== "PG" && k.tipe !== "Benar/Salah");
  if (kelompok.length === 0) return "";

  return kelompok
    .map((k) => {
      const butir = k.soal
        .map((s, i) => {
          const nomor = k.nomorAwal + i;
          if (k.tipe === "Jodohkan") {
            const baris = (s.pasangan.length ? s.pasangan : [{ kiri: "", kanan: "" }])
              .map(
                (_p, idx) =>
                  `<div style="display:flex;align-items:flex-end;margin-top:9px"><span style="width:26px;font-weight:bold">${idx + 1}.</span><div style="border-bottom:1px dotted #000;flex:1"></div></div>`
              )
              .join("");
            return `<div class="blok-uraian"><b>${nomor}. Menjodohkan</b>${baris}</div>`;
          }
          const jumlahBaris = k.tipe === "Isian Singkat" ? 1 : barisPerSoal;
          const baris = Array.from({ length: jumlahBaris })
            .map(() => `<div class="baris-uraian"></div>`)
            .join("");
          return `<div class="blok-uraian"><b>${nomor}. (${escHtml(k.label)})</b><div style="margin-top:8px">${baris}</div></div>`;
        })
        .join("");
      return `<div style="border:1px solid #000;padding:12px;margin-bottom:12px"><div style="font-weight:bold;font-size:9.5pt;margin-bottom:8px;text-transform:uppercase">${k.romawi}. ${escHtml(k.label)}</div>${butir}</div>`;
    })
    .join("");
}

/** Lembar jawaban siap cetak sesuai model yang dipilih guru. */
export function htmlLJK(
  model: ModelLJK,
  daftar: Soal[],
  identitas: IdentitasUjian,
  kop: KopLembaga,
  opsi: { qrData?: string; barisUraian?: number } = {}
): string {
  const qr = opsi.qrData
    ? `<img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(opsi.qrData)}" alt="" />`
    : "";

  const petunjuk =
    model === "silang"
      ? "1. Gunakan pulpen tinta hitam atau biru tua.<br/>2. Berilah tanda silang (X) penuh pada kotak jawaban yang dianggap benar.<br/>3. Bila ingin memperbaiki, coret jawaban lama dengan dua garis lalu silang jawaban baru.<br/>4. Jagalah lembar agar tidak kotor, basah, atau robek."
      : model === "uraian"
      ? "1. Tulislah jawaban dengan tulisan yang jelas dan terbaca.<br/>2. Kerjakan berurutan sesuai nomor soal.<br/>3. Gunakan tinta hitam atau biru tua.<br/>4. Coretan yang tidak perlu dapat mengurangi nilai kerapian."
      : "1. Gunakan pensil 2B atau pulpen tinta hitam pekat.<br/>2. Hitamkan bulatan secara penuh pada jawaban yang dianggap benar.<br/>3. Hapus sampai bersih bila ingin mengganti jawaban.<br/>4. Jagalah lembar agar tidak kotor atau robek karena akan dipindai kamera.";

  let isi = "";
  if (model === "bulatan") {
    isi = `<div class="judul-bagian">Bagian A — Jawaban Objektif</div>${kisiJawaban(daftar, "bulat", 4)}`;
  } else if (model === "silang") {
    isi = `<div class="judul-bagian">Bagian A — Jawaban Objektif</div>${kisiJawaban(daftar, "kotak", 4)}`;
  } else if (model === "kompak") {
    isi = `<div class="judul-bagian">Jawaban Objektif</div>${kisiJawaban(daftar, "bulat", 6)}`;
  } else if (model === "campuran") {
    isi = `<div class="judul-bagian">Bagian A — Jawaban Objektif</div>${kisiJawaban(daftar, "bulat", 4)}
           <div class="judul-bagian">Bagian B — Jawaban Uraian</div>${blokUraian(daftar, opsi.barisUraian ?? 4)}`;
  } else {
    isi = `<div class="judul-bagian">Lembar Jawaban Uraian</div>${blokUraian(daftar, opsi.barisUraian ?? 6)}`;
  }

  if (!isi.replace(/<[^>]+>/g, "").trim()) {
    isi = '<p style="text-align:center;font-style:italic;padding:24px">Tidak ada butir soal yang sesuai untuk model LJK ini.</p>';
  }

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>LJK - ${escHtml(identitas.judul)}</title><style>${GAYA_LJK}</style></head><body><div class="lembar">
    <div style="position:relative">${qr}${kopSuratHtml(kop, "LEMBAR JAWABAN", escHtml(identitas.judul))}</div>
    <div class="petunjuk"><b>PETUNJUK PENGISIAN:</b><br/>${petunjuk}</div>
    <div class="info">
      <div class="kotak-info" style="flex:1.5">
        <div class="baris-info"><div class="label-info">Nama Peserta</div><div class="garis-info"></div></div>
        <div class="baris-info"><div class="label-info">Nomor Induk</div><div class="garis-info"></div></div>
        <div class="baris-info"><div class="label-info">Tanda Tangan</div><div class="garis-info" style="height:26px"></div></div>
      </div>
      <div class="kotak-info">
        <div style="margin-bottom:6px"><b>Mata Pelajaran:</b> ${escHtml(identitas.mapel || "-")}</div>
        <div style="margin-bottom:6px"><b>Kelas:</b> ${escHtml(identitas.kelas || "-")}</div>
        <div style="margin-bottom:6px"><b>Durasi:</b> ${identitas.waktuMenit || 60} Menit</div>
        <div><b>Tanggal:</b> ${escHtml(identitas.tanggal || ".............................")}</div>
      </div>
    </div>
    ${isi}
    <div class="kaki">Lembar ini adalah dokumen resmi ${escHtml(kop.namaLembaga || "satuan pendidikan")}. Jangan dicoret di luar kolom jawaban.</div>
  </div></body></html>`;
}

/** Kunci jawaban terpisah untuk pegangan pemeriksa. */
export function htmlKunciJawaban(daftar: Soal[], identitas: IdentitasUjian, kop: KopLembaga): string {
  const kelompok = kelompokkanSoal(daftar);
  const bagian = kelompok
    .map((k) => {
      const baris = k.soal
        .map((s, i) => {
          const nomor = k.nomorAwal + i;
          let jawaban: string;
          if (k.tipe === "Jodohkan" && s.pasangan.length) {
            // Huruf di bawah ini sama persis dengan yang tercetak pada naskah soal.
            const { hurufJawaban } = acakLajurKanan(s);
            jawaban = s.pasangan
              .map((p, idx) => `${idx + 1}. ${escHtml(p.kiri)} → <b>${hurufJawaban[idx]}</b> (${escHtml(p.kanan)})`)
              .join("<br/>");
          } else {
            jawaban = escHtml(s.kunci || s.panduanAI || "-");
          }
          return `<tr><td style="text-align:center;width:10%">${nomor}</td><td>${jawaban}</td><td style="text-align:center;width:12%">${s.bobot || BOBOT_DEFAULT[k.tipe]}</td></tr>`;
        })
        .join("");
      return `<div class="bagian"><div class="judul-bagian">${k.romawi}. ${escHtml(k.label.toUpperCase())}</div><table><tr><th>No</th><th>Kunci / Pedoman Penskoran</th><th>Skor</th></tr>${baris}</table></div>`;
    })
    .join("");

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Kunci - ${escHtml(identitas.judul)}</title><style>${GAYA_CETAK}</style></head><body><div class="lembar">
    ${kopSuratHtml(kop, "KUNCI JAWABAN & PEDOMAN PENSKORAN", escHtml(identitas.judul))}
    <div class="identitas"><div class="identitas-baris">
      <div><b>Mata Pelajaran</b> : ${escHtml(identitas.mapel || "-")}</div>
      <div><b>Kelas</b> : ${escHtml(identitas.kelas || "-")}</div>
      <div><b>Total Skor</b> : ${totalBobot(daftar)}</div>
    </div></div>
    ${bagian || '<p style="text-align:center;font-style:italic">Belum ada butir soal.</p>'}
  </div></body></html>`;
}

/** Membuka jendela cetak berisi HTML yang sudah dibangun. */
export function cetakHtml(html: string): boolean {
  const jendela = window.open("", "_blank");
  if (!jendela) return false;
  jendela.document.write(html);
  jendela.document.close();
  jendela.focus();
  setTimeout(() => jendela.print(), 700);
  return true;
}
