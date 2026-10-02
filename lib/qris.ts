/**
 * Utilitas QRIS: mengubah kode QRIS menjadi QRIS dinamis yang memuat nominal
 * pembayaran, sehingga satu ID QRIS lembaga bisa dipakai untuk berbagai jumlah
 * pembelian token tanpa membuat barcode baru secara manual.
 *
 * Standar EMVCo (format TLV: Tag-Length-Value) dengan checksum CRC16-CCITT
 * (polinomial 0x1021, nilai awal 0xFFFF) sesuai ketentuan QRIS Bank Indonesia.
 *
 * Catatan penting implementasi:
 *  - Spasi di dalam payload DIPERTAHANKAN (nama merchant tag 59 & kota tag 60
 *    boleh mengandung spasi). Hanya karakter kontrol (newline/tab hasil
 *    salin-tempel) yang dibuang.
 *  - Bila QRIS sumber sudah memuat nominal (tag 54), nominal lama DIGANTI, bukan
 *    ditambah — mencegah tag ganda yang membuat QRIS gagal dipindai.
 */

type Objek = { tag: string; val: string };

/** Menghitung CRC16-CCITT (False) atas untai ASCII, hasil 4 digit heksadesimal kapital. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Membersihkan karakter kontrol tanpa mengganggu spasi yang sah di dalam payload. */
function normalkan(qris: string): string {
  return (qris || "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

/** Mengurai untai EMVCo menjadi daftar objek TLV tingkat atas. Null bila tidak rapi. */
function uraiTLV(s: string): Objek[] | null {
  const out: Objek[] = [];
  let i = 0;
  while (i + 4 <= s.length) {
    const tag = s.substr(i, 2);
    const len = parseInt(s.substr(i + 2, 2), 10);
    if (isNaN(len) || i + 4 + len > s.length) return null;
    out.push({ tag, val: s.substr(i + 4, len) });
    i += 4 + len;
  }
  return i === s.length ? out : null;
}

function tlv(tag: string, val: string): string {
  return tag + String(val.length).padStart(2, "0") + val;
}

/** Validasi QRIS berdasarkan struktur TLV: punya tag awal "00" dan tag CRC "63". */
export function qrisValid(qris: string): boolean {
  const objs = uraiTLV(normalkan(qris));
  if (!objs || objs.length < 3) return false;
  return objs[0].tag === "00" && objs.some((o) => o.tag === "63");
}

/**
 * Membuat QRIS dinamis dari QRIS sumber + nominal (rupiah, bilangan bulat).
 * Mengembalikan untai QRIS lengkap yang siap dijadikan barcode.
 */
export function buatQrisDinamis(qrisSumber: string, nominal: number): string {
  const sumber = normalkan(qrisSumber);
  const objs = uraiTLV(sumber);
  if (!objs || !objs.length || objs[0].tag !== "00") {
    throw new Error("Kode QRIS tidak valid. Salin ulang seluruh teks QRIS dari sumber aslinya.");
  }
  const jumlah = Math.round(Number(nominal));
  if (!Number.isFinite(jumlah) || jumlah <= 0) {
    throw new Error("Nominal pembayaran tidak valid.");
  }

  // Buang checksum lama (63) dan nominal lama (54) agar tidak ganda.
  const hasil = objs.filter((o) => o.tag !== "63" && o.tag !== "54");

  // Point of Initiation Method: paksa 12 (dinamis, memuat nominal).
  for (const o of hasil) if (o.tag === "01") o.val = "12";

  // Sisipkan nominal (54) tepat sebelum tag >= 55 (mis. 58 Country Code), sesuai urutan EMVCo.
  let idx = hasil.findIndex((o) => parseInt(o.tag, 10) >= 55);
  if (idx === -1) idx = hasil.length;
  hasil.splice(idx, 0, { tag: "54", val: String(jumlah) });

  // Rangkai ulang + hitung CRC baru atas seluruh data termasuk penanda "6304".
  const tanpaCrc = hasil.map((o) => tlv(o.tag, o.val)).join("") + "6304";
  return tanpaCrc + crc16(tanpaCrc);
}

/**
 * URL gambar QR dari untai QRIS. Memakai layanan render QR publik (goqr.me);
 * payload QRIS memang dirancang untuk dipindai terbuka, bukan data rahasia.
 */
export function urlGambarQr(data: string, ukuran = 320): string {
  const u = Math.max(120, Math.min(1000, Math.round(ukuran)));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${u}x${u}&margin=16&ecc=M&data=${encodeURIComponent(
    data,
  )}`;
}

/** Format rupiah ringkas untuk tampilan. */
export function formatRupiah(n: number): string {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}
