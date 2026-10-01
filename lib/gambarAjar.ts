"use client";

/**
 * Dukungan gambar pada perangkat ajar, LKPD, dan butir soal.
 *
 * Dua jalur yang saling melengkapi:
 *
 * 1. DIAGRAM SVG — dibuat langsung oleh model teks sebagai kode <svg> inline.
 *    Dipakai untuk apa pun yang menuntut presisi: bangun datar/ruang, garis
 *    bilangan, bidang kartesius, diagram batang, jaring-jaring, sudut. SVG
 *    tajam saat dicetak, ringan, ikut tersimpan di dokumen, dan tidak
 *    memerlukan penyimpanan berkas.
 *
 * 2. ILUSTRASI RASTER — model gambar Gemini, untuk konteks bergambar yang tidak
 *    presisi (situasi cerita, benda konkret). Ditulis model sebagai penanda
 *    [GAMBAR: deskripsi], lalu diganti gambar asli oleh `lengkapiGambarRaster`.
 *
 * Model gambar kerap salah menulis angka dan label, karena itu seluruh teks
 * matematis wajib lewat jalur SVG.
 */

import { getAuth } from "firebase/auth";

import { unggahDataUrlKeCloudinary } from "@/lib/cloudinary";

export const PENANDA_GAMBAR = /\[GAMBAR:\s*([\s\S]*?)\]/g;

/** Mapel yang secara default perlu diagram presisi. */
export function perluDiagram(mapel: string): boolean {
  const m = (mapel || "").toLowerCase();
  return [
    "matematika", "mtk", "math", "fisika", "kimia", "biologi", "ipa",
    "geometri", "statistika", "ekonomi", "geografi",
  ].some((kata) => m.includes(kata));
}

/**
 * Instruksi diagram SVG untuk system prompt.
 * Ditulis sangat eksplisit karena model cenderung memakai Markdown image
 * atau LaTeX bila tidak dilarang.
 */
export function instruksiDiagramSVG(mapel: string): string {
  return [
    `ATURAN GAMBAR & DIAGRAM (WAJIB DIPATUHI):`,
    `1. Setiap kali materi ${mapel || "ini"} memerlukan gambar yang presisi — bangun datar, bangun ruang, jaring-jaring, garis bilangan, bidang koordinat kartesius, diagram batang/garis/lingkaran, sudut, segitiga siku-siku, pecahan, atau grafik fungsi — Anda WAJIB menggambarnya sebagai kode SVG inline.`,
    `2. Tulis SVG langsung di dalam dokumen, bukan di dalam blok kode, dan JANGAN memakai sintaks gambar Markdown ![]() untuk diagram.`,
    `3. Format SVG wajib: <svg viewBox="0 0 400 260" width="100%" style="max-width:380px;height:auto;display:block;margin:12px auto"> ... </svg>`,
    `4. Semua garis WAJIB stroke="#000" dengan stroke-width minimal 1.5. Semua isian WAJIB fill="none" atau warna sangat muda (#e2e8f0). Dokumen ini dicetak hitam-putih.`,
    `5. Tulis label, angka, ukuran, dan nama titik memakai elemen <text> dengan font-size="13" fill="#000". Jangan pernah menaruh teks di luar elemen <text>.`,
    `6. Gambar harus akurat secara matematis: skala garis bilangan konsisten, sudut siku-siku benar 90 derajat, panjang sisi sebanding dengan angka yang tertulis.`,
    `7. Beri keterangan di bawah setiap SVG dengan format: *Gambar 1. Keterangan singkat*`,
    `8. Jangan memakai <style>, <script>, <foreignObject>, atau atribut on... di dalam SVG.`,
  ].join("\n");
}

/** Instruksi ilustrasi raster untuk system prompt. */
export function instruksiIlustrasiRaster(): string {
  return [
    `ATURAN ILUSTRASI KONTEKSTUAL:`,
    `1. Bila sebuah bagian akan lebih mudah dipahami dengan ilustrasi situasi nyata (bukan diagram presisi), tuliskan penanda [GAMBAR: deskripsi ilustrasi] pada baris tersendiri.`,
    `2. Deskripsi ditulis dalam satu kalimat bahasa Indonesia yang jelas dan konkret. Contoh: [GAMBAR: seorang pedagang buah menata jeruk dalam beberapa keranjang di pasar tradisional]`,
    `3. Ilustrasi tidak boleh memuat angka, rumus, atau tulisan apa pun — gunakan SVG bila memerlukan itu.`,
    `4. Gunakan maksimal 3 penanda [GAMBAR: ...] dalam satu dokumen agar dokumen tetap ringkas.`,
  ].join("\n");
}

