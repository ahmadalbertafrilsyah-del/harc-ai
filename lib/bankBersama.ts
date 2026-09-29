"use client";

/**
 * Bank Bersama — pustaka perangkat ajar & instrumen asesmen yang dibagikan
 * antar-guru.
 *
 * Tujuan: menghemat token AI. Ketika seorang guru hendak membuat perangkat
 * dengan mapel + materi yang sudah pernah dibuat guru lain, sistem menawarkan
 * untuk memuatnya tanpa memanggil AI, lalu guru cukup merevisi sebagian.
 *
 * Privasi: identitas (nama guru, nama sekolah, kota, tahun pelajaran) DIBUANG
 * saat dokumen dikontribusikan, diganti penanda seperti [Nama Guru]. Saat dimuat
 * kembali, penanda disubstitusi dengan identitas guru yang memuat. KOP dan kolom
 * tanda tangan tidak pernah ikut karena dirender terpisah dari `konten`.
 */

import {
  collection, doc, setDoc, getDoc, getDocs, query, where, limit,
  serverTimestamp, increment, orderBy,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export type EntriBank = {
  id: string;
  tipe: string;
  mapel: string;
  mapelKey: string;
  fase: string;
  kelas: string;
  topik: string;
  materi: string;
  materiKey: string;
  sumber: string;
  konten: string;
  dipakai: number;
  tervalidasi: boolean;
  createdAt?: any;
};

export type IdentitasDokumen = {
  namaGuru?: string;
  namaSekolah?: string;
  kota?: string;
  tahunPelajaran?: string;
};

const KATA_UMUM = new Set([
  "dan", "atau", "yang", "di", "ke", "dari", "pada", "untuk", "dengan", "dalam",
  "materi", "pokok", "bab", "tema", "sub", "kelas", "fase", "the", "of", "a", "an",
]);

/** Menyeragamkan teks agar cocok meski beda spasi/huruf besar/tanda baca. */
export function normalisasi(teks: string): string {
  return (teks || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kunci deterministik untuk satu materi, dipakai sebagai id dokumen bank. */
export function kunciEntri(tipe: string, mapel: string, materi: string): string {
  const gabung = `${normalisasi(tipe)}|${normalisasi(mapel)}|${normalisasi(materi)}`;
  // djb2 → hex, cukup untuk id dokumen yang stabil dan pendek.
  let h = 5381;
  for (let i = 0; i < gabung.length; i++) h = (h * 33) ^ gabung.charCodeAt(i);
  return "bp_" + (h >>> 0).toString(16) + "_" + gabung.length.toString(36);
}

function himpunanKata(teks: string): Set<string> {
  return new Set(
    normalisasi(teks)
      .split(" ")
      .filter((w) => w.length > 2 && !KATA_UMUM.has(w))
  );
}

/** Kemiripan Jaccard dua teks (0..1). */
export function kemiripan(a: string, b: string): number {
  const sa = himpunanKata(a);
  const sb = himpunanKata(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let irisan = 0;
  sa.forEach((w) => { if (sb.has(w)) irisan++; });
  return irisan / (sa.size + sb.size - irisan);
}

/** Membuang identitas dari konten sebelum dibagikan. */
export function sanitasiIdentitas(konten: string, id: IdentitasDokumen): string {
  let hasil = konten || "";
  const ganti = (nilai: string | undefined, penanda: string) => {
    const bersih = (nilai || "").trim();
    if (bersih.length < 3) return;
    // Ganti kemunculan persis (case-insensitive), aman dari karakter regex.
    const pola = new RegExp(bersih.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    hasil = hasil.replace(pola, penanda);
  };
  ganti(id.namaGuru, "[Nama Guru]");
  ganti(id.namaSekolah, "[Nama Sekolah]");
  ganti(id.kota, "[Kota]");
  ganti(id.tahunPelajaran, "[Tahun Pelajaran]");
  return hasil;
}

/** Mengembalikan identitas guru pemuat ke dalam konten dari bank. */
export function terapkanIdentitas(konten: string, id: IdentitasDokumen): string {
  let hasil = konten || "";
  const isi = (penanda: string, nilai: string | undefined) => {
    if (!nilai || !nilai.trim()) return;
    hasil = hasil.split(penanda).join(nilai.trim());
  };
  isi("[Nama Guru]", id.namaGuru);
  isi("[Nama Sekolah]", id.namaSekolah);
  isi("[Kota]", id.kota);
  isi("[Tahun Pelajaran]", id.tahunPelajaran);
  return hasil;
}

/**
 * Menyumbangkan perangkat ke Bank Bersama.
 *
 * Memakai id deterministik sehingga materi yang sama tidak menumpuk: entri
 * diperbarui ke versi terbaru sambil mempertahankan hitungan pemakaian.
 * Gagal menyimpan tidak boleh mengganggu alur utama — error hanya dicatat.
 */
export async function kontribusiBank(params: {
  tipe: string;
  mapel: string;
  fase?: string;
  kelas?: string;
  topik?: string;
  materi: string;
  konten: string;
  identitas: IdentitasDokumen;
  tervalidasi?: boolean;
}): Promise<void> {
  try {
    const { tipe, mapel, materi, konten } = params;
    if (!tipe || !mapel || !materi || !konten || konten.length < 120) return;

    const id = kunciEntri(tipe, mapel, materi);
    const ref = doc(db, "bank_perangkat", id);
    const adaSebelumnya = (await getDoc(ref)).exists();

    await setDoc(
      ref,
      {
        tipe,
        mapel,
        mapelKey: normalisasi(mapel),
        fase: params.fase || "",
        kelas: params.kelas || "",
        topik: params.topik || "",
        materi,
        materiKey: normalisasi(materi),
        konten: sanitasiIdentitas(konten, params.identitas),
        sumber: "kontribusi-guru",
        tervalidasi: params.tervalidasi ?? false,
        diperbaruiPada: serverTimestamp(),
        ...(adaSebelumnya ? {} : { dipakai: 0, createdAt: serverTimestamp() }),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Gagal kontribusi Bank Bersama:", error);
  }
}

/**
 * Mencari perangkat serupa di Bank Bersama.
 *
 * Query hanya memakai kesetaraan `mapelKey` (indeks lapangan tunggal, tidak
 * perlu indeks komposit), lalu tipe & kemiripan materi disaring di sisi klien.
 */
export async function cariBank(params: {
  tipe: string;
  mapel: string;
  materi: string;
  topik?: string;
  minKemiripan?: number;
}): Promise<(EntriBank & { skor: number })[]> {
  try {
    const { tipe, mapel, materi } = params;
    if (!mapel) return [];

    const snap = await getDocs(
      query(collection(db, "bank_perangkat"), where("mapelKey", "==", normalisasi(mapel)), limit(60))
    );

    const acuan = `${materi} ${params.topik || ""}`;
    const minK = params.minKemiripan ?? 0.18;

    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as EntriBank)
      .filter((e) => normalisasi(e.tipe) === normalisasi(tipe))
      .map((e) => ({ ...e, skor: kemiripan(acuan, `${e.materi} ${e.topik}`) }))
      .filter((e) => e.skor >= minK)
      .sort((a, b) => b.skor - a.skor || (b.dipakai || 0) - (a.dipakai || 0))
      .slice(0, 6);
  } catch (error) {
    console.error("Gagal mencari Bank Bersama:", error);
    return [];
  }
}

/** Menaikkan hitungan pemakaian sebuah entri (best-effort). */
export async function tandaiDipakai(id: string): Promise<void> {
  try {
    await setDoc(doc(db, "bank_perangkat", id), { dipakai: increment(1) }, { merge: true });
  } catch (error) {
    console.error("Gagal menandai pemakaian bank:", error);
  }
}

/** Menandai entri bank sebagai tervalidasi ketika dokumen sumber disetujui. */
export async function tandaiTervalidasiBank(tipe: string, mapel: string, materi: string): Promise<void> {
  try {
    if (!tipe || !mapel || !materi) return;
    const id = kunciEntri(tipe, mapel, materi);
    const ref = doc(db, "bank_perangkat", id);
    if ((await getDoc(ref)).exists()) {
      await setDoc(ref, { tervalidasi: true }, { merge: true });
    }
  } catch (error) {
    console.error("Gagal menandai validasi bank:", error);
  }
}

/** Entri terpopuler untuk etalase (dipakai di modal Bank Bersama). */
export async function bankPopuler(maks = 12): Promise<EntriBank[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "bank_perangkat"), orderBy("dipakai", "desc"), limit(maks))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EntriBank);
  } catch {
    return [];
  }
}
