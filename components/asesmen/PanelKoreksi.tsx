"use client";

/**
 * Koreksi lembar jawaban luring.
 *
 * Alurnya sengaja dibuat "AI membaca, guru memutuskan": model hanya membaca
 * tanda pada lembar, seluruh hasil bacaan tampil dalam tabel yang dapat
 * disunting, dan nilai baru tersimpan setelah guru menekan simpan.
 */

import { useEffect, useRef, useState } from "react";
import {
  Camera, UploadCloud, Loader2, X, Save, AlertTriangle, CheckCircle2,
  ScanLine, RefreshCw, UserRound,
} from "lucide-react";

import { getAuth } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  urutkanSoal, kelompokkanSoal, BOBOT_DEFAULT, LABEL_TIPE,
  type Soal,
} from "@/lib/soal";

type Props = {
  ujianId: string;
  judulUjian: string;
  kelasNama: string;
  soal: Soal[];
  daftarSiswa: { id: string; nama: string; nisn?: string }[];
};

type BacaanLJK = {
  nama: string;
  nomorInduk: string;
  jawaban: Record<string, string>;
  ragu: number[];
  catatan: string;
};

const BATAS_GAMBAR_BYTE = 6 * 1024 * 1024;

export default function PanelKoreksi({ ujianId, judulUjian, kelasNama, soal, daftarSiswa }: Props) {
  const [kameraAktif, setKameraAktif] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [bacaan, setBacaan] = useState<BacaanLJK | null>(null);
  const [siswaId, setSiswaId] = useState("");
  const [skorManual, setSkorManual] = useState<Record<string, number>>({});
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const terurut = urutkanSoal(soal);
  const kelompok = kelompokkanSoal(soal);

  // Kamera selalu dimatikan saat komponen ditutup agar lampu kamera tidak menyala terus.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const bukaKamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setKameraAktif(true);
      // Elemen video baru ada setelah render berikutnya.
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 60);
    } catch {
      setPesan({ tipe: "error", teks: "Tidak dapat mengakses kamera. Periksa izin kamera pada browser." });
    }
  };

  const tutupKamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setKameraAktif(false);
  };

  const ambilFoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    tutupKamera();
    void kirimKeAI(dataUrl.split(",")[1], "image/jpeg");
  };

  const pilihBerkas = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPesan({ tipe: "error", teks: "Unggah berkas gambar (JPG/PNG). Untuk PDF, potret halamannya terlebih dahulu." });
      return;
    }
    if (file.size > BATAS_GAMBAR_BYTE) {
      setPesan({ tipe: "error", teks: "Ukuran gambar melebihi 6 MB. Perkecil resolusi foto." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const hasil = String(reader.result);
      void kirimKeAI(hasil.split(",")[1], file.type);
    };
    reader.readAsDataURL(file);
  };

  const kirimKeAI = async (base64: string, mimeType: string) => {
    setMemproses(true);
    setPesan(null);
    setBacaan(null);
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const tipePerNomor: Record<number, string> = {};
      kelompok.forEach((k) => k.soal.forEach((_s, i) => { tipePerNomor[k.nomorAwal + i] = LABEL_TIPE[k.tipe]; }));

      const res = await fetch("/api/koreksi-ljk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          gambarBase64: base64,
          mimeType,
          nomorSoal: terurut.map((_s, i) => i + 1),
          tipePerNomor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membaca lembar jawaban.");

      setBacaan({
        nama: data.nama || "",
        nomorInduk: data.nomorInduk || "",
        jawaban: data.jawaban || {},
        ragu: data.ragu || [],
        catatan: data.catatan || "",
      });

      // Cocokkan otomatis dengan siswa terdaftar bila namanya mirip.
      const namaTerbaca = String(data.nama || "").toLowerCase().trim();
      if (namaTerbaca) {
        const cocok = daftarSiswa.find(
          (s) => s.nama.toLowerCase().includes(namaTerbaca) || namaTerbaca.includes(s.nama.toLowerCase())
        );
        if (cocok) setSiswaId(cocok.id);
      }
    } catch (error: any) {
      setPesan({ tipe: "error", teks: error?.message || "Gagal memproses lembar jawaban." });
    } finally {
      setMemproses(false);
    }
  };

  const ubahJawaban = (nomor: number, nilai: string) =>
    setBacaan((prev) => (prev ? { ...prev, jawaban: { ...prev.jawaban, [nomor]: nilai } } : prev));

  /* --------------------------- PENILAIAN --------------------------- */

  const hitung = () => {
    let skor = 0;
    let skorMaks = 0;
    let benar = 0;
    let jumlahObjektif = 0;

    kelompok.forEach((k) => {
      k.soal.forEach((s, i) => {
        const nomor = k.nomorAwal + i;
        const bobot = s.bobot || BOBOT_DEFAULT[k.tipe] || 1;
        skorMaks += bobot;

        if (k.tipe === "PG" || k.tipe === "Benar/Salah") {
          jumlahObjektif++;
          const jawab = (bacaan?.jawaban[nomor] || "").trim().toLowerCase();
          if (jawab && jawab === (s.kunci || "").trim().toLowerCase()) {
            skor += bobot;
            benar++;
          }
        } else {
          skor += skorManual[s.id] ?? 0;
        }
      });
    });

    const nilai = skorMaks > 0 ? Math.round((skor / skorMaks) * 100) : 0;
    return { skor, skorMaks, nilai, benar, jumlahObjektif };
  };

  const hasil = hitung();

  const simpan = async () => {
    if (!bacaan) return;
    const siswa = daftarSiswa.find((s) => s.id === siswaId);
    if (!siswa && !bacaan.nama) {
      setPesan({ tipe: "error", teks: "Pilih peserta didik terlebih dahulu." });
      return;
    }

    setMenyimpan(true);
    setPesan(null);
    try {
      await addDoc(collection(db, "jawaban_siswa"), {
        idUjian: ujianId,
        judulUjian,
        kelas: kelasNama,
        siswaId: siswa?.id || "",
        nama: siswa?.nama || bacaan.nama,
        nisn: siswa?.nisn || bacaan.nomorInduk || "",
        jawaban: bacaan.jawaban,
        skorManual,
        skor: hasil.skor,
        skorMaks: hasil.skorMaks,
        nilai: hasil.nilai,
        sumber: "LJK luring (pindai)",
        diperiksaOleh: getAuth().currentUser?.uid || "",
        timestamp: serverTimestamp(),
      });
      setPesan({ tipe: "sukses", teks: `Nilai ${siswa?.nama || bacaan.nama} tersimpan: ${hasil.nilai}.` });
      setBacaan(null);
      setSiswaId("");
      setSkorManual({});
    } catch (error) {
      console.error("Gagal menyimpan nilai:", error);
      setPesan({ tipe: "error", teks: "Gagal menyimpan nilai ke basis data." });
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="space-y-4">
      {pesan && (
        <div
          role="status"
          className={`flex items-start gap-2 p-3 rounded-xl text-[11px] sm:text-xs font-semibold border ${
            pesan.tipe === "sukses" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {pesan.tipe === "sukses" ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
          {pesan.teks}
        </div>
      )}

      {/* Sumber lembar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Camera size={16} className="text-slate-500" />
            <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Pindai Kamera</h3>
          </div>
          <div className="p-4">
            <div className="bg-slate-900 rounded-xl overflow-hidden relative h-[220px] sm:h-[240px] flex items-center justify-center">
              {kameraAktif ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-5 border-2 border-blue-400/60 rounded-lg pointer-events-none" />
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-3">
                    <button
                      type="button"
                      onClick={ambilFoto}
                      className="min-h-[40px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[12px] font-bold shadow-lg"
                    >
                      Ambil Foto
                    </button>
                    <button
                      type="button"
                      onClick={tutupKamera}
                      aria-label="Tutup kamera"
                      className="min-h-[40px] px-3 bg-white/90 text-slate-800 rounded-xl text-[12px] font-bold shadow-lg"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center px-5">
                  <ScanLine size={30} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-[12px] font-bold text-slate-200">Pemindai LJK</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Letakkan lembar jawaban pada bidang datar dengan cahaya merata.</p>
                  <button
                    type="button"
                    onClick={bukaKamera}
                    disabled={memproses}
                    className="mt-3 min-h-[40px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[12px] font-bold disabled:opacity-60"
                  >
                    Buka Kamera
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <UploadCloud size={16} className="text-slate-500" />
            <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Unggah Berkas</h3>
          </div>
          <div className="p-4">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pilihBerkas(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={memproses}
              className="w-full h-[220px] sm:h-[240px] border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-xl flex flex-col items-center justify-center text-center px-5 hover:bg-blue-50/60 transition-colors disabled:opacity-60"
            >
              <UploadCloud size={30} className="text-blue-400 mb-2" />
              <p className="text-[12px] font-bold text-slate-800">Pilih foto lembar jawaban</p>
              <p className="text-[11px] text-slate-500 mt-1">Format JPG atau PNG, maksimal 6 MB</p>
            </button>
          </div>
        </section>
      </div>

      {memproses && (
        <div className="flex items-center justify-center gap-2.5 p-5 bg-white rounded-2xl border border-slate-200 text-[12px] font-bold text-slate-600">
          <Loader2 size={17} className="animate-spin text-blue-600" /> Membaca lembar jawaban...
        </div>
      )}

      {/* Hasil pembacaan */}
      {bacaan && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Hasil Pembacaan</h3>
            <button
              type="button"
              onClick={() => { setBacaan(null); setSkorManual({}); }}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1"
            >
              <RefreshCw size={12} /> Ulangi
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Hasil di bawah adalah <b>bacaan mesin</b>, bukan keputusan nilai. Periksa dan perbaiki bila ada yang keliru sebelum menyimpan.
                {bacaan.ragu.length > 0 && <> Nomor yang diragukan: <b>{bacaan.ragu.join(", ")}</b>.</>}
                {bacaan.catatan && <> Catatan mesin: {bacaan.catatan}</>}
              </p>
            </div>

            {/* Identitas peserta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <UserRound size={12} /> Peserta Didik
                </label>
                <select
                  value={siswaId}
                  onChange={(e) => setSiswaId(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] outline-none focus:border-blue-500"
                >
                  <option value="">
                    {bacaan.nama ? `Terbaca: ${bacaan.nama} — pilih untuk memastikan` : "Pilih peserta didik"}
                  </option>
                  {daftarSiswa.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama}{s.nisn ? ` (${s.nisn})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nomor Induk Terbaca</label>
                <input
                  type="text"
                  value={bacaan.nomorInduk}
                  onChange={(e) => setBacaan({ ...bacaan, nomorInduk: e.target.value })}
                  className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] font-mono outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Jawaban per bagian */}
            {kelompok.map((k) => (
              <div key={k.tipe} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{k.romawi}. {k.label}</p>
                </div>
                <div className="p-3">
                  {k.tipe === "PG" || k.tipe === "Benar/Salah" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {k.soal.map((s, i) => {
                        const nomor = k.nomorAwal + i;
                        const jawab = bacaan.jawaban[nomor] || "";
                        const benar = jawab.trim().toLowerCase() === (s.kunci || "").trim().toLowerCase();
                        const ragu = bacaan.ragu.includes(nomor);
                        return (
                          <div key={s.id} className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500 w-6 text-right shrink-0">{nomor}.</span>
                            <input
                              type="text"
                              value={jawab}
                              onChange={(e) => ubahJawaban(nomor, e.target.value.toUpperCase())}
                              className={`w-full min-h-[38px] px-2 text-center rounded-lg border text-[12px] font-bold uppercase outline-none ${
                                ragu
                                  ? "border-amber-400 bg-amber-50"
                                  : !jawab
                                  ? "border-slate-200 bg-slate-50"
                                  : benar
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-rose-300 bg-rose-50 text-rose-700"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {k.soal.map((s, i) => {
                        const nomor = k.nomorAwal + i;
                        const bobot = s.bobot || BOBOT_DEFAULT[k.tipe];
                        return (
                          <div key={s.id} className="space-y-1.5">
                            <p className="text-[11px] font-bold text-slate-600">
                              {nomor}. {s.pertanyaan.replace(/<[^>]+>/g, " ").slice(0, 70) || "(soal)"}
                            </p>
                            <textarea
                              rows={2}
                              value={bacaan.jawaban[nomor] || ""}
                              onChange={(e) => ubahJawaban(nomor, e.target.value)}
                              placeholder="Jawaban peserta (hasil baca mesin)"
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-[12px] outline-none focus:border-blue-500 resize-y"
                            />
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-bold text-slate-500">Skor (maks {bobot})</label>
                              <input
                                type="number"
                                min={0}
                                max={bobot}
                                value={skorManual[s.id] ?? 0}
                                onChange={(e) =>
                                  setSkorManual({ ...skorManual, [s.id]: Math.min(bobot, Math.max(0, Number(e.target.value) || 0)) })
                                }
                                className="w-16 min-h-[36px] px-2 text-center bg-white border border-slate-300 rounded-lg text-[12px] font-bold outline-none focus:border-blue-500"
                              />
                              {s.panduanAI && <span className="text-[10px] text-slate-400 line-clamp-1">Pedoman: {s.panduanAI}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Rekap & simpan */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Nilai Akhir</p>
                <p className="text-2xl font-black text-slate-900 leading-tight">{hasil.nilai}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Skor {hasil.skor} dari {hasil.skorMaks} • Objektif benar {hasil.benar}/{hasil.jumlahObjektif}
                </p>
              </div>
              <button
                type="button"
                onClick={simpan}
                disabled={menyimpan}
                className="min-h-[46px] px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 active:scale-[0.98]"
              >
                {menyimpan ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan Nilai
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
