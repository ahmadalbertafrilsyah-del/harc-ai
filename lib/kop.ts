"use client";

/**
 * Sumber tunggal data KOP surat lembaga.
 *
 * KOP disimpan pada dokumen user milik lembaga (role === "lembaga") di field
 * `kop`. Guru tidak menulis KOP sendiri: ia otomatis tersambung lewat NPSN yang
 * sama, sehingga seluruh perangkat ajar yang dihasilkan guru memakai kop resmi
 * lembaganya.
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";

export type KopLembaga = {
  /** Baris paling atas, mis. "YAYASAN PENDIDIKAN ISLAM AL-HIKMAH" atau "DINAS PENDIDIKAN KABUPATEN X" */
  naungan: string;
  /** Baris kedua opsional, mis. "KEMENTERIAN AGAMA REPUBLIK INDONESIA" */
  naunganKedua: string;
  /** Nama sekolah/madrasah — baris paling besar */
  namaLembaga: string;
  npsn: string;
  nss: string;
  akreditasi: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  /** URL logo (Firebase Storage). Kiri biasanya logo yayasan/pemerintah, kanan logo sekolah. */
  logoKiri: string;
  logoKanan: string;
  /** Penanda tangan dokumen */
  namaKepala: string;
  nipKepala: string;
  jabatanKepala: string;
  /** Default tahun pelajaran & semester untuk dokumen baru */
  tahunPelajaran: string;
  semester: string;
};

export const KOP_KOSONG: KopLembaga = {
  naungan: "",
  naunganKedua: "",
  namaLembaga: "",
  npsn: "",
  nss: "",
  akreditasi: "",
  alamat: "",
  kelurahan: "",
  kecamatan: "",
  kota: "",
  provinsi: "",
  kodePos: "",
  telepon: "",
  email: "",
  website: "",
  logoKiri: "",
  logoKanan: "",
  namaKepala: "",
  nipKepala: "",
  jabatanKepala: "Kepala Sekolah",
  tahunPelajaran: "",
  semester: "Ganjil",
};

/** Menggabungkan data tersimpan (bentuk apa pun) dengan bentuk baku di atas. */
export function normalisasiKop(data: Partial<KopLembaga> | undefined | null): KopLembaga {
  return { ...KOP_KOSONG, ...(data || {}) };
}

/** Baris alamat satu kalimat, dipakai di kop cetak. */
export function barisAlamat(kop: KopLembaga): string {
  const bagian = [
    kop.alamat,
    kop.kelurahan && `Kel. ${kop.kelurahan}`,
    kop.kecamatan && `Kec. ${kop.kecamatan}`,
    kop.kota,
    kop.provinsi,
    kop.kodePos,
  ].filter(Boolean);
  return bagian.join(", ");
}

/** Baris kontak satu kalimat, dipakai di kop cetak. */
export function barisKontak(kop: KopLembaga): string {
  const bagian = [
    kop.telepon && `Telp. ${kop.telepon}`,
    kop.email && `Surel: ${kop.email}`,
    kop.website && `Laman: ${kop.website}`,
  ].filter(Boolean);
  return bagian.join(" | ");
}

export function kopTerisi(kop: KopLembaga): boolean {
  return Boolean(kop.namaLembaga);
}

/**
 * Menarik KOP lembaga berdasarkan NPSN guru yang sedang login.
 * Mengembalikan kop kosong selama NPSN belum diketahui atau lembaga belum
 * mengisi kopnya, sehingga pemanggil tidak perlu menangani null.
 */
export function useKopLembaga(npsn: string | undefined | null) {
  const [kop, setKop] = useState<KopLembaga>(KOP_KOSONG);
  const [sedangMemuat, setSedangMemuat] = useState(Boolean(npsn));
  const [lembagaDitemukan, setLembagaDitemukan] = useState(false);

  useEffect(() => {
    if (!npsn) {
      setKop(KOP_KOSONG);
      setSedangMemuat(false);
      setLembagaDitemukan(false);
      return;
    }

    setSedangMemuat(true);
    const qLembaga = query(
      collection(db, "users"),
      where("role", "==", "lembaga"),
      where("npsn", "==", npsn)
    );

    const unsub = onSnapshot(
      qLembaga,
      (snap) => {
        if (snap.empty) {
          setKop({ ...KOP_KOSONG, npsn });
          setLembagaDitemukan(false);
        } else {
          const data = snap.docs[0].data();
          const tersimpan = normalisasiKop(data.kop as Partial<KopLembaga>);
          setKop({
            ...tersimpan,
            // Fallback ke field lama agar lembaga yang belum mengisi kop tetap
            // punya nama & NPSN yang benar di dokumen.
            namaLembaga: tersimpan.namaLembaga || data.namaLembaga || data.namaInstansi || "",
            npsn: tersimpan.npsn || data.npsn || npsn,
          });
          setLembagaDitemukan(true);
        }
        setSedangMemuat(false);
      },
      () => setSedangMemuat(false)
    );

    return () => unsub();
  }, [npsn]);

  return { kop, sedangMemuat, lembagaDitemukan };
}
