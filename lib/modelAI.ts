/**
 * Penamaan ramah untuk model AI.
 *
 * Di sisi pengguna, merek "Gemini" disembunyikan dan ditampilkan sebagai
 * "Harc-AI ...". Namun ID asli (mis. "gemini-2.5-flash") tetap dipakai saat
 * memanggil API, sehingga tidak mengubah perilaku backend.
 *
 * Admin tetap bisa mengatur daftar model lewat kolom `availableModels`
 * (dipisah koma) pada konfigurasi AI. Tiap entri boleh:
 *   • hanya ID            → label dibuat otomatis, mis. "gemini-2.5-pro"
 *   • ID dengan alias     → "gemini-2.5-flash=Harc-AI Flash" atau pakai "|"
 */

/** Memisah satu entri menjadi ID asli + label (bila diberi alias). */
function pisahEntri(entri: string): { id: string; label?: string } {
  const bersih = (entri || "").trim();
  const cocok = bersih.match(/^(.*?)\s*[=|]\s*(.+)$/);
  if (cocok) return { id: cocok[1].trim(), label: cocok[2].trim() };
  return { id: bersih };
}

/** ID model asli yang dikirim ke API (membuang alias bila ada). */
export function idModel(entri: string): string {
  return pisahEntri(entri).id;
}

/** Peta nama ramah untuk ID yang umum dipakai. */
const PETA_LABEL: Record<string, string> = {
  "gemini-2.5-flash": "Harc-AI Flash",
  "gemini-2.5-flash-lite": "Harc-AI Flash Lite",
  "gemini-2.5-pro": "Harc-AI Pro",
  "gemini-2.0-flash": "Harc-AI Flash",
  "gemini-2.0-flash-lite": "Harc-AI Flash Lite",
  "gemini-1.5-flash": "Harc-AI Flash",
  "gemini-1.5-pro": "Harc-AI Pro",
  "gemini-3.5-flash": "Harc-AI Flash Lite",
};

/**
 * Label yang ditampilkan ke pengguna. Urutan prioritas:
 *   1. alias eksplisit dari admin,
 *   2. peta nama bawaan,
 *   3. turunan otomatis dari pola nama (pro / flash-lite / flash).
 */
export function labelModel(entri: string): string {
  const { id, label } = pisahEntri(entri);
  if (label) return label;

  const kunci = id.toLowerCase().replace(/^models\//, "");
  if (PETA_LABEL[kunci]) return PETA_LABEL[kunci];

  if (kunci.startsWith("gemini") || kunci.startsWith("harc")) {
    const tingkat = /flash[-\s]?lite|lite/.test(kunci)
      ? "Flash Lite"
      : /pro/.test(kunci)
        ? "Pro"
        : /flash/.test(kunci)
          ? "Flash"
          : "AI";
    return `Harc-AI ${tingkat}`;
  }
  return id || "Harc-AI";
}

/** Memecah string `availableModels` menjadi daftar entri yang bersih. */
export function daftarEntriModel(raw: string | undefined, fallback = "gemini-1.5-flash"): string[] {
  const teks = raw && raw.trim() ? raw : fallback;
  return teks
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
