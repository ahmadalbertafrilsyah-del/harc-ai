"use client";

import { motion } from "framer-motion";
import {
  Building, Save, Loader2, ImageUp, Trash2, Eye, Info,
  MapPin, Phone, UserCog, CalendarRange, CheckCircle2
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useEffect, useRef, useState } from "react";

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import { unggahKeCloudinary } from "@/lib/cloudinary";
import KopSurat from "@/components/KopSurat";
import { KOP_KOSONG, normalisasiKop, type KopLembaga } from "@/lib/kop";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

const BATAS_LOGO_BYTE = 1024 * 1024; // 1 MB — logo kop tidak perlu lebih besar dari ini.

export default function PengaturanKopLembaga() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [kop, setKop] = useState<KopLembaga>(KOP_KOSONG);
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);
  const [logoDiunggah, setLogoDiunggah] = useState<"logoKiri" | "logoKanan" | null>(null);

  const inputKiri = useRef<HTMLInputElement>(null);
  const inputKanan = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        const tersimpan = normalisasiKop(data.kop as Partial<KopLembaga>);
        setKop({
          ...tersimpan,
          // Lembaga lama belum punya objek `kop`; ambil dari field profil yang ada.
          namaLembaga: tersimpan.namaLembaga || data.namaLembaga || data.namaInstansi || "",
          npsn: tersimpan.npsn || data.npsn || data.instansi || "",
          telepon: tersimpan.telepon || data.noTelp || "",
          email: tersimpan.email || data.email || "",
          namaKepala: tersimpan.namaKepala || data.nama || "",
        });
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const ubah = (field: keyof KopLembaga, nilai: string) =>
    setKop((prev) => ({ ...prev, [field]: nilai }));

  const unggahLogo = async (posisi: "logoKiri" | "logoKanan", file: File | undefined) => {
    if (!file || !uid) return;
    if (!file.type.startsWith("image/")) {
      setPesan({ tipe: "error", teks: "Berkas logo harus berupa gambar (PNG/JPG)." });
      return;
    }
    if (file.size > BATAS_LOGO_BYTE) {
      setPesan({ tipe: "error", teks: "Ukuran logo maksimal 1 MB. Perkecil gambar terlebih dahulu." });
      return;
    }

    setLogoDiunggah(posisi);
    setPesan(null);
    try {
      const hasil = await unggahKeCloudinary(file, {
        folder: `kop/${uid}`,
        resourceType: "image",
      });
      setKop((prev) => ({ ...prev, [posisi]: hasil.url }));
      setPesan({ tipe: "sukses", teks: "Logo terunggah. Jangan lupa tekan Simpan Kop." });
    } catch (error: any) {
      console.error("Gagal mengunggah logo:", error);
      setPesan({ tipe: "error", teks: error?.message || "Gagal mengunggah logo. Periksa koneksi internet." });
    } finally {
      setLogoDiunggah(null);
    }
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setIsSaving(true);
    setPesan(null);
    try {
      await updateDoc(doc(db, "users", uid), {
        kop,
        // Jaga agar field lama tetap sinkron: dipakai query NPSN di modul guru.
        namaLembaga: kop.namaLembaga,
        namaInstansi: kop.namaLembaga,
        npsn: kop.npsn,
        instansi: kop.npsn,
      });
      setPesan({ tipe: "sukses", teks: "Kop lembaga tersimpan. Semua guru dengan NPSN ini otomatis memakainya." });
    } catch (error) {
      console.error("Gagal menyimpan kop:", error);
      setPesan({ tipe: "error", teks: "Gagal menyimpan kop lembaga." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4 animate-pulse" role="status" aria-label="Memuat kop lembaga">
        <div className="h-20 rounded-2xl bg-slate-200" />
        <div className="h-[420px] rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto w-full space-y-4 md:space-y-5 pb-4"
    >
      <header className="pb-4 border-b border-slate-200">
        <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>
          Kop Surat Lembaga
        </h1>
        <p className="text-slate-500 text-[12px] sm:text-sm mt-1.5 leading-relaxed">
          Kop ini otomatis dipakai pada seluruh perangkat ajar, LKPD, lembar soal, dan LJK yang dibuat
          guru dengan NPSN <span className="font-bold text-slate-700">{kop.npsn || "(belum diisi)"}</span>.
        </p>
      </header>

      {pesan && (
        <div
          role="status"
          className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold border ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {pesan.tipe === "sukses" ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <Info size={15} className="shrink-0 mt-0.5" />}
          {pesan.teks}
        </div>
      )}

      {/* PRATINJAU */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
          <Eye size={16} className="text-slate-500" />
          <h2 className={`text-sm font-bold text-slate-800 ${teachersFont.className}`}>Pratinjau Kop</h2>
        </div>
        <div className="p-3 sm:p-5 bg-slate-100">
          <div className="bg-white mx-auto p-4 sm:p-8 shadow-sm border border-slate-300 overflow-x-auto">
            <div style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000", minWidth: "520px" }}>
              <KopSurat kop={kop} judulDokumen="MODUL AJAR" subJudul="Contoh penempatan kop pada dokumen" />
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={simpan} className="space-y-4 md:space-y-5">
        {/* LOGO */}
        <Kartu judul="Logo" ikon={ImageUp}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <KotakLogo
              label="Logo Kiri (Yayasan / Pemerintah)"
              url={kop.logoKiri}
              sedangUnggah={logoDiunggah === "logoKiri"}
              onPilih={() => inputKiri.current?.click()}
              onHapus={() => ubah("logoKiri", "")}
            />
            <KotakLogo
              label="Logo Kanan (Sekolah / Madrasah)"
              url={kop.logoKanan}
              sedangUnggah={logoDiunggah === "logoKanan"}
              onPilih={() => inputKanan.current?.click()}
              onHapus={() => ubah("logoKanan", "")}
            />
          </div>
          <input ref={inputKiri} type="file" accept="image/*" className="hidden" onChange={(e) => unggahLogo("logoKiri", e.target.files?.[0])} />
          <input ref={inputKanan} type="file" accept="image/*" className="hidden" onChange={(e) => unggahLogo("logoKanan", e.target.files?.[0])} />
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
            Gunakan PNG berlatar transparan, maksimal 1 MB. Logo tampil berukuran 70×70 pt pada dokumen cetak.
          </p>
        </Kartu>

        {/* IDENTITAS */}
        <Kartu judul="Identitas Lembaga" ikon={Building}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Medan label="Naungan / Baris Atas" nilai={kop.naungan} onChange={(v) => ubah("naungan", v)} placeholder="Cth: YAYASAN PENDIDIKAN AL-HIKMAH" />
            <Medan label="Baris Naungan Kedua (opsional)" nilai={kop.naunganKedua} onChange={(v) => ubah("naunganKedua", v)} placeholder="Cth: KEMENTERIAN AGAMA REPUBLIK INDONESIA" />
            <div className="md:col-span-2">
              <Medan label="Nama Sekolah / Madrasah" nilai={kop.namaLembaga} onChange={(v) => ubah("namaLembaga", v)} placeholder="Cth: SMP ISLAM AL-HIKMAH" wajib />
            </div>
            <Medan label="NPSN" nilai={kop.npsn} onChange={(v) => ubah("npsn", v)} placeholder="8 digit" wajib mono />
            <Medan label="NSS / NSM (opsional)" nilai={kop.nss} onChange={(v) => ubah("nss", v)} mono />
            <Medan label="Akreditasi" nilai={kop.akreditasi} onChange={(v) => ubah("akreditasi", v)} placeholder="Cth: A (Unggul)" />
          </div>
        </Kartu>

        {/* ALAMAT */}
        <Kartu judul="Alamat" ikon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="md:col-span-2">
              <Medan label="Alamat Jalan" nilai={kop.alamat} onChange={(v) => ubah("alamat", v)} placeholder="Cth: Jl. Pendidikan No. 12" />
            </div>
            <Medan label="Kelurahan / Desa" nilai={kop.kelurahan} onChange={(v) => ubah("kelurahan", v)} />
            <Medan label="Kecamatan" nilai={kop.kecamatan} onChange={(v) => ubah("kecamatan", v)} />
            <Medan label="Kota / Kabupaten" nilai={kop.kota} onChange={(v) => ubah("kota", v)} placeholder="Dipakai juga pada kota penandatanganan" />
            <Medan label="Provinsi" nilai={kop.provinsi} onChange={(v) => ubah("provinsi", v)} />
            <Medan label="Kode Pos" nilai={kop.kodePos} onChange={(v) => ubah("kodePos", v)} mono />
          </div>
        </Kartu>

        {/* KONTAK */}
        <Kartu judul="Kontak" ikon={Phone}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <Medan label="Telepon" nilai={kop.telepon} onChange={(v) => ubah("telepon", v)} mono />
            <Medan label="Surel" nilai={kop.email} onChange={(v) => ubah("email", v)} />
            <Medan label="Laman" nilai={kop.website} onChange={(v) => ubah("website", v)} placeholder="Cth: www.sekolah.sch.id" />
          </div>
        </Kartu>

        {/* PENANDA TANGAN */}
        <Kartu judul="Penanda Tangan Dokumen" ikon={UserCog}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <Medan label="Jabatan" nilai={kop.jabatanKepala} onChange={(v) => ubah("jabatanKepala", v)} placeholder="Kepala Sekolah" />
            <Medan label="Nama Kepala" nilai={kop.namaKepala} onChange={(v) => ubah("namaKepala", v)} />
            <Medan label="NIP Kepala" nilai={kop.nipKepala} onChange={(v) => ubah("nipKepala", v)} mono />
          </div>
        </Kartu>

        {/* TAHUN PELAJARAN */}
        <Kartu judul="Tahun Pelajaran Aktif" ikon={CalendarRange}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Medan label="Tahun Pelajaran" nilai={kop.tahunPelajaran} onChange={(v) => ubah("tahunPelajaran", v)} placeholder="Cth: 2026/2027" />
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semester</label>
              <select
                value={kop.semester}
                onChange={(e) => ubah("semester", e.target.value)}
                className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
              >
                <option>Ganjil</option>
                <option>Genap</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
            Nilai ini menjadi isian awal pada Generator Perangkat Ajar milik guru, dan masih dapat diubah per dokumen.
          </p>
        </Kartu>

        {/* AKSI — menempel di bawah pada layar HP agar selalu terjangkau */}
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent md:static md:mx-0 md:px-0 md:bg-none">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full md:w-auto md:ml-auto md:flex min-h-[48px] bg-purple-700 hover:bg-purple-800 text-white px-6 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            Simpan Kop Lembaga
          </button>
        </div>
      </form>
    </motion.div>
  );
}

/* ---------------------------------- UI ---------------------------------- */

function Kartu({ judul, ikon: Ikon, children }: { judul: string; ikon: any; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
        <Ikon size={16} className="text-purple-600" />
        <h2 className={`text-sm font-bold text-slate-800 ${teachersFont.className}`}>{judul}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Medan({
  label, nilai, onChange, placeholder, wajib, mono,
}: {
  label: string; nilai: string; onChange: (v: string) => void;
  placeholder?: string; wajib?: boolean; mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        {label} {wajib && <span className="text-rose-500">*</span>}
      </label>
      <input
        type="text"
        value={nilai}
        required={wajib}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}

function KotakLogo({
  label, url, sedangUnggah, onPilih, onHapus,
}: {
  label: string; url: string; sedangUnggah: boolean;
  onPilih: () => void; onHapus: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">{label}</p>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
          {sedangUnggah ? (
            <Loader2 size={18} className="animate-spin text-purple-600" />
          ) : url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt="" className="w-full h-full object-contain" />
          ) : (
            <ImageUp size={18} className="text-slate-300" />
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={onPilih}
            disabled={sedangUnggah}
            className="min-h-[38px] px-3 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            {url ? "Ganti Logo" : "Pilih Logo"}
          </button>
          {url && (
            <button
              type="button"
              onClick={onHapus}
              className="min-h-[38px] px-3 bg-white border border-rose-200 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 size={13} /> Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
