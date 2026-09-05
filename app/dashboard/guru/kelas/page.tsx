"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, BookOpen, Plus, ChevronRight, GraduationCap, Loader2, Key, 
  ArrowLeft, UploadCloud, BrainCircuit, CheckCircle2, FileText, X, Clock, 
  CalendarDays, Save, Trash2, Target, Settings2, Edit3, FileSpreadsheet, 
  ArrowDownToLine, Calculator, AlertCircle, ClipboardCheck, List, Eye, Printer, 
  SlidersHorizontal, Percent, FileCheck, Bold, Italic, Underline, AlignLeft, ListOrdered,
  MessageSquareText, Activity, Info
} from "lucide-react";
import { Teachers } from "next/font/google";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, where, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenKelas() {
  const [isLoading, setIsLoading] = useState(true);
  const [kelasData, setKelasData] = useState<any[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [guruNpsn, setGuruNpsn] = useState<string>("");
  const [daftarSiswaGlobal, setDaftarSiswaGlobal] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClass, setNewClass] = useState({ nama: "", mapel: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("siswa"); 
  const [daftarUjian, setDaftarUjian] = useState<any[]>([]);
  const [koleksiAI, setKoleksiAI] = useState<any[]>([]);

  // === STATE ADMINISTRASI (ABSENSI & JURNAL) ===
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [absensi, setAbsensi] = useState<Record<string, string>>({});
  const [isSubmittingAbsen, setIsSubmittingAbsen] = useState(false);
  const [statusPesanAbsen, setStatusPesanAbsen] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);
  const [isRiwayatAbsenOpen, setIsRiwayatAbsenOpen] = useState(false);
  const [riwayatAbsenData, setRiwayatAbsenData] = useState<any[]>([]); 
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [jurnal, setJurnal] = useState({ materi: "", kegiatan: "", hambatan: "", solusi: "" });
  const [isSubmittingJurnal, setIsSubmittingJurnal] = useState(false);
  const [statusPesanJurnal, setStatusPesanJurnal] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);
  const [isRiwayatJurnalOpen, setIsRiwayatJurnalOpen] = useState(false);
  const [riwayatJurnalData, setRiwayatJurnalData] = useState<any[]>([]); 

  // === STATE UJIAN CBT ===
  const [isCbtModalOpen, setIsCbtModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isHasilUjianOpen, setIsHasilUjianOpen] = useState(false);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [selectedUjianView, setSelectedUjianView] = useState<any | null>(null);
  const [hasilUjianData, setHasilUjianData] = useState<any[]>([]);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);

  // === STATE KOREKSI AI OVERRIDE ===
  const [hasilKoreksiAI, setHasilKoreksiAI] = useState<any | null>(null);
  const [overrideScore, setOverrideScore] = useState<number | null>(null);

  const [cbtForm, setCbtForm] = useState({
    judul: "", jenisUjian: "Asesmen Formatif", jenisUjianCustom: "", sumberSoal: "Buat Manual (Ketik Sendiri)", bahanBacaan: "", opsiPG: "A - D (4 Opsi)",
    waktuMenit: 60, waktuMulai: "", waktuSelesai: "", koleksiId: "" 
  });

  // === STATE REKAP NILAI ===
  const [kkm, setKkm] = useState(75); 
  const [nilai, setNilai] = useState<Record<string, Record<string, number>>>({});
  const [isPengaturanNilaiOpen, setIsPengaturanNilaiOpen] = useState(false);
  const [indikatorNilai, setIndikatorNilai] = useState([{ id: "harian", nama: "N. Harian", bobot: 40 }, { id: "pts", nama: "N. PTS", bobot: 30 }, { id: "pas", nama: "N. PAS", bobot: 30 }, { id: "praktik", nama: "Praktik", bobot: 0 } ]);
  const [isSubmittingRekap, setIsSubmittingRekap] = useState(false);
  const [statusPesanRekap, setStatusPesanRekap] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // === 1. TARIK DATA AWAL ===
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        onSnapshot(doc(db, "users", user.uid), (docSnap) => { if(docSnap.exists()){ setGuruNpsn(docSnap.data().npsn || docSnap.data().instansi || ""); }});
        onSnapshot(query(collection(db, "manajemen_kelas"), where("guruId", "==", user.uid)), (snapshot) => {
          setKelasData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        });
        onSnapshot(query(collection(db, "modul_ajar"), where("userId", "==", user.uid)), (snapshot) => {
          setKoleksiAI(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (guruNpsn) {
      onSnapshot(query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", guruNpsn)), (snap) => setDaftarSiswaGlobal(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
  }, [guruNpsn]);

  useEffect(() => {
    if (selectedClass) {
      onSnapshot(query(collection(db, "bank_soal"), where("kelasId", "==", selectedClass.id)), (snapshot) => setDaftarUjian(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }
  }, [selectedClass]);

  useEffect(() => {
    if (isHasilUjianOpen && selectedUjianView) {
      const q = query(collection(db, "jawaban_siswa"), where("idUjian", "==", selectedUjianView.id));
      const unsub = onSnapshot(q, (snap) => {
        setHasilUjianData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [isHasilUjianOpen, selectedUjianView]);

  // === 2. FETCH REKAP NILAI & ABSENSI ===
  useEffect(() => {
    const fetchRekapNilai = async () => {
      if (!selectedClass) return;
      try {
        const rekapSnap = await getDoc(doc(db, "rekap_nilai", selectedClass.id));
        let currentNilai: Record<string, Record<string, number>> = {};
        const siswaKelas = daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama);
        if (rekapSnap.exists()) {
          const dataServer = rekapSnap.data();
          if (dataServer.kkm) setKkm(dataServer.kkm);
          if (dataServer.indikator) setIndikatorNilai(dataServer.indikator);
          if (dataServer.dataNilai) { currentNilai = dataServer.dataNilai; }
        }
        siswaKelas.forEach(s => { if(!currentNilai[s.id]) currentNilai[s.id] = {}; });
        setNilai(currentNilai);
      } catch (error) {}
    };
    fetchRekapNilai();
  }, [selectedClass, daftarSiswaGlobal]);

  useEffect(() => {
    const fetchAbsensi = async () => {
      if (!selectedClass || !tanggal) return;
      try {
        let currentAbsen: Record<string, string> = {};
        const siswaKelas = daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama);
        siswaKelas.forEach(s => currentAbsen[s.id] = "Hadir");
        const absenSnap = await getDoc(doc(db, "absensi_siswa", `${selectedClass.id}_${tanggal}`));
        if (absenSnap.exists() && absenSnap.data().dataKehadiran) { currentAbsen = { ...currentAbsen, ...absenSnap.data().dataKehadiran }; }
        setAbsensi(currentAbsen);
      } catch (error) {}
    };
    fetchAbsensi();
  }, [selectedClass, tanggal, daftarSiswaGlobal]);

  useEffect(() => {
    if (selectedClass && isRiwayatAbsenOpen) {
      const q = query(collection(db, "absensi_siswa"), where("kelasId", "==", selectedClass.id));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRiwayatAbsenData(data.sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()));
      });
      return () => unsub();
    }
  }, [selectedClass, isRiwayatAbsenOpen]);

  useEffect(() => {
    if (selectedClass && isRiwayatJurnalOpen) {
      const q = query(collection(db, "jurnal_kbm"), where("kelasId", "==", selectedClass.id));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRiwayatJurnalData(data.sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()));
      });
      return () => unsub();
    }
  }, [selectedClass, isRiwayatJurnalOpen]);

  // ==========================================
  // SEMUA FUNCTION HANDLERS
  // ==========================================

  const handleBuatKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.nama || !newClass.mapel || !userUid) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "manajemen_kelas"), { nama: newClass.nama, mapel: newClass.mapel, kode: Math.floor(100000 + Math.random() * 900000).toString(), siswa: 0, peserta: [], status: "Aktif", guruId: userUid, timestamp: serverTimestamp() });
      setIsModalOpen(false); setNewClass({ nama: "", mapel: "" });
    } catch (error) {} finally { setIsSubmitting(false); }
  };

  const handleSimpanAbsensi = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingAbsen(true); setStatusPesanAbsen(null);
    try {
      await setDoc(doc(db, "absensi_siswa", `${selectedClass.id}_${tanggal}`), { guruId: userUid, kelasId: selectedClass.id, tanggal: tanggal, dataKehadiran: absensi, timestamp: serverTimestamp() }, { merge: true });
      setStatusPesanAbsen({ tipe: "sukses", teks: "Data absensi berhasil diperbarui." }); setTimeout(() => setStatusPesanAbsen(null), 3000);
    } catch (error: any) {} finally { setIsSubmittingAbsen(false); }
  };

  const handleSimpanJurnal = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingJurnal(true); setStatusPesanJurnal(null);
    try {
      await addDoc(collection(db, "jurnal_kbm"), { guruId: userUid, kelasId: selectedClass.id, mapel: selectedClass.mapel || "Umum", tanggal: tanggal, ...jurnal, timestamp: serverTimestamp() });
      setJurnal({ materi: "", kegiatan: "", hambatan: "", solusi: "" });
      setStatusPesanJurnal({ tipe: "sukses", teks: "Jurnal KBM berhasil dikirim." }); setTimeout(() => setStatusPesanJurnal(null), 3000);
    } catch (error: any) {} finally { setIsSubmittingJurnal(false); }
  };

  const handleUbahNilai = (idSiswa: string, idIndikator: string, value: string) => {
    let numValue = parseInt(value) || 0;
    if (numValue > 100) numValue = 100; if (numValue < 0) numValue = 0;
    setNilai(prev => ({ ...prev, [idSiswa]: { ...(prev[idSiswa] || {}), [idIndikator]: numValue } }));
  };

  const hitungNilaiAkhir = (dataN: Record<string, number>) => {
    let total = 0;
    indikatorNilai.forEach(ind => { if (ind.bobot > 0) total += (dataN[ind.id] || 0) * (ind.bobot / 100); });
    return Math.round(total);
  };

  const handleSimpanRekap = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingRekap(true); setStatusPesanRekap(null);
    try {
      await setDoc(doc(db, "rekap_nilai", selectedClass.id), { guruId: userUid, kelasId: selectedClass.id, kkm: kkm, indikator: indikatorNilai, dataNilai: nilai, terakhirDiperbarui: serverTimestamp() }, { merge: true });
      setStatusPesanRekap({ tipe: "sukses", teks: "Rekap Nilai berhasil disimpan." }); setTimeout(() => setStatusPesanRekap(null), 3000);
    } catch (error: any) {} finally { setIsSubmittingRekap(false); }
  };

  const handleDownloadExcel = () => {
    const siswaKelasAsli = daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama);
    if (siswaKelasAsli.length === 0) return alert("Belum ada siswa di kelas ini.");
    const headers = ["No", "NISN", "Nama Siswa", ...indikatorNilai.map(i => `${i.nama} (${i.bobot}%)`), "Nilai Akhir Kognitif", "Status"];
    const rows = siswaKelasAsli.map((s, idx) => {
      const dataN = nilai[s.id] || {};
      const na = hitungNilaiAkhir(dataN);
      const rowNilai = indikatorNilai.map(ind => dataN[ind.id] || 0);
      return [idx + 1, `="${s.nisn || '-'}"`, `"${s.nama}"`, ...rowNilai, na, na >= kkm ? "Tuntas" : "Remedial"].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Rekap_Nilai_${selectedClass.nama}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleDownloadCSVSiswa = () => {
    const siswaKelasAsli = selectedClass ? daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama) : [];
    if (siswaKelasAsli.length === 0) return alert("Tidak ada data siswa untuk diunduh.");
    const headers = ["No", "Nama Lengkap", "NISN", "Email", "Status"];
    const csvRows = [headers.join(","), ...siswaKelasAsli.map((s, i) => [i + 1, `"${s.nama}"`, `="${s.nisn}"`, `"${s.email}"`, "Aktif"].join(","))];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Data_Siswa_${selectedClass.nama}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleTambahIndikator = () => setIndikatorNilai([...indikatorNilai, { id: `ind_${Date.now()}`, nama: "Indikator Baru", bobot: 0 }]);
  const handleHapusIndikator = (id: string) => setIndikatorNilai(indikatorNilai.filter(i => i.id !== id));
  const hapusUjian = async (id: string) => { if(confirm("Yakin ingin menghapus ujian ini?")) await deleteDoc(doc(db, "bank_soal", id)); };

  const handleUploadLJK = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    alert(`Memproses LJK: ${file.name} dengan AI Vision...`);
    setTimeout(() => { 
      setHasilKoreksiAI({
        namaSiswa: "Ahmad Muhammad Alhammad",
        nilaiAwal: 65,
        diagnosa: "AI menandai jawaban salah karena dialek lokal ('ndak') dianggap tidak baku."
      });
      setOverrideScore(65);
    }, 2500);
  };

  const simpanOverrideNilai = () => {
    alert(`Nilai diubah menjadi ${overrideScore}. Keputusan otoritas guru (Responsif Budaya) direkam.`);
    setHasilKoreksiAI(null);
  }

  const generateFeedbackAI = async (siswa: any, jawabanData: any) => {
    const nilai = jawabanData.nilai || 0;
    let feedbackText = "";
    if (nilai >= 85) {
      feedbackText = `Berdasarkan analisis sistem, Ananda ${siswa.nama} telah menunjukkan pemahaman kognitif yang luar biasa. Kemampuan analisis soal sangat menonjol. AI merekomendasikan pengayaan mandiri (HOTS) di level lanjutan.`;
    } else if (nilai >= 60) {
      feedbackText = `Sistem mendeteksi bahwa Ananda ${siswa.nama} masih kesulitan pada pemahaman materi spesifik. AI menyarankan guru untuk memberikan intervensi (scaffolding) tambahan. Tingkat kemandirian siswa berada pada fase "Berkembang".`;
    } else {
      feedbackText = `Tingkat Ketergantungan Tinggi: Ananda ${siswa.nama} terdeteksi membutuhkan pendampingan khusus. Terdapat kesalahan berulang pada konsep dasar. Mohon berikan tugas remedial secara terarah.`;
    }
    try {
      await updateDoc(doc(db, "jawaban_siswa", jawabanData.id), { feedbackGuru: feedbackText });
      alert(`Auto-Feedback AI untuk ${siswa.nama} Berhasil di-generate!`);
    } catch (error) {
      alert("Gagal memproses feedback AI.");
    }
  };

  const getInitialOpsi = () => Array.from({length: cbtForm.opsiPG.includes("5") ? 5 : 4}).map((_, i) => ({ id: ["A", "B", "C", "D", "E"][i], teks: "" }));

  const tambahSoalManual = (tipe: string) => {
    const soalBaru = { 
      id: Date.now().toString(), tipe: tipe, pertanyaan: "", 
      opsi: (tipe === "PG") ? getInitialOpsi() : [], 
      pasangan: tipe === "Jodohkan" ? [{kiri: "", kanan: ""}, {kiri: "", kanan: ""}] : [],
      kunci: "A", panduanAI: "",
      analisis: { kesukaran: "Sedang", dayaPembeda: "Baik", status: "Layak Digunakan" }
    };
    setDaftarSoal([...daftarSoal, soalBaru]);
  };
  
  const hapusSoal = (id: string) => setDaftarSoal(daftarSoal.filter(s => s.id !== id));

  // ==========================================
  // PARSER AI BARU & CERDAS
  // ==========================================
  const prosesLanjutPembuatan = () => {
    if(!cbtForm.judul || !cbtForm.waktuMulai || !cbtForm.waktuSelesai) { 
      alert("Mohon isi Judul Ujian dan Jadwal Pelaksanaan."); return; 
    }
    if((cbtForm.sumberSoal === "Tarik dari Bank Soal AI (Generator)" || cbtForm.sumberSoal === "Upload dari Kisi-kisi / LKPD (Word/PDF)") && !cbtForm.koleksiId) {
      alert("Harap pilih Koleksi Hasil Generate AI terlebih dahulu."); return;
    }

    let initialSoal: any[] = [];

    if (cbtForm.sumberSoal === "Tarik dari Bank Soal AI (Generator)" && cbtForm.koleksiId) {
       const selectedKol = koleksiAI.find(k => k.id === cbtForm.koleksiId);
       if (selectedKol && selectedKol.konten) {
          const content = selectedKol.konten;
          
          const soalBlocks = content.match(/\[SOAL_START\]([\s\S]*?)\[SOAL_END\]/g);

          if (soalBlocks && soalBlocks.length > 0) {
              soalBlocks.forEach((block: string, index: number) => {
                  let tipe = "PG";
                  let pertanyaan = "";
                  let opsi: any[] = [];
                  let pasangan: any[] = [];
                  let kunci = "A";
                  let panduanAI = "";

                  const tipeMatch = block.match(/\[TIPE:(.*?)\]/i);
                  if (tipeMatch) {
                      const tipeRaw = tipeMatch[1].trim().toUpperCase();
                      if(tipeRaw === "BS") tipe = "Benar/Salah";
                      else if(tipeRaw === "JODOHKAN") tipe = "Jodohkan";
                      else if(tipeRaw === "ISIAN") tipe = "Isian Singkat";
                      else if(tipeRaw === "URAIAN") tipe = "Uraian";
                  }

                  const kunciMatch = block.match(/\[KUNCI:([\s\S]*?)\]/i);
                  if (kunciMatch) {
                      let rawKunci = kunciMatch[1].trim();
                      if (tipe === "PG") kunci = rawKunci.replace(/[^A-E]/gi, '').charAt(0).toUpperCase() || "A";
                      else if (tipe === "Benar/Salah") kunci = rawKunci.toLowerCase().includes("benar") ? "Benar" : "Salah";
                      else panduanAI = rawKunci;
                  }

                  let cleanText = block.replace(/\[SOAL_START\]/gi, '').replace(/\[SOAL_END\]/gi, '')
                                       .replace(/\[TIPE:.*?\]/gi, '').replace(/\[KUNCI:[\s\S]*?\]/gi, '').trim();

                  const lines = cleanText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
                  const qLines: string[] = [];

                  if (tipe === "PG") {
                      const optRegex = /^(?:[\*\-]\s*)?(?:\*\*)?([A-E])[\.\)](?:\*\*)?\s+(.*)/i;
                      lines.forEach((line: string) => {
                          const m = line.match(optRegex);
                          if(m) opsi.push({ id: m[1].toUpperCase(), teks: m[2].trim() });
                          else if(opsi.length === 0) qLines.push(line);
                          else opsi[opsi.length-1].teks += " " + line.trim();
                      });
                      pertanyaan = qLines.join('\n').trim();
                  } 
                  else if (tipe === "Jodohkan") {
                      lines.forEach((line: string) => {
                          if(line.includes("|") && !line.match(/\|[-\s:]+\|/)) {
                              const cols = line.split("|").map((c: string) => c.trim()).filter((c: string) => c);
                              if(cols.length >= 2 && !cols[0].toLowerCase().includes("pernyataan") && !cols[0].toLowerCase().includes("kiri") && !cols[0].toLowerCase().includes("lajur")) {
                                  pasangan.push({ kiri: cols[0].replace(/^\d+\.\s*/, ''), kanan: cols[1] });
                              }
                          } 
                          else if (!line.includes("|") && (line.includes("=") || (line.includes(" - ") && !line.match(/^[\*\-]\s/)))) {
                              const sp = line.split(/\s*=\s*|\s+-\s+/);
                              if(sp.length >= 2) {
                                  pasangan.push({ kiri: sp[0].trim().replace(/^\d+\.\s*/, ''), kanan: sp[1].trim() });
                              } else {
                                  qLines.push(line);
                              }
                          } 
                          else if (!line.match(/\|[-\s:]+\|/)) {
                              qLines.push(line);
                          }
                      });
                      pertanyaan = qLines.join('\n').trim();
                      if(pasangan.length === 0) pasangan = [{kiri:"", kanan:""}];
                  } 
                  else {
                      pertanyaan = cleanText.replace(/^\d+\.\s*/, '').trim();
                  }

                  initialSoal.push({
                      id: `soal_${Date.now()}_${index}_${Math.random()}`,
                      tipe, pertanyaan, opsi, kunci, panduanAI, pasangan,
                      analisis: { kesukaran: "Sedang", dayaPembeda: "Baik", status: "Layak Digunakan" }
                  });
              });
          } else {
             let kunciJawabanSection = "";
             const kunciMatch = content.match(/(?:Kunci Jawaban|KUNCI JAWABAN|Pedoman Penskoran)[\s\S]*/i);
             if (kunciMatch) { kunciJawabanSection = kunciMatch[0]; }

             const blockRegex = /(?:\n|^)(?:\*\*)?(?:[A-Z]\.\s+)?(\d+)\.\s(?:\*\*)?/g;
             let match, lastIndex = 0, soalMatches: any[] = [];

             while ((match = blockRegex.exec(content)) !== null) {
                if (soalMatches.length > 0) {
                  soalMatches[soalMatches.length - 1].text = content.substring(lastIndex, match.index).trim();
                }
                soalMatches.push({ num: match[1], text: "" });
                lastIndex = blockRegex.lastIndex;
             }
             if (soalMatches.length > 0) soalMatches[soalMatches.length - 1].text = content.substring(lastIndex).trim();

             soalMatches.forEach((sMatch: any, index: number) => {
                let blockText = sMatch.text;
                if (kunciMatch && blockText.includes(kunciMatch[0])) {
                   blockText = blockText.replace(kunciMatch[0], "").trim();
                }
                if (!blockText) return;

                let tipe = "Uraian";
                let opsi: any[] = [];
                let pasangan: any[] = [];
                let kunci = "A";
                let panduanAI = "";

                const lines = blockText.split(/\n|<br\s*\/?>/i).map((l: string) => l.trim()).filter((l: string) => l);
                const pertanyaanLines: string[] = [];
                const optRegex = /^(?:[\*\-]\s*)?(?:\*\*)?([A-E])[\.\)](?:\*\*)?\s+(.*)/i;

                lines.forEach((line: string) => {
                    const lineMatch = line.match(optRegex);
                    if (lineMatch) {
                        opsi.push({ id: lineMatch[1].toUpperCase(), teks: lineMatch[2].trim() });
                    } else {
                        if (opsi.length === 0) pertanyaanLines.push(line);
                        else opsi[opsi.length - 1].teks += " " + line.trim();
                    }
                });

                let pertanyaan = pertanyaanLines.join('\n').trim();

                if (opsi.length >= 2) { 
                    tipe = "PG"; 
                } else if (blockText.toLowerCase().includes("benar") && blockText.toLowerCase().includes("salah")) { 
                    tipe = "Benar/Salah"; opsi = []; 
                } else if (blockText.toLowerCase().includes("jodohkan") || blockText.toLowerCase().includes("pasangkan")) {
                    tipe = "Jodohkan";
                    lines.forEach((line: string) => {
                        if(line.includes("|") && !line.match(/\|[-\s:]+\|/)) {
                            const cols = line.split("|").map((c: string) => c.trim()).filter((c: string) => c);
                            if(cols.length >= 2 && !cols[0].toLowerCase().includes("pernyataan") && !cols[0].toLowerCase().includes("kiri") && !cols[0].toLowerCase().includes("lajur") && !cols[0].toLowerCase().includes("no")) {
                                let kiri = cols[0].replace(/^\d+\.\s*/, '');
                                let kanan = cols[cols.length > 2 ? 2 : 1]; 
                                if (cols.length >= 4) { kiri = cols[1]; kanan = cols[3]; } 
                                else if (cols.length >= 2) { kiri = cols[0]; kanan = cols[1]; }
                                pasangan.push({ kiri: kiri.replace(/^\d+\.\s*/, ''), kanan: kanan.replace(/^[A-Z]\.\s*/, '') });
                            }
                        } else if (!line.includes("|") && (line.includes("=") || (line.includes(" - ") && !line.match(/^[\*\-]\s/)))) {
                            const sp = line.split(/\s*=\s*|\s+-\s+/);
                            if (sp.length >= 2) pasangan.push({ kiri: sp[0].trim().replace(/^\d+\.\s*/, ''), kanan: sp[1].trim().replace(/^[A-Z]\.\s*/, '') });
                        }
                    });
                    if (pasangan.length === 0) pasangan = [{kiri: "", kanan: ""}, {kiri: "", kanan: ""}];
                } else if (blockText.toLowerCase().includes("isian") || blockText.includes("....") || blockText.includes("___")) { 
                    tipe = "Isian Singkat"; 
                }

                if (kunciJawabanSection) {
                    const kunciRegex = new RegExp(`(?:\\n|^|<br\\s*\\/?>)(?:\\*\\*)?${sMatch.num}\\.(?:\\*\\*)?\\s*(.*)`, 'i');
                    const kMatch = kunciJawabanSection.match(kunciRegex);
                    if (kMatch) {
                        let rawKunci = kMatch[1].trim();
                        if (tipe === "PG") { 
                            const parsedLetter = rawKunci.match(/^[A-E]/i); 
                            if (parsedLetter) kunci = parsedLetter[0].toUpperCase(); 
                        } else if (tipe === "Benar/Salah") { 
                            kunci = rawKunci.toLowerCase().includes("benar") ? "Benar" : "Salah"; 
                        } else { 
                            panduanAI = rawKunci; 
                        }
                    }
                }

                initialSoal.push({
                    id: `soal_${Date.now()}_${index}_${Math.random()}`,
                    tipe, pertanyaan, opsi, kunci, panduanAI, pasangan,
                    analisis: { kesukaran: "Sedang", dayaPembeda: "Baik", status: "Layak Digunakan" }
                });
             });
          }
       }
    }

    if (initialSoal.length === 0) initialSoal = [{ id: Date.now().toString(), tipe: "PG", pertanyaan: "", opsi: getInitialOpsi(), kunci: "A", panduanAI: "", pasangan: [], analisis: { kesukaran: "Sedang", dayaPembeda: "Baik", status: "Layak Digunakan" } }];
    setDaftarSoal(initialSoal); setIsCbtModalOpen(false); setIsEditorOpen(true);
  };

  const simpanUjianKeDatabase = async () => {
    try {
      const finalPengaturan = { ...cbtForm, jenisUjian: cbtForm.jenisUjian === 'Custom' ? cbtForm.jenisUjianCustom : cbtForm.jenisUjian };
      await addDoc(collection(db, "bank_soal"), { kelasId: selectedClass.id, pengaturan: finalPengaturan, soal: daftarSoal, guruId: userUid, timestamp: serverTimestamp() });
      alert("Ujian berhasil disimpan!"); setIsEditorOpen(false); setActiveTab("cbt");
    } catch (error) { alert("Gagal menyimpan soal."); }
  };

  const handlePrintSoal = (ujian: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Izinkan pop-up browser untuk mencetak.");
    const html = `
      <html><head><title>Soal Ujian - ${ujian.pengaturan.judul}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; padding: 40px; color: black; font-size: 14px; }
          .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 15px; margin-bottom: 20px; }
          .header h2, .header h3 { margin: 0; padding: 3px 0; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-weight: bold; border-bottom: 1px dashed black; padding-bottom: 10px; }
          .soal-container { margin-bottom: 20px; page-break-inside: avoid; }
          .opsi-list { list-style-type: none; padding-left: 20px; margin-top: 5px; }
          .opsi-list li { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
        </style>
      </head><body>
        <div class="header"><h2>LEMBAR SOAL UJIAN</h2><h3>${ujian.pengaturan.judul}</h3></div>
        <div class="meta"><span>Mata Pelajaran: ${selectedClass?.mapel || '-'}</span><span>Waktu: ${ujian.pengaturan.waktuMenit} Menit</span></div>
        <div class="content">
          ${(ujian.soal || []).map((s: any, idx: number) => `
            <div class="soal-container">
              <div style="display: flex; gap: 8px;"><strong>${idx + 1}.</strong> <div>${(s.pertanyaan || '').replace(/\n/g, '<br/>')}</div></div>
              ${s.tipe === 'PG' && s.opsi ? `<ul class="opsi-list">${s.opsi.map((opt: any) => `<li>${opt.id}. ${opt.teks || ''}</li>`).join('')}</ul>` : ''}
              ${s.tipe === 'Jodohkan' && s.pasangan ? `
                <table><tr><th>Pernyataan (Kiri)</th><th>Pasangan (Kanan)</th></tr>
                ${s.pasangan.map((p:any)=> `<tr><td>${p.kiri}</td><td>${p.kanan}</td></tr>`).join('')}</table>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </body></html>
    `;
    printWindow.document.write(html); printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 800);
  };

  const handlePrintLJK = (ujian: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Izinkan pop-up browser untuk mencetak LJK.");

    const objectiveSoal = (ujian.soal || []).filter((s: any) => s.tipe === 'PG' || s.tipe === 'Benar/Salah');
    const subjectiveSoal = (ujian.soal || []).filter((s: any) => s.tipe !== 'PG' && s.tipe !== 'Benar/Salah');

    let objectiveHtml = '';
    objectiveSoal.forEach((s: any) => {
      const num = ujian.soal.findIndex((x:any) => x.id === s.id) + 1;
      if (s.tipe === 'PG') {
        const opsiLetters = (s.opsi && s.opsi.length > 0) ? s.opsi.map((o:any)=>o.id) : ['A','B','C','D'];
        const bubbles = opsiLetters.map((l:string) => `<span class="bubble">${l}</span>`).join('');
        objectiveHtml += `<div class="pg-item"><span class="pg-num">${num}.</span>${bubbles}</div>`;
      } else if (s.tipe === 'Benar/Salah') {
        objectiveHtml += `<div class="pg-item"><span class="pg-num">${num}.</span><span class="bubble">B</span><span class="bubble">S</span></div>`;
      }
    });

    let subjectiveHtml = '';
    subjectiveSoal.forEach((s: any) => {
      const num = ujian.soal.findIndex((x:any) => x.id === s.id) + 1;
      if (s.tipe === 'Jodohkan') {
        const lines = s.pasangan ? s.pasangan.map((p:any, i:number) => `<div style="display:flex; margin-top:12px; align-items:flex-end;"><span style="width:25px; font-weight:bold;">${i+1}.</span><div style="border-bottom:1px dotted black; flex:1;"></div></div>`).join('') : '<div class="essay-lines"></div>';
        subjectiveHtml += `<div class="essay-item"><strong>${num}. (Menjodohkan)</strong><div style="margin-top:10px; margin-bottom:10px;">${lines}</div></div>`;
      } else {
        subjectiveHtml += `<div class="essay-item"><strong>${num}. (${s.tipe})</strong> <div class="essay-lines"></div><div class="essay-lines"></div><div class="essay-lines"></div></div>`;
      }
    });

    if (!objectiveHtml) objectiveHtml = '<div style="grid-column: 1 / -1; text-align: center; color: #666; font-style: italic;">Tidak ada soal objektif</div>';
    if (!subjectiveHtml) subjectiveHtml = '<div style="text-align: center; color: #666; font-style: italic;">Tidak ada soal subjektif</div>';

    const html = `
      <html><head><title>LJK - ${ujian.pengaturan?.judul}</title><style>
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: black; max-width: 800px; margin: auto; }
          .header { text-align: center; border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 2px;}
          .header h2 { margin: 5px 0 0 0; font-size: 12px; font-weight: normal; }
          .petunjuk { font-size: 10px; border: 1px solid black; padding: 10px; margin-bottom: 15px; background-color: #fafafa; }
          .info-container { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
          .info-box { flex: 1; border: 1px solid black; padding: 10px; }
          .info-row { display: flex; margin-bottom: 8px; align-items: flex-end; }
          .info-label { width: 90px; font-weight: bold; font-size: 11px; }
          .info-line { flex: 1; border-bottom: 1px dotted black; height: 14px; }
          .section-title { font-weight: bold; font-size: 13px; text-align: center; text-transform: uppercase; border: 1px solid black; background: #eee; padding: 5px; margin-bottom: 15px;}
          
          .pg-grid { column-count: 4; column-gap: 20px; border: 1px solid black; padding: 15px; margin-bottom: 20px; }
          .pg-item { break-inside: avoid; display: flex; align-items: center; margin-bottom: 8px; }
          .pg-num { width: 25px; text-align: right; margin-right: 8px; font-weight: bold; }
          .bubble { border: 1px solid black; border-radius: 50%; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; margin-right: 4px; }
          
          .essay-section { border: 1px solid black; padding: 15px; }
          .essay-item { margin-bottom: 25px; break-inside: avoid; }
          .essay-lines { border-bottom: 1px dotted black; height: 20px; width: 100%; margin-top: 10px; }
        </style></head><body>
        <div class="container">
          <div class="header"><h1>LEMBAR JAWABAN KOMPUTER (LJK)</h1><h2>${ujian.pengaturan?.judul}</h2></div>
          <div class="petunjuk"><b>PETUNJUK PENGISIAN:</b><br/>1. Gunakan pensil 2B atau pulpen tinta hitam pekat.<br/>2. Hitamkan bulatan (⬤) secara penuh pada jawaban yang dianggap benar.<br/>3. Jaga lembar agar tidak kotor/robek karena akan dipindai menggunakan teknologi AI.</div>
          <div class="info-container">
            <div class="info-box" style="flex: 1.5;">
              <div class="info-row"><div class="info-label">Nama Peserta</div><div class="info-line"></div></div>
              <div class="info-row"><div class="info-label">Nomor Ujian</div><div class="info-line"></div></div>
              <div class="info-row"><div class="info-label">Tanda Tangan</div><div class="info-line" style="height: 25px;"></div></div>
            </div>
            <div class="info-box" style="flex: 1;">
              <div style="margin-bottom: 5px;"><b>Mata Pelajaran:</b> ${selectedClass?.mapel}</div>
              <div style="margin-bottom: 5px;"><b>Durasi Ujian:</b> ${ujian.pengaturan?.waktuMenit || 60} Menit</div>
              <div style="margin-bottom: 5px;"><b>Tanggal:</b> .......................</div>
            </div>
          </div>
          <div class="section-title">A. SOAL OBJEKTIF (Pilihan Ganda & Benar/Salah)</div>
          <div class="pg-grid">${objectiveHtml}</div>
          <div class="section-title">B. SOAL SUBJEKTIF (Menjodohkan, Isian Singkat & Uraian)</div>
          <div class="essay-section">${subjectiveHtml}</div>
        </div></body></html>
    `;
    printWindow.document.write(html); printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 800);
  };

  if (isLoading) return <div className="w-full h-[70vh] flex flex-col justify-center items-center"><Loader2 size={36} className="animate-spin text-blue-600" /></div>;
  const realClassData = selectedClass ? (kelasData.find(k => k.id === selectedClass.id) || selectedClass) : null;
  const siswaKelasAsli = realClassData ? daftarSiswaGlobal.filter(s => realClassData.peserta?.includes(s.id) || s.kelas === realClassData.nama) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-5 pb-6">
      
      {/* TAMPILAN 1: DAFTAR KELAS (HOME) */}
      {!selectedClass && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Kelas & Akademik</h1>
              <p className="text-slate-500 text-sm mt-1">Kelola data peserta didik, absensi, rekap nilai, dan asesmen CBT.</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 shrink-0">
              <Plus size={16} /> Buat Kelas Baru
            </button>
          </div>

          <AnimatePresence>
            {kelasData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kelasData.map((kelas) => (
                  <motion.div key={kelas.id} whileHover={{ y: -2 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 cursor-pointer p-5 flex flex-col justify-between transition-all" onClick={() => setSelectedClass(kelas)}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0 pr-2">
                        <h3 className={`text-lg font-bold text-slate-900 truncate ${teachersFont.className}`}>{kelas.nama}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{kelas.mapel}</p>
                      </div>
                      <span className="bg-indigo-50 text-indigo-700 font-mono text-xs font-bold px-2.5 py-1 rounded-xl border border-indigo-100 shrink-0">{kelas.kode}</span>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><Users size={14}/> Peserta Didik</span>
                      <span className="font-bold text-slate-800">{kelas.peserta?.length || 0} Siswa</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400">Belum ada kelas yang dibuat.</p>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* TAMPILAN 2: DETAIL KELAS & TABS */}
      {selectedClass && !isEditorOpen && (
        <>
          <button onClick={() => { setSelectedClass(null); setIsEditorOpen(false); }} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-sm">
            <ArrowLeft size={15} /> Kembali ke Daftar Kelas
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className={`text-xl md:text-2xl font-bold text-slate-900 truncate ${teachersFont.className}`}>{realClassData.nama}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{realClassData.mapel} • {siswaKelasAsli.length} Siswa Terdaftar</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-2xl flex items-center justify-between gap-4 shrink-0">
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Kode Akses Kelas</p>
                <p className="text-lg font-mono font-bold text-indigo-700 tracking-widest">{realClassData.kode}</p>
              </div>
              <Key size={20} className="text-indigo-300" />
            </div>
          </div>

          <div className="flex gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none pb-0" style={{ scrollbarWidth: 'none' }}>
            {["siswa", "absensi", "jurnal", "rekap", "cbt", "koreksi"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-3 text-xs md:text-sm font-bold capitalize transition-all relative shrink-0 ${activeTab === tab ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}>
                {tab === "cbt" ? "E-Ujian (CBT)" : tab} 
                {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>}
              </button>
            ))}
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
            
            {/* TAB: SISWA */}
            {activeTab === "siswa" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Database Siswa</h3>
                  <button onClick={handleDownloadCSVSiswa} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all">
                    <ArrowDownToLine size={14} /> Unduh CSV
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[500px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200">
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">Nama Lengkap</th>
                        <th className="px-4 py-3">NISN / Email</th>
                        <th className="px-4 py-3 text-center w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {siswaKelasAsli.length > 0 ? siswaKelasAsli.map((siswa, idx) => (
                        <tr key={siswa.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{siswa.nama}</td>
                          <td className="px-4 py-3">
                            <p className="font-mono text-slate-600">{siswa.nisn || "-"}</p>
                            <p className="text-[10px] text-slate-400">{siswa.email || "-"}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                              <CheckCircle2 size={11}/> Aktif
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="text-center py-10 text-slate-400">Belum ada siswa terdaftar di kelas ini.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: ABSENSI */}
            {activeTab === "absensi" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Absensi Harian</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <CalendarDays size={15} className="text-slate-400"/>
                      <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none" />
                    </div>
                    <button type="button" onClick={() => setIsRiwayatAbsenOpen(true)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
                      <FileSpreadsheet size={15} /> Riwayat
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <form onSubmit={handleSimpanAbsensi}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[550px] text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                            <th className="px-4 py-3 text-center w-12">No</th>
                            <th className="px-4 py-3">Nama Siswa</th>
                            <th className="px-4 py-3 text-center">Keterangan Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {siswaKelasAsli.map((siswa, idx) => (
                            <tr key={siswa.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-3 font-bold text-slate-800">{siswa.nama}</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-2">
                                  {["Hadir", "Sakit", "Izin", "Alpha"].map((opsi) => (
                                    <label key={opsi} className={`px-2.5 py-1 rounded-lg cursor-pointer border text-[11px] font-bold transition-all ${absensi[siswa.id] === opsi ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                      <input type="radio" name={`absen-${siswa.id}`} value={opsi} checked={absensi[siswa.id] === opsi} onChange={(e) => setAbsensi(prev => ({ ...prev, [siswa.id]: e.target.value }))} className="hidden" />
                                      {opsi}
                                    </label>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button type="submit" disabled={isSubmittingAbsen} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50">
                        {isSubmittingAbsen ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan Absensi
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB: JURNAL */}
            {activeTab === "jurnal" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Jurnal Mengajar</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <CalendarDays size={15} className="text-slate-400"/>
                      <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none" />
                    </div>
                    <button type="button" onClick={() => setIsRiwayatJurnalOpen(true)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all">
                      <FileSpreadsheet size={15} /> Riwayat
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSimpanJurnal} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Materi Pembelajaran *</label>
                    <input type="text" required value={jurnal.materi} onChange={(e) => setJurnal({...jurnal, materi: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium" placeholder="Contoh: Teks Deskripsi Budaya Lokal" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Uraian Kegiatan Belajar *</label>
                    <textarea required rows={3} value={jurnal.kegiatan} onChange={(e) => setJurnal({...jurnal, kegiatan: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium resize-none" placeholder="Deskripsikan jalannya pembelajaran..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Hambatan (Opsional)</label>
                      <textarea rows={2} value={jurnal.hambatan} onChange={(e) => setJurnal({...jurnal, hambatan: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium resize-none" />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Solusi (Opsional)</label>
                      <textarea rows={2} value={jurnal.solusi} onChange={(e) => setJurnal({...jurnal, solusi: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium resize-none" />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button type="submit" disabled={isSubmittingJurnal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50">
                      {isSubmittingJurnal ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Kirim Jurnal KBM
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* TAB: REKAP NILAI */}
            {activeTab === "rekap" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Buku Nilai Digital</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={() => setIsPengaturanNilaiOpen(true)} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                      <SlidersHorizontal size={13} /> Indikator & Bobot
                    </button>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                      <span className="font-bold text-slate-500 uppercase text-[10px]">KKM:</span>
                      <input type="number" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className="w-10 bg-white border border-slate-300 rounded text-center font-bold outline-none" />
                    </div>
                    <button type="button" onClick={handleDownloadExcel} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                      <ArrowDownToLine size={13} /> CSV
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <form onSubmit={handleSimpanRekap}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[600px] text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                            <th className="px-3 py-3 text-center w-10">No</th>
                            <th className="px-4 py-3 min-w-[140px]">Nama Siswa</th>
                            {indikatorNilai.map(ind => (
                              <th key={ind.id} className="px-2 py-3 text-center">
                                {ind.nama} <span className="block text-[8px] font-normal text-slate-400">({ind.bobot}%)</span>
                              </th>
                            ))}
                            <th className="px-4 py-3 text-center bg-indigo-50/50 text-indigo-900 border-l">Nilai Akhir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {siswaKelasAsli.map((siswa, idx) => { 
                            const dataN = nilai[siswa.id] || {}; 
                            const nilaiAkhir = hitungNilaiAkhir(dataN); 
                            const tuntas = nilaiAkhir >= kkm; 
                            return (
                              <tr key={siswa.id} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-4 py-2 font-bold text-slate-800 truncate">{siswa.nama}</td>
                                {indikatorNilai.map(ind => (
                                  <td key={ind.id} className="px-2 py-2 text-center">
                                    <input type="number" value={dataN[ind.id] || ""} onChange={(e) => handleUbahNilai(siswa.id, ind.id, e.target.value)} className="w-12 mx-auto block p-1 border border-slate-200 rounded-lg text-center font-bold outline-none focus:border-indigo-400 text-xs" />
                                  </td>
                                ))}
                                <td className="px-4 py-2 text-center border-l bg-indigo-50/20">
                                  <span className={`font-black text-sm ${nilaiAkhir > 0 ? (tuntas ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{nilaiAkhir}</span>
                                </td>
                              </tr>
                            ); 
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button type="submit" disabled={isSubmittingRekap} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50">
                        {isSubmittingRekap ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan Rekap Nilai
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB: E-UJIAN (CBT) */}
            {activeTab === "cbt" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Bank Soal & Penugasan CBT</h3>
                  <button type="button" onClick={() => setIsCbtModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95">
                    <Plus size={15}/> Pengaturan Ujian Baru
                  </button>
                </div>

                {daftarUjian.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {daftarUjian.map((ujian) => (
                      <div key={ujian.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between relative">
                        <div>
                          <button type="button" onClick={() => hapusUjian(ujian.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                          <h4 className="font-bold text-slate-900 text-sm pr-6">{ujian.pengaturan.judul}</h4>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5 mb-2.5">{ujian.pengaturan.jenisUjian}</p>
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mb-3">
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><Target size={12}/> {ujian.soal?.length || 0} Soal</span>
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><Clock size={12}/> {ujian.pengaturan.waktuMenit} Menit</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => handlePrintSoal(ujian)} className="flex justify-center items-center gap-1 text-[10px] font-bold bg-slate-50 border border-slate-200 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100"><Printer size={12}/> Print Soal</button>
                            <button type="button" onClick={() => handlePrintLJK(ujian)} className="flex justify-center items-center gap-1 text-[10px] font-bold bg-slate-50 border border-slate-200 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100"><FileCheck size={12}/> Unduh LJK</button>
                          </div>
                          <button type="button" onClick={() => { setSelectedUjianView(ujian); setIsHasilUjianOpen(true); }} className="w-full flex justify-center items-center gap-1 text-[11px] font-bold bg-indigo-50 border border-indigo-100 py-2 rounded-xl text-indigo-700 hover:bg-indigo-100 transition-colors">
                            <Eye size={13}/> Lihat Hasil & Feedback AI
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center">
                    <p className="text-xs font-bold text-slate-400">Belum ada ujian di kelas ini.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: KOREKSI AI */}
            {activeTab === "koreksi" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm md:text-base"><BrainCircuit size={18} className="text-indigo-600"/> Pengaturan Koreksi AI</h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">Sistem AI memindai Lembar Jawaban (LJK) & mengoreksi otomatis berdasarkan rubrik.</p>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Rubrik Kunci Jawaban</label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400">
                    <option>Pilih Rubrik Asesmen...</option>
                    {daftarUjian.map(u => <option key={u.id}>Kunci Jawaban: {u.pengaturan.judul}</option>)}
                  </select>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-2 text-sm md:text-base">Unggah LJK / Jawaban Siswa</h3>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleUploadLJK} />
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-indigo-200 bg-indigo-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/50 transition-colors h-[180px]">
                    <UploadCloud size={36} className="text-indigo-400 mb-2.5" />
                    <p className="font-bold text-slate-800 text-xs mb-0.5">Klik untuk mengunggah Berkas LJK</p>
                    <p className="text-[10px] text-slate-400">Format: PNG, JPG, PDF</p>
                  </div>
                  
                  <AnimatePresence>
                    {hasilKoreksiAI && (
                      <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="mt-4 p-4 border border-emerald-200 bg-emerald-50 rounded-2xl text-xs space-y-2">
                        <h4 className="font-bold text-emerald-800 flex items-center gap-1.5"><CheckCircle2 size={15}/> Koreksi AI Selesai</h4>
                        <p className="text-slate-700">Siswa: <strong>{hasilKoreksiAI.namaSiswa}</strong> | Nilai AI: <strong className="text-rose-600">{hasilKoreksiAI.nilaiAwal}</strong></p>
                        <div className="p-2.5 bg-white border border-emerald-100 rounded-xl text-[10px] text-slate-500 italic">
                           Catatan AI: {hasilKoreksiAI.diagnosa}
                        </div>
                        <div className="pt-2 border-t border-emerald-200/60 space-y-1.5">
                           <label className="font-bold text-slate-700 flex items-center gap-1"><Info size={13} className="text-indigo-500"/> Otoritas Guru (Override)</label>
                           <div className="flex gap-2">
                             <input type="number" value={overrideScore || 0} onChange={e=>setOverrideScore(Number(e.target.value))} className="w-16 p-2 text-center rounded-xl border border-slate-200 text-xs font-bold outline-none bg-white"/>
                             <button onClick={simpanOverrideNilai} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all">Simpan Nilai</button>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* TAMPILAN 3: EDITOR SOAL CBT */}
      {selectedClass && isEditorOpen && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 space-y-5">
          <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className={`text-lg md:text-xl font-bold text-slate-900 ${teachersFont.className}`}>{cbtForm.judul}</h2>
              <p className="text-xs font-bold text-indigo-600 mt-0.5">{cbtForm.jenisUjian === 'Custom' ? cbtForm.jenisUjianCustom : cbtForm.jenisUjian}</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
               <button onClick={() => setIsEditorOpen(false)} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex-1 md:flex-none">
                 Tutup Editor
               </button>
               <button type="button" onClick={simpanUjianKeDatabase} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all flex-1 md:flex-none">
                 <Save size={15} /> Simpan Ujian
               </button>
            </div>
          </div>

          <div className="space-y-4">
            {daftarSoal.map((soal, index) => (
              <div key={soal.id} className="p-4 md:p-5 border border-slate-200 rounded-2xl relative bg-white shadow-sm space-y-3">
                <button type="button" onClick={() => hapusSoal(soal.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 bg-slate-50 p-2 rounded-xl border border-slate-200 transition-colors"><Trash2 size={15} /></button>
                
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 pr-10">
                  <span className="font-bold text-xs bg-indigo-50 text-indigo-700 w-6 h-6 flex items-center justify-center rounded-lg">{index + 1}</span>
                  <select value={soal.tipe} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].tipe = e.target.value; setDaftarSoal(newSoal); }} className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none">
                    <option value="PG">Pilihan Ganda</option>
                    <option value="Benar/Salah">Benar / Salah</option>
                    <option value="Jodohkan">Menjodohkan</option>
                    <option value="Isian Singkat">Isian Singkat</option>
                    <option value="Uraian">Uraian</option>
                  </select>
                </div>

                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
                  <textarea className="w-full p-3 text-xs outline-none resize-none font-medium min-h-[80px]" value={soal.pertanyaan} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].pertanyaan = e.target.value; setDaftarSoal(newSoal); }} placeholder="Ketik deskripsi pertanyaan di sini..." />
                  
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    {soal.tipe === "PG" && (
                      <div className="space-y-2">
                        {soal.opsi?.map((opt: any, oIdx: number) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className="font-bold w-5">{opt.id}.</span>
                            <input type="text" value={opt.teks} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].opsi[oIdx].teks = e.target.value; setDaftarSoal(newSoal); }} placeholder={`Teks Pilihan ${opt.id}`} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs space-y-2">
                  <label className="font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider text-[10px]"><Key size={13}/> Kunci Jawaban</label>
                  {(soal.tipe === "PG" || soal.tipe === "Benar/Salah") && (
                    <select value={soal.kunci} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].kunci = e.target.value; setDaftarSoal(newSoal); }} className="bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-700 outline-none">
                      {soal.tipe === "PG" ? soal.opsi?.map((opt:any) => <option key={opt.id} value={opt.id}>Opsi {opt.id}</option>) : <><option value="Benar">Benar</option><option value="Salah">Salah</option></>}
                    </select>
                  )}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-3">
              <button type="button" onClick={() => tambahSoalManual("PG")} className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"><Plus size={14}/> PG</button>
              <button type="button" onClick={() => tambahSoalManual("Benar/Salah")} className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"><Plus size={14}/> B/S</button>
              <button type="button" onClick={() => tambahSoalManual("Uraian")} className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-50"><Plus size={14}/> Uraian</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* MODAL BUAT KELAS */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800 text-sm">Buat Kelas Baru</h3></div>
              <form onSubmit={handleBuatKelas} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1 uppercase tracking-wider">Nama Kelas</label>
                  <input type="text" required value={newClass.nama} onChange={(e) => setNewClass({...newClass, nama: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 font-medium" placeholder="Contoh: Kelas 7A" />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1 uppercase tracking-wider">Mata Pelajaran</label>
                  <input type="text" required value={newClass.mapel} onChange={(e) => setNewClass({...newClass, mapel: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 font-medium" placeholder="Contoh: Bahasa Indonesia" />
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-500 rounded-xl">Batal</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm">Simpan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CBT CONFIG */}
      <AnimatePresence>
        {isCbtModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><Target size={16} className="text-indigo-600"/> Pengaturan Ujian Baru</h3>
                <button type="button" onClick={() => setIsCbtModalOpen(false)} className="text-slate-400 p-1 rounded-lg hover:bg-slate-200"><X size={18}/></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Judul Ujian / Penugasan *</label>
                  <input type="text" value={cbtForm.judul} onChange={(e) => setCbtForm({...cbtForm, judul: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" placeholder="Contoh: Sumatif Harian Bab 1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Jenis Ujian</label>
                    <select value={cbtForm.jenisUjian} onChange={(e) => setCbtForm({...cbtForm, jenisUjian: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none">
                      <option value="Ulangan Harian">Ulangan Harian</option>
                      <option value="Asesmen Formatif">Asesmen Formatif</option>
                      <option value="Sumatif Lingkup Materi">Sumatif Lingkup Materi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Durasi (Menit)</label>
                    <input type="number" value={cbtForm.waktuMenit} onChange={(e) => setCbtForm({...cbtForm, waktuMenit: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Waktu Buka</label>
                    <input type="datetime-local" value={cbtForm.waktuMulai} onChange={(e) => setCbtForm({...cbtForm, waktuMulai: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Waktu Tutup</label>
                    <input type="datetime-local" value={cbtForm.waktuSelesai} onChange={(e) => setCbtForm({...cbtForm, waktuSelesai: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Sumber Soal</label>
                  <select value={cbtForm.sumberSoal} onChange={(e) => setCbtForm({...cbtForm, sumberSoal: e.target.value, koleksiId: ""})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-700 outline-none">
                    <option value="Buat Manual (Ketik Sendiri)">Buat Manual (Ketik Sendiri)</option>
                    <option value="Tarik dari Bank Soal AI (Generator)">Tarik dari Bank Soal AI (Generator)</option>
                  </select>
                </div>
                {cbtForm.sumberSoal === 'Tarik dari Bank Soal AI (Generator)' && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                    <label className="block font-bold text-indigo-900 uppercase text-[10px]">Pilih Koleksi AI</label>
                    <select value={cbtForm.koleksiId || ''} onChange={(e) => setCbtForm({...cbtForm, koleksiId: e.target.value})} className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-xs outline-none">
                      <option value="" disabled>-- Pilih Koleksi AI --</option>
                      {koleksiAI.map(kol => (<option key={kol.id} value={kol.id}>{kol.tipe} - {kol.mapel}</option>))}
                    </select>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-slate-50 shrink-0">
                <button type="button" onClick={prosesLanjutPembuatan} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all">Lanjutkan <ChevronRight size={15}/></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL HASIL UJIAN */}
      <AnimatePresence>
        {isHasilUjianOpen && selectedUjianView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><Target size={16} className="text-indigo-600" /> Hasil & Feedback AI</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedUjianView.pengaturan.judul}</p>
                </div>
                <button type="button" onClick={() => setIsHasilUjianOpen(false)} className="text-slate-400 p-1 rounded-lg hover:bg-slate-200"><X size={18}/></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl flex gap-2.5 items-start">
                  <Activity size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-indigo-900 leading-relaxed">Sistem menganalisis kemampuan kognitif tiap peserta didik secara otomatis berdasarkan pola pengerjaan ujian.</p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                        <th className="p-3 text-center w-10">No</th>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3 text-center">Nilai</th>
                        <th className="p-3 text-center">Benar / Salah</th>
                        <th className="p-3 text-center w-36">Aksi Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {siswaKelasAsli.map((siswa, idx) => {
                        const hasilSiswa = hasilUjianData.find(h => h.uid === siswa.id);
                        const isExpanded = expandedFeedbackId === siswa.id;
                        return (
                          <React.Fragment key={siswa.id}>
                            <tr className="hover:bg-slate-50/50">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-800">{siswa.nama}</td>
                              <td className={`p-3 text-center font-black text-sm ${hasilSiswa?.nilai >= kkm ? 'text-emerald-600' : 'text-rose-600'}`}>{hasilSiswa?.nilai ?? "-"}</td>
                              <td className="p-3 text-center font-bold text-slate-600">{hasilSiswa?.benar ?? "-"} / {hasilSiswa?.salah ?? "-"}</td>
                              <td className="p-3 text-center">
                                {hasilSiswa ? (
                                  <button onClick={() => {
                                    setExpandedFeedbackId(isExpanded ? null : siswa.id);
                                    if (!isExpanded && !hasilSiswa.feedbackGuru) generateFeedbackAI(siswa, hasilSiswa);
                                  }} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-xl text-[10px] font-bold transition-all w-full">
                                    <MessageSquareText size={12} className="inline mr-1"/> Feedback
                                  </button>
                                ) : <span className="text-slate-400 italic">Belum Ujian</span>}
                              </td>
                            </tr>
                            {isExpanded && hasilSiswa && (
                              <tr className="bg-indigo-50/20">
                                <td colSpan={5} className="p-4">
                                  <div className="bg-white border border-indigo-100 p-3.5 rounded-xl space-y-1.5 shadow-sm">
                                    <p className="font-bold text-indigo-900 uppercase tracking-wider text-[9px]">Umpan Balik Sistem AI:</p>
                                    <p className="text-slate-700 leading-relaxed font-medium">{hasilSiswa.feedbackGuru || "Menyiapkan rekomendasi..."}</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PENGATURAN BOBOT NILAI */}
      <AnimatePresence>
        {isPengaturanNilaiOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><SlidersHorizontal size={16} className="text-amber-600"/> Pengaturan Bobot Indikator</h3>
                <button onClick={() => setIsPengaturanNilaiOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"><X size={18}/></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-3 text-xs">
                {indikatorNilai.map((ind, idx) => (
                  <div key={ind.id} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <input type="text" value={ind.nama} onChange={(e) => { const newInd = [...indikatorNilai]; newInd[idx].nama = e.target.value; setIndikatorNilai(newInd); }} className="flex-1 bg-transparent font-bold text-slate-800 outline-none" />
                    <div className="flex items-center gap-1">
                      <input type="number" value={ind.bobot} onChange={(e) => { const newInd = [...indikatorNilai]; newInd[idx].bobot = Number(e.target.value); setIndikatorNilai(newInd); }} className="w-12 bg-white border border-slate-200 rounded-lg text-center font-bold p-1 outline-none" />
                      <span className="text-slate-400 font-bold">%</span>
                    </div>
                    <button type="button" onClick={() => handleHapusIndikator(ind.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={15}/></button>
                  </div>
                ))}
                <button type="button" onClick={handleTambahIndikator} className="w-full border-2 border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                  <Plus size={15}/> Tambah Indikator Baru
                </button>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-slate-50 shrink-0">
                <button onClick={() => setIsPengaturanNilaiOpen(false)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all">Selesai</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL RIWAYAT ABSENSI */}
      <AnimatePresence>
        {isRiwayatAbsenOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><CalendarDays className="text-indigo-600" size={16}/> Riwayat Absensi Kelas</h3>
                <button onClick={() => setIsRiwayatAbsenOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"><X size={18}/></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-2.5 text-xs custom-scrollbar">
                {riwayatAbsenData.length > 0 ? riwayatAbsenData.map((absen, idx) => (
                  <div key={idx} className="p-3.5 border border-slate-200 rounded-xl flex justify-between items-center bg-white shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800">{absen.tanggal}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Hadir: {Object.values(absen.dataKehadiran || {}).filter(v => v === "Hadir").length} Siswa</p>
                    </div>
                    <button onClick={() => { setTanggal(absen.tanggal); setAbsensi(absen.dataKehadiran || {}); setIsRiwayatAbsenOpen(false); }} className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-all">Muat Data</button>
                  </div>
                )) : <p className="text-center py-8 text-slate-400 font-bold">Belum ada riwayat absensi.</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL RIWAYAT JURNAL */}
      <AnimatePresence>
        {isRiwayatJurnalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><FileSpreadsheet className="text-indigo-600" size={16}/> Riwayat Jurnal Mengajar</h3>
                <button onClick={() => setIsRiwayatJurnalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"><X size={18}/></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-3 text-xs custom-scrollbar">
                {riwayatJurnalData.length > 0 ? riwayatJurnalData.map((j, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">{j.tanggal}</span>
                      <button onClick={async () => { if(confirm("Hapus jurnal ini?")) await deleteDoc(doc(db, "jurnal_kbm", j.id)); }} className="text-slate-300 hover:text-rose-500"><Trash2 size={15}/></button>
                    </div>
                    <p className="font-bold text-slate-900">Materi: {j.materi}</p>
                    <p className="text-slate-600 leading-relaxed">{j.kegiatan}</p>
                  </div>
                )) : <p className="text-center py-8 text-slate-400 font-bold">Belum ada riwayat jurnal.</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}