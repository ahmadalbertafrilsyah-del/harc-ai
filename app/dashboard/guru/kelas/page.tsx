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
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, where, getDoc, setDoc } from "firebase/firestore";
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
  const [absenViewMode, setAbsenViewMode] = useState<"bulan" | "semester">("bulan");
  const [riwayatAbsenData, setRiwayatAbsenData] = useState<any[]>([]); 
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [filterBulan, setFilterBulan] = useState(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
  const [filterSemester, setFilterSemester] = useState("Ganjil");
  const [filterTahunAjaran, setFilterTahunAjaran] = useState(`${currentYear}/${currentYear+1}`);

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

  const handleDownloadAbsenExcel = () => {
    const siswaKelasAsli = selectedClass ? daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama) : [];
    if (siswaKelasAsli.length === 0) return alert("Belum ada data siswa.");
    
    let csvRows = [];
    if (absenViewMode === "bulan") {
      const [yearStr, monthStr] = filterBulan.split('-');
      const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
      const headers = ["No", "NISN", "Nama", ...Array.from({length: daysInMonth}).map((_, i) => `${i+1}`), "Sakit", "Izin", "Alpha"];
      csvRows.push(headers.join(","));
      
      siswaKelasAsli.forEach((siswa, idx) => {
        let s=0, i=0, a=0;
        const rowData = [idx + 1, `="${siswa.nisn || '-'}"`, `"${siswa.nama}"`];
        
        Array.from({length: daysInMonth}).map((_, d) => {
          const dateStr = `${yearStr}-${monthStr}-${(d+1).toString().padStart(2, '0')}`;
          const record = riwayatAbsenData.find(r => r.tanggal === dateStr);
          let status = "";
          if (record && record.dataKehadiran && record.dataKehadiran[siswa.id]) {
            const val = record.dataKehadiran[siswa.id];
            if (val === "Hadir") status = "H";
            else if (val === "Sakit") { status = "S"; s++; }
            else if (val === "Izin") { status = "I"; i++; }
            else if (val === "Alpha") { status = "A"; a++; }
          }
          rowData.push(status);
        });
        rowData.push(s.toString(), i.toString(), a.toString());
        csvRows.push(rowData.join(","));
      });
    } else {
      const months = filterSemester === "Ganjil" ? [7,8,9,10,11,12] : [1,2,3,4,5,6];
      const startYear = parseInt(filterTahunAjaran.split('/')[0]);
      const endYear = parseInt(filterTahunAjaran.split('/')[1]);
      const headers = ["No", "NISN", "Nama", "L/P", ...months.map(m => `Bulan ${m} (S)`), ...months.map(m => `Bulan ${m} (I)`), ...months.map(m => `Bulan ${m} (A)`), "Total S", "Total I", "Total A", "Kehadiran (%)"];
      csvRows.push(headers.join(","));
      
      siswaKelasAsli.forEach((siswa, idx) => {
        const jk = siswa.jenisKelamin === 'Perempuan' ? 'P' : (siswa.jenisKelamin === 'Laki-laki' ? 'L' : '-');
        const rowData = [idx + 1, `="${siswa.nisn || '-'}"`, `"${siswa.nama}"`, jk];
        
        let totalS=0, totalI=0, totalA=0, totalHadir=0, totalHari=0;
        let sArr:number[]=[], iArr:number[]=[], aArr:number[]=[];
        
        months.forEach(m => {
          const y = m >= 7 ? startYear : endYear;
          const prefix = `${y}-${m.toString().padStart(2, '0')}`;
          let s=0, i=0, a=0;
          riwayatAbsenData.forEach(record => {
            if (record.tanggal && record.tanggal.startsWith(prefix) && record.dataKehadiran?.[siswa.id]) {
               totalHari++;
               const val = record.dataKehadiran[siswa.id];
               if (val === "Sakit") s++; else if (val === "Izin") i++; else if (val === "Alpha") a++; else if(val === "Hadir") totalHadir++;
            }
          });
          sArr.push(s); iArr.push(i); aArr.push(a);
          totalS+=s; totalI+=i; totalA+=a;
        });
        
        const persentaseHadir = totalHari === 0 ? 100 : Math.round((totalHadir / totalHari) * 100);
        rowData.push(...sArr.map(String), ...iArr.map(String), ...aArr.map(String), totalS.toString(), totalI.toString(), totalA.toString(), `${persentaseHadir}%`);
        csvRows.push(rowData.join(","));
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); 
    link.setAttribute("download", `Rekap_Absensi_${selectedClass.nama}_${absenViewMode}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handlePrintAbsenPDF = () => { alert("Mempersiapkan dokumen PDF untuk dicetak..."); window.print(); };

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
          let kunciJawabanSection = "";
          const kunciMatch = content.match(/(?:Kunci Jawaban|KUNCI JAWABAN|Pedoman Penskoran)[\s\S]*/i);
          if (kunciMatch) { kunciJawabanSection = kunciMatch[0]; }

          const blockRegex = /(?:\n|^)(?:\*\*)?(?:[A-Z]\.\s+)?(\d+)\.\s(?:\*\*)?/g;
          let match, lastIndex = 0, soalMatches = [];

          while ((match = blockRegex.exec(content)) !== null) {
              if (soalMatches.length > 0) { soalMatches[soalMatches.length - 1].text = content.substring(lastIndex, match.index).trim(); }
              soalMatches.push({ num: match[1], text: "" });
              lastIndex = blockRegex.lastIndex;
          }
          if (soalMatches.length > 0) soalMatches[soalMatches.length - 1].text = content.substring(lastIndex).trim();

          soalMatches.forEach((sMatch) => {
              let blockText = sMatch.text;
              if (kunciMatch && blockText.includes(kunciMatch[0])) blockText = blockText.replace(kunciMatch[0], "").trim();
              if (!blockText) return;

              let tipe = "Uraian";
              let opsi: any[] = [];
              let pertanyaan = blockText;
              let kunci = "A";
              let panduanAI = "";

              const optionRegex = /(?:\n|^)(?:\*\*)?([A-E])\.(?:\*\*)?\s(.*?)(?=(?:\n(?:\*\*)?[A-E]\.(?:\*\*)?\s)|$)/g;
              let optMatch, firstOptIndex = -1;
              while ((optMatch = optionRegex.exec(blockText)) !== null) {
                  if (firstOptIndex === -1) firstOptIndex = optMatch.index;
                  opsi.push({ id: optMatch[1].toUpperCase(), teks: optMatch[2].trim() });
              }

              if (opsi.length >= 3) {
                  tipe = "PG";
                  pertanyaan = blockText.substring(0, firstOptIndex > -1 ? firstOptIndex : blockText.length).trim();
              } else if (blockText.toLowerCase().includes("benar") && blockText.toLowerCase().includes("salah")) {
                  tipe = "Benar/Salah";
                  opsi = []; 
              } else if (blockText.toLowerCase().includes("jodohkan") || blockText.toLowerCase().includes("pasangkan")) {
                  tipe = "Jodohkan";
              } else if (blockText.toLowerCase().includes("isian") || blockText.includes("....") || blockText.includes("___")) {
                  tipe = "Isian Singkat";
              }

              if (kunciJawabanSection) {
                  const kunciRegex = new RegExp(`(?:\\n|^)(?:\\*\\*)?${sMatch.num}\\.(?:\\*\\*)?\\s*(.*)`, 'i');
                  const kMatch = kunciJawabanSection.match(kunciRegex);
                  if (kMatch) {
                      let rawKunci = kMatch[1].trim();
                      if (tipe === "PG") {
                          const parsedLetter = rawKunci.match(/^[A-E]/i);
                          if (parsedLetter) kunci = parsedLetter[0].toUpperCase();
                      } else {
                          panduanAI = `KUNCI JAWABAN BENAR: ${rawKunci}`;
                      }
                  }
              }

              const kesukaranArr = ["Mudah", "Sedang", "Sedang", "Sukar"];
              const dayaArr = ["Cukup", "Baik", "Baik", "Sangat Baik"];
              initialSoal.push({
                  id: `soal_${Date.now()}_${sMatch.num}_${Math.random()}`,
                  tipe, pertanyaan, opsi, kunci, panduanAI,
                  pasangan: tipe === "Jodohkan" ? [{kiri: "", kanan: ""}, {kiri: "", kanan: ""}] : [],
                  analisis: { kesukaran: kesukaranArr[Math.floor(Math.random() * kesukaranArr.length)], dayaPembeda: dayaArr[Math.floor(Math.random() * dayaArr.length)], status: "Layak Digunakan" }
              });
          });
       }
    }

    if (initialSoal.length === 0) initialSoal = [{ id: Date.now().toString(), tipe: "PG", pertanyaan: "", opsi: getInitialOpsi(), kunci: "A", panduanAI: "", analisis: { kesukaran: "Sedang", dayaPembeda: "Baik", status: "Layak Digunakan" } }];
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

    const soalPG = (ujian.soal || []).filter((s: any) => s.tipe === 'PG');
    const soalEsai = (ujian.soal || []).filter((s: any) => s.tipe !== 'PG');
    const totalPG = soalPG.length > 0 ? soalPG.length : 40; 
    
    let pgHtml = '';
    for (let i = 1; i <= totalPG; i++) {
      pgHtml += `<div class="pg-item"><span class="pg-num">${i}.</span><span class="bubble">A</span><span class="bubble">B</span><span class="bubble">C</span><span class="bubble">D</span><span class="bubble">E</span></div>`;
    }

    let esaiHtml = '';
    for (let i = 1; i <= (soalEsai.length > 0 ? soalEsai.length : 5); i++) {
      esaiHtml += `<div class="essay-item"><strong>${i}.</strong> <div class="essay-lines"></div><div class="essay-lines"></div><div class="essay-lines"></div></div>`;
    }

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
          .pg-num { width: 20px; text-align: right; margin-right: 8px; font-weight: bold; }
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
          <div class="section-title">A. PILIHAN GANDA (Hitamkan salah satu jawaban)</div>
          <div class="pg-grid">${pgHtml}</div>
          <div class="section-title">B. URAIAN / ISIAN SINGKAT</div>
          <div class="essay-section">${esaiHtml}</div>
        </div></body></html>
    `;
    printWindow.document.write(html); printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 800);
  };

  if (isLoading) return <div className="w-full h-[70vh] flex flex-col justify-center items-center"><Loader2 size={40} className="animate-spin text-blue-600" /></div>;
  const realClassData = selectedClass ? (kelasData.find(k => k.id === selectedClass.id) || selectedClass) : null;
  const siswaKelasAsli = realClassData ? daftarSiswaGlobal.filter(s => realClassData.peserta?.includes(s.id) || s.kelas === realClassData.nama) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-full lg:max-w-6xl mx-auto space-y-6 pb-10 relative px-2 md:px-0">
      
      {/* TAMPILAN 1: DAFTAR KELAS (HOME) */}
      {!selectedClass && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div><h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Kelas & Akademik</h1></div>
            <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Plus size={18} /> Buat Kelas Baru</button>
          </div>
          <AnimatePresence>
            {kelasData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {kelasData.map((kelas) => (
                  <motion.div key={kelas.id} className="bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow relative" onClick={() => setSelectedClass(kelas)}>
                    <div className="p-5 pb-4 flex justify-between items-start">
                      <div className="min-w-0"><h3 className={`text-xl font-bold truncate ${teachersFont.className}`}>{kelas.nama}</h3><p className="text-xs text-slate-500 mt-1 truncate">{kelas.mapel}</p></div>
                      <div className="bg-blue-50 text-blue-700 font-mono text-xs font-bold px-2 py-1 rounded-md border border-blue-100">{kelas.kode}</div>
                    </div>
                    <div className="px-5 py-4 border-t border-slate-50">
                      <div className="flex justify-between items-center text-sm"><span className="text-slate-500 flex items-center gap-2"><Users size={16}/> Siswa Terdaftar</span><span className="font-bold text-slate-700">{kelas.peserta?.length || 0}</span></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (<div className="text-center py-24 bg-white rounded-xl border border-dashed border-slate-300 w-full"><h3 className="font-bold text-slate-700">Belum Ada Kelas</h3></div>)}
          </AnimatePresence>
        </>
      )}

      {/* TAMPILAN 2: DETAIL KELAS & TABS */}
      {selectedClass && !isEditorOpen && (
        <>
          <button onClick={() => { setSelectedClass(null); setIsEditorOpen(false); }} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold w-fit"><ArrowLeft size={16} /> Kembali</button>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-4 w-full">
            <div><h1 className={`text-2xl md:text-3xl font-bold truncate ${teachersFont.className}`}>{realClassData.nama}</h1><p className="text-slate-500 mt-1">{realClassData.mapel} • {siswaKelasAsli.length} Siswa</p></div>
            <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-lg flex items-center justify-between md:justify-start gap-4 shrink-0">
              <div><p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Kode Akses</p><p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">{realClassData.kode}</p></div>
              <Key size={24} className="text-blue-300" />
            </div>
          </div>

          <div className="flex gap-4 md:gap-8 border-b border-slate-200 overflow-x-auto custom-scrollbar pt-2 px-2 w-full whitespace-nowrap" style={{ WebkitOverflowScrolling: 'touch' }}>
            {["siswa", "absensi", "jurnal", "rekap", "cbt", "koreksi"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-bold capitalize relative ${activeTab === tab ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                {tab === "cbt" ? "E-Ujian (CBT)" : tab} {activeTab === tab && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
            
            {/* TAB: SISWA */}
            {activeTab === "siswa" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0 h-full">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div><h3 className="font-bold text-slate-800 text-lg">Database Siswa</h3></div>
                  <button onClick={handleDownloadCSVSiswa} className="w-full sm:w-auto bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><ArrowDownToLine size={16} /> Unduh CSV</button>
                </div>
                <div className="w-full border border-slate-200 rounded-lg overflow-hidden">
                  <div className="w-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead><tr className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold border-b border-slate-200"><th className="px-6 py-4 text-center w-16">No</th><th className="px-6 py-4">Nama Lengkap</th><th className="px-6 py-4">NISN / Email</th><th className="px-6 py-4 text-center w-32">Status</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {siswaKelasAsli.map((siswa, idx) => (
                          <tr key={siswa.id} className="hover:bg-slate-50"><td className="px-6 py-4 text-center text-sm font-bold text-slate-400">{idx + 1}</td><td className="px-6 py-4 text-sm font-bold text-slate-800">{siswa.nama}</td><td className="px-6 py-4"><p className="text-sm font-mono text-slate-600">{siswa.nisn || "-"}</p><p className="text-[11px] text-slate-400 mt-0.5">{siswa.email || "-"}</p></td><td className="px-6 py-4 text-center"><span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 shadow-sm"><CheckCircle2 size={12}/> Aktif</span></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: ABSENSI */}
            {activeTab === "absensi" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div><h3 className="font-bold text-slate-800 text-lg">Absensi Harian</h3></div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"><CalendarDays size={16} className="text-slate-500"/><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-transparent w-full sm:w-auto text-sm font-bold text-slate-700 outline-none" /></div>
                    <button type="button" onClick={() => setIsRiwayatAbsenOpen(true)} className="w-full sm:w-auto justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={16} /> Lihat Riwayat</button>
                  </div>
                </div>
                <div className="w-full bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden">
                  <form onSubmit={handleSimpanAbsensi} className="w-full flex flex-col min-w-0">
                    <div className="w-full overflow-x-auto"><table className="w-full text-left border-collapse min-w-[600px]"><thead><tr className="bg-slate-100 text-[10px] uppercase font-bold border-b border-slate-300"><th className="px-4 py-3 text-center border-r border-slate-200 w-12">No</th><th className="px-4 py-3 border-r border-slate-200">Identitas Siswa</th><th className="px-4 py-3 text-center">Keterangan</th></tr></thead><tbody className="divide-y divide-slate-200">{siswaKelasAsli.map((siswa, idx) => (<tr key={siswa.id} className="hover:bg-slate-50/50"><td className="px-4 py-3 text-center text-xs font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td><td className="px-4 py-3 border-r border-slate-200"><p className="text-sm font-bold text-slate-800">{siswa.nama}</p></td><td className="px-4 py-3"><div className="flex justify-center gap-2 sm:gap-4">{["Hadir", "Sakit", "Izin", "Alpha"].map((opsi) => (<label key={opsi} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border ${absensi[siswa.id] === opsi ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-100'}`}><input type="radio" name={`absen-${siswa.id}`} value={opsi} checked={absensi[siswa.id] === opsi} onChange={(e) => setAbsensi(prev => ({ ...prev, [siswa.id]: e.target.value }))} className="w-3.5 h-3.5 accent-blue-600" /><span className={`text-xs font-bold ${absensi[siswa.id] === opsi ? 'text-blue-700' : 'text-slate-600'}`}>{opsi}</span></label>))}</div></td></tr>))}</tbody></table></div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end"><button type="submit" disabled={isSubmittingAbsen} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2">{isSubmittingAbsen ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan</button></div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB: JURNAL */}
            {activeTab === "jurnal" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div><h3 className="font-bold text-slate-800 text-lg">Jurnal Mengajar</h3></div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"><CalendarDays size={16} className="text-slate-500"/><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-transparent w-full sm:w-auto text-sm font-bold text-slate-700 outline-none" /></div>
                    <button type="button" onClick={() => setIsRiwayatJurnalOpen(true)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={16} /> Lihat Riwayat</button>
                  </div>
                </div>
                <form onSubmit={handleSimpanJurnal} className="space-y-4">
                  <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Materi Pembelajaran *</label><input type="text" required value={jurnal.materi} onChange={(e) => setJurnal({...jurnal, materi: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Uraian Kegiatan Belajar *</label><textarea required rows={4} value={jurnal.kegiatan} onChange={(e) => setJurnal({...jurnal, kegiatan: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none resize-none"></textarea></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Hambatan (Opsional)</label><textarea rows={3} value={jurnal.hambatan} onChange={(e) => setJurnal({...jurnal, hambatan: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none resize-none"></textarea></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Solusi (Opsional)</label><textarea rows={3} value={jurnal.solusi} onChange={(e) => setJurnal({...jurnal, solusi: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none resize-none"></textarea></div>
                  </div>
                  <div className="pt-4 flex justify-end"><button type="submit" disabled={isSubmittingJurnal} className="bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-bold flex items-center gap-2">{isSubmittingJurnal ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Kirim Jurnal</button></div>
                </form>
              </motion.div>
            )}

            {/* TAB: REKAP NILAI */}
            {activeTab === "rekap" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div><h3 className="font-bold text-slate-800 text-lg">Buku Nilai Digital</h3></div>
                  <div className="flex items-center gap-3 shrink-0 overflow-x-auto">
                    <button type="button" onClick={() => setIsPengaturanNilaiOpen(true)} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"><SlidersHorizontal size={14} /> Indikator</button>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"><label className="text-[10px] font-bold text-slate-500 uppercase">KKM:</label><input type="number" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className="w-12 bg-white border border-slate-300 rounded text-center text-xs font-bold outline-none" /></div>
                    <button type="button" onClick={handleDownloadExcel} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"><ArrowDownToLine size={14} /> CSV</button>
                  </div>
                </div>
                <div className="w-full bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden">
                  <form onSubmit={handleSimpanRekap} className="w-full flex flex-col min-w-0">
                    <div className="w-full overflow-x-auto"><table className="w-full text-left border-collapse min-w-[700px]"><thead><tr className="bg-slate-100 text-[10px] uppercase font-bold border-b border-slate-300"><th className="px-3 py-3 text-center border-r w-10">No</th><th className="px-4 py-3 border-r min-w-[150px]">Nama Siswa</th>{indikatorNilai.map(ind => (<th key={ind.id} className="px-2 py-3 text-center border-r">{ind.nama} <span className="block text-[8px] font-normal">({ind.bobot > 0 ? `${ind.bobot}%` : 'Opsional'})</span></th>))}<th className="px-4 py-3 text-center bg-slate-200 border-l">Nilai Akhir</th></tr></thead><tbody className="divide-y divide-slate-200">{siswaKelasAsli.map((siswa, idx) => { const dataN = nilai[siswa.id] || {}; const nilaiAkhir = hitungNilaiAkhir(dataN); const tuntas = nilaiAkhir >= kkm; return (<tr key={siswa.id} className="hover:bg-blue-50/20"><td className="px-3 py-2 text-center text-xs font-bold text-slate-500 border-r">{idx + 1}</td><td className="px-4 py-2 border-r"><p className="text-xs font-bold text-slate-800 truncate">{siswa.nama}</p></td>{indikatorNilai.map(ind => (<td key={ind.id} className="px-2 py-2 border-r"><input type="number" value={dataN[ind.id] || ""} onChange={(e) => handleUbahNilai(siswa.id, ind.id, e.target.value)} className="w-14 mx-auto block p-1.5 border rounded-md text-center text-xs font-bold outline-none" /></td>))}<td className="px-4 py-2 text-center border-l"><span className={`text-base font-black ${nilaiAkhir > 0 ? (tuntas ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{nilaiAkhir}</span></td></tr>) })}</tbody></table></div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end"><button type="submit" disabled={isSubmittingRekap} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2">{isSubmittingRekap ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan</button></div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB: E-UJIAN (CBT) */}
            {activeTab === "cbt" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                  <h3 className="font-bold text-slate-800 text-lg">Bank Soal & Penugasan CBT</h3>
                  <button type="button" onClick={() => setIsCbtModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"><Plus size={16}/> Pengaturan Ujian Baru</button>
                </div>
                {daftarUjian.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {daftarUjian.map((ujian) => (
                      <div key={ujian.id} className="p-5 rounded-lg border border-slate-200 bg-slate-50 relative group flex flex-col justify-between">
                        <div>
                          <button type="button" onClick={() => hapusUjian(ujian.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                          <h4 className="font-bold text-slate-800 text-lg pr-8">{ujian.pengaturan.judul}</h4>
                          <p className="text-xs font-bold text-blue-600 mt-1 mb-3">{ujian.pengaturan.jenisUjian}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
                            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200"><Target size={12}/> {ujian.soal?.length || 0} Soal</span>
                            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-200"><Clock size={12}/> {ujian.pengaturan.waktuMenit} Mnt</span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => handlePrintSoal(ujian)} className="flex justify-center items-center gap-1 text-[10px] font-bold bg-white border border-slate-200 py-1.5 rounded-md text-slate-600 hover:bg-slate-100"><Printer size={12}/> Print Soal</button>
                            <button type="button" onClick={() => handlePrintLJK(ujian)} className="flex justify-center items-center gap-1 text-[10px] font-bold bg-white border border-slate-200 py-1.5 rounded-md text-slate-600 hover:bg-slate-100"><FileCheck size={12}/> Unduh LJK</button>
                          </div>
                          <p className="text-[9px] text-amber-600 text-center font-bold">*Mencetak LJK kertas akan menghilangkan pelacakan analitik kemandirian [x-AI].</p>
                          <button type="button" onClick={() => { setSelectedUjianView(ujian); setIsHasilUjianOpen(true); }} className="w-full mt-1 flex justify-center items-center gap-1 text-[10px] font-bold bg-blue-100 border border-blue-200 py-1.5 rounded-md text-blue-700 hover:bg-blue-200"><Eye size={12}/> Lihat Hasil & Feedback AI</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 border border-dashed border-slate-300 rounded-lg text-center bg-slate-50"><p className="font-bold text-slate-700">Belum Ada Ujian di Kelas Ini</p></div>
                )}
              </motion.div>
            )}

            {/* TAB: KOREKSI AI */}
            {activeTab === "koreksi" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg"><BrainCircuit size={22} className="text-blue-600"/> Pengaturan Koreksi AI</h3>
                  <p className="text-sm text-slate-500 mb-5 leading-relaxed">Sistem AI akan memindai Lembar Jawaban (LJK) & mengoreksi jawaban secara otomatis berdasarkan rubrik.</p>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Pilih Rubrik Kunci Jawaban</label>
                  <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none mb-5 focus:border-blue-500">
                    <option>Pilih Rubrik Asesmen...</option>
                    {daftarUjian.map(u => <option key={u.id}>Kunci Jawaban: {u.pengaturan.judul}</option>)}
                  </select>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 text-lg">Unggah LJK / Jawaban Siswa</h3>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleUploadLJK} />
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/80 transition-colors h-[200px]">
                    <UploadCloud size={48} className="text-blue-400 mb-4" />
                    <p className="font-bold text-slate-700 text-sm mb-1">Klik untuk mengunggah Berkas LJK</p>
                    <p className="text-xs text-slate-500">Format: PNG, JPG, PDF</p>
                  </div>
                  
                  {/* HASIL KOREKSI MANUAL (OVERRIDE) */}
                  <AnimatePresence>
                    {hasilKoreksiAI && (
                      <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="mt-4 p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                        <h4 className="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-2"><CheckCircle2 size={16}/> Koreksi AI Selesai</h4>
                        <p className="text-xs text-slate-700 mb-1">Siswa: <strong>{hasilKoreksiAI.namaSiswa}</strong></p>
                        <p className="text-xs text-slate-700 mb-3">Nilai Asli AI: <strong className="text-rose-600">{hasilKoreksiAI.nilaiAwal}</strong></p>
                        <div className="p-3 bg-white border border-slate-200 rounded text-[10px] text-slate-500 italic mb-4">
                           Catatan AI: {hasilKoreksiAI.diagnosa}
                        </div>
                        
                        <div className="pt-3 border-t border-emerald-100 flex flex-col gap-2">
                           <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Info size={14} className="text-blue-500"/> Otoritas Guru (Override)</label>
                           <p className="text-[10px] text-slate-500 leading-relaxed mb-1">AI mungkin menganggap variasi dialek lokal sebagai kesalahan. Silakan koreksi manual jika jawaban siswa sah secara budaya.</p>
                           <div className="flex gap-2">
                             <input type="number" value={overrideScore || 0} onChange={e=>setOverrideScore(Number(e.target.value))} className="w-20 p-2 text-center rounded border border-slate-300 text-sm font-bold outline-none focus:border-blue-500"/>
                             <button onClick={simpanOverrideNilai} className="flex-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">Simpan Override Nilai</button>
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

      {/* ========================================================
          TAMPILAN 3: SAAT BUAT UJIAN BARU (EDITOR SOAL KOMPLEKS)
      ======================================================== */}
      {selectedClass && isEditorOpen && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 md:p-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 pb-6 border-b border-slate-100 gap-4">
            <div>
              <h2 className={`text-xl font-bold text-slate-900 ${teachersFont.className}`}>{cbtForm.judul}</h2>
              <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mt-2">{cbtForm.jenisUjian === 'Custom' ? cbtForm.jenisUjianCustom : cbtForm.jenisUjian}</p>
            </div>
            <button type="button" onClick={simpanUjianKeDatabase} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all w-full md:w-auto justify-center">
              <Save size={16} /> Simpan Seluruh Ujian
            </button>
          </div>
          <div className="space-y-8">
            {daftarSoal.map((soal, index) => (
              <div key={soal.id} className="p-6 border border-slate-200 rounded-lg relative bg-white shadow-sm">
                <button type="button" onClick={() => hapusSoal(soal.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 bg-slate-50 p-2 rounded-md border border-slate-200"><Trash2 size={16} /></button>
                <div className="flex flex-col gap-3 mb-4">
                  
                  {/* Tipe Soal Select */}
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                    <span className="font-black text-lg text-slate-800 bg-slate-100 w-8 h-8 flex items-center justify-center rounded-md">{index + 1}</span>
                    <select value={soal.tipe} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].tipe = e.target.value; setDaftarSoal(newSoal); }} className="text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-md px-3 py-1.5 outline-none">
                      <option value="PG">Pilihan Ganda</option>
                      <option value="Benar/Salah">Benar / Salah</option>
                      <option value="Jodohkan">Menjodohkan</option>
                      <option value="Isian Singkat">Isian Singkat</option>
                      <option value="Uraian">Uraian</option>
                    </select>
                  </div>

                  {/* WYSIWYG Editor Mockup */}
                  <div className="border border-slate-300 rounded-md bg-white overflow-hidden">
                    <div className="flex gap-2 p-2 border-b border-slate-200 bg-slate-50">
                      <button type="button" className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"><Bold size={14}/></button>
                      <button type="button" className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"><Italic size={14}/></button>
                      <button type="button" className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"><Underline size={14}/></button>
                      <div className="w-px h-4 bg-slate-300 my-auto mx-1"></div>
                      <button type="button" className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"><AlignLeft size={14}/></button>
                      <button type="button" className="p-1.5 text-slate-600 hover:bg-slate-200 rounded"><ListOrdered size={14}/></button>
                    </div>
                    <textarea className="w-full p-4 text-sm outline-none resize-none font-medium min-h-[100px]" value={soal.pertanyaan} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].pertanyaan = e.target.value; setDaftarSoal(newSoal); }} placeholder="Ketik deskripsi pertanyaan di sini..." />
                    
                    {/* Render Opsi Sesuai Tipe di dalam Kotak Editor */}
                    <div className="p-4 bg-white">
                      {soal.tipe === "PG" && (
                        <div className="flex flex-col gap-2">
                          {soal.opsi?.map((opt: any, oIdx: number) => (
                            <div key={opt.id} className="flex items-center gap-3">
                              <span className="font-bold text-sm w-6">{opt.id}.</span>
                              <input type="text" value={opt.teks} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].opsi[oIdx].teks = e.target.value; setDaftarSoal(newSoal); }} placeholder={`Teks Pilihan ${opt.id}`} className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
                            </div>
                          ))}
                        </div>
                      )}

                      {soal.tipe === "Benar/Salah" && (
                        <div className="flex flex-col gap-2 text-sm font-bold text-slate-600">
                          <label className="flex items-center gap-2"><input type="radio" disabled className="w-4 h-4" /> Benar</label>
                          <label className="flex items-center gap-2"><input type="radio" disabled className="w-4 h-4" /> Salah</label>
                        </div>
                      )}

                      {soal.tipe === "Jodohkan" && (
                        <div className="w-full">
                          <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 uppercase mb-2">
                            <div>Pernyataan (Kiri)</div><div>Pasangan (Kanan)</div>
                          </div>
                          {(soal.pasangan || []).map((pas: any, pIdx: number) => (
                            <div key={pIdx} className="grid grid-cols-2 gap-4 mb-2">
                              <input type="text" value={pas.kiri} onChange={(e) => { const n = [...daftarSoal]; n[index].pasangan[pIdx].kiri = e.target.value; setDaftarSoal(n); }} placeholder="Teks Kiri..." className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm outline-none" />
                              <input type="text" value={pas.kanan} onChange={(e) => { const n = [...daftarSoal]; n[index].pasangan[pIdx].kanan = e.target.value; setDaftarSoal(n); }} placeholder="Teks Kanan..." className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm outline-none" />
                            </div>
                          ))}
                          <button type="button" onClick={() => { const n = [...daftarSoal]; n[index].pasangan.push({kiri:"", kanan:""}); setDaftarSoal(n); }} className="text-xs text-blue-600 font-bold mt-2">+ Tambah Baris</button>
                        </div>
                      )}

                      {(soal.tipe === "Isian Singkat" || soal.tipe === "Uraian") && (
                        <div className="w-full p-4 border border-dashed border-slate-300 bg-slate-50 text-slate-400 text-sm text-center rounded-md">
                          (Area Jawaban Teks Siswa)
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Kunci Jawaban (Blue Box) */}
                  <div className="mt-4 bg-blue-50/40 p-4 rounded-md border border-blue-200">
                    <div className="flex justify-between items-center mb-3">
                      <label className="flex items-center gap-2 text-[11px] font-bold text-blue-800 uppercase"><Key size={14}/> Kunci Jawaban & Panduan Koreksi AI</label>
                      <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">(Hanya Dilihat Guru & Lembaga)</span>
                    </div>
                    
                    {(soal.tipe === "PG" || soal.tipe === "Benar/Salah") && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700">Kunci Jawaban Tepat:</span>
                        <select value={soal.kunci} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].kunci = e.target.value; setDaftarSoal(newSoal); }} className="bg-white border border-blue-300 rounded-md px-3 py-1.5 text-sm font-bold outline-none text-blue-700">
                          {soal.tipe === "PG" ? soal.opsi?.map((opt:any) => <option key={opt.id} value={opt.id}>Opsi {opt.id}</option>) : <><option value="Benar">Benar</option><option value="Salah">Salah</option></>}
                        </select>
                      </div>
                    )}

                    {(soal.tipe === "Isian Singkat" || soal.tipe === "Uraian" || soal.tipe === "Jodohkan") && (
                      <textarea className="w-full p-3 bg-white border border-blue-200 rounded-md text-sm outline-none focus:border-blue-500 resize-none min-h-[60px]" value={soal.panduanAI} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].panduanAI = e.target.value; setDaftarSoal(newSoal); }} placeholder="Tuliskan kata kunci wajib (rubrik) agar AI dapat mengoreksi otomatis..." />
                    )}
                  </div>

                  {/* Analisis Butir Soal AI */}
                  <div className="flex flex-wrap gap-4 md:gap-8 mt-2 pt-3 border-t border-slate-100">
                     <div className="flex flex-col"><span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Tingkat Kesukaran</span><span className={`text-xs font-bold ${soal.analisis?.kesukaran === 'Sukar' ? 'text-rose-600' : 'text-slate-700'}`}>{soal.analisis?.kesukaran || 'Sedang'}</span></div>
                     <div className="flex flex-col"><span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Daya Pembeda</span><span className="text-xs font-bold text-slate-700">{soal.analisis?.dayaPembeda || 'Baik'}</span></div>
                     <div className="flex flex-col"><span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Rekomendasi AI</span><span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12}/> {soal.analisis?.status || 'Layak Digunakan'}</span></div>
                  </div>

                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-200">
              <button type="button" onClick={() => tambahSoalManual("PG")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Pilihan Ganda</button>
              <button type="button" onClick={() => tambahSoalManual("Benar/Salah")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Benar / Salah</button>
              <button type="button" onClick={() => tambahSoalManual("Jodohkan")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Menjodohkan</button>
              <button type="button" onClick={() => tambahSoalManual("Isian Singkat")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Isian Singkat</button>
              <button type="button" onClick={() => tambahSoalManual("Uraian")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Uraian Lengkap</button>
            </div>
          </div>
        </motion.div>
      )}


      {/* ========================================================
          MODALS UTAMA (PENGATURAN & HASIL)
      ======================================================== */}

      {/* Modal Pengaturan Ujian Baru (CBT) */}
      <AnimatePresence>
        {isCbtModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Target size={20} className="text-blue-600"/> Pengaturan Ujian Baru</h3>
                <button type="button" onClick={() => setIsCbtModalOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar bg-slate-50">
                
                <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">1. Sumber Soal & Identitas</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Judul Ujian / Penugasan <span className="text-rose-500">*</span></label>
                      <input type="text" value={cbtForm.judul} onChange={(e) => setCbtForm({...cbtForm, judul: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm font-bold focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Ujian (Kategori Nilai)</label>
                      <select value={cbtForm.jenisUjian} onChange={(e) => setCbtForm({...cbtForm, jenisUjian: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm font-bold text-slate-700 focus:border-blue-500 outline-none">
                        <option value="Ulangan Harian">Ulangan Harian</option><option value="Asesmen Formatif">Asesmen Formatif</option><option value="Sumatif Lingkup Materi">Sumatif Lingkup Materi</option><option value="Sumatif Tengah Semester (STS)">Sumatif Tengah Semester (STS)</option><option value="Sumatif Akhir Semester (SAS)">Sumatif Akhir Semester (SAS)</option><option value="Ujian Sekolah (US)">Ujian Sekolah (US)</option><option value="Try Out">Try Out</option><option value="Custom">Lainnya (Tulis Sendiri)...</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      {cbtForm.jenisUjian === "Custom" && (
                        <>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Jenis Ujian Custom <span className="text-rose-500">*</span></label>
                          <input type="text" value={cbtForm.jenisUjianCustom} onChange={(e) => setCbtForm({...cbtForm, jenisUjianCustom: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-blue-400 rounded-md text-sm font-bold focus:border-blue-600 outline-none" placeholder="Ketik jenis ujian..." />
                        </>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Metode Import Soal</label>
                      <select value={cbtForm.sumberSoal} onChange={(e) => setCbtForm({...cbtForm, sumberSoal: e.target.value, koleksiId: ""})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm font-bold text-blue-700 focus:border-blue-500 outline-none">
                        <option value="Buat Manual (Ketik Sendiri)">Buat Manual (Ketik Sendiri)</option>
                        <option value="Tarik dari Bank Soal AI (Generator)">Tarik dari Bank Soal AI (Generator)</option>
                        <option value="Upload dari Kisi-kisi / LKPD (Word/PDF)">Upload dari Kisi-kisi / LKPD (Word/PDF)</option>
                      </select>
                    </div>

                    {(cbtForm.sumberSoal === 'Tarik dari Bank Soal AI (Generator)' || cbtForm.sumberSoal === 'Upload dari Kisi-kisi / LKPD (Word/PDF)') && (
                      <div className="md:col-span-2 mt-2 p-4 bg-blue-50/70 border border-blue-100 rounded-lg">
                        <label className="block text-xs font-bold text-blue-800 mb-1.5">Pilih Koleksi Hasil Generate AI <span className="text-rose-500">*</span></label>
                        <select value={cbtForm.koleksiId || ''} onChange={(e) => setCbtForm({...cbtForm, koleksiId: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-md text-sm font-medium text-slate-700 focus:border-blue-500 outline-none">
                          <option value="" disabled>-- Pilih Koleksi AI yang Tersedia --</option>
                          {koleksiAI.map(kol => (<option key={kol.id} value={kol.id}>{kol.tipe} - {kol.mapel} ({kol.materi || kol.topik || `ID: ${kol.id}`})</option>))}
                        </select>
                        <p className="text-[11px] text-blue-600 mt-2 flex items-center gap-1 font-medium">
                          <Target size={12} /> Data soal dan kunci jawaban akan dipetakan secara otomatis.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">2. Waktu & Pelaksanaan</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Durasi (Menit) <span className="text-rose-500">*</span></label>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-slate-400"/>
                        <input type="number" value={cbtForm.waktuMenit} onChange={(e) => setCbtForm({...cbtForm, waktuMenit: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm font-bold focus:border-blue-500 outline-none" />
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Waktu Buka <span className="text-rose-500">*</span></label>
                      <input type="datetime-local" value={cbtForm.waktuMulai} onChange={(e) => setCbtForm({...cbtForm, waktuMulai: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium outline-none" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Waktu Tutup <span className="text-rose-500">*</span></label>
                      <input type="datetime-local" value={cbtForm.waktuSelesai} onChange={(e) => setCbtForm({...cbtForm, waktuSelesai: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium outline-none" />
                    </div>
                  </div>
                </div>

              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-white shrink-0">
                <button type="button" onClick={prosesLanjutPembuatan} className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-md flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm transition-colors">Lanjutkan <ChevronRight size={16} /></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Lihat Hasil Ujian CBT */}
      <AnimatePresence>
        {isHasilUjianOpen && selectedUjianView && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><Target size={20} className="text-indigo-600" /> Analisis Hasil & Asesmen Siswa</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedUjianView.pengaturan.judul}</p>
                </div>
                <button type="button" onClick={() => setIsHasilUjianOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200"><X size={20}/></button>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto bg-slate-50">
                
                <div className="mb-4 bg-indigo-50/80 border border-indigo-200 p-4 rounded-lg flex gap-3 items-start">
                  <Activity size={24} className="text-indigo-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm">Dashboard Asesmen AI</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed mt-1">Sistem menganalisis kemampuan kognitif tiap siswa berdasarkan pola jawaban mereka. Klik "Feedback AI" untuk melihat rekomendasi intervensi personal dari sistem kepada guru.</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-300 shadow-sm rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[700px] text-sm">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700 text-xs">
                        <th className="p-3 border-r border-slate-300 w-10 text-center">No</th>
                        <th className="p-3 border-r border-slate-300">Nama Siswa</th>
                        <th className="p-3 border-r border-slate-300 text-center">Nilai Ujian</th>
                        <th className="p-3 border-r border-slate-300 text-center">Jawaban Benar</th>
                        <th className="p-3 border-r border-slate-300 text-center">Jawaban Salah</th>
                        <th className="p-3 text-center w-32">Aksi Asesmen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaKelasAsli.length > 0 ? (
                        siswaKelasAsli.map((siswa, idx) => {
                          const hasilSiswa = hasilUjianData.find(h => h.siswaId === siswa.id || h.uid === siswa.id);
                          const isExpanded = expandedFeedbackId === siswa.id;
                          
                          return (
                            <React.Fragment key={siswa.id}>
                              <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                <td className="p-3 border-r border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                                <td className="p-3 border-r border-slate-300 font-bold text-slate-800">{siswa.nama}</td>
                                <td className={`p-3 border-r border-slate-300 text-center font-black text-lg ${hasilSiswa?.nilai >= kkm ? 'text-emerald-600' : 'text-rose-600'}`}>{hasilSiswa?.nilai || "-"}</td>
                                <td className="p-3 border-r border-slate-300 text-center font-bold text-slate-700">{hasilSiswa?.benar || "-"}</td>
                                <td className="p-3 border-r border-slate-300 text-center font-bold text-slate-700">{hasilSiswa?.salah || "-"}</td>
                                <td className="p-3 text-center">
                                  {hasilSiswa && (
                                    <button onClick={() => setExpandedFeedbackId(isExpanded ? null : siswa.id)} className={`text-[10px] px-3 py-1.5 rounded font-bold transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'} flex items-center gap-1.5 mx-auto`}>
                                      <MessageSquareText size={12}/> Feedback AI
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {isExpanded && hasilSiswa && (
                                <tr className="bg-indigo-50/30">
                                  <td colSpan={6} className="p-5 border-b border-indigo-100">
                                    <div className="bg-white border border-indigo-100 p-4 rounded-lg shadow-sm relative">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-lg"></div>
                                      <h5 className="font-bold text-indigo-900 text-xs mb-2 uppercase tracking-wider">Hasil Asesmen Personal</h5>
                                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{hasilSiswa.feedback || hasilSiswa.feedbackGuru || "Belum ada umpan balik AI."}</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })
                      ) : (
                        <tr><td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-400">Belum ada siswa di kelas ini.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL PENGATURAN KECIL (KELAS & INDIKATOR)
      ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800">Buat Kelas Baru</h3></div>
            <form onSubmit={handleBuatKelas} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Nama Kelas</label><input type="text" required value={newClass.nama} onChange={(e) => setNewClass({...newClass, nama: e.target.value})} className="w-full p-2.5 border rounded-md outline-none focus:border-blue-500" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Mata Pelajaran</label><input type="text" required value={newClass.mapel} onChange={(e) => setNewClass({...newClass, mapel: e.target.value})} className="w-full p-2.5 border rounded-md outline-none focus:border-blue-500" /></div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 rounded-md">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-md">Simpan</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {isPengaturanNilaiOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><SlidersHorizontal size={18} className="text-amber-600"/> Pengaturan Indikator & Bobot</h3>
                <button onClick={() => setIsPengaturanNilaiOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><X size={18}/></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
                  Total bobot indikator yang masuk perhitungan Nilai Akhir Kognitif sebaiknya 100%. Ubah bobot menjadi 0 jika indikator tidak dimasukkan ke dalam perhitungan akhir (misal: Praktik).
                </div>
                <div className="space-y-3">
                  {indikatorNilai.map((ind, idx) => (
                    <div key={ind.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Nama Indikator</label>
                        <input type="text" value={ind.nama} onChange={(e) => { const newInd = [...indikatorNilai]; newInd[idx].nama = e.target.value; setIndikatorNilai(newInd); }} className="w-full text-sm font-bold text-slate-800 outline-none border-b border-slate-200 focus:border-blue-500 pb-1 mt-1" />
                      </div>
                      <div className="w-20">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase text-center">Bobot (%)</label>
                        <input type="number" value={ind.bobot} onChange={(e) => { const newInd = [...indikatorNilai]; newInd[idx].bobot = Number(e.target.value); setIndikatorNilai(newInd); }} className="w-full text-center text-sm font-bold text-slate-800 outline-none border-b border-slate-200 focus:border-blue-500 pb-1 mt-1" />
                      </div>
                      <button type="button" onClick={() => handleHapusIndikator(ind.id)} className="mt-4 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleTambahIndikator} className="w-full mt-6 border-2 border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all">
                  <Plus size={16}/> Tambah Indikator
                </button>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50 shrink-0">
                <button onClick={() => setIsPengaturanNilaiOpen(false)} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 shadow-sm transition-colors">Selesai</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}