/** Menghitung berapa ilustrasi raster yang diminta model. */
export function hitungPenandaGambar(markdown: string): string[] {
  const hasil: string[] = [];
  const regex = new RegExp(PENANDA_GAMBAR.source, "g");
  let m: RegExpExecArray | null;
  while ((m = regex.exec(markdown)) !== null) hasil.push(m[1].trim());
  return hasil;
}

export type ProgresGambar = { selesai: number; total: number; deskripsi: string };

/**
 * Mengganti setiap penanda [GAMBAR: ...] dengan gambar hasil model.
 *
 * Gambar diunggah ke Cloudinary lalu ditulis sebagai Markdown image, sehingga
 * ikut tersimpan di Firestore sebagai URL pendek (bukan base64 yang akan
 * menembus batas 1 MB per dokumen).
 *
 * Bila satu gambar gagal dibuat, penandanya diganti keterangan teks biasa agar
 * dokumen tetap utuh dan guru tahu bagian mana yang perlu gambar manual.
 */
export async function lengkapiGambarRaster(
  markdown: string,
  opsi: { mapel?: string; jenjang?: string; onProgres?: (p: ProgresGambar) => void } = {}
): Promise<{ konten: string; berhasil: number; gagal: number; pesanGagal: string[] }> {
  const deskripsiList = hitungPenandaGambar(markdown);
  if (deskripsiList.length === 0) return { konten: markdown, berhasil: 0, gagal: 0, pesanGagal: [] };

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return { konten: markdown, berhasil: 0, gagal: deskripsiList.length, pesanGagal: ["Sesi tidak valid."] };

  const idToken = await user.getIdToken();
  const hasilPerDeskripsi = new Map<string, string>();
  const pesanGagal: string[] = [];
  let berhasil = 0;

  for (let i = 0; i < deskripsiList.length; i++) {
    const deskripsi = deskripsiList[i];
    opsi.onProgres?.({ selesai: i, total: deskripsiList.length, deskripsi });

    // Deskripsi yang sama cukup dibuat sekali.
    if (hasilPerDeskripsi.has(deskripsi)) continue;

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ deskripsi, mapel: opsi.mapel, jenjang: opsi.jenjang }),
      });
      const data = await res.json();
      if (!res.ok || !data.dataUrl) throw new Error(data.error || "Gambar tidak terbentuk.");

      const hasil = await unggahDataUrlKeCloudinary(data.dataUrl, {
        folder: `gambar-ajar/${user.uid}`,
        resourceType: "image",
      });
      hasilPerDeskripsi.set(deskripsi, hasil.url);
      berhasil++;
    } catch (error: any) {
      pesanGagal.push(`"${deskripsi.slice(0, 60)}": ${error?.message || "gagal"}`);
    }
  }

  opsi.onProgres?.({ selesai: deskripsiList.length, total: deskripsiList.length, deskripsi: "" });

  const konten = markdown.replace(new RegExp(PENANDA_GAMBAR.source, "g"), (_cocok, isi) => {
    const deskripsi = String(isi).trim();
    const url = hasilPerDeskripsi.get(deskripsi);
    if (!url) return `*(Ilustrasi belum tersedia: ${deskripsi})*`;
    return `\n\n![${deskripsi}](${url})\n\n*Gambar. ${deskripsi}*\n\n`;
  });

  return { konten, berhasil, gagal: deskripsiList.length - berhasil, pesanGagal };
}

/**
 * Membersihkan SVG buatan model dari elemen yang tidak aman sebelum dirender
 * lewat rehype-raw. Konten berasal dari model, bukan dari pengguna lain, tetapi
 * pembersihan ini mencegah skrip ikut tereksekusi bila prompt disalahgunakan.
 */
export function bersihkanSvg(markdown: string): string {
  return markdown
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
}
