"use client";

export const maxDuration = 60;

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, BookOpen, Settings, FileText, CheckCircle, Bot, Loader2, Save, History, FileDown, Printer, Coins, Target, Link2, Trash2 } from "lucide-react";
import { Teachers } from "next/font/google";

import { db } from "@/lib/firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, increment, deleteDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function GeneratorBahanAjar() {
  // State User Auth & Token
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pendidik");
  const [aiTokens, setAiTokens] = useState(0);

  // State Form Input (Kurikulum & Identitas)
  const [sumber, setSumber] = useState("Kemendikdasmen (SK BSKAP 32/2024)"); 
  const [tipe, setTipe] = useState("Modul Ajar (PPM)");
  const [fase, setFase] = useState("");
  const [kelas, setKelas] = useState("");
  const [mapel, setMapel] = useState("");
  const [topik, setTopik] = useState(""); // Elemen / Topik Utama
  const [materi, setMateri] = useState(""); // Materi Spesifik

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

  // State UI, AI & Dokumen Terakhir
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasil, setHasil] = useState("");
  const [docId, setDocId] = useState(""); 
  const [dokumenTerakhir, setDokumenTerakhir] = useState(""); 
  const [gunakanKonteks, setGunakanKonteks] = useState(false); 
  const [riwayatModul, setRiwayatModul] = useState<any[]>([]);

  const pdfRef = useRef<HTMLDivElement>(null);

  const p5Kemendikbud = ["Semua Dimensi P5", "Beriman, Bertakwa & Berakhlak Mulia", "Berkebinekaan Global", "Bergotong Royong", "Mandiri", "Bernalar Kritis", "Kreatif"];
  const p5Kemenag = ["Semua Nilai P5 & PPRA", "Berkeadaban (Ta'addub)", "Keteladanan (Qudwah)", "Kewarganegaraan (Muwatana)", "Mengambil jalan tengah (Tawassut)", "Berimbang (Tawazun)", "Lurus dan tegas (I'tidal)", "Kesetaraan (Musawa)"];

  // Mapping Fase ke Kelas
  const opsiKelas: any = {
    "Fase PAUD": ["TK A", "TK B"],
    "Fase A": ["Kelas 1", "Kelas 2"],
    "Fase B": ["Kelas 3", "Kelas 4"],
    "Fase C": ["Kelas 5", "Kelas 6"],
    "Fase D": ["Kelas 7", "Kelas 8", "Kelas 9"],
    "Fase E": ["Kelas 10"],
    "Fase F": ["Kelas 11", "Kelas 12"],
  };

  const opsiTipeDokumen = [
    "Modul Ajar", "RPP", "ATP", "PROMES", "PROTA", 
    "LKPD", "Bahan Bacaan Siswa", "Kisi-kisi Ujian", "Rubrik Penilaian", "Bank Soal"
  ];

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
          const data = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((d: any) => d.userId === user.uid);
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
    if (!topik || !materi || !fase || !kelas) { alert("Mohon lengkapi Fase, Kelas, Topik, dan Materi Spesifik."); return; }
    if (aiTokens <= 0) { alert("Sisa Token AI Anda habis. Silakan hubungi Admin."); return; }

    setIsGenerating(true);
    setHasil("");
    setDocId(""); // Reset doc id karena ini dokumen baru
    const startTime = Date.now();
    
    // --- BUILD SYSTEM PROMPT BERDASARKAN REGULASI ---
    let sistemPrompt = `Anda adalah Ahli Penyusun Kurikulum Pendidikan Nasional Indonesia. Buatlah dokumen menggunakan format Markdown (tabel, bold, list) yang sangat rapi dan formal.\n`;
    if (sumber.includes("BSKAP")) {
      sistemPrompt += `PENTING: Rujuk pada SK BSKAP No. 32 Tahun 2024 tentang Capaian Pembelajaran (CP) pada Kurikulum Merdeka. Jabarkan CP menjadi Tujuan Pembelajaran (TP) yang logis.\n`;
    } else {
      sistemPrompt += `PENTING: Rujuk pada regulasi KMA No. 1503 Tahun 2025 (Kementerian Agama) terbaru terkait Capaian Pembelajaran dan integrasi nilai-nilai Madrasah (PPRA).\n`;
    }

    let topikKirim = `Buatlah dokumen **${tipe}**.\n\n`;
    topikKirim += `**IDENTITAS DOKUMEN**\n- Sekolah/Madrasah: ${namaSekolah || '[Nama Institusi]'}\n- Mata Pelajaran: ${mapel}\n- Fase / Kelas: ${fase} / ${kelas}\n- Tahun Pelajaran: ${tahunPelajaran} (Semester ${semester})\n- Topik/Elemen CP: ${topik}\n- Materi Spesifik: ${materi}\n\n`;

    if (tipe === "Modul Ajar (PPM)" || tipe === "RPP") {
        if (metode) topikKirim += `- Strategi/Model Pembelajaran: ${metode}\n`;
        if (alokasiWaktu) topikKirim += `- Alokasi Waktu: ${alokasiWaktu}\n`;
        if (profilPelajar) topikKirim += `- Fokus Profil Pelajar (P5/PPRA): Integrasikan nilai "${profilPelajar}" dalam skenario pembelajaran.\n`;
        topikKirim += `Struktur Wajib: Identitas, Capaian Pembelajaran (SK BSKAP 32/2024), Tujuan Pembelajaran, Pemahaman Bermakna, Pertanyaan Pemantik, Skenario Kegiatan (Pendahuluan, Inti, Penutup), dan Asesmen Singkat.\n`;
    } else if (tipe === "PROMES") {
        topikKirim += `Struktur Wajib: Buatlah tabel Program Semester (PROSEM) yang memuat Alokasi Waktu (JP), Bulan (Juli s.d Desember atau Januari s.d Juni sesuai semester), dan matriks/ceklis Minggu Efektif layaknya Kalender Pendidikan (Kaldik).\n`;
    } else if (tipe === "Lembar Kerja Peserta Didik (LKPD)") {
        topikKirim += `Struktur Wajib: Judul LKPD, Tujuan, Alat/Bahan (jika ada), Langkah Kegiatan/Instruksi Pengerjaan, dan Soal/Tabel Pengamatan untuk diisi siswa.\n`;
    } else if (tipe === "Kisi-kisi Ujian") {
        topikKirim += `Struktur Wajib: Tabel yang memuat CP/TP, Materi, Indikator Soal, Level Kognitif (C1-C6), Bentuk Soal (PG/Esai), dan Nomor Soal.\n`;
    } else {
        topikKirim += `Buatlah struktur yang komprehensif dan sesuai standar akademik untuk ${tipe}.\n`;
    }

    // Integrasi Konteks Jika Dicentang
    if (gunakanKonteks && dokumenTerakhir) {
      topikKirim += `\n\n[KONTEKS DOKUMEN SEBELUMNYA]:\nUntuk memastikan kesinambungan, selaraskan dokumen baru ini dengan data dari dokumen yang baru saja saya buat sebelumnya berikut ini:\n"""\n${dokumenTerakhir.substring(0, 3000)}\n"""\n`;
    }

    try {
      const apiMessages = [
        { role: "system", content: sistemPrompt },
        { role: "user", content: topikKirim }
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gemini-1.5-flash", messages: apiMessages })
      });

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const aiResponseContent = data.choices[0].message.content;
        const tokenUsed = data.usage?.total_tokens || 0;

        setHasil(aiResponseContent);
        setDokumenTerakhir(aiResponseContent); // Simpan untuk konteks selanjutnya

        if (tokenUsed > 0) {
          await updateDoc(doc(db, "users", userUid), { aiTokens: increment(-tokenUsed) });
          await updateDoc(doc(db, "ai_monitoring", "token_stats"), { tokenTerpakai: increment(tokenUsed) });
          await addDoc(collection(db, "ai_logs"), {
            aksi: `Generate ${tipe}`, pengguna: userName, role: "guru", status: "Sukses",
            latensi: Date.now() - startTime, tokenDipakai: tokenUsed, timestamp: serverTimestamp()
          });
        }
      } else {
        throw new Error("Respons AI kosong.");
      }
    } catch (error: any) {
      alert("Gagal memproses AI: " + error.message);
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handleSaveToDatabase = async () => {
    if (!userUid || !hasil) return;
    setIsSaving(true);
    try {
      if (docId) {
        // Update dokumen jika sudah pernah disave
        await updateDoc(doc(db, "modul_ajar", docId), { konten: hasil });
        alert("Perubahan dokumen berhasil diperbarui!");
      } else {
        // Simpan baru
        const docRef = await addDoc(collection(db, "modul_ajar"), {
          userId: userUid,
          sumber, tipe, fase, kelas, mapel, topik, materi, konten: hasil,
          namaSekolah, kotaSekolah, namaKepsek, nipKepsek, namaGuru, nipGuru,
          createdAt: serverTimestamp()
        });
        setDocId(docRef.id);
        alert("Dokumen baru berhasil disimpan ke Koleksi Sistem!");
      }
    } catch (error) {
      alert("Gagal menyimpan dokumen.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenRiwayat = (riwayat: any) => {
    setTipe(riwayat.tipe);
    setTopik(riwayat.topik);
    setMateri(riwayat.materi || "");
    setMapel(riwayat.mapel);
    setFase(riwayat.fase);
    setKelas(riwayat.kelas || "");
    setHasil(riwayat.konten);
    setDocId(riwayat.id);
    setDokumenTerakhir(riwayat.konten);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); // Scroll ke bawah (Kanvas)
  };

  const hapusRiwayat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Mencegah ter-trigger handleOpenRiwayat
    if(confirm("Yakin ingin menghapus dokumen ini dari koleksi?")) {
      await deleteDoc(doc(db, "modul_ajar", id));
      if (docId === id) { setHasil(""); setDocId(""); } // Bersihkan kanvas jika yg dihapus sedang dibuka
    }
  };

  const handleDownloadWord = () => {
    if (!pdfRef.current) return;
    let printHtml = pdfRef.current.innerHTML.replace(/class="markdown-body"/g, '');
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Dokumen</title><style>@page WordSection1 { size: 21cm 29.7cm; margin: 2.54cm; } div.WordSection1 { page: WordSection1; } body, p, li, td, th, h1, h2, h3, h4, div { font-family: 'Times New Roman', serif !important; font-size: 12pt !important; color: black !important; line-height: 1.5; } h1 { font-size: 14pt !important; font-weight: bold !important; margin-bottom: 12pt; text-align: center; text-transform: uppercase; } h2, h3 { font-size: 12pt !important; font-weight: bold !important; margin-top: 12pt; margin-bottom: 6pt; } table { width: 100%; border-collapse: collapse; margin-top: 15pt; margin-bottom: 15pt; border: 1pt solid black !important; } td, th { border: 1pt solid black !important; padding: 5pt 8pt; vertical-align: top; text-align: left; } th { background-color: #f2f2f2; font-weight: bold !important; text-align: center; } .sig-table, .sig-table td, .sig-table th, .sig-table tr { border: none !important; }</style></head><body><div class="WordSection1">${printHtml}</div></body></html>`;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header);
    const fileDownload = document.createElement("a"); document.body.appendChild(fileDownload); 
    fileDownload.href = source; fileDownload.download = `${tipe}_${mapel || 'Dokumen'}.doc`.replace(/[^a-zA-Z0-9.\-_]/g, "_"); 
    fileDownload.click(); document.body.removeChild(fileDownload);
  };

  const handlePrintPDF = () => {
    const printContent = pdfRef.current?.innerHTML;
    if (!printContent) return;
    const iframe = document.createElement("iframe"); iframe.style.display = "none"; document.body.appendChild(iframe);
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`<html><head><title>Cetak PDF</title><style>@page { size: A4 portrait; margin: 2.54cm; } body { font-family: 'Times New Roman', serif !important; font-size: 12pt !important; line-height: 1.5 !important; color: #000; } h1 { text-align: center; font-size: 14pt; margin-bottom: 2rem; font-weight: bold; text-transform: uppercase; } table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; margin-bottom: 1.5rem; border: 1pt solid #000; } th, td { border: 1pt solid #000; padding: 8px 10px; text-align: left; vertical-align: top; } th { background-color: #f1f5f9; font-weight: bold; text-align: center; } tr { page-break-inside: avoid; } h2, h3, h4 { page-break-after: avoid; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; } ul, ol { margin-left: 20px; margin-bottom: 10px; } .sig-table, .sig-table td, .sig-table th, .sig-table tr { border: none !important; padding: 4px; vertical-align: top; }</style></head><body>${printContent}</body></html>`);
    iframe.contentWindow?.document.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
  };

  const tanggalSekarang = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto space-y-6 pb-16 px-4 md:px-6 pt-4">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Generator Perangkat Ajar Nasional</h1>
          <p className="text-slate-500 text-[13px] md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            Didukung AI untuk menyusun dokumen akademik yang selaras dengan SK BSKAP 32/2024 dan Regulasi Madrasah Kemenag.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm w-fit">
          <Coins size={14} className="text-amber-500" /> Sisa Token AI: {aiTokens.toLocaleString('id-ID')}
        </div>
      </div>

      {/* ==============================================
          BAGIAN ATAS: FORM INPUT & PARAMETER
          ============================================== */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
          <Settings size={20} className="text-blue-600" />
          <h2 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>Parameter Penyusunan Dokumen</h2>
        </div>

        <form onSubmit={handleGenerate} className="space-y-8">
          
          {/* 1. JENIS DOKUMEN */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">1. Pilih Jenis Dokumen</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {opsiTipeDokumen.map((item) => (
                <button key={item} type="button" onClick={() => setTipe(item)} className={`py-2 px-3 text-[11px] font-bold rounded-lg transition-all border text-left flex items-center justify-between shadow-sm ${tipe === item ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-white'}`}>
                  <span className="truncate">{item}</span>
                  {tipe === item && <CheckCircle size={14} className="shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* 2. KURIKULUM & MATERI */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200">
             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">2. Kurikulum & Ruang Lingkup Materi</label>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Standar Kurikulum Nasional</label>
                  <select value={sumber} onChange={(e) => setSumber(e.target.value)} className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm">
                    <option value="Kemendikdasmen (SK BSKAP 32/2024)">Kemendikdasmen (SK BSKAP 32/2024)</option>
                    <option value="Kementerian Agama (KMA)">Kementerian Agama (KMA 1503/2025)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Fase Pembelajaran</label>
                  <select value={fase} onChange={(e) => { setFase(e.target.value); setKelas(""); }} className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm" required>
                    <option value="">Pilih Fase</option>
                    {Object.keys(opsiKelas).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Spesifik Kelas</label>
                  <select value={kelas} onChange={(e) => setKelas(e.target.value)} disabled={!fase} className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400" required>
                    <option value="">Pilih Kelas</option>
                    {fase && opsiKelas[fase]?.map((kls: string) => <option key={kls} value={kls}>{kls}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mata Pelajaran</label>
                  <input type="text" value={mapel} onChange={(e) => setMapel(e.target.value)} placeholder="Contoh: Pendidikan Pancasila / Biologi / SKI" className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm" required />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Elemen CP / Topik Utama</label>
                  <input type="text" value={topik} onChange={(e) => setTopik(e.target.value)} placeholder="Contoh: Menyimak / Pancasila sebagai Dasar Negara" className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Materi Pembelajaran Spesifik</label>
                  <input type="text" value={materi} onChange={(e) => setMateri(e.target.value)} placeholder="Contoh: Proses perumusan Pancasila pada sidang BPUPKI" className="w-full bg-white border border-slate-300 px-4 py-3 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm" required />
                </div>
             </div>
          </div>

          {/* 3. IDENTITAS SEKOLAH & PENGATURAN TAMBAHAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">3. Kop Identitas & Cetak</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={namaSekolah} onChange={(e) => setNamaSekolah(e.target.value)} placeholder="Nama Sekolah" className="col-span-2 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400" />
                  <input type="text" value={kotaSekolah} onChange={(e) => setKotaSekolah(e.target.value)} placeholder="Kabupaten/Kota" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400" />
                  <input type="text" value={tahunPelajaran} onChange={(e) => setTahunPelajaran(e.target.value)} placeholder="Thn Ajaran (2025/2026)" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400" />
                  <input type="text" value={namaGuru} onChange={(e) => setNamaGuru(e.target.value)} placeholder="Nama Guru" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400" />
                  <input type="text" value={namaKepsek} onChange={(e) => setNamaKepsek(e.target.value)} placeholder="Nama Kepsek" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400" />
                </div>
             </div>

             <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2 border-b border-emerald-100 pb-2">4. Pengaturan Spesifik Modul</h4>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">Model Pendekatan</label>
                  <select value={metode} onChange={(e) => setMetode(e.target.value)} className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs outline-none focus:border-emerald-500">
                    <option value="">Rekomendasi AI Bebas</option><option value="Problem Based Learning (PBL)">PBL</option><option value="Project Based Learning (PjBL)">PjBL</option><option value="Discovery Learning">Discovery Learning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">Fokus Karakter (P5 / PPRA)</label>
                  <select value={profilPelajar} onChange={(e) => setProfilPelajar(e.target.value)} className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs outline-none focus:border-emerald-500">
                    <option value="">Pilih Fokus...</option>
                    {(sumber.includes("Agama") ? p5Kemenag : p5Kemendikbud).map((opt: string) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">Alokasi Waktu Utama</label>
                  <input type="text" value={alokasiWaktu} onChange={(e) => setAlokasiWaktu(e.target.value)} placeholder="Contoh: 2 JP x 45 Menit" className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                </div>
             </div>
          </div>

          {/* Checkbox Konteks Lanjutan */}
          {dokumenTerakhir && (
            <label className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 cursor-pointer hover:bg-indigo-50 transition-colors shadow-sm">
              <input type="checkbox" checked={gunakanKonteks} onChange={(e) => setGunakanKonteks(e.target.checked)} className="mt-0.5 w-5 h-5 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer" />
              <div>
                <p className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Link2 size={16}/> Selaraskan dengan Dokumen Sebelumnya</p>
                <p className="text-[11px] text-indigo-700/80 mt-1">Centang ini jika Anda ingin dokumen yang dibuat sekarang menyambung secara materi dan konteks dengan dokumen yang baru saja Anda hasilkan (Cocok untuk membuat LKPD atau Kisi-kisi setelah Modul Ajar jadi).</p>
              </div>
            </label>
          )}

          {/* TOMBOL GENERATE */}
          <button type="submit" disabled={isGenerating} className={`w-full py-4 rounded-xl text-base font-black text-white transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 ${isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 hover:shadow-xl'}`}>
            {isGenerating ? <><Loader2 size={20} className="animate-spin" /> Merajut Kurikulum Nasional...</> : <><Bot size={20} /> Generate Dokumen Sekarang</>}
          </button>
        </form>
      </div>

      {/* ==============================================
          BAGIAN BAWAH: KANVAS HASIL AI & KOLEKSI DOKUMEN
          ============================================== */}
      <div className="flex flex-col lg:flex-row gap-6 pt-4 border-t border-slate-200">
        
        {/* KOLOM KIRI BAWAH: DAFTAR KOLEKSI DOKUMEN SAYA */}
        <div className="lg:w-1/3 flex flex-col">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm h-full max-h-[800px] overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <History size={16} className="text-blue-500" /> Koleksi Dokumen Saya
            </h3>
            <div className="space-y-3">
              {riwayatModul.length > 0 ? (
                riwayatModul.map(riwayat => (
                  <div key={riwayat.id} onClick={() => handleOpenRiwayat(riwayat)} className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer group ${docId === riwayat.id ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-white'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{riwayat.tipe}</span>
                      <button onClick={(e) => hapusRiwayat(e, riwayat.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={14}/></button>
                    </div>
                    <span className="font-bold text-slate-800 text-sm leading-snug group-hover:text-blue-700 transition-colors">{riwayat.materi || riwayat.topik}</span>
                    <span className="text-[10px] font-medium text-slate-500 mt-2">{riwayat.mapel} • Kelas {riwayat.kelas}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-60">
                  <FileText size={32} className="mx-auto text-slate-300 mb-2"/>
                  <p className="text-xs text-slate-400 font-medium">Belum ada dokumen yang disimpan.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KOLOM KANAN BAWAH: KANVAS HASIL */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col relative overflow-hidden min-h-[600px] lg:h-[800px]">
            
            {/* Header Kanvas */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm"><BookOpen size={20} className="text-blue-600"/></div>
                <div>
                  <h2 className={`font-bold text-slate-800 text-lg ${teachersFont.className}`}>Kanvas Tinjauan</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Siap Edit & Ekspor</p>
                </div>
              </div>
              
              {hasil && (
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handleDownloadWord} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-blue-200"><FileDown size={14}/> Word</button>
                  <button onClick={handlePrintPDF} className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-rose-200"><Printer size={14}/> PDF</button>
                  <button onClick={handleSaveToDatabase} disabled={isSaving} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-70 ml-2">
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14}/>} {docId ? "Perbarui" : "Simpan"}
                  </button>
                </div>
              )}
            </div>

            {/* Isi Kanvas Markdown */}
            <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 md:p-10 relative">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                  <div className="relative w-16 h-16 flex items-center justify-center mb-5">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    <Bot size={24} className="text-blue-600 animate-pulse" />
                  </div>
                  <p className="font-bold text-slate-700">Merajut Kurikulum Nasional...</p>
                  <p className="text-xs text-slate-500 mt-1">Mengintegrasikan standar {sumber.split(" ")[0]}</p>
                </div>
              ) : hasil ? (
                <div className="bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-slate-200 rounded-lg p-8 md:p-12 mx-auto max-w-3xl min-h-[800px]">
                  <div ref={pdfRef} className="pdf-container">
                    <style>{`
                      .pdf-container { font-family: 'Times New Roman', serif !important; font-size: 12pt !important; line-height: 1.5 !important; color: #000; } 
                      .markdown-body table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; margin-bottom: 1.5rem; } 
                      .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 8px 12px; text-align: left; vertical-align: top; } 
                      .markdown-body th { background-color: #f2f2f2; font-weight: bold; text-align: center; } 
                      .markdown-body tr { page-break-inside: avoid; } 
                      .markdown-body h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 1.5rem; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; } 
                      .markdown-body h2 { font-size: 12pt; margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: bold; text-transform: uppercase; } 
                      .markdown-body h3 { font-size: 12pt; margin-top: 1rem; margin-bottom: 0.5rem; font-weight: bold; } 
                      .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 1rem; }
                      .markdown-body li { margin-bottom: 4px; }
                      .sig-table, .sig-table td, .sig-table th, .sig-table tr { border: none !important; padding: 4px; vertical-align: top; }
                    `}</style>
                    
                    {/* Kop Surat Dokumen Formal */}
                    {namaSekolah && (
                      <div style={{ textAlign: 'center', borderBottom: '3px solid black', paddingBottom: '12px', marginBottom: '24px', pageBreakAfter: 'avoid' }}>
                        <h1 style={{ fontSize: '16pt', fontWeight: 'bold', textTransform: 'uppercase', color: 'black', margin: '0 0 5px 0' }}>{namaSekolah}</h1>
                        <p style={{ fontSize: '12pt', margin: 0 }}>Dokumen Akademik Resmi - Kurikulum {sumber.split("(")[0].trim()}</p>
                      </div>
                    )}

                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{hasil}</ReactMarkdown>
                    </div>

                    {/* Kolom Tanda Tangan */}
                    {(namaGuru || namaKepsek) && (
                      <table className="sig-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4rem', pageBreakInside: 'avoid', border: 'none' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '50%', border: 'none' }}></td>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}>{kotaSekolah || "........................"}, {tanggalSekarang}</td>
                          </tr>
                          <tr><td colSpan={2} style={{ border: 'none', textAlign: 'center', paddingTop: '10px', paddingBottom: '20px' }}>Mengetahui,</td></tr>
                          <tr>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}>Kepala Sekolah</td>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}>Guru Mata Pelajaran</td>
                          </tr>
                          <tr><td style={{ border: 'none', height: '80px' }}></td><td style={{ border: 'none', height: '80px' }}></td></tr>
                          <tr>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}><strong><u>{namaKepsek || "..................................................."}</u></strong><br/>NIP. {nipKepsek || "........................"}</td>
                            <td style={{ width: '50%', border: 'none', textAlign: 'center' }}><strong><u>{namaGuru || "..................................................."}</u></strong><br/>NIP. {nipGuru || "........................"}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-20 opacity-60">
                  <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 rounded-3xl flex items-center justify-center mb-5 text-4xl">📄</div>
                  <h3 className="font-bold text-slate-600 text-lg mb-2">Area Tinjau Dokumen</h3>
                  <p className="text-xs max-w-sm text-slate-500">Lengkapi parameter di atas lalu tekan Generate untuk memicu sistem Syntax merakit dokumen Anda.</p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
}