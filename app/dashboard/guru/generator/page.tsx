"use client";

export const maxDuration = 240;

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Settings, FileText, Bot, Loader2, History, FileDown,
  Printer, Coins, Link2, Trash2, CalendarDays, X, FileSpreadsheet, Cloud,
  Stamp, CheckCircle2, CloudOff, ImageIcon, AlertTriangle, ExternalLink, Shapes,
  Pencil, Library, Zap, Users2
} from "lucide-react";
import Link from "next/link";
import { Teachers } from "next/font/google";

import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import KopSurat from "@/components/KopSurat";
import EditorDokumen from "@/components/EditorDokumen";
import { useKopLembaga, kopTerisi } from "@/lib/kop";
import {
  bersihkanSvg, hitungPenandaGambar, instruksiDiagramSVG, instruksiIlustrasiRaster,
  lengkapiGambarRaster, perluDiagram, type ProgresGambar,
} from "@/lib/gambarAjar";
import {
  cariBank, kontribusiBank, tandaiDipakai, terapkanIdentitas, type EntriBank,
} from "@/lib/bankBersama";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

type StatusSimpan = "kosong" | "menyimpan" | "tersimpan" | "gagal";

export default function GeneratorBahanAjar() {
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pendidik");
  const [aiTokens, setAiTokens] = useState(0);
  const [npsnGuru, setNpsnGuru] = useState("");

  // Kop lembaga otomatis mengikuti NPSN guru.
  const { kop, lembagaDitemukan } = useKopLembaga(npsnGuru);

  const [sumber, setSumber] = useState("Kemendikdasmen (SK BSKAP 32/2024)");
  const [tipe, setTipe] = useState("Modul Ajar");
  const [fase, setFase] = useState("");
  const [kelas, setKelas] = useState("");
  const [mapel, setMapel] = useState("");
  const [topik, setTopik] = useState("");
  const [materi, setMateri] = useState("");

  // Identitas guru penyusun (milik guru, bukan lembaga).
  const [namaGuru, setNamaGuru] = useState("");
  const [nipGuru, setNipGuru] = useState("");
  const [tahunPelajaran, setTahunPelajaran] = useState("");
  const [semester, setSemester] = useState("Ganjil");

  const [metode, setMetode] = useState("");
  const [alokasiWaktu, setAlokasiWaktu] = useState("");
  const [profilPelajar, setProfilPelajar] = useState("");

  // Gambar
  const [pakaiDiagram, setPakaiDiagram] = useState(true);
  const [pakaiIlustrasi, setPakaiIlustrasi] = useState(false);
  const [progresGambar, setProgresGambar] = useState<ProgresGambar | null>(null);
  const [catatanGambar, setCatatanGambar] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasil, setHasil] = useState("");
  const [kontenHtml, setKontenHtml] = useState("");
  const [docId, setDocId] = useState("");
  const [statusSimpan, setStatusSimpan] = useState<StatusSimpan>("kosong");
  const [dokumenTerakhir, setDokumenTerakhir] = useState("");
  const [gunakanKonteks, setGunakanKonteks] = useState(false);

  // Editor WYSIWYG & Bank Bersama
  const [editorBuka, setEditorBuka] = useState(false);
  const [bankHasil, setBankHasil] = useState<(EntriBank & { skor?: number })[]>([]);
  const [bankModal, setBankModal] = useState(false);
  const [bankMemeriksa, setBankMemeriksa] = useState(false);

  const [isExportingGoogle, setIsExportingGoogle] = useState(false);
  const [googleExportType, setGoogleExportType] = useState<"Docs" | "Sheets" | null>(null);

  const [showKoleksi, setShowKoleksi] = useState(false);
  const [riwayatModul, setRiwayatModul] = useState<any[]>([]);

  const pdfRef = useRef<HTMLDivElement>(null);
  /** Konten yang sudah benar-benar tersimpan, pembanding untuk auto-save. */
  const kontenTersimpanRef = useRef("");
  /** Metadata terbaru, agar auto-save tidak memakai nilai closure yang basi. */
  const metaRef = useRef<any>({});

  const isLandscape = tipe === "PROMES" || tipe === "PROTA" || tipe === "ATP";
  const mapelPerluDiagram = perluDiagram(mapel);

  const p5Kemendikbud: string[] = ["Semua Dimensi P5", "Beriman, Bertakwa & Berakhlak Mulia", "Berkebinekaan Global", "Bergotong Royong", "Mandiri", "Bernalar Kritis", "Kreatif"];
  const p5Kemenag: string[] = ["Semua Nilai P5 & PPRA", "Berkeadaban (Ta'addub)", "Keteladanan (Qudwah)", "Kewarganegaraan (Muwatana)", "Mengambil jalan tengah (Tawassut)", "Berimbang (Tawazun)", "Lurus dan tegas (I'tidal)", "Kesetaraan (Musawa)"];

  const opsiKelas: Record<string, string[]> = {
    "Fase PAUD": ["TK A", "TK B"],
    "Fase A": ["Kelas 1", "Kelas 2"],
    "Fase B": ["Kelas 3", "Kelas 4"],
    "Fase C": ["Kelas 5", "Kelas 6"],
    "Fase D": ["Kelas 7", "Kelas 8", "Kelas 9"],
    "Fase E": ["Kelas 10"],
    "Fase F": ["Kelas 11", "Kelas 12"],
  };

  const opsiTipeDokumen = ["Modul Ajar", "RPP", "ATP", "PROMES", "PROTA", "LKPD", "Bahan Bacaan Siswa", "Rubrik Penilaian"];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(getAuth(), (user) => {
      if (!user) return;
      setUserUid(user.uid);

      const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        setUserName(data.nama || "Pendidik");
        setNamaGuru((prev) => prev || data.nama || "");
        setNipGuru((prev) => prev || data.nip || "");
        setAiTokens(data.aiTokens || 0);
        setNpsnGuru(data.npsn || data.instansi || "");
      });

      const qRiwayat = query(
        collection(db, "modul_ajar"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const unsubRiwayat = onSnapshot(qRiwayat, (snapshot) => {
        setRiwayatModul(
          snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }) as any)
            .filter((d) => !String(d.tipe || "").match(/Asesmen|Bank Soal|Kisi/))
        );
      });

      return () => { unsubProfil(); unsubRiwayat(); };
    });
    return () => unsubscribeAuth();
  }, []);

  // Tahun pelajaran & semester mengikuti setelan lembaga bila guru belum mengubahnya.
  useEffect(() => {
    if (kop.tahunPelajaran) setTahunPelajaran((prev) => prev || kop.tahunPelajaran);
    if (kop.semester) setSemester((prev) => prev || kop.semester);
  }, [kop.tahunPelajaran, kop.semester]);

  // Diagram hanya relevan untuk mapel eksakta; jangan memaksakan pada mapel lain.
  useEffect(() => setPakaiDiagram(mapelPerluDiagram), [mapelPerluDiagram]);

  useEffect(() => {
    metaRef.current = {
      sumber, tipe, fase, kelas, mapel, topik, materi, namaGuru, nipGuru,
      tahunPelajaran, semester, npsn: npsnGuru,
      namaSekolah: kop.namaLembaga, kotaSekolah: kop.kota,
      namaKepsek: kop.namaKepala, nipKepsek: kop.nipKepala,
    };
  }, [sumber, tipe, fase, kelas, mapel, topik, materi, namaGuru, nipGuru, tahunPelajaran, semester, npsnGuru, kop]);

  /* ------------------------- SIMPAN OTOMATIS ------------------------- */

  const simpanOtomatis = useCallback(async (konten: string, html: string) => {
    const uid = getAuth().currentUser?.uid;
    if (!uid || !konten) return;

    setStatusSimpan("menyimpan");
    try {
      const muatan = { konten, kontenHtml: html || "", ...metaRef.current, diperbaruiPada: serverTimestamp() };
      if (docId) {
        await updateDoc(doc(db, "modul_ajar", docId), muatan);
      } else {
        const docRef = await addDoc(collection(db, "modul_ajar"), {
          userId: uid,
          ...muatan,
          statusValidasi: "menunggu",
          createdAt: serverTimestamp(),
        });
        setDocId(docRef.id);
      }
      kontenTersimpanRef.current = konten + "\u0000" + (html || "");
      setStatusSimpan("tersimpan");
    } catch (error) {
      console.error("Gagal menyimpan otomatis:", error);
      setStatusSimpan("gagal");
    }
  }, [docId]);

  // Setiap perubahan konten/hasil-edit disimpan sendiri setelah jeda singkat —
  // guru tidak perlu menekan tombol simpan sama sekali.
  useEffect(() => {
    if (!hasil) return;
    if (hasil + "\u0000" + kontenHtml === kontenTersimpanRef.current) return;
    const timer = setTimeout(() => { void simpanOtomatis(hasil, kontenHtml); }, 1200);
    return () => clearTimeout(timer);
  }, [hasil, kontenHtml, simpanOtomatis]);

  /* ---------------------------- BANK BERSAMA ---------------------------- */

  // Sebelum menghabiskan token, tawarkan perangkat serupa dari Bank Bersama.
  const mulaiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid) { alert("Sesi Anda tidak valid. Silakan login ulang."); return; }
    if (!materi || !fase || !kelas || !mapel) { alert("Mohon lengkapi Fase, Kelas, Mata Pelajaran, dan Materi Spesifik."); return; }

    setBankMemeriksa(true);
    const cocok = await cariBank({ tipe, mapel, materi, topik });
    setBankMemeriksa(false);

    if (cocok.length > 0) {
      setBankHasil(cocok);
      setBankModal(true);
      return;
    }
    await generateSekarang();
  };

  const identitasKu = () => ({
    namaGuru, namaSekolah: kop.namaLembaga, kota: kop.kota, tahunPelajaran,
  });

  const muatDariBank = async (entri: EntriBank) => {
    const konten = terapkanIdentitas(entri.konten, identitasKu());
    setBankModal(false);
    setHasil(konten);
    setDokumenTerakhir(konten);
    setKontenHtml("");
    setDocId("");
    setCatatanGambar([]);
    kontenTersimpanRef.current = "";
    setStatusSimpan("kosong");
    void tandaiDipakai(entri.id);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 150);
  };

  /* ---------------------------- GENERATE ---------------------------- */

  const generateSekarang = async () => {
    setBankModal(false);
    if (!userUid) return;
    if (aiTokens <= 0) { alert("Sisa Token AI Anda habis."); return; }

    setIsGenerating(true);
    setHasil("");
    setKontenHtml("");
    setDocId("");
    setCatatanGambar([]);
    setStatusSimpan("kosong");
    kontenTersimpanRef.current = "";
    const startTime = Date.now();

    let sistemPrompt = `Anda adalah Ahli Penyusun Kurikulum Pendidikan Nasional Indonesia. Buatlah dokumen menggunakan format Markdown (tabel, bold, list) yang sangat rapi dan terstruktur secara formal.\n`;
    sistemPrompt += `ATURAN FORMAT JARAK & TABEL MUTLAK:\n`;
    sistemPrompt += `1. Setiap Sub-bab atau Judul Poin WAJIB diberi baris baru (ENTER dua kali) sebelum menuliskan isinya di area teks biasa.\n`;
    sistemPrompt += `2. KHUSUS DI DALAM SEL TABEL: Anda DILARANG KERAS menggunakan ENTER atau karakter \\n. Untuk daftar bernomor atau baris baru di dalam SATU SEL TABEL, WAJIB MENGGUNAKAN tag HTML <br/>.\n`;
    sistemPrompt += `Contoh penulisan di dalam tabel yang benar: 1. Berdoa<br/>2. Apersepsi<br/>3. Motivasi.\n`;
    sistemPrompt += `3. JANGAN membuat kop surat, kepala sekolah, atau kolom tanda tangan — sistem sudah menambahkannya secara otomatis.\n`;

    if (pakaiDiagram) sistemPrompt += `\n${instruksiDiagramSVG(mapel)}\n`;
    if (pakaiIlustrasi) sistemPrompt += `\n${instruksiIlustrasiRaster()}\n`;

    if (sumber.includes("BSKAP")) {
      sistemPrompt += `PENTING: Rujuk pada SK BSKAP No. 32 Tahun 2024 tentang Capaian Pembelajaran (CP) Kurikulum Merdeka.\n`;
    } else {
      sistemPrompt += `PENTING: Rujuk pada regulasi KMA No. 1503 Tahun 2025 terbaru terkait Capaian Pembelajaran dan integrasi PPRA Madrasah.\n`;
    }

    let topikKirim = `Buatlah dokumen **${tipe}**.\n\n`;

    if (tipe === "Modul Ajar") {
      topikKirim += `STRUKTUR WAJIB MODUL AJAR:\n`;
      topikKirim += `1. INFORMASI UMUM. Buatlah TABEL Informasi Umum berisi kolom Komponen dan Keterangan dengan data berikut:\n`;
      topikKirim += `   - Penyusun: ${namaGuru || "(Nama Guru Penyusun)"}\n`;
      topikKirim += `   - Institusi: ${kop.namaLembaga || "(Nama Sekolah)"}\n`;
      topikKirim += `   - Tahun Pelajaran: ${tahunPelajaran || "(Tahun Pelajaran)"}\n`;
      topikKirim += `   - Jenjang Sekolah: (Isi sesuai fase)\n`;
      topikKirim += `   - Mata Pelajaran: ${mapel}\n`;
      topikKirim += `   - Fase / Kelas: ${fase} / ${kelas} (Semester ${semester})\n`;
      topikKirim += `   - Materi Pokok: ${materi}\n`;
      topikKirim += `   - Alokasi Waktu: ${alokasiWaktu || "(Isi alokasi waktu yang sesuai)"}\n\n`;
      topikKirim += `Setelah tabel identitas, lanjutkan Informasi Umum dengan sub-judul: Kompetensi Awal, P5/PPRA (${profilPelajar || "Sesuaikan"}), Sarpras, Target Peserta Didik, dan Model Pembelajaran (${metode || "Sesuaikan"}).\n`;
      topikKirim += `2. KOMPONEN INTI (Tujuan Pembelajaran, Pemahaman Bermakna, Pertanyaan Pemantik, Tabel Kegiatan Pembelajaran [Pendahuluan, Inti, Penutup], Asesmen, Pengayaan & Remedial)\n`;
      topikKirim += `Peringatan: Pada Tabel Kegiatan Pembelajaran, HANYA gunakan <br/> sebagai pemisah baris di dalam sel!\n`;
      topikKirim += `3. LAMPIRAN (Lembar Kerja Peserta Didik, Rubrik, Bahan Bacaan, Daftar Pustaka).\n`;
    } else if (tipe === "PROMES" || tipe === "PROTA") {
      const bulanGanjil = "Jul 1|Jul 2|Jul 3|Jul 4|Jul 5|Agu 1|Agu 2|Agu 3|Agu 4|Agu 5|Sep 1|Sep 2|Sep 3|Sep 4|Sep 5|Okt 1|Okt 2|Okt 3|Okt 4|Okt 5|Nov 1|Nov 2|Nov 3|Nov 4|Nov 5|Des 1|Des 2|Des 3|Des 4|Des 5";
      const bulanGenap = "Jan 1|Jan 2|Jan 3|Jan 4|Jan 5|Feb 1|Feb 2|Feb 3|Feb 4|Feb 5|Mar 1|Mar 2|Mar 3|Mar 4|Mar 5|Apr 1|Apr 2|Apr 3|Apr 4|Apr 5|Mei 1|Mei 2|Mei 3|Mei 4|Mei 5|Jun 1|Jun 2|Jun 3|Jun 4|Jun 5";
      const kalender = semester === "Ganjil" ? bulanGanjil : bulanGenap;
      topikKirim += `STRUKTUR WAJIB PROMES/PROTA:\n`;
      topikKirim += `Buatlah Judul "MATRIKS PROGRAM SEMESTER", lalu TABEL Matriks.\n`;
      topikKirim += `Kolom Tabel WAJIB PERSIS: No | Tema / Materi | Sub-Tema | JP | ${kalender}\n`;
      topikKirim += `Isi sel matriks dengan tanda centang (✓) pada minggu efektif.\n`;
    } else {
      topikKirim += `**IDENTITAS DOKUMEN**\n- Mata Pelajaran: ${mapel}\n- Fase / Kelas: ${fase} / ${kelas}\n- Tahun Pelajaran: ${tahunPelajaran} (Semester ${semester})\n- Materi Pokok: ${materi}\n\n`;
      if (tipe === "RPP") {
        topikKirim += `STRUKTUR WAJIB:\n1. Identitas\n2. Tujuan Pembelajaran\n3. Tabel Langkah Pembelajaran (Tahap, Deskripsi Kegiatan Guru & Siswa, Alokasi Waktu)\n4. Penilaian.\n`;
      } else if (tipe === "ATP") {
        topikKirim += `STRUKTUR WAJIB:\nTABEL Alur Tujuan Pembelajaran dengan kolom: Elemen | Tujuan Pembelajaran | Alokasi Waktu | Profil Pelajar Pancasila.\n`;
      } else if (tipe === "LKPD") {
        topikKirim += `STRUKTUR WAJIB:\nJudul LKPD, Identitas Peserta Didik (Nama, Kelas, Tanggal — sediakan titik-titik isian), Tujuan Kegiatan, Alat & Bahan, Langkah Kerja (Sistematis), TABEL Pengamatan (No | Aspek | Hasil [Biarkan Kosong]), Pertanyaan Analisis, dan Kesimpulan.\n`;
        if (pakaiDiagram) topikKirim += `LKPD ini WAJIB memuat minimal satu diagram SVG yang harus diamati atau dilengkapi peserta didik.\n`;
      } else if (tipe === "Bahan Bacaan Siswa") {
        topikKirim += `STRUKTUR WAJIB:\nJudul Materi, Tujuan, Peta Konsep (Bulleted List), Uraian Materi (Lengkap dan menarik), Rangkuman, Latihan Mandiri.\n`;
      } else if (tipe === "Rubrik Penilaian") {
        topikKirim += `STRUKTUR WAJIB:\nTABEL Rubrik Penilaian dengan kolom: Aspek Penilaian | Skor 4 (Sangat Baik) | Skor 3 (Baik) | Skor 2 (Cukup) | Skor 1 (Kurang).\n`;
      }
    }

    if (gunakanKonteks && dokumenTerakhir) {
      topikKirim += `\n\n[KONTEKS SINKRONISASI]:\nSelaraskan materi pada dokumen ini dengan referensi berikut:\n"""\n${dokumenTerakhir.substring(0, 2000)}\n"""\n`;
    }

    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          model: "gemini-2.5-pro",
          messages: [{ role: "system", content: sistemPrompt }, { role: "user", content: topikKirim }],
        }),
      });
      const data = await response.json();

      if (!data.choices?.length) throw new Error(data.error || "Respons AI kosong atau API Key belum diset.");

      let konten = data.choices[0].message.content as string;
      const tokenUsed = data.usage?.total_tokens || 0;

      setHasil(konten);
      setDokumenTerakhir(konten);

      if (tokenUsed > 0) {
        await addDoc(collection(db, "ai_logs"), {
          aksi: `Generate ${tipe}`, pengguna: userName, role: "guru", status: "Sukses",
          latensi: Date.now() - startTime, tokenDipakai: tokenUsed, timestamp: serverTimestamp(),
        });
      }

      // Ilustrasi raster dibuat setelah teks selesai agar guru tidak menunggu dua kali.
      if (pakaiIlustrasi && hitungPenandaGambar(konten).length > 0) {
        const hasilGambar = await lengkapiGambarRaster(konten, {
          mapel, jenjang: `${fase} / ${kelas}`,
          onProgres: (p) => setProgresGambar(p),
        });
        setProgresGambar(null);
        setHasil(hasilGambar.konten);
        setDokumenTerakhir(hasilGambar.konten);
        konten = hasilGambar.konten;
        if (hasilGambar.pesanGagal.length) setCatatanGambar(hasilGambar.pesanGagal);
      }

      // Sumbangkan ke Bank Bersama (identitas dibuang) agar guru lain hemat token.
      void kontribusiBank({
        tipe, mapel, fase, kelas, topik, materi, konten, identitas: identitasKu(),
      });
    } catch (error: any) {
      alert("Gagal memproses AI: " + error.message);
    } finally {
      setIsGenerating(false);
      setProgresGambar(null);
    }
  };

  const handleOpenRiwayat = (riwayat: any) => {
    setTipe(riwayat.tipe || "Modul Ajar");
    setTopik(riwayat.topik || "");
    setMateri(riwayat.materi || "");
    setMapel(riwayat.mapel || "");
    setFase(riwayat.fase || "");
    setKelas(riwayat.kelas || "");
    setHasil(riwayat.konten || "");
    setKontenHtml(riwayat.kontenHtml || "");
    setDocId(riwayat.id);
    setDokumenTerakhir(riwayat.konten || "");
    kontenTersimpanRef.current = (riwayat.konten || "") + "\u0000" + (riwayat.kontenHtml || "");
    setStatusSimpan("tersimpan");
    setShowKoleksi(false);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  };

  const hapusRiwayat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Yakin ingin menghapus dokumen ini dari koleksi?")) return;
    await deleteDoc(doc(db, "modul_ajar", id));
    if (docId === id) {
      setHasil(""); setKontenHtml(""); setDocId(""); kontenTersimpanRef.current = ""; setStatusSimpan("kosong");
    }
  };

  /* ----------------------------- EKSPOR ----------------------------- */

  const handleExportToGoogle = async (type: "Docs" | "Sheets") => {
    if (!pdfRef.current) return;
    setIsExportingGoogle(true);
    setGoogleExportType(type);
    try {
      const formattedHtml = `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5;">${pdfRef.current.innerHTML}</div>`;
      const blobHtml = new Blob([formattedHtml], { type: "text/html" });
      await navigator.clipboard.write([new window.ClipboardItem({ "text/html": blobHtml })]);
      setTimeout(() => {
        setIsExportingGoogle(false);
        setGoogleExportType(null);
        alert(`✅ BERHASIL!\n\nFormat dokumen telah tersalin ke memori perangkat.\nSilakan tekan CTRL + V pada lembar kosong Google ${type}.`);
        window.open(type === "Docs" ? "https://docs.new" : "https://sheets.new", "_blank");
      }, 1500);
    } catch {
      setIsExportingGoogle(false);
      setGoogleExportType(null);
      alert("Browser Anda tidak mendukung penyalinan otomatis. Gunakan tombol 'Word'.");
    }
  };

  const handleDownloadExcel = () => {
    if (!pdfRef.current) return;
    const html = pdfRef.current.innerHTML.replace(/class="markdown-body"/g, "");
    const excelTemplate = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid black;padding:5px;vertical-align:top}th{background-color:#f2f2f2;font-weight:bold;text-align:center}.header-table td,.header-table th{border:none!important;font-weight:bold}.sig-table td,.sig-table th{border:none!important}</style></head><body>${html}</body></html>`;
    const url = URL.createObjectURL(new Blob([excelTemplate], { type: "application/vnd.ms-excel" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipe}_${mapel || "Dokumen"}.xls`.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadWord = () => {
    if (!pdfRef.current) return;
    const printNode = pdfRef.current.cloneNode(true) as HTMLElement;

    printNode.querySelectorAll("table").forEach((table) => {
      if (table.classList.contains("sig-table") || table.classList.contains("header-table")) return;
      table.querySelectorAll("th").forEach((th) => {
        const text = th.innerText.trim().toLowerCase();
        if (text === "no" || text === "no.") th.style.width = "3%";
        else if (/tema|materi|tujuan|elemen|capaian/.test(text)) th.style.width = "25%";
        else if (/skor|nilai/.test(text)) th.style.width = "15%";
      });
    });

    const printHtml = printNode.innerHTML.replace(/class="markdown-body"/g, "");
    const cssOrientation = `@page WordSection1 { size: ${isLandscape ? "841.9pt 595.3pt" : "595.3pt 841.9pt"}; mso-page-orientation: ${isLandscape ? "landscape" : "portrait"}; margin: 2.54cm; } div.WordSection1 { page: WordSection1; }`;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Dokumen</title><style>${cssOrientation} body,p,li,td,th,h1,h2,h3,h4,div{font-family:'Times New Roman',serif!important;font-size:11pt!important;color:black!important;line-height:1.5;text-align:justify}h1{font-size:14pt!important;font-weight:bold!important;margin-bottom:12pt;text-align:center;text-transform:uppercase}h2,h3{font-size:12pt!important;font-weight:bold!important;margin-top:12pt;margin-bottom:6pt;text-align:left}table{width:100%;border-collapse:collapse;margin-top:10pt;margin-bottom:15pt;border:1pt solid black!important;word-wrap:break-word}table.promes-table{font-size:8pt!important}table.promes-table th,table.promes-table td{padding:2pt!important}td,th{border:1pt solid black!important;padding:4pt 8pt;vertical-align:top;text-align:left}th{background-color:#f2f2f2;font-weight:bold!important;text-align:center}p{margin-bottom:10pt}li{margin-bottom:6pt;text-align:justify}img{max-width:320px;height:auto;display:block;margin:10pt auto}svg{max-width:100%;height:auto}.kop-surat table,.kop-surat td,.header-table,.header-table td,.header-table th{border:none!important;padding:2pt!important}.sig-table,.sig-table td,.sig-table th,.sig-table tr{border:none!important}</style></head><body><div class="WordSection1">${printHtml}</div></body></html>`;
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = "data:application/vnd.ms-word;charset=utf-8," + encodeURIComponent(header);
    a.download = `${tipe}_${mapel || "Dokumen"}.doc`.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPDF = () => {
    if (!pdfRef.current) return;
    const printContent = pdfRef.current.innerHTML;
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = isLandscape ? "297mm" : "210mm";
    iframe.style.height = "100vh";
    document.body.appendChild(iframe);
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`<html><head><title>Cetak PDF</title><style>@page{size:A4 ${isLandscape ? "landscape" : "portrait"};margin:1.5cm}body{font-family:'Times New Roman',serif!important;font-size:11pt!important;line-height:1.5!important;color:#000;text-align:justify}h1{text-align:center;font-size:14pt;margin-bottom:1.5rem;font-weight:bold;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-top:1rem;margin-bottom:1.5rem;border:1pt solid #000;word-wrap:break-word}table.promes-table{font-size:9px!important}table.promes-table th,table.promes-table td{padding:4px!important}th,td{border:1pt solid #000;padding:6px 8px;text-align:left;vertical-align:top}th{background-color:#f1f5f9;font-weight:bold;text-align:center}tr{page-break-inside:avoid}h2,h3,h4{page-break-after:avoid;margin-top:1rem;margin-bottom:.5rem;font-weight:bold;text-align:left}ul,ol{margin-left:20px;margin-bottom:10px}li{margin-bottom:6px;text-align:justify}p{margin-bottom:10px}img{max-width:320px;height:auto;display:block;margin:10px auto;page-break-inside:avoid}svg{max-width:100%;height:auto;page-break-inside:avoid}.kop-surat table,.kop-surat td,.header-table td,.header-table th{border:none!important;padding:4px}.sig-table,.sig-table td,.sig-table th,.sig-table tr{border:none!important;padding:4px;vertical-align:top}</style></head><body>${printContent}</body></html>`);
    iframe.contentWindow?.document.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  const sanitasiHasil = bersihkanSvg(hasil);
  const judulDokumenCetak = isLandscape
    ? `PROGRAM ${tipe === "PROMES" ? "SEMESTER" : "TAHUNAN"}`
    : tipe.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-6xl mx-auto space-y-4 md:space-y-5 pb-4"
    >
      <AnimatePresence>
        {isExportingGoogle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-white/85 backdrop-blur-sm p-4">
            <div className="flex flex-col items-center text-center p-6 sm:p-8 bg-white shadow-2xl rounded-2xl border border-slate-200 max-w-sm">
              <div className="w-16 h-16 relative flex items-center justify-center mb-4">
                <Loader2 size={44} className={`${googleExportType === "Docs" ? "text-blue-500" : "text-emerald-500"} animate-spin absolute`} />
                <Cloud size={20} className={googleExportType === "Docs" ? "text-blue-600" : "text-emerald-600"} />
              </div>
              <h3 className={`font-bold text-base sm:text-lg text-slate-800 ${teachersFont.className}`}>Menyiapkan Format Dokumen</h3>
              <p className="text-xs text-slate-500 mt-2">Menyalin tabel dan struktur teks ke memori perangkat.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>
            Generator Perangkat Ajar
          </h1>
          <p className="text-slate-500 text-[12px] sm:text-sm mt-1.5 leading-relaxed">
            Modul Ajar, RPP, LKPD, dan dokumen pedagogi lain. Soal & kisi-kisi ada di menu Asesmen.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowKoleksi(true)}
            className="flex-1 sm:flex-none min-h-[40px] flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3.5 rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <History size={14} /> Koleksi
          </button>
          <div className="flex-1 sm:flex-none min-h-[40px] flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3.5 rounded-xl text-xs font-bold shadow-sm">
            <Coins size={14} className="text-amber-500" /> {aiTokens.toLocaleString("id-ID")}
          </div>
        </div>
      </header>

      {/* STATUS KOP LEMBAGA */}
      <StatusKop kop={kop} npsn={npsnGuru} lembagaDitemukan={lembagaDitemukan} />

      {/* KOLEKSI */}
      <AnimatePresence>
        {showKoleksi && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <History size={17} className="text-blue-600" /> Koleksi Dokumen Saya
                </h3>
                <button onClick={() => setShowKoleksi(false)} aria-label="Tutup" className="text-slate-400 hover:text-rose-600 bg-white p-2 rounded-lg border border-slate-200">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {riwayatModul.length > 0 ? (
                    riwayatModul.map((riwayat) => (
                      <div
                        key={riwayat.id}
                        onClick={() => handleOpenRiwayat(riwayat)}
                        className={`flex flex-col p-3.5 rounded-xl border transition-all cursor-pointer ${
                          docId === riwayat.id ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">{riwayat.tipe}</span>
                          <button onClick={(e) => hapusRiwayat(e, riwayat.id)} aria-label="Hapus dokumen" className="text-slate-300 hover:text-rose-500 p-1 shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <span className="font-bold text-slate-800 text-[13px] leading-snug line-clamp-2">{riwayat.materi || riwayat.topik || "Dokumen Tanpa Judul"}</span>
                        <span className="text-[11px] text-slate-500 mt-2.5 border-t border-slate-100 pt-2 truncate">{riwayat.mapel} • {riwayat.kelas}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <FileText size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500 font-medium">Belum ada dokumen tersimpan.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FORM PARAMETER */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
          <Settings size={17} className="text-slate-600" />
          <h2 className={`text-sm font-bold text-slate-800 uppercase tracking-wide ${teachersFont.className}`}>Parameter Dokumen</h2>
        </div>

        <form onSubmit={mulaiGenerate} className="p-4 sm:p-5 md:p-6 space-y-5 md:space-y-6">
          {/* Jenis dokumen */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">1. Jenis Dokumen</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
              {opsiTipeDokumen.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTipe(item)}
                  className={`shrink-0 min-h-[40px] py-2 px-3.5 text-xs font-bold rounded-xl transition-colors border ${
                    tipe === item ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {/* Kurikulum & materi */}
            <div className="bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">
                2. Kurikulum & Materi
              </p>

              <Bidang label="Standar Kurikulum">
                <select value={sumber} onChange={(e) => setSumber(e.target.value)} className={kelasInput}>
                  <option value="Kemendikdasmen (SK BSKAP 32/2024)">Kemendikdasmen (SK BSKAP 32/2024)</option>
                  <option value="Kementerian Agama (KMA)">Kementerian Agama (KMA 1503/2025)</option>
                </select>
              </Bidang>

              <div className="grid grid-cols-2 gap-3">
                <Bidang label="Fase">
                  <select value={fase} onChange={(e) => { setFase(e.target.value); setKelas(""); }} required className={kelasInput}>
                    <option value="">Pilih Fase</option>
                    {Object.keys(opsiKelas).map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Bidang>
                <Bidang label="Kelas">
                  <select value={kelas} onChange={(e) => setKelas(e.target.value)} disabled={!fase} required className={`${kelasInput} disabled:bg-slate-100 disabled:text-slate-400`}>
                    <option value="">Pilih Kelas</option>
                    {fase && opsiKelas[fase]?.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </Bidang>
              </div>

              <Bidang label="Mata Pelajaran">
                <input type="text" value={mapel} onChange={(e) => setMapel(e.target.value)} placeholder="Cth: Matematika / Biologi" required className={kelasInput} />
              </Bidang>
              <Bidang label="Elemen CP / Topik (opsional)">
                <input type="text" value={topik} onChange={(e) => setTopik(e.target.value)} placeholder="Cth: Bilangan / Geometri" className={kelasInput} />
              </Bidang>
              <Bidang label="Materi Spesifik">
                <input type="text" value={materi} onChange={(e) => setMateri(e.target.value)} placeholder="Cth: Luas dan Keliling Segitiga" required className={kelasInput} />
              </Bidang>
            </div>

            {/* Identitas & gambar */}
            <div className="flex flex-col gap-4 md:gap-5">
              <div className="bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">
                  3. Identitas Penyusun
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Bidang label="Nama Guru">
                    <input type="text" value={namaGuru} onChange={(e) => setNamaGuru(e.target.value)} className={kelasInput} />
                  </Bidang>
                  <Bidang label="NIP Guru">
                    <input type="text" value={nipGuru} onChange={(e) => setNipGuru(e.target.value)} className={`${kelasInput} font-mono`} />
                  </Bidang>
                  <Bidang label="Tahun Pelajaran">
                    <input type="text" value={tahunPelajaran} onChange={(e) => setTahunPelajaran(e.target.value)} placeholder="2026/2027" className={kelasInput} />
                  </Bidang>
                  <Bidang label="Semester">
                    <select value={semester} onChange={(e) => setSemester(e.target.value)} className={kelasInput}>
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </Bidang>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Nama sekolah, kepala sekolah, dan kota penandatanganan diambil otomatis dari Kop Lembaga.
                </p>
              </div>

              {/* Gambar & diagram */}
              <div className="bg-blue-50/40 p-4 sm:p-5 rounded-xl border border-blue-100 space-y-3">
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-widest border-b border-blue-100 pb-2 flex items-center gap-1.5">
                  <ImageIcon size={13} /> 4. Gambar & Diagram
                </p>

                <SaklarOpsi
                  aktif={pakaiDiagram}
                  onUbah={setPakaiDiagram}
                  ikon={Shapes}
                  judul="Diagram presisi (SVG)"
                  keterangan="Bangun datar/ruang, garis bilangan, bidang koordinat, grafik. Tajam saat dicetak."
                  disarankan={mapelPerluDiagram}
                />
                <SaklarOpsi
                  aktif={pakaiIlustrasi}
                  onUbah={setPakaiIlustrasi}
                  ikon={ImageIcon}
                  judul="Ilustrasi kontekstual (AI)"
                  keterangan="Gambar situasi nyata pendukung soal cerita. Memakai token tambahan per gambar."
                />
              </div>

              <AnimatePresence mode="popLayout">
                {(tipe === "Modul Ajar" || tipe === "RPP") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 sm:p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3 overflow-hidden"
                  >
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest border-b border-emerald-100 pb-2">5. Pengaturan Modul</p>
                    <Bidang label="Model Pendekatan">
                      <select value={metode} onChange={(e) => setMetode(e.target.value)} className={kelasInput}>
                        <option value="">Rekomendasi AI</option>
                        <option value="Problem Based Learning (PBL)">PBL</option>
                        <option value="Project Based Learning (PjBL)">PjBL</option>
                        <option value="Discovery Learning">Discovery Learning</option>
                      </select>
                    </Bidang>
                    <Bidang label="Fokus P5 / PPRA">
                      <select value={profilPelajar} onChange={(e) => setProfilPelajar(e.target.value)} className={kelasInput}>
                        <option value="">Pilih Fokus (opsional)</option>
                        {(sumber.includes("Agama") ? p5Kemenag : p5Kemendikbud).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </Bidang>
                    <Bidang label="Alokasi Waktu">
                      <input type="text" value={alokasiWaktu} onChange={(e) => setAlokasiWaktu(e.target.value)} placeholder="Cth: 2 JP x 45 Menit" className={kelasInput} />
                    </Bidang>
                  </motion.div>
                )}

                {(tipe === "PROMES" || tipe === "PROTA") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-5 bg-slate-50/80 border border-slate-200 rounded-xl text-center overflow-hidden"
                  >
                    <CalendarDays size={30} className="mx-auto text-slate-400 mb-3" />
                    <p className="text-[13px] font-bold text-slate-800 mb-1.5">Format Kaldik Terpadu</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Matriks alokasi minggu efektif disusun otomatis dalam orientasi lanskap.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {dokumenTerakhir && (
            <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input type="checkbox" checked={gunakanKonteks} onChange={(e) => setGunakanKonteks(e.target.checked)} className="mt-0.5 w-5 h-5 text-slate-800 rounded border-slate-300 cursor-pointer" />
              <div>
                <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><Link2 size={15} /> Selaraskan dengan Dokumen Sebelumnya</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Agar materi nyambung dengan dokumen yang baru saja dibuat.</p>
              </div>
            </label>
          )}

          <button
            type="submit"
            disabled={isGenerating || bankMemeriksa}
            className={`w-full min-h-[52px] rounded-xl text-sm font-black tracking-wider uppercase text-white transition-colors shadow-md flex items-center justify-center gap-2 active:scale-[0.98] ${
              isGenerating || bankMemeriksa ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {bankMemeriksa ? <><Loader2 size={20} className="animate-spin" /> Memeriksa Bank Bersama...</>
              : isGenerating ? <><Loader2 size={20} className="animate-spin" /> Menyusun Dokumen...</>
              : <><Bot size={20} /> Generate Dokumen AI</>}
          </button>
          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <Library size={12} /> Sistem memeriksa Bank Bersama dulu — jika ada yang cocok, Anda bisa memuatnya tanpa token.
          </p>
        </form>
      </section>

      {/* KANVAS HASIL */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen size={18} className="text-slate-600 shrink-0" />
            <div className="min-w-0">
              <h2 className={`font-bold text-slate-800 text-sm uppercase tracking-wide ${teachersFont.className}`}>Kanvas Tinjauan</h2>
              <IndikatorSimpan status={statusSimpan} />
            </div>
          </div>

          {hasil && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible">
              {isLandscape ? (
                <>
                  <TombolEkspor onClick={handleDownloadExcel} ikon={FileSpreadsheet} label="Excel" />
                  <TombolEkspor onClick={() => handleExportToGoogle("Sheets")} ikon={Cloud} label="G-Sheets" nuansa="emerald" />
                </>
              ) : (
                <>
                  <TombolEkspor onClick={handleDownloadWord} ikon={FileDown} label="Word" />
                  <TombolEkspor onClick={() => handleExportToGoogle("Docs")} ikon={Cloud} label="G-Docs" nuansa="blue" />
                </>
              )}
              <TombolEkspor onClick={handlePrintPDF} ikon={Printer} label="Cetak PDF" />
              <button
                onClick={() => setEditorBuka(true)}
                className="shrink-0 min-h-[40px] px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border shadow-sm bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
              >
                <Pencil size={15} /> Edit Dokumen
              </button>
            </div>
          )}
        </div>

        {catatanGambar.length > 0 && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <p className="font-bold flex items-center gap-1.5 mb-1"><AlertTriangle size={13} /> Sebagian ilustrasi gagal dibuat</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {catatanGambar.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        <div className="bg-slate-100 p-3 sm:p-5 md:p-8 relative min-h-[360px]">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/92 backdrop-blur-sm z-10 px-6 text-center">
              <div className="relative w-16 h-16 flex items-center justify-center mb-5">
                <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full border-t-transparent animate-spin" />
                <Bot size={22} className="text-slate-800" />
              </div>
              <p className="font-bold text-slate-800 text-sm sm:text-base uppercase tracking-widest">
                {progresGambar ? "Membuat Ilustrasi..." : "Menyusun Dokumen..."}
              </p>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                {progresGambar
                  ? `Gambar ${Math.min(progresGambar.selesai + 1, progresGambar.total)} dari ${progresGambar.total}${progresGambar.deskripsi ? `: ${progresGambar.deskripsi}` : ""}`
                  : `Mengkalibrasi standar ${sumber.split(" ")[0]}`}
              </p>
            </div>
          ) : hasil ? (
            <div className={`bg-white shadow-lg border border-slate-300 p-4 sm:p-8 md:p-12 mx-auto overflow-x-auto ${isLandscape ? "w-full" : "max-w-4xl"}`}>
              <div ref={pdfRef} className="pdf-container">
                <style>{`
                  .pdf-container { font-family: 'Times New Roman', Times, serif !important; font-size: 13px; line-height: 1.6 !important; color: #000; }
                  @media (min-width: 768px) { .pdf-container { font-size: 12pt; } }
                  .markdown-body p { margin-bottom: .8rem; text-align: justify; }
                  .markdown-body table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; word-wrap: break-word; }
                  .markdown-body table.promes-table { font-size: 9pt !important; }
                  .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 6px 10px; text-align: left; vertical-align: top; overflow-wrap: break-word; }
                  .markdown-body th { background-color: #f8fafc; font-weight: bold; text-align: center; }
                  .markdown-body tr { page-break-inside: avoid; }
                  .markdown-body h1 { font-size: 1.2em; font-weight: bold; text-align: center; margin-bottom: 1.2rem; text-transform: uppercase; }
                  .markdown-body h2 { font-size: 1.08em; margin-top: 1.4rem; margin-bottom: .5rem; font-weight: bold; text-transform: uppercase; }
                  .markdown-body h3 { font-size: 1em; margin-top: 1rem; margin-bottom: .4rem; font-weight: bold; }
                  .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 1rem; margin-top: .4rem; text-align: justify; }
                  .markdown-body li { margin-bottom: .4rem; text-align: justify; }
                  .markdown-body img { max-width: 320px; width: 100%; height: auto; display: block; margin: 12px auto; page-break-inside: avoid; }
                  .markdown-body svg { max-width: 100%; height: auto; display: block; margin: 12px auto; page-break-inside: avoid; }
                  .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; margin-bottom: 1.5rem; }
                  @media (max-width: 768px) { .markdown-body table { min-width: 560px; } }
                  .sig-table, .sig-table td, .sig-table th, .sig-table tr { border: none !important; padding: 4px; vertical-align: top; }
                  .kop-surat table, .kop-surat td, .header-table td, .header-table th { border: none !important; }
                  .pdf-container [contenteditable] { outline: none; }
                `}</style>

                {kontenHtml ? (
                  <div className="markdown-body" dangerouslySetInnerHTML={{ __html: bersihkanSvg(kontenHtml) }} />
                ) : (<>
                {kopTerisi(kop) && (
                  <KopSurat
                    kop={kop}
                    judulDokumen={judulDokumenCetak}
                    subJudul={`${mapel}${kelas ? ` — ${kelas}` : ""}${tahunPelajaran ? ` — T.P. ${tahunPelajaran}` : ""}`}
                  />
                )}

                {isLandscape && (
                  <table className="header-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", border: "none" }}>
                    <tbody>
                      <tr>
                        <td style={{ border: "none", width: "18%" }}>Mata Pelajaran</td>
                        <td style={{ border: "none", width: "2%" }}>:</td>
                        <td style={{ border: "none", width: "30%" }}>{mapel || "........................"}</td>
                        <td style={{ border: "none", width: "18%" }}>Fase / Kelas</td>
                        <td style={{ border: "none", width: "2%" }}>:</td>
                        <td style={{ border: "none" }}>{fase} / {kelas}</td>
                      </tr>
                      <tr>
                        <td style={{ border: "none" }}>Semester</td>
                        <td style={{ border: "none" }}>:</td>
                        <td style={{ border: "none" }}>{semester}</td>
                        <td style={{ border: "none" }}>Tahun Pelajaran</td>
                        <td style={{ border: "none" }}>:</td>
                        <td style={{ border: "none" }}>{tahunPelajaran || "........................"}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                <div className="markdown-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      table: ({ ...props }) => (
                        <div className={isLandscape ? "w-full overflow-x-auto" : "table-wrapper"}>
                          <table className={isLandscape ? "promes-table" : ""} {...props} />
                        </div>
                      ),
                      th: ({ children, ...props }) => {
                        const text = String(children).toLowerCase().trim();
                        let width = "auto";
                        let whiteSpace = "normal";
                        if (text === "no" || text === "no.") width = "3%";
                        else if (text.includes("tema") && isLandscape) width = "15%";
                        else if (text.includes("sub-tema") && isLandscape) width = "15%";
                        else if (text.includes("jp") && isLandscape) width = "3%";
                        else if (/tema|materi|tujuan|elemen|capaian/.test(text)) width = "25%";
                        else if (/skor|nilai/.test(text)) width = "15%";
                        else if (isLandscape) whiteSpace = "nowrap";
                        return <th style={{ width, whiteSpace: whiteSpace as any, padding: isLandscape ? "4px 2px" : "6px 10px" }} {...props}>{children}</th>;
                      },
                      td: ({ children, ...props }) => (
                        <td style={{ padding: isLandscape ? "4px 2px" : "6px 10px", fontSize: isLandscape ? "9pt" : "inherit" }} {...props}>{children}</td>
                      ),
                      /* eslint-disable-next-line @next/next/no-img-element */
                      img: ({ ...props }) => <img {...props} alt={props.alt || ""} loading="lazy" />,
                    }}
                  >
                    {sanitasiHasil}
                  </ReactMarkdown>
                </div>

                {/* Kolom tanda tangan — kepala sekolah diambil dari kop lembaga */}
                {(namaGuru || kop.namaKepala) && (
                  <table className="sig-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "3rem", pageBreakInside: "avoid", border: "none" }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "50%", border: "none" }} />
                        <td style={{ width: "50%", border: "none", textAlign: "center" }}>
                          {kop.kota || "........................"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </td>
                      </tr>
                      <tr><td colSpan={2} style={{ border: "none", textAlign: "center", paddingTop: 10, paddingBottom: 20 }}>Mengetahui,</td></tr>
                      <tr>
                        <td style={{ border: "none", textAlign: "center" }}>{kop.jabatanKepala || "Kepala Sekolah"}</td>
                        <td style={{ border: "none", textAlign: "center" }}>Guru Penyusun</td>
                      </tr>
                      <tr><td style={{ border: "none", height: 70 }} /><td style={{ border: "none", height: 70 }} /></tr>
                      <tr>
                        <td style={{ border: "none", textAlign: "center" }}>
                          <strong><u>{kop.namaKepala || "..................................."}</u></strong><br />NIP. {kop.nipKepala || "............................"}
                        </td>
                        <td style={{ border: "none", textAlign: "center" }}>
                          <strong><u>{namaGuru || "..................................."}</u></strong><br />NIP. {nipGuru || "............................"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
                </>)}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-14 sm:py-20">
              <div className="w-16 h-16 bg-white border-2 border-slate-300 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <FileText size={28} className="text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm sm:text-base uppercase tracking-widest mb-2">Area Tinjau Dokumen</h3>
              <p className="text-[12px] sm:text-sm max-w-md text-slate-500 leading-relaxed px-4">
                Dokumen hasil generate tampil di sini lengkap dengan kop lembaga, siap diunduh Word/PDF/Excel — dan tersimpan otomatis.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* MODAL BANK BERSAMA */}
      <ModalBank
        buka={bankModal}
        hasil={bankHasil}
        onTutup={() => setBankModal(false)}
        onMuat={muatDariBank}
        onGenerate={generateSekarang}
      />

      {/* EDITOR WYSIWYG */}
      <EditorDokumen
        buka={editorBuka}
        htmlAwal={editorBuka ? (pdfRef.current?.innerHTML || "").replace(/<style[\s\S]*?<\/style>/gi, "") : ""}
        judul={`Edit ${tipe}`}
        gambarMapel={mapel}
        gambarJenjang={`${fase} / ${kelas}`}
        onTutup={() => setEditorBuka(false)}
        onSimpan={(html) => { setKontenHtml(html); setEditorBuka(false); }}
      />
    </motion.div>
  );
}

function ModalBank({
  buka, hasil, onTutup, onMuat, onGenerate,
}: {
  buka: boolean; hasil: (EntriBank & { skor?: number })[];
  onTutup: () => void; onMuat: (e: EntriBank) => void; onGenerate: () => void;
}) {
  return (
    <AnimatePresence>
      {buka && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
          >
            <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-white">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Library size={18} /></span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800">Ditemukan di Bank Bersama</h3>
                    <p className="text-[11px] text-slate-500">Muat tanpa token, lalu revisi sebagian saja.</p>
                  </div>
                </div>
                <button onClick={onTutup} aria-label="Tutup" className="text-slate-400 hover:text-rose-600 bg-white p-2 rounded-lg border border-slate-200"><X size={15} /></button>
              </div>
            </div>

            <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
              {hasil.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onMuat(e)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-slate-800 line-clamp-1">{e.materi || e.topik}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                      {Math.round((e.skor ?? 0) * 100)}% cocok
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span>{e.tipe}</span>
                    <span>•</span>
                    <span>{e.mapel} {e.kelas}</span>
                    <span className="flex items-center gap-1"><Users2 size={11} /> {e.dipakai || 0}x dipakai</span>
                    {e.tervalidasi && <span className="text-emerald-600 font-bold flex items-center gap-0.5"><CheckCircle2 size={11} /> tervalidasi</span>}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={onGenerate}
                className="w-full min-h-[46px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Zap size={15} /> Tetap Generate Baru dengan AI (pakai token)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------- UI ---------------------------------- */

const kelasInput =
  "w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] font-medium text-slate-800 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-100 transition-all";

function Bidang({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function IndikatorSimpan({ status }: { status: StatusSimpan }) {
  if (status === "kosong") {
    return <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Belum ada dokumen</p>;
  }
  const peta = {
    menyimpan: { ikon: <Loader2 size={11} className="animate-spin" />, teks: "Menyimpan...", warna: "text-slate-500" },
    tersimpan: { ikon: <CheckCircle2 size={11} />, teks: "Tersimpan otomatis", warna: "text-emerald-600" },
    gagal: { ikon: <CloudOff size={11} />, teks: "Gagal menyimpan — periksa koneksi", warna: "text-rose-600" },
  }[status];
  return (
    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1 ${peta.warna}`}>
      {peta.ikon} {peta.teks}
    </p>
  );
}

function TombolEkspor({
  onClick, ikon: Ikon, label, nuansa = "netral",
}: { onClick: () => void; ikon: any; label: string; nuansa?: "netral" | "blue" | "emerald" }) {
  const gaya = {
    netral: "bg-white hover:bg-slate-100 text-slate-700 border-slate-300",
    blue: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200",
  }[nuansa];
  return (
    <button onClick={onClick} className={`shrink-0 min-h-[40px] px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border shadow-sm ${gaya}`}>
      <Ikon size={15} /> {label}
    </button>
  );
}

function SaklarOpsi({
  aktif, onUbah, ikon: Ikon, judul, keterangan, disarankan,
}: {
  aktif: boolean; onUbah: (v: boolean) => void; ikon: any;
  judul: string; keterangan: string; disarankan?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${aktif ? "bg-white border-blue-300" : "bg-white/60 border-slate-200 hover:bg-white"}`}>
      <input type="checkbox" checked={aktif} onChange={(e) => onUbah(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0" />
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
          <Ikon size={13} className="text-blue-600" /> {judul}
          {disarankan && <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Disarankan</span>}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{keterangan}</p>
      </div>
    </label>
  );
}

function StatusKop({ kop, npsn, lembagaDitemukan }: { kop: any; npsn: string; lembagaDitemukan: boolean }) {
  if (!npsn) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] sm:text-xs text-amber-800">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-bold">NPSN belum terisi pada profil Anda.</span> Dokumen akan dicetak tanpa kop lembaga.
          Lengkapi NPSN di menu Profil agar kop resmi sekolah terpasang otomatis.
        </p>
      </div>
    );
  }

  if (!lembagaDitemukan || !kop.namaLembaga) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] sm:text-xs text-amber-800">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-bold">Kop lembaga NPSN {npsn} belum disiapkan.</span> Minta admin lembaga mengisi menu
          <span className="font-bold"> Kop Surat</span> pada dashboard lembaga, lalu kop akan muncul otomatis di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start sm:items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] sm:text-xs text-emerald-800">
      <Stamp size={15} className="shrink-0 mt-0.5 sm:mt-0" />
      <p className="leading-relaxed min-w-0 flex-1">
        Kop resmi <span className="font-bold">{kop.namaLembaga}</span> (NPSN {kop.npsn || npsn}) terpasang otomatis pada setiap dokumen.
      </p>
      <Link
        href="/dashboard/guru/profil"
        className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 shrink-0"
      >
        Profil <ExternalLink size={11} />
      </Link>
    </div>
  );
}
