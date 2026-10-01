"use client";

export const maxDuration = 240;

import { motion, AnimatePresence } from "framer-motion";
import {
  Target, FileQuestion, BarChart4, MessageSquareHeart, BrainCircuit, Loader2,
  Sparkles, Globe, ListOrdered, History, Coins, X, Trash2, FileDown, Printer,
  Cloud, CheckCircle2, BookOpen, Bot, ClipboardList, Plus, ChevronLeft, Users,
  Clock, Eye, ScanLine, Download, Stamp, AlertTriangle, ImageIcon, Shapes,
  CloudOff, GraduationCap, CalendarClock, Pencil, Library, Zap, Users2,
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, FormEvent, useRef, useMemo, useCallback } from "react";

import { db } from "@/lib/firebase";
import {
  collection, addDoc, serverTimestamp, onSnapshot, doc, query, where, orderBy,
  deleteDoc, updateDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import KopSurat from "@/components/KopSurat";
import EditorSoal from "@/components/asesmen/EditorSoal";
import PanelCetak from "@/components/asesmen/PanelCetak";
import PanelKoreksi from "@/components/asesmen/PanelKoreksi";
import EditorDokumen from "@/components/EditorDokumen";

import { useKopLembaga, kopTerisi } from "@/lib/kop";
import {
  cariBank, kontribusiBank, tandaiDipakai, terapkanIdentitas, type EntriBank,
} from "@/lib/bankBersama";
import {
  parseSoalDariMarkdown, ringkasKomposisi, totalBobot,
  type IdentitasUjian, type Soal,
} from "@/lib/soal";
import {
  bersihkanSvg, hitungPenandaGambar, instruksiDiagramSVG, instruksiIlustrasiRaster,
  lengkapiGambarRaster, perluDiagram, type ProgresGambar,
} from "@/lib/gambarAjar";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

type Tab = "generator" | "ujian" | "koreksi" | "analisis" | "feedback";
type StatusSimpan = "kosong" | "menyimpan" | "tersimpan" | "gagal";

const TABS: { id: Tab; label: string; ikon: any }[] = [
  { id: "generator", label: "Generator Soal", ikon: Sparkles },
  { id: "ujian", label: "E-Ujian (CBT)", ikon: ClipboardList },
  { id: "koreksi", label: "Koreksi LJK", ikon: ScanLine },
  { id: "analisis", label: "Analisis Butir", ikon: BarChart4 },
  { id: "feedback", label: "Feedback", ikon: MessageSquareHeart },
];

export default function ModulAsesmenGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("generator");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pendidik");
  const [aiTokens, setAiTokens] = useState(0);
  const [npsnGuru, setNpsnGuru] = useState("");

  const { kop, lembagaDitemukan } = useKopLembaga(npsnGuru);

  /* ------------------------- GENERATOR SOAL ------------------------- */
  const [isGenerating, setIsGenerating] = useState(false);
  const [docId, setDocId] = useState("");
  const [hasil, setHasil] = useState("");
  const [kontenHtml, setKontenHtml] = useState("");
  const [statusSimpan, setStatusSimpan] = useState<StatusSimpan>("kosong");
  const [editorBuka, setEditorBuka] = useState(false);
  const [bankHasil, setBankHasil] = useState<(EntriBank & { skor?: number })[]>([]);
  const [bankModal, setBankModal] = useState(false);
  const [bankMemeriksa, setBankMemeriksa] = useState(false);
  const [progresGambar, setProgresGambar] = useState<ProgresGambar | null>(null);
  const [catatanGambar, setCatatanGambar] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    mapel: "", fase: "", kelas: "", kompetensiDasar: "",
    jenisUjian: "Ulangan Harian", tingkatKesulitan: "Campuran (Proporsional)",
    dimensiXAI: ["Linguistik", "Sosiolinguistik", "Budaya"] as string[],
  });
  const [opsiPG, setOpsiPG] = useState("A - D (4 Opsi)");
  const [jumlah, setJumlah] = useState({ pg: "10", bs: "0", jodoh: "0", isian: "0", uraian: "5" });
  const [pakaiDiagram, setPakaiDiagram] = useState(false);
  const [pakaiIlustrasi, setPakaiIlustrasi] = useState(false);

  const [showKoleksi, setShowKoleksi] = useState(false);
  const [riwayatAsesmen, setRiwayatAsesmen] = useState<any[]>([]);
  const [modulAjarList, setModulAjarList] = useState<any[]>([]);
  const [showModulModal, setShowModulModal] = useState(false);

  /* --------------------------- E-UJIAN CBT -------------------------- */
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [kelasAktifId, setKelasAktifId] = useState("");
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [ujianAktifId, setUjianAktifId] = useState("");
  const [soalEdit, setSoalEdit] = useState<Soal[]>([]);
  const [statusSoal, setStatusSoal] = useState<StatusSimpan>("kosong");
  const [subTabUjian, setSubTabUjian] = useState<"soal" | "cetak" | "hasil">("soal");
  const [showModalUjian, setShowModalUjian] = useState(false);
  const [hasilPeserta, setHasilPeserta] = useState<any[]>([]);
  const [daftarSiswa, setDaftarSiswa] = useState<any[]>([]);

  const [formUjian, setFormUjian] = useState({
    judul: "", jenisUjian: "Ulangan Harian", waktuMenit: 60,
    waktuMulai: "", waktuSelesai: "", sumberSoal: "manual", koleksiId: "",
  });

  /* ------------------------ ANALISIS & FEEDBACK --------------------- */
  const [analisisInput, setAnalisisInput] = useState("");
  const [analisisHasil, setAnalisisHasil] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ nama: "", nilai: "", catatan: "" });
  const [feedbackHasil, setFeedbackHasil] = useState("");
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const [isExportingGoogle, setIsExportingGoogle] = useState(false);
  const [googleExportType, setGoogleExportType] = useState<"Docs" | "Sheets" | null>(null);

  const pdfRef = useRef<HTMLDivElement>(null);
  const kontenTersimpanRef = useRef("");
  const soalTersimpanRef = useRef("");
  const metaRef = useRef<any>({});

  const mapelPerluDiagram = perluDiagram(formData.mapel);
  const kelasAktif = kelasList.find((k) => k.id === kelasAktifId) || null;
  const ujianAktif = ujianList.find((u) => u.id === ujianAktifId) || null;

  /* ----------------------------- MUAT DATA -------------------------- */

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => {
      if (!user) { window.location.href = "/login"; return; }
      setUserUid(user.uid);

      const unsubProfil = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setUserName(data.nama || "Pendidik");
        setAiTokens(data.aiTokens || 0);
        setNpsnGuru(data.npsn || data.instansi || "");
      });

      const qRiwayat = query(
        collection(db, "modul_ajar"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const unsubRiwayat = onSnapshot(qRiwayat, (snapshot) => {
        const semua = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        setRiwayatAsesmen(semua.filter((d) => /Asesmen|Bank Soal|Kisi/.test(String(d.tipe || ""))));
        setModulAjarList(semua.filter((d) => /Modul Ajar|Bahan Ajar|LKPD|RPP/.test(String(d.tipe || ""))));
        setIsLoading(false);
      });

      const unsubKelas = onSnapshot(
        query(collection(db, "manajemen_kelas"), where("guruId", "==", user.uid)),
        (snap) => {
          const daftar = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
          setKelasList(daftar);
          setKelasAktifId((prev) => prev || daftar[0]?.id || "");
        }
      );

      return () => { unsubProfil(); unsubRiwayat(); unsubKelas(); };
    });
    return () => unsub();
  }, []);

  // Daftar ujian mengikuti kelas terpilih.
  useEffect(() => {
    if (!kelasAktifId) { setUjianList([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "bank_soal"), where("kelasId", "==", kelasAktifId)),
      (snap) => setUjianList(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any))
    );
    return () => unsub();
  }, [kelasAktifId]);

  // Peserta didik pada kelas terpilih, untuk pencocokan nama saat koreksi.
  useEffect(() => {
    if (!npsnGuru) { setDaftarSiswa([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsnGuru)),
      (snap) => {
        const semua = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        setDaftarSiswa(
          kelasAktif
            ? semua.filter((s) => kelasAktif.peserta?.includes(s.id) || s.kelas === kelasAktif.nama)
            : semua
        );
      }
    );
    return () => unsub();
  }, [npsnGuru, kelasAktifId, kelasAktif]);

  // Hasil pengerjaan peserta untuk ujian yang sedang dibuka.
  useEffect(() => {
    if (!ujianAktifId) { setHasilPeserta([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "jawaban_siswa"), where("idUjian", "==", ujianAktifId)),
      (snap) => setHasilPeserta(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any))
    );
    return () => unsub();
  }, [ujianAktifId]);

  // Butir soal dimuat saat ujian dibuka.
  useEffect(() => {
    if (!ujianAktif) { setSoalEdit([]); soalTersimpanRef.current = ""; setStatusSoal("kosong"); return; }
    const daftar: Soal[] = ujianAktif.soal || [];
    setSoalEdit(daftar);
    soalTersimpanRef.current = JSON.stringify(daftar);
    setStatusSoal("tersimpan");
  }, [ujianAktifId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPakaiDiagram(mapelPerluDiagram), [mapelPerluDiagram]);

  useEffect(() => {
    metaRef.current = {
      mapel: formData.mapel,
      kelas: formData.kelas,
      fase: formData.fase,
      topik: formData.kompetensiDasar,
      tipe: `Bank Soal: ${formData.jenisUjian}`,
      npsn: npsnGuru,
      namaSekolah: kop.namaLembaga,
    };
  }, [formData, npsnGuru, kop.namaLembaga]);

  /* ------------------------- SIMPAN OTOMATIS ------------------------ */

  const simpanOtomatis = useCallback(async (konten: string, html: string) => {
    const uid = getAuth().currentUser?.uid;
    if (!uid || !konten) return;
    setStatusSimpan("menyimpan");
    try {
      const muatan = { konten, kontenHtml: html || "", ...metaRef.current, diperbaruiPada: serverTimestamp() };
      if (docId) {
        await updateDoc(doc(db, "modul_ajar", docId), muatan);
      } else {
        const ref = await addDoc(collection(db, "modul_ajar"), {
          userId: uid, ...muatan, statusValidasi: "menunggu", createdAt: serverTimestamp(),
        });
        setDocId(ref.id);
      }
      kontenTersimpanRef.current = konten + "\u0000" + (html || "");
      setStatusSimpan("tersimpan");
    } catch (error) {
      console.error("Gagal menyimpan otomatis:", error);
      setStatusSimpan("gagal");
    }
  }, [docId]);

  useEffect(() => {
    if (!hasil) return;
    if (hasil + "\u0000" + kontenHtml === kontenTersimpanRef.current) return;
    const timer = setTimeout(() => { void simpanOtomatis(hasil, kontenHtml); }, 1200);
    return () => clearTimeout(timer);
  }, [hasil, kontenHtml, simpanOtomatis]);

  // Butir soal ujian juga tersimpan sendiri, tanpa tombol simpan.
  useEffect(() => {
    if (!ujianAktifId) return;
    const cetakan = JSON.stringify(soalEdit);
    if (cetakan === soalTersimpanRef.current) return;

    setStatusSoal("menyimpan");
    const timer = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "bank_soal", ujianAktifId), {
          soal: soalEdit,
          totalSkor: totalBobot(soalEdit),
          diperbaruiPada: serverTimestamp(),
        });
        soalTersimpanRef.current = cetakan;
        setStatusSoal("tersimpan");
      } catch (error) {
        console.error("Gagal menyimpan butir soal:", error);
        setStatusSoal("gagal");
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [soalEdit, ujianAktifId]);

  /* --------------------------- AKSI AI ------------------------------ */

  const handleToggleDimensi = (dimensi: string) =>
    setFormData((prev) => ({
      ...prev,
      dimensiXAI: prev.dimensiXAI.includes(dimensi)
        ? prev.dimensiXAI.filter((d) => d !== dimensi)
        : [...prev.dimensiXAI, dimensi],
    }));

  const identitasKu = () => ({
    namaGuru: userName, namaSekolah: kop.namaLembaga, kota: kop.kota, tahunPelajaran: kop.tahunPelajaran,
  });

  // Sebelum menghabiskan token, tawarkan instrumen serupa dari Bank Bersama.
  const mulaiGenerateAI = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid) return;
    if (!formData.mapel || !formData.kompetensiDasar) return alert("Lengkapi Mata Pelajaran dan Kompetensi Dasar / Topik.");
    if (formData.dimensiXAI.length === 0) return alert("Pilih minimal satu dimensi [x-AI] untuk diujikan.");

    setBankMemeriksa(true);
    const cocok = await cariBank({ tipe: "Asesmen", mapel: formData.mapel, materi: formData.kompetensiDasar });
    setBankMemeriksa(false);
    if (cocok.length > 0) { setBankHasil(cocok); setBankModal(true); return; }
    await generateSoalSekarang();
  };

  const muatDariBankSoal = (entri: EntriBank) => {
    const konten = terapkanIdentitas(entri.konten, identitasKu());
    setBankModal(false);
    setHasil(konten);
    setKontenHtml("");
    setDocId("");
    setCatatanGambar([]);
    kontenTersimpanRef.current = "";
    setStatusSimpan("kosong");
    void tandaiDipakai(entri.id);
  };

  const handleGenerateAI = async (e: FormEvent) => {
    e.preventDefault();
    await mulaiGenerateAI(e);
  };

  const generateSoalSekarang = async () => {
    setBankModal(false);
    if (!userUid) return;
    if (aiTokens <= 0) return alert("Sisa Token AI Anda habis.");

    setIsGenerating(true);
    setHasil("");
    setKontenHtml("");
    setDocId("");
    setCatatanGambar([]);
    setStatusSimpan("kosong");
    kontenTersimpanRef.current = "";

    const instruksiDimensi = formData.dimensiXAI
      .map((d) => {
        if (d === "Linguistik") return "- Linguistik: Ketepatan tata bahasa dan makna.";
        if (d === "Sosiolinguistik") return "- Sosiolinguistik: Tingkat tutur dan sapaan sosial.";
        if (d === "Budaya") return "- Budaya: Tradisi atau peribahasa lokal.";
        return "";
      })
      .join("\n");

    let systemPrompt = `Anda adalah Evaluator Akademik Ahli di Indonesia.\n`;
    systemPrompt += `BUATLAH INSTRUMEN ASESMEN DENGAN ATURAN FORMAT MUTLAK BERIKUT AGAR BISA DIBACA PARSER APLIKASI:\n\n`;
    systemPrompt += `1. Setiap soal WAJIB dibungkus [SOAL_START] di awal dan [SOAL_END] di akhir.\n`;
    systemPrompt += `2. Tepat di bawah [SOAL_START], WAJIB ada [TIPE:jenis]. Gunakan hanya: PG, BS, JODOHKAN, ISIAN, URAIAN.\n`;
    systemPrompt += `3. WAJIB sertakan [KUNCI:jawaban] tepat sebelum [SOAL_END].\n`;
    systemPrompt += `4. Jangan gunakan Markdown Table untuk daftar soal, KECUALI tipe JODOHKAN yang wajib memakai tabel Markdown.\n`;
    systemPrompt += `5. Urutkan penulisan soal per jenis: seluruh PG dahulu, lalu BS, JODOHKAN, ISIAN, terakhir URAIAN.\n\n`;
    systemPrompt += `CONTOH PG:\n[SOAL_START]\n[TIPE:PG]\n1. Apa ibu kota Indonesia?\n- A. Jakarta\n- B. Bali\n- C. Papua\n- D. Maluku\n[KUNCI:A]\n[SOAL_END]\n\n`;
    systemPrompt += `CONTOH BS:\n[SOAL_START]\n[TIPE:BS]\n2. Matahari terbit dari barat.\n[KUNCI:Salah]\n[SOAL_END]\n\n`;
    systemPrompt += `CONTOH JODOHKAN:\n[SOAL_START]\n[TIPE:JODOHKAN]\n3. Pasangkanlah pernyataan berikut!\n| Pernyataan (Kiri) | Pasangan (Kanan) |\n|---|---|\n| Sapi | Mamalia |\n| Ayam | Unggas |\n[KUNCI:Sapi=Mamalia | Ayam=Unggas]\n[SOAL_END]\n\n`;
    systemPrompt += `CONTOH ISIAN:\n[SOAL_START]\n[TIPE:ISIAN]\n4. Ibu kota Provinsi Jawa Barat adalah ....\n[KUNCI:Bandung]\n[SOAL_END]\n\n`;
    systemPrompt += `CONTOH URAIAN:\n[SOAL_START]\n[TIPE:URAIAN]\n5. Jelaskan makna proklamasi!\n[KUNCI:Kemerdekaan bangsa dari penjajahan]\n[SOAL_END]\n\n`;
    systemPrompt += `PENTING: untuk ISIAN, [KUNCI:...] WAJIB berisi jawaban singkat yang PASTI dan eksak (satu kata/frasa), bukan penjelasan.\n\n`;

    if (pakaiDiagram) systemPrompt += `${instruksiDiagramSVG(formData.mapel)}\nSVG ditulis di dalam badan soal, di antara [TIPE:...] dan [KUNCI:...].\n\n`;
    if (pakaiIlustrasi) systemPrompt += `${instruksiIlustrasiRaster()}\n\n`;

    systemPrompt += `Tuliskan instrumen untuk:\nMata Pelajaran: ${formData.mapel}\nFase/Kelas: ${formData.fase}/${formData.kelas}\nMateri: ${formData.kompetensiDasar}\n\n`;
    systemPrompt += `KOMPOSISI WAJIB: ${jumlah.pg} PG (${opsiPG}), ${jumlah.bs} Benar/Salah, ${jumlah.jodoh} Menjodohkan, ${jumlah.isian} Isian, ${jumlah.uraian} Uraian.\n`;
    systemPrompt += `TINGKAT KESULITAN: ${formData.tingkatKesulitan}.\n`;
    systemPrompt += `DIMENSI TERINTEGRASI:\n${instruksiDimensi}\n\n`;
    systemPrompt += `Di bagian paling bawah dokumen, buat TABEL KISI-KISI PENULISAN SOAL.`;

    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          model: "gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Buatkan dokumen Asesmen sesuai format tag secara ketat sekarang." },
          ],
        }),
      });
      const data = await response.json();
      if (!data.choices?.length) throw new Error(data.error?.message || data.error || "Gagal mendapatkan respons AI.");

      let konten = data.choices[0].message.content as string;
      setHasil(konten);

      if (data.usage?.total_tokens > 0) {
        await addDoc(collection(db, "ai_logs"), {
          aksi: `Generate Asesmen ${formData.jenisUjian}`, pengguna: userName, role: "guru",
          status: "Sukses", tokenDipakai: data.usage.total_tokens, timestamp: serverTimestamp(),
        });
      }

      if (pakaiIlustrasi && hitungPenandaGambar(konten).length > 0) {
        const hasilGambar = await lengkapiGambarRaster(konten, {
          mapel: formData.mapel,
          jenjang: `${formData.fase} / ${formData.kelas}`,
          onProgres: setProgresGambar,
        });
        setProgresGambar(null);
        setHasil(hasilGambar.konten);
        konten = hasilGambar.konten;
        if (hasilGambar.pesanGagal.length) setCatatanGambar(hasilGambar.pesanGagal);
      }

      // Sumbangkan ke Bank Bersama (identitas dibuang) agar guru lain hemat token.
      void kontribusiBank({
        tipe: "Asesmen", mapel: formData.mapel, fase: formData.fase, kelas: formData.kelas,
        topik: formData.kompetensiDasar, materi: formData.kompetensiDasar, konten, identitas: identitasKu(),
      });
    } catch (error: any) {
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setProgresGambar(null);
    }
  };

  const handleAnalisisAI = async (e: FormEvent) => {
    e.preventDefault();
    if (!analisisInput || aiTokens <= 0) return;
    setIsAnalyzing(true);
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          model: "gemini-2.5-pro",
          messages: [{ role: "user", content: `Bertindaklah sebagai ahli evaluasi pendidikan. Analisis data butir soal berikut dan berikan evaluasi tingkat kesukaran, daya pembeda, serta rekomendasi tindak lanjut yang spesifik:\n\n${analisisInput}` }],
        }),
      });
      const data = await res.json();
      setAnalisisHasil(data.choices?.[0]?.message?.content || "Tidak ada hasil analisis.");
    } catch {
      alert("Terjadi kesalahan saat menganalisis data.");
    }
    setIsAnalyzing(false);
  };

  const handleFeedbackAI = async (e: FormEvent) => {
    e.preventDefault();
    if (aiTokens <= 0) return;
    setIsGeneratingFeedback(true);
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          model: "gemini-2.5-pro",
          messages: [{ role: "user", content: `Buatkan feedback rapor formatif yang memotivasi, personal, dan konstruktif (pendekatan Kurikulum Merdeka) untuk siswa berikut:\nNama: ${feedbackData.nama}\nNilai: ${feedbackData.nilai}\nCatatan Guru: ${feedbackData.catatan}\n\nGunakan bahasa positif, apresiatif, dan berikan saran perbaikan yang jelas.` }],
        }),
      });
      const data = await res.json();
      setFeedbackHasil(data.choices?.[0]?.message?.content || "Tidak ada hasil.");
    } catch {
      alert("Terjadi kesalahan saat membuat feedback.");
    }
    setIsGeneratingFeedback(false);
  };

  /* ---------------------------- UJIAN CBT --------------------------- */

  const buatUjian = async () => {
    if (!kelasAktifId || !userUid) return alert("Pilih kelas terlebih dahulu.");
    if (!formUjian.judul.trim()) return alert("Judul ujian wajib diisi.");

    let soalAwal: Soal[] = [];
    if (formUjian.sumberSoal === "koleksi" && formUjian.koleksiId) {
      const koleksi = riwayatAsesmen.find((k) => k.id === formUjian.koleksiId);
      soalAwal = parseSoalDariMarkdown(koleksi?.konten || "");
      if (soalAwal.length === 0) {
        if (!confirm("Tidak ada butir soal yang terbaca dari koleksi tersebut. Lanjutkan dengan naskah kosong?")) return;
      }
    }

    try {
      const ref = await addDoc(collection(db, "bank_soal"), {
        kelasId: kelasAktifId,
        guruId: userUid,
        pengaturan: {
          judul: formUjian.judul.trim(),
          jenisUjian: formUjian.jenisUjian,
          waktuMenit: Number(formUjian.waktuMenit) || 60,
          waktuMulai: formUjian.waktuMulai,
          waktuSelesai: formUjian.waktuSelesai,
          opsiPG,
        },
        soal: soalAwal,
        totalSkor: totalBobot(soalAwal),
        timestamp: serverTimestamp(),
      });
      setShowModalUjian(false);
      setFormUjian({ judul: "", jenisUjian: "Ulangan Harian", waktuMenit: 60, waktuMulai: "", waktuSelesai: "", sumberSoal: "manual", koleksiId: "" });
      setUjianAktifId(ref.id);
      setSubTabUjian("soal");
    } catch (error) {
      console.error("Gagal membuat ujian:", error);
      alert("Gagal membuat ujian.");
    }
  };

  const hapusUjian = async (id: string) => {
    if (!confirm("Hapus ujian ini beserta seluruh butir soalnya?")) return;
    await deleteDoc(doc(db, "bank_soal", id));
    if (ujianAktifId === id) setUjianAktifId("");
  };

  const identitasUjian: IdentitasUjian = useMemo(
    () => ({
      judul: ujianAktif?.pengaturan?.judul || "Naskah Ujian",
      mapel: kelasAktif?.mapel || formData.mapel || "-",
      kelas: kelasAktif?.nama || formData.kelas || "-",
      waktuMenit: ujianAktif?.pengaturan?.waktuMenit || 60,
      jenisUjian: ujianAktif?.pengaturan?.jenisUjian || "Ujian",
      tanggal: ujianAktif?.pengaturan?.waktuMulai
        ? new Date(ujianAktif.pengaturan.waktuMulai).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "",
    }),
    [ujianAktif, kelasAktif, formData.mapel, formData.kelas]
  );

  /* ----------------------------- EKSPOR ----------------------------- */

  const handleExportToGoogle = async (type: "Docs" | "Sheets") => {
    if (!pdfRef.current) return;
    setIsExportingGoogle(true);
    setGoogleExportType(type);
    try {
      const html = `<div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5">${pdfRef.current.innerHTML}</div>`;
      await navigator.clipboard.write([new window.ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) })]);
      setTimeout(() => {
        setIsExportingGoogle(false);
        setGoogleExportType(null);
        alert(`✅ Format dokumen tersalin.\nTekan CTRL + V pada lembar kosong Google ${type}.`);
        window.open(type === "Docs" ? "https://docs.new" : "https://sheets.new", "_blank");
      }, 1500);
    } catch {
      setIsExportingGoogle(false);
      setGoogleExportType(null);
      alert("Browser tidak mendukung penyalinan otomatis. Gunakan tombol Word.");
    }
  };

  const handleDownloadWord = () => {
    if (!pdfRef.current) return;
    const printHtml = pdfRef.current.innerHTML.replace(/class="markdown-body"/g, "");
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Asesmen</title><style>@page WordSection1{size:595.3pt 841.9pt;margin:2.54cm}div.WordSection1{page:WordSection1}body,p,li,td,th,h1,h2,h3,h4,div{font-family:'Times New Roman',Times,serif!important;font-size:12pt!important;color:black!important;line-height:1.5;text-align:justify}h1{font-size:14pt!important;font-weight:bold!important;margin-bottom:12pt;text-align:center;text-transform:uppercase}h2,h3{font-size:12pt!important;font-weight:bold!important;margin-top:12pt;margin-bottom:6pt;text-align:left;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-top:12pt;margin-bottom:15pt;border:1pt solid black!important;word-wrap:break-word}td,th{border:1pt solid black!important;padding:6pt 8pt;vertical-align:top;text-align:left}th{background-color:#f2f2f2;font-weight:bold!important;text-align:center}p{margin-bottom:10pt}ul,ol{margin-left:20pt;margin-bottom:10pt}li{margin-bottom:6pt;text-align:justify}img,svg{max-width:100%;height:auto}.kop-surat table,.kop-surat td,.header-table td,.header-table th{border:none!important}</style></head><body><div class="WordSection1">${printHtml}</div></body></html>`;
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = "data:application/vnd.ms-word;charset=utf-8," + encodeURIComponent(header);
    a.download = `Asesmen_${formData.mapel || "Dokumen"}.doc`.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPDF = () => {
    if (!pdfRef.current) return;
    const printContent = pdfRef.current.innerHTML;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;top:-9999px;left:-9999px;width:210mm;height:100vh";
    document.body.appendChild(iframe);
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(`<html><head><title>Cetak PDF</title><style>@page{size:A4 portrait;margin:2cm}body{font-family:'Times New Roman',Times,serif!important;font-size:12pt!important;line-height:1.5!important;color:#000;text-align:justify}h1{text-align:center;font-size:14pt;margin-bottom:1.5rem;font-weight:bold;text-transform:uppercase}h2{font-size:12pt;margin-top:1.5rem;margin-bottom:.5rem;font-weight:bold;text-transform:uppercase;text-align:left}h3{font-size:12pt;margin-top:1rem;margin-bottom:.5rem;font-weight:bold;text-align:left}table{width:100%;border-collapse:collapse;margin-top:1rem;margin-bottom:1.5rem;border:1pt solid #000;word-wrap:break-word}th,td{border:1pt solid #000;padding:6px 8px;text-align:left;vertical-align:top}th{background-color:#f2f2f2;font-weight:bold;text-align:center}tr{page-break-inside:avoid}ul,ol{margin-left:20px;margin-bottom:10px}li{margin-bottom:6px;text-align:justify}p{margin-bottom:10px}img,svg{max-width:100%;height:auto;page-break-inside:avoid}.kop-surat table,.kop-surat td,.header-table td,.header-table th{border:none!important}</style></head><body>${printContent}</body></html>`);
    iframe.contentWindow?.document.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  const sanitasiHasil = bersihkanSvg(hasil)
    .replace(/\[SOAL_START\]\n?/gi, "")
    .replace(/\[SOAL_END\]\n?/gi, "")
    .replace(/\[TIPE:(.*?)\]\n?/gi, "**Tipe Soal:** $1\n\n")
    .replace(/\[KUNCI:([\s\S]*?)\]\n?/gi, "\n> **Kunci Jawaban:** $1\n\n");

  if (isLoading) return <KerangkaMuat />;

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto w-full space-y-4 md:space-y-5 pb-4"
    >
      <AnimatePresence>
        {isExportingGoogle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-white/85 backdrop-blur-sm p-4">
            <div className="flex flex-col items-center text-center p-6 bg-white shadow-2xl rounded-2xl border border-slate-200 max-w-sm">
              <Loader2 size={40} className={`animate-spin mb-4 ${googleExportType === "Docs" ? "text-blue-500" : "text-emerald-500"}`} />
              <h3 className={`font-bold text-base text-slate-800 ${teachersFont.className}`}>Menyiapkan Format...</h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalKoleksi
        buka={showKoleksi}
        judul="Koleksi Asesmen Saya"
        daftar={riwayatAsesmen}
        docIdAktif={docId}
        onTutup={() => setShowKoleksi(false)}
        onPilih={(r) => {
          setFormData((prev) => ({ ...prev, mapel: r.mapel || prev.mapel, kelas: r.kelas || prev.kelas, kompetensiDasar: r.topik || prev.kompetensiDasar }));
          setHasil(r.konten || "");
          setKontenHtml(r.kontenHtml || "");
          kontenTersimpanRef.current = (r.konten || "") + "\u0000" + (r.kontenHtml || "");
          setStatusSimpan("tersimpan");
          setDocId(r.id);
          setShowKoleksi(false);
          setActiveTab("generator");
        }}
        onHapus={async (id) => {
          if (!confirm("Hapus dokumen asesmen ini?")) return;
          await deleteDoc(doc(db, "modul_ajar", id));
          if (docId === id) { setHasil(""); setDocId(""); setStatusSimpan("kosong"); }
        }}
      />

      <ModalKoleksi
        buka={showModulModal}
        judul="Ambil Data dari Modul Ajar"
        daftar={modulAjarList}
        docIdAktif=""
        onTutup={() => setShowModulModal(false)}
        onPilih={(m) => {
          setFormData((prev) => ({ ...prev, mapel: m.mapel || "", kelas: m.kelas || "", fase: m.fase || prev.fase, kompetensiDasar: m.topik || m.materi || "" }));
          setShowModulModal(false);
        }}
      />

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
            <Target className="text-blue-600 shrink-0" size={24} /> Pusat Asesmen
          </h1>
          <p className="text-slate-500 text-[12px] sm:text-sm mt-1.5 leading-relaxed">
            Menyusun kisi-kisi & bank soal, menyelenggarakan E-Ujian (CBT), mencetak naskah dan LJK, hingga koreksi.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowKoleksi(true)} className="flex-1 sm:flex-none min-h-[40px] flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3.5 rounded-xl text-xs font-bold shadow-sm transition-colors">
            <History size={14} /> Koleksi
          </button>
          <div className="flex-1 sm:flex-none min-h-[40px] flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3.5 rounded-xl text-xs font-bold shadow-sm">
            <Coins size={14} className="text-amber-500" /> {aiTokens.toLocaleString("id-ID")}
          </div>
        </div>
      </header>

      <StatusKop kop={kop} npsn={npsnGuru} lembagaDitemukan={lembagaDitemukan} />

      {/* TAB BAR */}
      <nav aria-label="Bagian asesmen" className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200">
          {TABS.map(({ id, label, ikon: Ikon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`shrink-0 min-h-[44px] px-3.5 text-[12px] font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Ikon size={15} /> {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ---------------------- TAB: GENERATOR ---------------------- */}
      {activeTab === "generator" && (
        <div className="space-y-4 md:space-y-5">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
              <h2 className={`text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 ${teachersFont.className}`}>
                <FileQuestion size={17} className="text-slate-600" /> Parameter Asesmen
              </h2>
              <button type="button" onClick={() => setShowModulModal(true)} className="min-h-[38px] flex items-center gap-1.5 px-3 bg-white text-slate-700 hover:text-blue-700 hover:border-blue-200 rounded-lg text-[11px] font-bold border border-slate-200 transition-colors">
                <BookOpen size={14} /> Ambil dari Modul Ajar
              </button>
            </div>

            <form onSubmit={handleGenerateAI} className="p-4 sm:p-5 md:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <Bidang label="Fase / Kelas">
                      <input type="text" required placeholder="Cth: Fase D / VII" value={formData.fase} onChange={(e) => setFormData({ ...formData, fase: e.target.value })} className={gayaInput} />
                    </Bidang>
                    <Bidang label="Kelas">
                      <input type="text" placeholder="Cth: VII A" value={formData.kelas} onChange={(e) => setFormData({ ...formData, kelas: e.target.value })} className={gayaInput} />
                    </Bidang>
                  </div>
                  <Bidang label="Mata Pelajaran">
                    <input type="text" required placeholder="Cth: Matematika" value={formData.mapel} onChange={(e) => setFormData({ ...formData, mapel: e.target.value })} className={gayaInput} />
                  </Bidang>
                  <Bidang label="Kompetensi Dasar / Topik">
                    <textarea required rows={3} placeholder="Materi atau KD yang akan diujikan..." value={formData.kompetensiDasar} onChange={(e) => setFormData({ ...formData, kompetensiDasar: e.target.value })} className={`${gayaInput} py-2.5 resize-y`} />
                  </Bidang>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50/30 p-4 sm:p-5 rounded-xl border border-blue-100 space-y-2.5">
                    <p className="text-[11px] font-bold text-blue-800 uppercase tracking-widest">Integrasi Dimensi [x-AI]</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Aspek budaya dan linguistik yang diuji bersamaan di dalam soal.</p>
                    {[
                      { id: "Linguistik", ket: "Tata bahasa, ejaan, & kosakata." },
                      { id: "Sosiolinguistik", ket: "Tingkat tutur & kesantunan." },
                      { id: "Budaya", ket: "Makna tradisi & peribahasa setempat." },
                    ].map((d) => (
                      <label key={d.id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${formData.dimensiXAI.includes(d.id) ? "bg-white border-blue-400" : "bg-white/60 border-slate-200 hover:bg-white"}`}>
                        <input type="checkbox" checked={formData.dimensiXAI.includes(d.id)} onChange={() => handleToggleDimensi(d.id)} className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-slate-700">{d.id}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{d.ket}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="bg-blue-50/30 p-4 sm:p-5 rounded-xl border border-blue-100 space-y-2.5">
                    <p className="text-[11px] font-bold text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                      <ImageIcon size={13} /> Gambar pada Soal
                    </p>
                    <SaklarOpsi aktif={pakaiDiagram} onUbah={setPakaiDiagram} ikon={Shapes} judul="Diagram presisi (SVG)" keterangan="Bangun datar, garis bilangan, grafik. Tajam saat naskah dicetak." disarankan={mapelPerluDiagram} />
                    <SaklarOpsi aktif={pakaiIlustrasi} onUbah={setPakaiIlustrasi} ikon={ImageIcon} judul="Ilustrasi kontekstual (AI)" keterangan="Gambar situasi untuk soal cerita. Memakai token tambahan." />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ListOrdered size={14} /> Komposisi Instrumen Soal
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <Bidang label="Jenis Ujian">
                    <select value={formData.jenisUjian} onChange={(e) => setFormData({ ...formData, jenisUjian: e.target.value })} className={gayaInput}>
                      <option>Ulangan Harian</option><option>Asesmen Formatif</option>
                      <option>Sumatif Tengah Semester</option><option>Sumatif Akhir Semester</option><option>Try Out</option>
                    </select>
                  </Bidang>
                  <Bidang label="Tingkat Kesulitan">
                    <select value={formData.tingkatKesulitan} onChange={(e) => setFormData({ ...formData, tingkatKesulitan: e.target.value })} className={gayaInput}>
                      <option>Campuran (Proporsional)</option><option>HOTS (Tingkat Tinggi)</option><option>MOTS (Tingkat Sedang)</option>
                    </select>
                  </Bidang>
                  <Bidang label="Opsi Pilihan Ganda">
                    <select value={opsiPG} onChange={(e) => setOpsiPG(e.target.value)} className={gayaInput}>
                      <option>A - D (4 Opsi)</option><option>A - E (5 Opsi)</option>
                    </select>
                  </Bidang>
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
                  {([
                    ["pg", "PG"], ["bs", "B/S"], ["jodoh", "Jodoh"], ["isian", "Isian"], ["uraian", "Esai"],
                  ] as const).map(([kunci, label]) => (
                    <div key={kunci} className="text-center">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1.5">{label}</label>
                      <input
                        type="number" min="0" inputMode="numeric"
                        value={jumlah[kunci]}
                        onChange={(e) => setJumlah({ ...jumlah, [kunci]: e.target.value })}
                        className="w-full min-h-[42px] text-center border border-slate-300 rounded-lg text-[13px] font-bold outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isGenerating || bankMemeriksa} className="w-full min-h-[52px] bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-sm font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50 active:scale-[0.98]">
                {(isGenerating || bankMemeriksa) ? <Loader2 size={19} className="animate-spin" /> : <BrainCircuit size={19} />}
                {bankMemeriksa ? "Memeriksa Bank Bersama..." : isGenerating ? "Menyusun Butir Soal..." : "Generate Instrumen Asesmen"}
              </button>
              <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                <Library size={12} /> Bank Bersama diperiksa dulu — jika cocok, muat tanpa token lalu revisi seperlunya.
              </p>
            </form>
          </section>

          {/* KANVAS */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen size={18} className="text-slate-600 shrink-0" />
                <div className="min-w-0">
                  <h2 className={`font-bold text-slate-800 text-sm uppercase tracking-wide ${teachersFont.className}`}>Kanvas Tinjauan</h2>
                  <IndikatorSimpan status={statusSimpan} />
                </div>
              </div>
              {hasil && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap">
                  <TombolEkspor onClick={handleDownloadWord} ikon={FileDown} label="Word" />
                  <TombolEkspor onClick={() => handleExportToGoogle("Docs")} ikon={Cloud} label="G-Docs" nuansa="blue" />
                  <TombolEkspor onClick={handlePrintPDF} ikon={Printer} label="Cetak PDF" />
                  <TombolEkspor
                    onClick={() => {
                      const parsed = parseSoalDariMarkdown(hasil);
                      if (parsed.length === 0) return alert("Tidak ada butir soal yang terbaca dari dokumen ini.");
                      if (!kelasAktifId) return alert("Buat atau pilih kelas terlebih dahulu pada tab E-Ujian.");
                      setFormUjian((p) => ({
                        ...p,
                        judul: `${formData.jenisUjian} — ${formData.kompetensiDasar.slice(0, 40) || formData.mapel}`,
                        jenisUjian: formData.jenisUjian,
                        sumberSoal: "koleksi",
                        koleksiId: docId,
                      }));
                      setActiveTab("ujian");
                      setShowModalUjian(true);
                    }}
                    ikon={ClipboardList}
                    label="Jadikan E-Ujian"
                    nuansa="emerald"
                  />
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
                <ul className="list-disc pl-4 space-y-0.5">{catatanGambar.map((p, i) => <li key={i}>{p}</li>)}</ul>
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
                    {progresGambar ? "Membuat Ilustrasi..." : "Menyusun Soal & Kisi-Kisi..."}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                    {progresGambar
                      ? `Gambar ${Math.min(progresGambar.selesai + 1, progresGambar.total)} dari ${progresGambar.total}`
                      : "Memastikan keselarasan sosiokultural pada setiap butir soal."}
                  </p>
                </div>
              ) : hasil ? (
                <div className="bg-white shadow-lg border border-slate-300 p-4 sm:p-8 md:p-12 mx-auto max-w-4xl overflow-x-auto">
                  <div ref={pdfRef} className="markdown-body">
                    <style>{gayaKanvas}</style>
                    {kontenHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: bersihkanSvg(kontenHtml) }} />
                    ) : (<>
                    {kopTerisi(kop) ? (
                      <KopSurat kop={kop} judulDokumen={`INSTRUMEN ASESMEN — ${formData.jenisUjian.toUpperCase()}`} subJudul={`${formData.mapel} • Fase/Kelas ${formData.fase}/${formData.kelas}`} />
                    ) : (
                      <div style={{ textAlign: "center", marginBottom: "24pt" }}>
                        <h1 style={{ fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4pt" }}>DOKUMEN INSTRUMEN ASESMEN</h1>
                        <p style={{ fontSize: "12pt", margin: 0, fontWeight: "bold" }}>{formData.jenisUjian} — {formData.mapel}</p>
                        <p style={{ fontSize: "12pt", margin: 0 }}>Fase / Kelas: {formData.fase} / {formData.kelas}</p>
                      </div>
                    )}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        table: ({ ...props }) => <div className="table-wrapper"><table {...props} /></div>,
                        /* eslint-disable-next-line @next/next/no-img-element */
                        img: ({ ...props }) => <img {...props} alt={props.alt || ""} loading="lazy" />,
                      }}
                    >
                      {sanitasiHasil}
                    </ReactMarkdown>
                    </>)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-14 sm:py-20">
                  <Globe size={40} className="mb-4 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Kanvas Kosong</p>
                  <p className="text-[12px] sm:text-sm text-slate-500 mt-2 max-w-sm leading-relaxed px-4">
                    Tentukan parameter di atas. Hasilnya tersimpan otomatis dan dapat langsung dijadikan naskah E-Ujian.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ----------------------- TAB: E-UJIAN ----------------------- */}
      {activeTab === "ujian" && (
        <div className="space-y-4">
          <PemilihKelas kelasList={kelasList} kelasAktifId={kelasAktifId} onPilih={(id) => { setKelasAktifId(id); setUjianAktifId(""); }} />

          {!kelasAktifId ? (
            <KotakKosong ikon={GraduationCap} judul="Belum ada kelas" pesan="Buat kelas terlebih dahulu di menu Kelas, lalu kembali ke sini untuk menyusun E-Ujian." />
          ) : !ujianAktif ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-bold text-slate-700">
                  {ujianList.length} ujian pada {kelasAktif?.nama}
                </p>
                <button onClick={() => setShowModalUjian(true)} className="min-h-[42px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors active:scale-[0.98]">
                  <Plus size={15} /> Ujian Baru
                </button>
              </div>

              {ujianList.length === 0 ? (
                <KotakKosong ikon={ClipboardList} judul="Belum ada ujian" pesan="Buat ujian baru, lalu susun butir soal secara manual atau tarik dari koleksi hasil generate AI." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ujianList.map((u) => (
                    <KartuUjian
                      key={u.id}
                      ujian={u}
                      onBuka={() => { setUjianAktifId(u.id); setSubTabUjian("soal"); }}
                      onHapus={() => hapusUjian(u.id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <button onClick={() => setUjianAktifId("")} className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2.5">
                  <ChevronLeft size={14} /> Kembali ke daftar ujian
                </button>
                <h2 className={`text-base sm:text-lg font-bold text-slate-900 leading-tight ${teachersFont.className}`}>
                  {ujianAktif.pengaturan?.judul}
                </h2>
                <p className="text-[11px] text-blue-700 font-bold uppercase tracking-wider mt-0.5">{ujianAktif.pengaturan?.jenisUjian}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Lencana ikon={Target} teks={`${soalEdit.length} butir`} />
                  <Lencana ikon={Clock} teks={`${ujianAktif.pengaturan?.waktuMenit || 60} menit`} />
                  <Lencana ikon={ListOrdered} teks={`Skor ${totalBobot(soalEdit)}`} />
                  <Lencana ikon={Users} teks={`${hasilPeserta.length} peserta`} />
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5">{ringkasKomposisi(soalEdit)}</p>
                <div className="mt-2"><IndikatorSimpan status={statusSoal} labelKosong="Ujian belum berisi soal" /></div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200">
                {([["soal", "Butir Soal"], ["cetak", "Naskah & LJK"], ["hasil", "Hasil Peserta"]] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSubTabUjian(id)}
                    className={`shrink-0 min-h-[42px] px-3.5 text-[12px] font-bold border-b-2 transition-colors ${
                      subTabUjian === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {subTabUjian === "soal" && (
                <EditorSoal soal={soalEdit} onUbah={setSoalEdit} jumlahOpsiPG={String(ujianAktif.pengaturan?.opsiPG || opsiPG).includes("5") ? 5 : 4} />
              )}

              {subTabUjian === "cetak" && (
                <PanelCetak
                  soal={soalEdit}
                  identitas={identitasUjian}
                  kop={kop}
                  qrData={JSON.stringify({ uId: ujianAktif.id, kId: kelasAktifId })}
                />
              )}

              {subTabUjian === "hasil" && <TabelHasil hasil={hasilPeserta} />}
            </div>
          )}
        </div>
      )}

      {/* ----------------------- TAB: KOREKSI ----------------------- */}
      {activeTab === "koreksi" && (
        <div className="space-y-4">
          <PemilihKelas kelasList={kelasList} kelasAktifId={kelasAktifId} onPilih={(id) => { setKelasAktifId(id); setUjianAktifId(""); }} />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ujian yang Dikoreksi</label>
            <select value={ujianAktifId} onChange={(e) => setUjianAktifId(e.target.value)} className={gayaInput}>
              <option value="">Pilih ujian</option>
              {ujianList.map((u) => (
                <option key={u.id} value={u.id}>{u.pengaturan?.judul} ({u.soal?.length || 0} butir)</option>
              ))}
            </select>
          </div>

          {!ujianAktif ? (
            <KotakKosong ikon={ScanLine} judul="Pilih ujian terlebih dahulu" pesan="Pemindai membutuhkan kunci jawaban dari naskah ujian untuk menghitung nilai." />
          ) : soalEdit.length === 0 ? (
            <KotakKosong ikon={AlertTriangle} judul="Ujian belum berisi soal" pesan="Lengkapi butir soal beserta kuncinya pada tab E-Ujian sebelum melakukan koreksi." />
          ) : (
            <PanelKoreksi
              ujianId={ujianAktif.id}
              judulUjian={ujianAktif.pengaturan?.judul || ""}
              kelasNama={kelasAktif?.nama || ""}
              soal={soalEdit}
              daftarSiswa={daftarSiswa.map((s) => ({ id: s.id, nama: s.nama || "Tanpa nama", nisn: s.nisn }))}
            />
          )}
        </div>
      )}

      {/* ----------------------- TAB: ANALISIS ---------------------- */}
      {activeTab === "analisis" && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-3">
            <BarChart4 size={19} className="text-blue-600" />
            <h2 className={`text-sm sm:text-base font-bold text-slate-800 uppercase tracking-wide ${teachersFont.className}`}>
              Analisis Butir Soal & Daya Pembeda
            </h2>
          </div>

          <form onSubmit={handleAnalisisAI} className="space-y-3 max-w-4xl">
            <Bidang label="Data Evaluasi Butir Soal">
              <textarea
                required rows={7} value={analisisInput} onChange={(e) => setAnalisisInput(e.target.value)}
                placeholder="Tempelkan data soal, persentase jawaban benar, atau distribusi opsi jawaban siswa..."
                className={`${gayaInput} py-3 resize-y`}
              />
            </Bidang>
            <button type="submit" disabled={isAnalyzing} className="w-full sm:w-auto min-h-[46px] px-5 bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-60">
              {isAnalyzing ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />} Mulai Analisis AI
            </button>
          </form>

          {analisisHasil && (
            <div className="mt-6 p-4 sm:p-5 bg-blue-50/50 border border-blue-200 rounded-xl prose prose-sm max-w-none">
              <h3 className="text-blue-800 font-bold mb-3 flex items-center gap-2 text-[13px]"><CheckCircle2 size={16} /> Hasil Analisis</h3>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{analisisHasil}</ReactMarkdown>
            </div>
          )}
        </section>
      )}

      {/* ----------------------- TAB: FEEDBACK ---------------------- */}
      {activeTab === "feedback" && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-3">
            <MessageSquareHeart size={19} className="text-rose-600" />
            <h2 className={`text-sm sm:text-base font-bold text-slate-800 uppercase tracking-wide ${teachersFont.className}`}>
              Generator Evaluasi Formatif
            </h2>
          </div>

          <form onSubmit={handleFeedbackAI} className="space-y-4 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Bidang label="Nama Siswa">
                <input type="text" required value={feedbackData.nama} onChange={(e) => setFeedbackData({ ...feedbackData, nama: e.target.value })} placeholder="Cth: Ahmad Albert" className={gayaInput} />
              </Bidang>
              <Bidang label="Nilai / Capaian">
                <input type="text" required value={feedbackData.nilai} onChange={(e) => setFeedbackData({ ...feedbackData, nilai: e.target.value })} placeholder="Cth: 85 (Berkembang Sesuai Harapan)" className={gayaInput} />
              </Bidang>
            </div>
            <Bidang label="Catatan Perkembangan (Observasi Guru)">
              <textarea required rows={4} value={feedbackData.catatan} onChange={(e) => setFeedbackData({ ...feedbackData, catatan: e.target.value })} placeholder="Cth: Aktif dalam diskusi, empati tinggi, namun kurang teliti pada numerasi dasar..." className={`${gayaInput} py-3 resize-y`} />
            </Bidang>
            <button type="submit" disabled={isGeneratingFeedback} className="w-full sm:w-auto min-h-[46px] px-5 bg-slate-900 hover:bg-rose-600 text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-60">
              {isGeneratingFeedback ? <Loader2 size={17} className="animate-spin" /> : <Bot size={17} />} Susun Narasi Feedback
            </button>
          </form>

          {feedbackHasil && (
            <div className="mt-6 p-4 sm:p-5 bg-rose-50/50 border border-rose-200 rounded-xl prose prose-sm max-w-none">
              <h3 className="text-rose-800 font-bold mb-3 flex items-center gap-2 text-[13px]"><CheckCircle2 size={16} /> Narasi Rapor Evaluasi</h3>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedbackHasil}</ReactMarkdown>
            </div>
          )}
        </section>
      )}

      {/* MODAL BUAT UJIAN */}
      <AnimatePresence>
        {showModalUjian && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ClipboardList size={16} className="text-blue-600" /> Ujian Baru</h3>
                <button onClick={() => setShowModalUjian(false)} aria-label="Tutup" className="text-slate-400 hover:text-rose-600 bg-white p-2 rounded-lg border border-slate-200"><X size={15} /></button>
              </div>

              <div className="p-4 space-y-3.5 overflow-y-auto custom-scrollbar">
                <Bidang label="Judul Ujian">
                  <input type="text" value={formUjian.judul} onChange={(e) => setFormUjian({ ...formUjian, judul: e.target.value })} placeholder="Cth: Sumatif Bab 3 — Bangun Ruang" className={gayaInput} />
                </Bidang>
                <div className="grid grid-cols-2 gap-3">
                  <Bidang label="Jenis">
                    <select value={formUjian.jenisUjian} onChange={(e) => setFormUjian({ ...formUjian, jenisUjian: e.target.value })} className={gayaInput}>
                      <option>Ulangan Harian</option><option>Asesmen Formatif</option>
                      <option>Sumatif Tengah Semester</option><option>Sumatif Akhir Semester</option><option>Try Out</option>
                    </select>
                  </Bidang>
                  <Bidang label="Durasi (menit)">
                    <input type="number" min={5} inputMode="numeric" value={formUjian.waktuMenit} onChange={(e) => setFormUjian({ ...formUjian, waktuMenit: Number(e.target.value) })} className={gayaInput} />
                  </Bidang>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Bidang label="Mulai">
                    <input type="datetime-local" value={formUjian.waktuMulai} onChange={(e) => setFormUjian({ ...formUjian, waktuMulai: e.target.value })} className={gayaInput} />
                  </Bidang>
                  <Bidang label="Selesai">
                    <input type="datetime-local" value={formUjian.waktuSelesai} onChange={(e) => setFormUjian({ ...formUjian, waktuSelesai: e.target.value })} className={gayaInput} />
                  </Bidang>
                </div>

                <Bidang label="Sumber Butir Soal">
                  <select value={formUjian.sumberSoal} onChange={(e) => setFormUjian({ ...formUjian, sumberSoal: e.target.value })} className={gayaInput}>
                    <option value="manual">Susun manual</option>
                    <option value="koleksi">Tarik dari Koleksi Asesmen AI</option>
                  </select>
                </Bidang>

                {formUjian.sumberSoal === "koleksi" && (
                  <Bidang label="Pilih Koleksi">
                    <select value={formUjian.koleksiId} onChange={(e) => setFormUjian({ ...formUjian, koleksiId: e.target.value })} className={gayaInput}>
                      <option value="">Pilih dokumen asesmen</option>
                      {riwayatAsesmen.map((r) => (
                        <option key={r.id} value={r.id}>{r.topik || r.tipe} — {r.mapel}</option>
                      ))}
                    </select>
                  </Bidang>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
                <button onClick={() => setShowModalUjian(false)} className="flex-1 min-h-[46px] bg-white border border-slate-300 text-slate-700 rounded-xl text-[12px] font-bold hover:bg-slate-100 transition-colors">
                  Batal
                </button>
                <button onClick={buatUjian} className="flex-1 min-h-[46px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[12px] font-bold transition-colors active:scale-[0.98]">
                  Buat Ujian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL BANK BERSAMA */}
      <ModalBank
        buka={bankModal}
        hasil={bankHasil}
        onTutup={() => setBankModal(false)}
        onMuat={muatDariBankSoal}
        onGenerate={generateSoalSekarang}
      />

      {/* EDITOR WYSIWYG */}
      <EditorDokumen
        buka={editorBuka}
        htmlAwal={editorBuka ? (pdfRef.current?.innerHTML || "").replace(/<style[\s\S]*?<\/style>/gi, "") : ""}
        judul="Edit Instrumen Asesmen"
        gambarMapel={formData.mapel}
        gambarJenjang={`${formData.fase} / ${formData.kelas}`}
        onTutup={() => setEditorBuka(false)}
        onSimpan={(html) => { setKontenHtml(html); setEditorBuka(false); }}
      />
    </motion.main>
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
            <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-white flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Library size={18} /></span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">Ditemukan di Bank Bersama</h3>
                  <p className="text-[11px] text-slate-500">Muat tanpa token, lalu revisi sebagian saja.</p>
                </div>
              </div>
              <button onClick={onTutup} aria-label="Tutup" className="text-slate-400 hover:text-rose-600 bg-white p-2 rounded-lg border border-slate-200"><X size={15} /></button>
            </div>
            <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
              {hasil.map((e) => (
                <button key={e.id} onClick={() => onMuat(e)} className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-slate-800 line-clamp-1">{e.materi || e.topik}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">{Math.round((e.skor ?? 0) * 100)}% cocok</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span>{e.mapel} {e.kelas}</span>
                    <span className="flex items-center gap-1"><Users2 size={11} /> {e.dipakai || 0}x</span>
                    {e.tervalidasi && <span className="text-emerald-600 font-bold flex items-center gap-0.5"><CheckCircle2 size={11} /> tervalidasi</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <button onClick={onGenerate} className="w-full min-h-[46px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-colors">
                <Zap size={15} /> Tetap Generate Baru dengan AI (pakai token)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ================================ UI ================================ */

const gayaInput =
  "w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-[13px] font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all";

const gayaKanvas = `
  .markdown-body { font-family: 'Times New Roman', Times, serif !important; font-size: 13px; line-height: 1.55 !important; color: #000; text-align: justify; }
  @media (min-width: 768px) { .markdown-body { font-size: 12pt; } }
  .markdown-body p { margin-bottom: 8pt; text-align: justify; }
  .markdown-body table { width: 100%; border-collapse: collapse; margin-top: 12pt; margin-bottom: 12pt; word-wrap: break-word; }
  .markdown-body th, .markdown-body td { border: 1pt solid #000; padding: 6pt 8pt; text-align: left; vertical-align: top; overflow-wrap: break-word; font-size: 11pt; }
  .markdown-body th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
  .markdown-body tr { page-break-inside: avoid; }
  .markdown-body h1 { font-size: 1.16em; font-weight: bold; text-align: center; margin-bottom: 14pt; text-transform: uppercase; }
  .markdown-body h2 { font-size: 1.06em; margin-top: 14pt; margin-bottom: 7pt; font-weight: bold; text-transform: uppercase; text-align: left; }
  .markdown-body h3 { font-size: 1em; margin-top: 11pt; margin-bottom: 5pt; font-weight: bold; text-align: left; }
  .markdown-body ul, .markdown-body ol { padding-left: 22pt; margin-bottom: 11pt; margin-top: 4pt; text-align: justify; }
  .markdown-body li { margin-bottom: 4pt; text-align: justify; }
  .markdown-body blockquote { border-left: 4px solid #3b82f6; background-color: #eff6ff; padding: 8px 14px; margin-bottom: 14px; font-style: italic; color: #1e3a8a; border-radius: 4px; }
  .markdown-body img, .markdown-body svg { max-width: 100%; height: auto; display: block; margin: 10px auto; page-break-inside: avoid; }
  .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; margin-bottom: 12pt; }
  @media (max-width: 768px) { .markdown-body table { min-width: 560px; } }
  .kop-surat table, .kop-surat td { border: none !important; }
`;

function Bidang({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function Lencana({ ikon: Ikon, teks }: { ikon: any; teks: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
      <Ikon size={12} /> {teks}
    </span>
  );
}

function IndikatorSimpan({ status, labelKosong = "Belum ada dokumen" }: { status: StatusSimpan; labelKosong?: string }) {
  if (status === "kosong") {
    return <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{labelKosong}</p>;
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
}: { aktif: boolean; onUbah: (v: boolean) => void; ikon: any; judul: string; keterangan: string; disarankan?: boolean }) {
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

function PemilihKelas({
  kelasList, kelasAktifId, onPilih,
}: { kelasList: any[]; kelasAktifId: string; onPilih: (id: string) => void }) {
  if (kelasList.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Kelas</label>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {kelasList.map((k) => (
          <button
            key={k.id}
            onClick={() => onPilih(k.id)}
            className={`shrink-0 min-h-[42px] px-3.5 rounded-xl text-[12px] font-bold border transition-colors ${
              kelasAktifId === k.id ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-blue-400"
            }`}
          >
            {k.nama}
            <span className={`block text-[10px] font-semibold ${kelasAktifId === k.id ? "text-blue-100" : "text-slate-400"}`}>{k.mapel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function KartuUjian({ ujian, onBuka, onHapus }: { ujian: any; onBuka: () => void; onHapus: () => void }) {
  const jumlahSoal = ujian.soal?.length || 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 text-[13px] leading-snug line-clamp-2">{ujian.pengaturan?.judul || "Tanpa Judul"}</h3>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">{ujian.pengaturan?.jenisUjian}</p>
        </div>
        <button onClick={onHapus} aria-label="Hapus ujian" className="shrink-0 text-slate-300 hover:text-rose-500 p-1"><Trash2 size={15} /></button>
      </div>

      <div className="flex flex-wrap gap-1.5 my-3">
        <Lencana ikon={Target} teks={`${jumlahSoal} butir`} />
        <Lencana ikon={Clock} teks={`${ujian.pengaturan?.waktuMenit || 60} mnt`} />
        {ujian.pengaturan?.waktuMulai && (
          <Lencana ikon={CalendarClock} teks={new Date(ujian.pengaturan.waktuMulai).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} />
        )}
      </div>

      <p className="text-[11px] text-slate-500 mb-3 line-clamp-1">{ringkasKomposisi(ujian.soal || [])}</p>

      <button onClick={onBuka} className="mt-auto w-full min-h-[42px] bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors">
        <Eye size={14} /> Buka Ujian
      </button>
    </div>
  );
}

function TabelHasil({ hasil }: { hasil: any[] }) {
  if (hasil.length === 0) {
    return <KotakKosong ikon={Users} judul="Belum ada hasil" pesan="Hasil muncul setelah peserta mengerjakan daring atau setelah LJK luring dikoreksi." />;
  }

  const unduhCsv = () => {
    const baris = [
      ["No", "Nama", "NISN", "Skor", "Skor Maks", "Nilai", "Sumber"].join(","),
      ...hasil.map((h, i) => [i + 1, `"${h.nama || ""}"`, `="${h.nisn || ""}"`, h.skor ?? "", h.skorMaks ?? "", h.nilai ?? "", `"${h.sumber || "Daring"}"`].join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + baris], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "Hasil_Ujian.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const rerata = Math.round(hasil.reduce((t, h) => t + (h.nilai || 0), 0) / hasil.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-bold text-slate-700">{hasil.length} peserta • rata-rata {rerata}</p>
        <button onClick={unduhCsv} className="min-h-[40px] px-3.5 bg-white border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors">
          <Download size={14} /> Unduh CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[12px] min-w-[520px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["No", "Nama", "Skor", "Nilai", "Sumber"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold text-slate-600 uppercase text-[10px] tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hasil.map((h, i) => (
                <tr key={h.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{h.nama || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600">{h.skor ?? "—"} / {h.skorMaks ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-bold ${(h.nilai || 0) >= 75 ? "text-emerald-600" : (h.nilai || 0) >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                      {h.nilai ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-[11px]">{h.sumber || "Daring"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KotakKosong({ ikon: Ikon, judul, pesan }: { ikon: any; judul: string; pesan: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 px-6 text-center">
      <Ikon size={30} className="mx-auto text-slate-300 mb-2.5" />
      <p className="text-[13px] font-bold text-slate-700">{judul}</p>
      <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">{pesan}</p>
    </div>
  );
}

function ModalKoleksi({
  buka, judul, daftar, docIdAktif, onTutup, onPilih, onHapus,
}: {
  buka: boolean; judul: string; daftar: any[]; docIdAktif: string;
  onTutup: () => void; onPilih: (r: any) => void; onHapus?: (id: string) => void;
}) {
  return (
    <AnimatePresence>
      {buka && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><History size={16} className="text-blue-600" /> {judul}</h3>
              <button onClick={onTutup} aria-label="Tutup" className="text-slate-400 hover:text-rose-600 bg-white p-2 rounded-lg border border-slate-200"><X size={15} /></button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {daftar.length > 0 ? (
                  daftar.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => onPilih(r)}
                      className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                        docIdAktif === r.id ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">{r.tipe}</span>
                        {onHapus && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onHapus(r.id); }}
                            aria-label="Hapus"
                            className="text-slate-300 hover:text-rose-500 p-1 shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <span className="font-bold text-slate-800 text-[13px] leading-snug line-clamp-2">{r.topik || r.materi || "Tanpa Judul"}</span>
                      <span className="text-[11px] text-slate-500 mt-2.5 border-t border-slate-100 pt-2 truncate">{r.mapel} • {r.kelas}</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <FileQuestion size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Belum ada dokumen tersimpan.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function StatusKop({ kop, npsn, lembagaDitemukan }: { kop: any; npsn: string; lembagaDitemukan: boolean }) {
  if (!npsn) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] sm:text-xs text-amber-800">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-bold">NPSN belum terisi pada profil Anda.</span> Naskah soal dan LJK akan dicetak tanpa kop lembaga.
        </p>
      </div>
    );
  }
  if (!lembagaDitemukan || !kop.namaLembaga) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] sm:text-xs text-amber-800">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-bold">Kop lembaga NPSN {npsn} belum disiapkan.</span> Minta admin lembaga mengisi menu Kop Surat pada dashboard lembaga.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start sm:items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] sm:text-xs text-emerald-800">
      <Stamp size={15} className="shrink-0 mt-0.5 sm:mt-0" />
      <p className="leading-relaxed">
        Kop resmi <span className="font-bold">{kop.namaLembaga}</span> terpasang otomatis pada naskah soal, kunci jawaban, dan LJK.
      </p>
    </div>
  );
}

function KerangkaMuat() {
  return (
    <div className="max-w-7xl mx-auto w-full space-y-4 animate-pulse" role="status" aria-label="Memuat pusat asesmen">
      <div className="h-20 rounded-2xl bg-slate-200" />
      <div className="h-11 rounded-xl bg-slate-200" />
      <div className="h-[320px] rounded-2xl bg-slate-200" />
      <div className="h-[220px] rounded-2xl bg-slate-200" />
    </div>
  );
}
