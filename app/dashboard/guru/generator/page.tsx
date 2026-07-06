"use client";

export const maxDuration = 240;

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, Settings, FileText, Bot, Loader2, Save, History, FileDown, Printer, Coins, Target, Link2, Trash2, CalendarDays, CheckCircle, X, FileSpreadsheet } from "lucide-react";
import { Teachers } from "next/font/google";

import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, increment, deleteDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function GeneratorBahanAjar() {
  // State User Auth & Token
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pendidik");
  const [aiTokens, setAiTokens] = useState(0);

  // State Form Input (Kurikulum & Identitas)
  const [sumber, setSumber] = useState("Kemendikdasmen (SK BSKAP 32/2024)"); 
  const [tipe, setTipe] = useState("Modul Ajar");
  const [fase, setFase] = useState("");
  const [kelas, setKelas] = useState("");
  const [mapel, setMapel] = useState("");
  const [topik, setTopik] = useState(""); 
  const [materi, setMateri] = useState(""); 

  const [namaSekolah, setNamaSekolah] = useState("");
  const [kotaSekolah, setKotaSekolah] = useState(""); 
  const [namaKepsek, setNamaKepsek] = useState("");
  const [nipKepsek, setNipKepsek] = useState("");
  const [namaGuru, setNamaGuru] = useState("");
  const [nipGuru, setNipGuru] = useState("");
  const [tahunPelajaran, setTahunPelajaran] = useState("");
  const [semester, setSemester] = useState("Ganjil");

  // State Parameter Tambahan
  const [metode, setMetode] = useState("");
  const [alokasiWaktu, setAlokasiWaktu] = useState("");
  const [profilPelajar, setProfilPelajar] = useState("");
  
  // State Parameter Bank Soal
  const [jenisUjian, setJenisUjian] = useState("Ulangan Harian");
  const [tingkatKesulitan, setTingkatKesulitan] = useState("Campuran (Proporsional)");
  const [opsiPG, setOpsiPG] = useState("A - D (4 Opsi)");
  const [jmlPG, setJmlPG] = useState("10"); 
  const [jmlBenarSalah, setJmlBenarSalah] = useState("0"); 
  const [jmlMenjodohkan, setJmlMenjodohkan] = useState("0"); 
  const [jmlIsianSingkat, setJmlIsianSingkat] = useState("0"); 
  const [jmlUraian, setJmlUraian] = useState("5"); 

  // State UI, AI & Dokumen Terakhir
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasil, setHasil] = useState("");
  const [docId, setDocId] = useState(""); 
  const [dokumenTerakhir, setDokumenTerakhir] = useState(""); 
  const [gunakanKonteks, setGunakanKonteks] = useState(false); 
  
  // State Modal Riwayat
  const [showKoleksi, setShowKoleksi] = useState(false);
  const [riwayatModul, setRiwayatModul] = useState<any[]>([]);

  const pdfRef = useRef<HTMLDivElement>(null);

  const isLandscape = tipe === "PROMES" || tipe === "PROTA" || tipe === "Kisi-kisi Ujian" || tipe === "ATP";

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

  const opsiTipeDokumen = ["Modul Ajar", "RPP", "ATP", "PROMES", "PROTA", "LKPD", "Bahan Bacaan Siswa", "Kisi-kisi Ujian", "Rubrik Penilaian", "Bank Soal"];

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserName(docSnap.data().nama || "Pendidik");
            setAiTokens(docSnap.data().aiTokens || 0);
          }
        });
        const qRiwayat = query(collection(db, "modul_ajar"), orderBy("createdAt", "desc"));
        const unsubRiwayat = onSnapshot(qRiwayat, (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter((d: any) => d.userId === user.uid);
          setRiwayatModul(data);
        });
        return () => { unsubProfil(); unsubRiwayat(); };
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid) { alert("Sesi Anda tidak valid. Silakan login ulang."); return; }
    if (!materi || !fase || !kelas || !mapel) { alert("Mohon lengkapi Fase, Kelas, Mata Pelajaran, dan Materi Spesifik."); return; }
    if (aiTokens <= 0) { alert("Sisa Token AI Anda habis."); return; }

    setIsGenerating(true);
    setHasil("");
    setDocId(""); 
    const startTime = Date.now();
    
    let sistemPrompt = `Anda adalah Ahli Penyusun Kurikulum Pendidikan Nasional Indonesia. Buatlah dokumen menggunakan format Markdown (tabel, bold, list) yang sangat rapi dan terstruktur secara formal.\n`;
    sistemPrompt += `ATURAN FORMAT JARAK: Setiap Sub-bab atau Judul Poin WAJIB diberi baris baru (ENTER dua kali) sebelum menuliskan isinya. DILARANG KERAS MENGGUNAKAN TAG HTML SEPERTI <br> ATAU <br/>.\n`;
    
    if (sumber.includes("BSKAP")) {
      sistemPrompt += `PENTING: Rujuk pada SK BSKAP No. 32 Tahun 2024 tentang Capaian Pembelajaran (CP) Kurikulum Merdeka.\n`;
    } else {
      sistemPrompt += `PENTING: Rujuk pada regulasi KMA No. 1503 Tahun 2025 terbaru terkait Capaian Pembelajaran dan integrasi PPRA Madrasah.\n`;
    }

    let topikKirim = `Buatlah dokumen **${tipe}**.\n\n`;

    if (tipe === "Modul Ajar") {
        topikKirim += `STRUKTUR WAJIB MODUL AJAR:\n`;
        topikKirim += `1. INFORMASI UMUM. Buatlah TABEL Informasi Umum yang WAJIB berisi kolom Komponen dan Keterangan dengan data berikut:\n`;
        topikKirim += `   - Penyusun: ${namaGuru || "(Nama Guru Penyusun)"}\n`;
        topikKirim += `   - Institusi: ${namaSekolah || "(Nama Sekolah)"}\n`;
        topikKirim += `   - Tahun Pelajaran: ${tahunPelajaran || "(Tahun Pelajaran)"}\n`;
        topikKirim += `   - Jenjang Sekolah: (Isi sesuai fase)\n`;
        topikKirim += `   - Mata Pelajaran: ${mapel}\n`;
        topikKirim += `   - Fase / Kelas: ${fase} / ${kelas} (Semester ${semester})\n`;
        topikKirim += `   - Materi Pokok: ${materi}\n`;
        topikKirim += `   - Alokasi Waktu: ${alokasiWaktu || "(Isi alokasi waktu yang sesuai)"}\n\n`;
        topikKirim += `Setelah tabel identitas di atas, lanjutkan poin Informasi Umum dengan sub-judul: Kompetensi Awal, P5/PPRA (${profilPelajar || 'Sesuaikan'}), Sarpras, Target Peserta Didik, dan Model Pembelajaran (${metode || 'Sesuaikan'}).\n`;
        topikKirim += `2. KOMPONEN INTI (Tujuan Pembelajaran, Pemahaman Bermakna, Pertanyaan Pemantik, Tabel Kegiatan Pembelajaran [Pendahuluan, Inti, Penutup], Asesmen, Pengayaan & Remedial)\n`;
        topikKirim += `3. LAMPIRAN (Lembar Kerja Peserta Didik, Rubrik, Bahan Bacaan, Daftar Pustaka).\n`;
    } else if (tipe === "Bank Soal") {
        topikKirim += `IDENTITAS: Mata Pelajaran ${mapel}, Fase/Kelas ${fase}/${kelas}, Materi: ${materi}\n\n`;
        topikKirim += `STRUKTUR WAJIB:\nBuatlah instrumen ${jenisUjian} dengan tingkat kesulitan soal rata-rata: ${tingkatKesulitan}.\n`;
        topikKirim += `Komposisi soal terdiri dari:\n`;
        if (Number(jmlPG) > 0) topikKirim += `- Pilihan Ganda (Opsi ${opsiPG}): ${jmlPG} butir.\n`;
        if (Number(jmlBenarSalah) > 0) topikKirim += `- Benar/Salah: ${jmlBenarSalah} butir.\n`;
        if (Number(jmlMenjodohkan) > 0) topikKirim += `- Menjodohkan: ${jmlMenjodohkan} butir.\n`;
        if (Number(jmlIsianSingkat) > 0) topikKirim += `- Isian Singkat: ${jmlIsianSingkat} butir.\n`;
        if (Number(jmlUraian) > 0) topikKirim += `- Uraian/Essay: ${jmlUraian} butir.\n`;
        topikKirim += `ATURAN FORMAT OPSI JAWABAN: WAJIB pisahkan setiap pilihan ganda (A, B, C, D, E) ke baris baru yang menurun ke bawah (dengan list). JANGAN MENGGABUNGKAN opsi dalam satu baris paragraf.\n`;
        topikKirim += `Buat Tabel Kunci Jawaban & Rubrik Penskoran di bagian paling bawah dokumen secara lengkap sesuai dengan komposisi soal di atas.\n`;
    } else if (tipe === "PROMES" || tipe === "PROTA") {
        const bulanGanjil = "Jul 1|Jul 2|Jul 3|Jul 4|Jul 5|Agu 1|Agu 2|Agu 3|Agu 4|Agu 5|Sep 1|Sep 2|Sep 3|Sep 4|Sep 5|Okt 1|Okt 2|Okt 3|Okt 4|Okt 5|Nov 1|Nov 2|Nov 3|Nov 4|Nov 5|Des 1|Des 2|Des 3|Des 4|Des 5";
        const bulanGenap = "Jan 1|Jan 2|Jan 3|Jan 4|Jan 5|Feb 1|Feb 2|Feb 3|Feb 4|Feb 5|Mar 1|Mar 2|Mar 3|Mar 4|Mar 5|Apr 1|Apr 2|Apr 3|Apr 4|Apr 5|Mei 1|Mei 2|Mei 3|Mei 4|Mei 5|Jun 1|Jun 2|Jun 3|Jun 4|Jun 5";
        const kalender = semester === "Ganjil" ? bulanGanjil : bulanGenap;
        
        topikKirim += `STRUKTUR WAJIB PROMES/PROTA:\n`;
        topikKirim += `Buatlah Judul "MATRIKS PROGRAM SEMESTER", lalu buatlah TABEL Matriks.\n`;
        topikKirim += `Kolom Tabel Matriks WAJIB PERSIS SEPERTI INI (Sangat Lebar):\nNo | Tema / Materi | Sub-Tema | JP | ${kalender}\n`;
        topikKirim += `Isi sel matriks bulan/minggu tersebut dengan tanda centang (✓) pada minggu yang efektif pelaksanaannya.\n`;
    } else {
        topikKirim += `**IDENTITAS DOKUMEN**\n- Mata Pelajaran: ${mapel}\n- Fase / Kelas: ${fase} / ${kelas}\n- Tahun Pelajaran: ${tahunPelajaran} (Semester ${semester})\n- Materi Pokok: ${materi}\n\n`;
        if (tipe === "RPP") {
            topikKirim += `STRUKTUR WAJIB:\n1. Identitas\n2. Tujuan Pembelajaran\n3. Tabel Langkah Pembelajaran (Tahap, Deskripsi Kegiatan Guru & Siswa, Alokasi Waktu)\n4. Penilaian.\n`;
        } else if (tipe === "ATP") {
            topikKirim += `STRUKTUR WAJIB:\nBuatlah TABEL Alur Tujuan Pembelajaran dengan kolom: Elemen | Tujuan Pembelajaran | Alokasi Waktu | Profil Pelajar Pancasila.\n`;
        } else if (tipe === "LKPD") {
            topikKirim += `STRUKTUR WAJIB:\nJudul LKPD, Tujuan Kegiatan, Alat & Bahan, Langkah Kerja (Sistematis), TABEL Pengamatan (No | Aspek | Hasil [Biarkan Kosong]), Pertanyaan Analisis.\n`;
        } else if (tipe === "Bahan Bacaan Siswa") {
            topikKirim += `STRUKTUR WAJIB:\nJudul Materi, Tujuan, Peta Konsep (Bulleted List), Uraian Materi (Lengkap dan menarik), Rangkuman, Latihan Mandiri.\n`;
        } else if (tipe === "Kisi-kisi Ujian") {
            topikKirim += `STRUKTUR WAJIB:\nBuatlah TABEL Kisi-kisi Ujian dengan kolom: Capaian Pembelajaran | Materi | Indikator Soal | Level Kognitif (C1-C6) | Bentuk Soal | Nomor Soal.\n`;
        } else if (tipe === "Rubrik Penilaian") {
            topikKirim += `STRUKTUR WAJIB:\nBuatlah TABEL Rubrik Penilaian dengan kolom: Aspek Penilaian | Skor 4 (Sangat Baik) | Skor 3 (Baik) | Skor 2 (Cukup) | Skor 1 (Kurang).\n`;
        }
    }

    if (gunakanKonteks && dokumenTerakhir) {
      topikKirim += `\n\n[KONTEKS SINKRONISASI]:\nSelaraskan materi pada dokumen ini dengan referensi dokumen berikut agar nyambung:\n"""\n${dokumenTerakhir.substring(0, 2000)}\n"""\n`;
    }

    try {
      const apiMessages = [{ role: "system", content: sistemPrompt }, { role: "user", content: topikKirim }];
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gemini-2.5-pro", messages: apiMessages })
      });
      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const aiResponseContent = data.choices[0].message.content;
        const tokenUsed = data.usage?.total_tokens || 0;

        setHasil(aiResponseContent);
        setDokumenTerakhir(aiResponseContent);

        if (tokenUsed > 0) {
          await updateDoc(doc(db, "users", userUid), { aiTokens: increment(-tokenUsed) });
          await updateDoc(doc(db, "ai_monitoring", "token_stats"), { tokenTerpakai: increment(tokenUsed) });
          await addDoc(collection(db, "ai_logs"), { aksi: `Generate ${tipe}`, pengguna: userName, role: "guru", status: "Sukses", latensi: Date.now() - startTime, tokenDipakai: tokenUsed, timestamp: serverTimestamp() });
        }
      } else { throw new Error(data.error || "Respons AI kosong atau API Key belum diset."); }
    } catch (error: any) { alert("Gagal memproses AI: " + error.message); } finally { setIsGenerating(false); }
  };

  const handleSaveToDatabase = async () => {
    if (!userUid || !hasil) return;
    setIsSaving(true);
    try {
      if (docId) {
        await updateDoc(doc(db, "modul_ajar", docId), { konten: hasil });
        alert("Perubahan dokumen berhasil diperbarui!");
      } else {
        const docRef = await addDoc(collection(db, "modul_ajar"), {
          userId: userUid, sumber, tipe, fase, kelas, mapel, topik, materi, konten: hasil,
          namaSekolah, kotaSekolah, namaKepsek, nipKepsek, namaGuru, nipGuru, createdAt: serverTimestamp()
        });
        setDocId(docRef.id);
        alert("Dokumen baru berhasil disimpan ke Koleksi Sistem!");
      }
    } catch (error) { alert("Gagal menyimpan dokumen."); } finally { setIsSaving(false); }
  };

  const handleOpenRiwayat = (riwayat: any) => {
    setTipe(riwayat.tipe); setTopik(riwayat.topik || ""); setMateri(riwayat.materi || ""); setMapel(riwayat.mapel);
    setFase(riwayat.fase); setKelas(riwayat.kelas || ""); setHasil(riwayat.konten); setDocId(riwayat.id);
    setDokumenTerakhir(riwayat.konten); 
    setShowKoleksi(false);
    // Scroll dengan sedikit delay agar UI me-render height kanvas terlebih dahulu
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const hapusRiwayat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm("Yakin ingin menghapus dokumen ini dari koleksi?")) {
      await deleteDoc(doc(db, "modul_ajar", id));
      if (docId === id) { setHasil(""); setDocId(""); }
    }
  };

  // --- FITUR DOWNLOAD EXCEL ---
  const handleDownloadExcel = () => {
    if (!pdfRef.current) return;
    let html = pdfRef.current.innerHTML.replace(/class="markdown-body"/g, '');
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 5px; vertical-align: top; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
          .header-table td, .header-table th { border: none !important; font-weight: bold; }
          .sig-table td, .sig-table th { border: none !important; }
        </style>
      </head>
      <body>${html}</body></html>`;
    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${tipe}_${mapel || 'Dokumen'}.xls`.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    a.click(); URL.revokeObjectURL(url);
  };

  // --- FITUR DOWNLOAD WORD ---
  const handleDownloadWord = () => {
    if (!pdfRef.current) return;
    const printNode = pdfRef.current.cloneNode(true) as HTMLElement;
    
    const tables = printNode.querySelectorAll('table');
    tables.forEach(table => {
      if (table.classList.contains('sig-table') || table.classList.contains('header-table')) return; 
      const ths = table.querySelectorAll('th');
      ths.forEach((th) => {
        const text = th.innerText.trim().toLowerCase();
        if (text === 'no' || text === 'no.') { th.style.width = '3%'; } 
        else if (text.includes('tema') || text.includes('materi') || text.includes('tujuan') || text.includes('elemen') || text.includes('capaian')) { th.style.width = '25%'; } 
        else if (text.includes('skor') || text.includes('nilai')) { th.style.width = '15%'; }
      });
    });

    let printHtml = printNode.innerHTML.replace(/class="markdown-body"/g, '');
    
    const cssOrientation = `
      @page WordSection1 { 
        size: ${isLandscape ? '841.9pt 595.3pt' : '595.3pt 841.9pt'}; 
        mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'}; 
        margin: 2.54cm; 
      } 
      div.WordSection1 { page: WordSection1; }
    `;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Dokumen</title><style>${cssOrientation} body, p, li, td, th, h1, h2, h3, h4, div { font-family: 'Times New Roman', serif !important; font-size: 11pt !important; color: black !important; line-height: 1.5; text-align: justify; } h1 { font-size: 14pt !important; font-weight: bold !important; margin-bottom: 12pt; text-align: center; text-transform: uppercase; } h2, h3 { font-size: 12pt !important; font-weight: bold !important; margin-top: 12pt; margin-bottom: 6pt; text-align: left; } table { width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 15pt; border: 1pt solid black !important; word-wrap: break-word; overflow-wrap: break-word; } table.promes-table { font-size: 8pt !important; table-layout: auto !important; } table.promes-table th, table.promes-table td { padding: 2pt !important; } td, th { border: 1pt solid black !important; padding: 4pt 8pt; vertical-align: top; text-align: left; } th { background-color: #f2f2f2; font-weight: bold !important; text-align: center; } p { margin-bottom: 10pt; } li { margin-bottom: 6pt; text-align: justify; } .header-table, .header-table td, .header-table th { border: none !important; padding: 2pt !important; } .sig-table, .sig-table td, .sig-table th, .sig-table tr { border: none !important; }</style></head><body><div class="WordSection1">${printHtml}</div></body></html>`;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header);
    const fileDownload = document.createElement("a"); document.body.appendChild(fileDownload); 
    fileDownload.href = source; fileDownload.download = `${tipe}_${mapel || 'Dokumen'}.doc`.replace(/[^a-zA-Z0-9.\-_]/g, "_"); fileDownload.click(); document.body.removeChild(fileDownload);
  };

  // --- FITUR DOWNLOAD PDF ---
  const handlePrintPDF = () => {
    if (!pdfRef.current) return;
    const printNode = pdfRef.current.cloneNode(true) as HTMLElement;
    let printContent = printNode.innerHTML;

    const cssOrientation = `
      @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 1.5cm; }
    `;

    const iframe = document.createElement("iframe"); iframe.style.display = "none"; document.body.appendChild(iframe); iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`<html><head><title>Cetak PDF</title><style> ${cssOrientation} body { font-family: 'Times New Roman', serif !important; font-size: 11pt !important; line-height: 1.5 !important; color: #000; text-align: justify; } h1 { text-align: center; font-size: 14pt; margin-bottom: 2rem; font-weight: bold; text-transform: uppercase; } table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; border: 1pt solid #000; word-wrap: break-word; overflow-wrap: break-word; } table.promes-table { font-size: 9px !important; table-layout: auto !important; } table.promes-table th, table.promes-table td { padding: 4px !important; } th, td { border: 1pt solid #000; padding: 6px 8px; text-align: left; vertical-align: top; } th { background-color: #f1f5f9; font-weight: bold; text-align: center; } tr { page-break-inside: avoid; } h2, h3, h4 { page-break-after: avoid; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; text-align: left; } ul, ol { margin-left: 20px; margin-bottom: 10px; } li { margin-bottom: 6px; text-align: justify; } p { margin-bottom: 10px; } .header-table td, .header-table th { border: none !important; padding: 4px; } .sig-table, .sig-table td, .sig-table th, .sig-table tr { border: none !important; padding: 4px; vertical-align: top; }</style></head><body>${printContent}</body></html>`);
    iframe.contentWindow?.document.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
  };

  const sanitasiHasil = hasil.replace(/<br\s*\/?>/gi, '\n\n');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-16 pt-4 px-2">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Generator Perangkat Ajar Nasional</h1>
          <p className="text-slate-500 text-[13px] md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Didukung AI untuk menyusun dokumen akademik yang selaras dengan regulasi nasional secara komprehensif.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowKoleksi(true)} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all">
            <History size={14} /> Koleksi
          </button>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
            <Coins size={14} className="text-amber-500" /> Token: {aiTokens.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* MODAL RIWAYAT (KOLEKSI DOKUMEN SAYA) */}
      <AnimatePresence>
        {showKoleksi && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <History size={18} className="text-blue-600" /> Koleksi
                </h3>
                <button onClick={() => setShowKoleksi(false)} className="text-slate-400 hover:text-rose-600 transition-colors bg-white p-1 rounded-md border border-slate-200 shadow-sm"><X size={18}/></button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {riwayatModul.length > 0 ? (
                    riwayatModul.map(riwayat => (
                      <div key={riwayat.id} onClick={() => handleOpenRiwayat(riwayat)} className={`flex flex-col p-4 rounded-lg border transition-all cursor-pointer group ${docId === riwayat.id ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{riwayat.tipe}</span>
                          <button onClick={(e) => hapusRiwayat(e, riwayat.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={14}/></button>
                        </div>
                        <span className="font-bold text-slate-800 text-sm leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">{riwayat.materi || riwayat.topik || "Dokumen Tanpa Judul"}</span>
                        <span className="text-[11px] font-medium text-slate-500 mt-3 border-t border-slate-100 pt-2">{riwayat.mapel} • Kelas {riwayat.kelas}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-1 sm:col-span-2 text-center py-12 opacity-70">
                      <FileText size={40} className="mx-auto text-slate-300 mb-3"/>
                      <p className="text-sm text-slate-500 font-medium">Anda belum menyimpan dokumen apapun.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==============================================
          LAYOUT UTAMA: ATAS (FORM) -> BAWAH (KANVAS)
          ============================================== */}
      <div className="flex flex-col gap-8 lg:gap-10">
        
        {/* --- BAGIAN ATAS: FORM PARAMETER AI --- */}
        <div className="w-full flex flex-col gap-6">
          <div className="bg-white p-6 md:p-8 rounded-md shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
              <Settings size={22} className="text-slate-800" />
              <h2 className={`text-lg font-bold text-slate-800 tracking-wide uppercase ${teachersFont.className}`}>Parameter Penyusunan Dokumen</h2>
            </div>

            <form onSubmit={handleGenerate} className="space-y-8">
              
              {/* 1. JENIS DOKUMEN */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">1. Pilih Jenis Dokumen</label>
                <div className="flex flex-wrap gap-2.5">
                  {opsiTipeDokumen.map((item) => (
                    <button key={item} type="button" onClick={() => setTipe(item)} className={`py-2 px-4 text-xs font-bold rounded-lg transition-all border shadow-sm ${tipe === item ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500 hover:bg-slate-50'}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* GRID UNTUK KURIKULUM DAN IDENTITAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 2. KURIKULUM & MATERI */}
                <div className="bg-slate-50/80 p-6 rounded-xl border border-slate-200 space-y-5">
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">2. Kurikulum & Ruang Lingkup Materi</label>
                   
                   <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Standar Kurikulum Nasional</label>
                      <select value={sumber} onChange={(e) => setSumber(e.target.value)} className="w-full bg-white border border-slate-300 px-4 py-3 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-slate-500 shadow-sm cursor-pointer">
                        <option value="Kemendikdasmen (SK BSKAP 32/2024)">Kemendikdasmen (SK BSKAP 32/2024)</option>
                        <option value="Kementerian Agama (KMA)">Kementerian Agama (KMA 1503 2025)</option>
                      </select>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Fase Pembelajaran</label>
                        <select value={fase} onChange={(e) => { setFase(e.target.value); setKelas(""); }} className="w-full bg-white border border-slate-300 px-4 py-3 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-slate-500 shadow-sm cursor-pointer" required>
                          <option value="">Pilih Fase</option>
                          {Object.keys(opsiKelas).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Spesifik Kelas</label>
                        <select value={kelas} onChange={(e) => setKelas(e.target.value)} disabled={!fase} className="w-full bg-white border border-slate-300 px-4 py-3 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-slate-500 shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-400" required>
                          <option value="">Pilih Kelas</option>
                          {fase && opsiKelas[fase]?.map((kls: string) => <option key={kls} value={kls}>{kls}</option>)}
                        </select>
                      </div>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Mata Pelajaran</label>
                      <input type="text" value={mapel} onChange={(e) => setMapel(e.target.value)} placeholder="Contoh: Pendidikan Pancasila / Biologi" className="w-full bg-white border border-slate-300 px-4 py-3 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-slate-500 shadow-sm" required />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Elemen CP / Topik Utama <span className="text-slate-400 font-normal italic">(Opsional)</span></label>
                      <input type="text" value={topik} onChange={(e) => setTopik(e.target.value)} placeholder="Contoh: Menyimak / Sistem Peredaran Darah" className="w-full bg-white border border-slate-300 px-4 py-3 rounded-lg text-sm font-medium text-slate-800 outline-none focus:border-slate-500 shadow-sm" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Materi Pembelajaran Spesifik</label>
                      <input type="text" value={materi} onChange={(e) => setMateri(e.target.value)} placeholder="Contoh: Fungsi Jantung dan Pembuluh Darah" className="w-full bg-white border border-slate-300 px-4 py-3 rounded-lg text-sm font-medium text-slate-800 outline-none focus:border-slate-500 shadow-sm" required />
                   </div>
                </div>

                {/* 3. IDENTITAS & SPESIFIKASI TAMBAHAN */}
                <div className="flex flex-col gap-6">
                  <div className="p-6 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">3. Identitas Cetak (Opsional)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" value={namaSekolah} onChange={(e) => setNamaSekolah(e.target.value)} placeholder="Nama Institusi/Sekolah" className="col-span-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-500 shadow-sm font-medium" />
                      <input type="text" value={tahunPelajaran} onChange={(e) => setTahunPelajaran(e.target.value)} placeholder="Thn Ajaran (Contoh: 2025/2026)" className="col-span-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-500 shadow-sm font-medium" />
                      <select value={semester} onChange={(e) => setSemester(e.target.value)} className="col-span-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-500 shadow-sm font-bold text-slate-700 cursor-pointer">
                        <option value="Ganjil">Semester Ganjil (Juli - Desember)</option><option value="Genap">Semester Genap (Januari - Juni)</option>
                      </select>
                      <input type="text" value={kotaSekolah} onChange={(e) => setKotaSekolah(e.target.value)} placeholder="Kota Penerbitan" className="col-span-2 w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-500 shadow-sm font-medium" />
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <input type="text" value={namaGuru} onChange={(e) => setNamaGuru(e.target.value)} placeholder="Nama Guru Penyusun" className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-500 shadow-sm font-medium" />
                        <input type="text" value={nipGuru} onChange={(e) => setNipGuru(e.target.value)} placeholder="NIP Guru" className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-500 shadow-sm font-medium" />
                      </div>
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <input type="text" value={namaKepsek} onChange={(e) => setNamaKepsek(e.target.value)} placeholder="Nama Kepala Sekolah" className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-500 shadow-sm font-medium" />
                        <input type="text" value={nipKepsek} onChange={(e) => setNipKepsek(e.target.value)} placeholder="NIP Kepala Sekolah" className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-500 shadow-sm font-medium" />
                      </div>
                    </div>
                  </div>

                  {/* KONDISIONAL BERDASARKAN TIPE */}
                  <AnimatePresence mode="popLayout">
                    {(tipe === "Modul Ajar" || tipe === "RPP") && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-4 overflow-hidden">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-2">4. Pengaturan Modul</h4>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-700 mb-1.5 uppercase">Model Pendekatan</label>
                            <select value={metode} onChange={(e) => setMetode(e.target.value)} className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs outline-none focus:border-emerald-500 cursor-pointer font-medium text-slate-700">
                              <option value="">Rekomendasi AI (Otomatis)</option><option value="Problem Based Learning (PBL)">PBL</option><option value="Project Based Learning (PjBL)">PjBL</option><option value="Discovery Learning">Discovery Learning</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-700 mb-1.5 uppercase">Fokus Karakter P5/PPRA</label>
                            <select value={profilPelajar} onChange={(e) => setProfilPelajar(e.target.value)} className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs outline-none focus:border-emerald-500 cursor-pointer font-medium text-slate-700">
                              <option value="">Pilih Fokus (Opsional)</option>
                              {(sumber.includes("Agama") ? p5Kemenag : p5Kemendikbud).map((opt: string) => (<option key={opt} value={opt}>{opt}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-700 mb-1.5 uppercase">Alokasi Waktu</label>
                            <input type="text" value={alokasiWaktu} onChange={(e) => setAlokasiWaktu(e.target.value)} placeholder="Contoh: 2 JP x 45 Menit" className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs outline-none focus:border-emerald-500 font-medium" />
                          </div>
                        </motion.div>
                    )}

                    {tipe === "Bank Soal" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-6 bg-rose-50/50 border border-rose-100 rounded-xl space-y-4 overflow-hidden">
                          <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-2">4. Komposisi Soal</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-rose-700 mb-1.5 uppercase">Jenis Ujian</label>
                              <select value={jenisUjian} onChange={(e) => setJenisUjian(e.target.value)} className="w-full p-3 bg-white border border-rose-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-rose-500 cursor-pointer">
                                <option>Ulangan Harian</option><option>Asesmen Formatif</option><option>Sumatif Lingkup Materi</option><option>Sumatif Tengah Semester (STS)</option><option>Sumatif Akhir Semester (SAS)</option><option>Ujian Sekolah (US)</option><option>Try Out</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-rose-700 mb-1.5 uppercase">Tingkat Kesulitan</label>
                              <select value={tingkatKesulitan} onChange={(e) => setTingkatKesulitan(e.target.value)} className="w-full p-3 bg-white border border-rose-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-rose-500 cursor-pointer">
                                <option>Campuran (Proporsional)</option><option>HOTS (High Order Thinking)</option><option>MOTS (Medium Order Thinking)</option><option>LOTS (Low Order Thinking)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-rose-700 mb-1.5 uppercase">Opsi Pilihan Ganda</label>
                              <select value={opsiPG} onChange={(e) => setOpsiPG(e.target.value)} className="w-full p-3 bg-white border border-rose-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-rose-500 cursor-pointer"><option>A - D (4 Opsi)</option><option>A - E (5 Opsi)</option></select>
                            </div>
                          </div>
                          
                          <div className="border-t border-rose-200/50 pt-4 mt-2">
                            <label className="block text-[10px] font-bold text-rose-700 mb-3 uppercase tracking-wider text-center">Distribusi Jumlah Soal</label>
                            <div className="grid grid-cols-5 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold text-rose-700 mb-1.5 uppercase text-center truncate">PG</label>
                                <input type="number" min="0" value={jmlPG} onChange={(e) => setJmlPG(e.target.value)} className="w-full text-center py-2 bg-white border border-rose-200 rounded-lg text-sm font-bold focus:border-rose-500 outline-none" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-rose-700 mb-1.5 uppercase text-center truncate">B/S</label>
                                <input type="number" min="0" value={jmlBenarSalah} onChange={(e) => setJmlBenarSalah(e.target.value)} className="w-full text-center py-2 bg-white border border-rose-200 rounded-lg text-sm font-bold focus:border-rose-500 outline-none" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-rose-700 mb-1.5 uppercase text-center truncate">Jodohkan</label>
                                <input type="number" min="0" value={jmlMenjodohkan} onChange={(e) => setJmlMenjodohkan(e.target.value)} className="w-full text-center py-2 bg-white border border-rose-200 rounded-lg text-sm font-bold focus:border-rose-500 outline-none" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-rose-700 mb-1.5 uppercase text-center truncate">Isian</label>
                                <input type="number" min="0" value={jmlIsianSingkat} onChange={(e) => setJmlIsianSingkat(e.target.value)} className="w-full text-center py-2 bg-white border border-rose-200 rounded-lg text-sm font-bold focus:border-rose-500 outline-none" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-rose-700 mb-1.5 uppercase text-center truncate">Uraian</label>
                                <input type="number" min="0" value={jmlUraian} onChange={(e) => setJmlUraian(e.target.value)} className="w-full text-center py-2 bg-white border border-rose-200 rounded-lg text-sm font-bold focus:border-rose-500 outline-none" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                    )}

                    {(tipe === "PROMES" || tipe === "PROTA") && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-6 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col justify-center text-center overflow-hidden h-full min-h-[150px]">
                          <CalendarDays size={40} className="mx-auto text-slate-400 mb-4" />
                          <h4 className="text-sm font-bold text-slate-800 mb-2">Format Kaldik Terpadu</h4>
                          <p className="text-xs text-slate-500 leading-relaxed px-4">Sistem akan menyusun matriks alokasi waktu per minggu efektif secara otomatis untuk format kalender pendidikan (Landscape).</p>
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Checkbox Konteks Lanjutan */}
              {dokumenTerakhir && (
                <label className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors shadow-sm">
                  <input type="checkbox" checked={gunakanKonteks} onChange={(e) => setGunakanKonteks(e.target.checked)} className="mt-0.5 w-5 h-5 text-slate-800 rounded border-slate-300 focus:ring-slate-800 cursor-pointer" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><Link2 size={16}/> Selaraskan dengan Dokumen Sebelumnya</p>
                    <p className="text-[11px] text-slate-500 mt-1">Centang opsi ini agar materi nyambung secara kontekstual dengan dokumen yang baru saja Anda buat.</p>
                  </div>
                </label>
              )}

              {/* TOMBOL GENERATE */}
              <button type="submit" disabled={isGenerating} className={`w-full py-5 rounded-xl text-base font-black tracking-widest uppercase text-white transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 mt-4 ${isGenerating ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 hover:shadow-lg'}`}>
                {isGenerating ? <><Loader2 size={22} className="animate-spin" /> Menganalisis Parameter Nasional...</> : <><Bot size={22} /> Generate Dokumen AI</>}
              </button>
            </form>
          </div>
        </div>

        {/* --- BAGIAN BAWAH: KANVAS HASIL AI (FULL WIDTH) --- */}
        <div className="w-full flex flex-col mt-4">
          <div className="bg-white rounded-md border border-slate-200 shadow-sm flex-1 flex flex-col relative overflow-hidden min-h-[600px] lg:min-h-[800px]">
            
            {/* Header Kanvas */}
            <div className="px-5 md:px-8 py-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white border border-slate-300 rounded-xl flex items-center justify-center shadow-sm"><BookOpen size={24} className="text-slate-700"/></div>
                <div>
                  <h2 className={`font-bold text-slate-800 text-xl tracking-wide uppercase ${teachersFont.className}`}>Kanvas Tinjauan</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Siap Edit & Ekspor</p>
                </div>
              </div>
              
              {hasil && (
                <div className="flex flex-wrap items-center gap-2.5">
                  {(tipe === "PROMES" || tipe === "PROTA" || tipe === "Kisi-kisi Ujian" || tipe === "ATP") && (
                    <button onClick={handleDownloadExcel} className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors border border-emerald-200 shadow-sm"><FileSpreadsheet size={16}/> Excel</button>
                  )}
                  <button onClick={handleDownloadWord} className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-300 shadow-sm"><FileDown size={16}/> Word</button>
                  <button onClick={handlePrintPDF} className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-300 shadow-sm"><Printer size={16}/> PDF</button>
                  <button onClick={handleSaveToDatabase} disabled={isSaving} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70 ml-2">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} {docId ? "Perbarui" : "Simpan Dokumen"}
                  </button>
                </div>
              )}
            </div>

            {/* Isi Kanvas Markdown */}
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-10 relative">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-10">
                  <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full border-t-transparent animate-spin"></div>
                    <Bot size={28} className="text-slate-800 animate-pulse" />
                  </div>
                  <p className="font-bold text-slate-800 text-xl uppercase tracking-widest">Menyusun Draft...</p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">Mengkalibrasi standar {sumber.split(" ")[0]}</p>
                </div>
              ) : hasil ? (
                <div className={`bg-white shadow-xl border border-slate-300 p-8 md:p-14 mx-auto min-h-[1100px] overflow-x-auto ${isLandscape ? 'w-full max-w-none' : 'max-w-4xl'}`}>
                  <div ref={pdfRef} className="pdf-container">
                    <style>{`
                      /* PENYESUAIAN FONT UNTUK MOBILE & DESKTOP */
                      .pdf-container { font-family: 'Times New Roman', serif !important; font-size: 14px; line-height: 1.6 !important; color: #000; } 
                      @media (min-width: 768px) { .pdf-container { font-size: 12pt; } }
                      
                      .markdown-body p { margin-bottom: 0.8rem; text-align: justify; }
                      
                      /* MENCEGAH TEKS TERGENCET DI MOBILE */
                      @media (max-width: 768px) {
                        .markdown-body table { table-layout: auto !important; min-width: 600px; }
                        .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; margin-bottom: 1.5rem; }
                      }
                      
                      .markdown-body table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1.5rem; table-layout: auto; word-wrap: break-word; overflow-wrap: break-word; } 
                      .markdown-body table.promes-table { font-size: 9pt !important; table-layout: auto !important; }
                      .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 6px 10px; text-align: left; vertical-align: top; overflow-wrap: break-word; word-wrap: break-word; } 
                      .markdown-body th { background-color: #f8fafc; font-weight: bold; text-align: center; } 
                      .markdown-body tr { page-break-inside: avoid; } 
                      
                      .markdown-body h1 { font-size: 1.25em; font-weight: bold; text-align: center; margin-bottom: 1.5rem; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; } 
                      .markdown-body h2 { font-size: 1.1em; margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: bold; text-transform: uppercase; } 
                      .markdown-body h3 { font-size: 1em; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; } 
                      .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 1rem; margin-top: 0.5rem; text-align: justify; }
                      .markdown-body li { margin-bottom: 0.5rem; text-align: justify; }
                      .markdown-body li > p { margin-bottom: 0.2rem; }
                      
                      .sig-table, .sig-table td, .sig-table th, .sig-table tr { border: none !important; padding: 4px; vertical-align: top; }
                      .header-table td, .header-table th { border: none !important; padding: 2px 4px; vertical-align: bottom; font-weight: bold; font-size: 12pt; }
                    `}</style>
                    
                    {/* Kop Surat Dokumen Khusus PROTA / PROMES */}
                    {isLandscape ? (
                       <div style={{ marginBottom: '24px' }}>
                         <h1 style={{ fontSize: '1.25em', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px', textTransform: 'uppercase' }}>
                           PROGRAM {tipe === "PROMES" ? "SEMESTER" : "TAHUNAN"} <br/> KURIKULUM {sumber.includes("BSKAP") ? "MERDEKA" : "MADRASAH"}
                         </h1>
                         <table className="header-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                           <tbody>
                             <tr>
                               <td style={{ width: '15%' }}>Satuan Pendidikan</td>
                               <td style={{ width: '2%' }}>:</td>
                               <td style={{ width: '43%' }}>{namaSekolah || "........................"}</td>
                               <td style={{ width: '15%' }}>Tahun Pelajaran</td>
                               <td style={{ width: '2%' }}>:</td>
                               <td style={{ width: '23%' }}>{tahunPelajaran || "........................"}</td>
                             </tr>
                             <tr>
                               <td>Mata Pelajaran</td>
                               <td>:</td>
                               <td>{mapel || "........................"}</td>
                               <td>Fase</td>
                               <td>:</td>
                               <td>{fase || "........................"}</td>
                             </tr>
                             <tr>
                               <td>Kelas / Semester</td>
                               <td>:</td>
                               <td colSpan={4}>{kelas || "........"} / {semester}</td>
                             </tr>
                           </tbody>
                         </table>
                       </div>
                    ) : (
                      namaSekolah && (
                        <div style={{ textAlign: 'center', borderBottom: '3px solid black', paddingBottom: '12px', marginBottom: '24px', pageBreakAfter: 'avoid' }}>
                          <h1 style={{ fontSize: '1.25em', fontWeight: 'bold', textTransform: 'uppercase', color: 'black', margin: '0 0 5px 0' }}>{namaSekolah}</h1>
                          <p style={{ fontSize: '1em', margin: 0 }}>Dokumen Akademik Resmi - Kurikulum {sumber.split("(")[0].trim()}</p>
                        </div>
                      )
                    )}

                    <div className="markdown-body">
                      {/* INTEGRASI REACT MARKDOWN DENGAN KONTROL LEBAR TABEL */}
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => (
                            <div className={isLandscape ? "w-full overflow-x-auto" : "table-wrapper"}>
                              <table className={isLandscape ? "promes-table" : ""} {...props} />
                            </div>
                          ),
                          th: ({node, children, ...props}) => {
                            const text = String(children).toLowerCase().trim();
                            let width = 'auto';
                            let whiteSpace = 'normal';
                            
                            if (text === 'no' || text === 'no.') width = '3%';
                            else if (text.includes('tema') && isLandscape) width = '15%';
                            else if (text.includes('sub-tema') && isLandscape) width = '15%';
                            else if (text.includes('pemb. ke-') && isLandscape) width = '5%';
                            else if (text.includes('jp') && isLandscape) width = '3%';
                            else if (text.includes('tema') || text.includes('materi') || text.includes('tujuan') || text.includes('elemen') || text.includes('capaian')) width = '25%';
                            else if (text.includes('skor') || text.includes('nilai')) width = '15%';
                            else if (isLandscape) { whiteSpace = 'nowrap'; } 
                            
                            return <th style={{ width, whiteSpace: whiteSpace as any, padding: isLandscape ? '4px 2px' : '6px 10px' }} {...props}>{children}</th>;
                          },
                          td: ({node, children, ...props}) => {
                            return <td style={{ padding: isLandscape ? '4px 2px' : '6px 10px', fontSize: isLandscape ? '9pt' : 'inherit' }} {...props}>{children}</td>;
                          }
                        }}
                      >
                        {sanitasiHasil}
                      </ReactMarkdown>
                    </div>

                    {/* Kolom Tanda Tangan */}
                    {(namaGuru || namaKepsek) && (
                      <table className="sig-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4rem', pageBreakInside: 'avoid', border: 'none' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '50%', border: 'none' }}></td>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}>{kotaSekolah || "........................"}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                          </tr>
                          <tr><td colSpan={2} style={{ border: 'none', textAlign: 'center', paddingTop: '10px', paddingBottom: '20px' }}>Mengetahui,</td></tr>
                          <tr>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}>Kepala Sekolah</td>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}>Guru Penyusun</td>
                          </tr>
                          <tr><td style={{ border: 'none', height: '80px' }}></td><td style={{ border: 'none', height: '80px' }}></td></tr>
                          <tr>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}><strong><u>{namaKepsek || "..................................................."}</u></strong><br/>NIP. {nipKepsek || "...................................."}</td>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}><strong><u>{namaGuru || "..................................................."}</u></strong><br/>NIP. {nipGuru || "...................................."}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-20 opacity-70">
                  <div className="w-24 h-24 bg-white border-2 border-slate-300 rounded-2xl flex items-center justify-center mb-6 text-5xl shadow-sm">📄</div>
                  <h3 className="font-bold text-slate-700 text-xl mb-2 uppercase tracking-widest">Area Tinjau Dokumen</h3>
                  <p className="text-sm max-w-md text-slate-500 leading-relaxed font-medium">Dokumen yang telah digenerate akan tampil di sini dengan format standar baku nasional dan siap untuk diunduh (Word/PDF/Excel).</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}