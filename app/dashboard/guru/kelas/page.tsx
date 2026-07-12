"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, BookOpen, Plus, ChevronRight, GraduationCap, Loader2, Key, 
  ArrowLeft, UploadCloud, BrainCircuit, CheckCircle2, FileText, X, Clock, 
  CalendarDays, Save, Trash2, Target, Settings2, Database, Edit3, FileSpreadsheet, 
  ArrowDownToLine, Calculator, AlertCircle, ClipboardCheck, List, Eye, Printer, 
  SlidersHorizontal, Percent, FileCheck, Bold, Italic, Underline, AlignLeft, ListOrdered
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef, FormEvent } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, where, getDoc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface NilaiSiswa { harian: number; pts: number; pas: number; praktik: number; }

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

  // === STATE ADMINISTRASI (ABSENSI & JURNAL) ===
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [absensi, setAbsensi] = useState<Record<string, string>>({});
  const [isSubmittingAbsen, setIsSubmittingAbsen] = useState(false);
  const [statusPesanAbsen, setStatusPesanAbsen] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);
  
  const [isRiwayatAbsenOpen, setIsRiwayatAbsenOpen] = useState(false);
  const [absenViewMode, setAbsenViewMode] = useState<"bulan" | "semester">("bulan");
  const [riwayatAbsenData, setRiwayatAbsenData] = useState<any[]>([]); 
  
  // Filter Riwayat Absen
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

  const [cbtForm, setCbtForm] = useState({
    judul: "", jenisUjian: "Asesmen Formatif", sumberSoal: "Buat Manual", bahanBacaan: "", opsiPG: "A - D (4 Opsi)",
    waktuMenit: 60, waktuMulai: "", waktuSelesai: ""
  });

  // === STATE REKAP NILAI ===
  const [kkm, setKkm] = useState(75); 
  const [nilai, setNilai] = useState<Record<string, Record<string, number>>>({});
  const [isPengaturanNilaiOpen, setIsPengaturanNilaiOpen] = useState(false);
  const [indikatorNilai, setIndikatorNilai] = useState([
    { id: "harian", nama: "N. Harian", bobot: 40 },
    { id: "pts", nama: "N. PTS", bobot: 30 },
    { id: "pas", nama: "N. PAS", bobot: 30 },
    { id: "praktik", nama: "Praktik", bobot: 0 } 
  ]);
  const [isSubmittingRekap, setIsSubmittingRekap] = useState(false);
  const [statusPesanRekap, setStatusPesanRekap] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // === 1. TARIK DATA AWAL ===
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
           if(docSnap.exists()){ setGuruNpsn(docSnap.data().npsn || docSnap.data().instansi || ""); }
        });
        const qKelas = query(collection(db, "manajemen_kelas"), where("guruId", "==", user.uid));
        onSnapshot(qKelas, (snapshot) => {
          setKelasData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (guruNpsn) {
      const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", guruNpsn));
      onSnapshot(qSiswa, (snap) => setDaftarSiswaGlobal(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
  }, [guruNpsn]);

  useEffect(() => {
    if (selectedClass) {
      const qUjian = query(collection(db, "bank_soal"), where("kelasId", "==", selectedClass.id));
      onSnapshot(qUjian, (snapshot) => setDaftarUjian(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }
  }, [selectedClass]);

  // === 2. FETCH REKAP NILAI ===
  useEffect(() => {
    const fetchRekapNilai = async () => {
      if (!selectedClass) return;
      try {
        const rekapRef = doc(db, "rekap_nilai", selectedClass.id);
        const rekapSnap = await getDoc(rekapRef);
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
      } catch (error) { console.error("Gagal menarik data nilai:", error); }
    };
    fetchRekapNilai();
  }, [selectedClass, daftarSiswaGlobal]);

  // === 3. FETCH ABSENSI & JURNAL ===
  useEffect(() => {
    const fetchAbsensi = async () => {
      if (!selectedClass || !tanggal) return;
      try {
        let currentAbsen: Record<string, string> = {};
        const siswaKelas = daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama);
        siswaKelas.forEach(s => currentAbsen[s.id] = "Hadir");

        const absenId = `${selectedClass.id}_${tanggal}`;
        const absenRef = doc(db, "absensi_siswa", absenId);
        const absenSnap = await getDoc(absenRef);
        if (absenSnap.exists() && absenSnap.data().dataKehadiran) {
           currentAbsen = { ...currentAbsen, ...absenSnap.data().dataKehadiran }; 
        }
        setAbsensi(currentAbsen);
      } catch (error) { console.error("Gagal menarik data absensi:", error); }
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
    const kodeUnik = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await addDoc(collection(db, "manajemen_kelas"), { nama: newClass.nama, mapel: newClass.mapel, kode: kodeUnik, siswa: 0, peserta: [], status: "Aktif", guruId: userUid, timestamp: serverTimestamp() });
      setIsModalOpen(false); setNewClass({ nama: "", mapel: "" });
    } catch (error) { alert("Gagal membuat kelas."); } finally { setIsSubmitting(false); }
  };

  const handleSimpanAbsensi = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid || !selectedClass) return;
    setIsSubmittingAbsen(true); setStatusPesanAbsen(null);
    try {
      const absenId = `${selectedClass.id}_${tanggal}`;
      await setDoc(doc(db, "absensi_siswa", absenId), {
        guruId: userUid, kelasId: selectedClass.id, tanggal: tanggal, dataKehadiran: absensi, timestamp: serverTimestamp()
      }, { merge: true });
      setStatusPesanAbsen({ tipe: "sukses", teks: "Data absensi harian berhasil diperbarui." });
      setTimeout(() => setStatusPesanAbsen(null), 3000);
    } catch (error: any) { setStatusPesanAbsen({ tipe: "error", teks: "Gagal menyimpan absensi." }); } 
    finally { setIsSubmittingAbsen(false); }
  };

  const handleSimpanJurnal = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid || !selectedClass) return;
    setIsSubmittingJurnal(true); setStatusPesanJurnal(null);
    try {
      await addDoc(collection(db, "jurnal_kbm"), {
        guruId: userUid, kelasId: selectedClass.id, mapel: selectedClass.mapel || "Umum", tanggal: tanggal, ...jurnal, timestamp: serverTimestamp()
      });
      setJurnal({ materi: "", kegiatan: "", hambatan: "", solusi: "" });
      setStatusPesanJurnal({ tipe: "sukses", teks: "Jurnal KBM berhasil dikirim." });
      setTimeout(() => setStatusPesanJurnal(null), 3000);
    } catch (error: any) { setStatusPesanJurnal({ tipe: "error", teks: "Gagal menyimpan jurnal." }); } 
    finally { setIsSubmittingJurnal(false); }
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
    if (!userUid || !selectedClass) return;
    setIsSubmittingRekap(true); setStatusPesanRekap(null);
    try {
      await setDoc(doc(db, "rekap_nilai", selectedClass.id), {
        guruId: userUid, kelasId: selectedClass.id, kkm: kkm, indikator: indikatorNilai, dataNilai: nilai, terakhirDiperbarui: serverTimestamp()
      }, { merge: true });
      setStatusPesanRekap({ tipe: "sukses", teks: "Rekap Nilai berhasil disimpan." });
      setTimeout(() => setStatusPesanRekap(null), 3000);
    } catch (error: any) { setStatusPesanRekap({ tipe: "error", teks: "Gagal menyimpan nilai." }); } 
    finally { setIsSubmittingRekap(false); }
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
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(blob)); link.setAttribute("download", `Rekap_Nilai_${selectedClass.nama}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleDownloadCSVSiswa = () => {
    const siswaKelasAsli = selectedClass ? daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama) : [];
    if (siswaKelasAsli.length === 0) return alert("Tidak ada data siswa untuk diunduh.");
    const headers = ["No", "Nama Lengkap", "NISN", "Email", "Status"];
    const csvRows = [headers.join(","), ...siswaKelasAsli.map((s, i) => [i + 1, `"${s.nama}"`, `="${s.nisn}"`, `"${s.email}"`, "Aktif"].join(","))];
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(blob)); link.setAttribute("download", `Data_Siswa_${selectedClass.nama}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleTambahIndikator = () => setIndikatorNilai([...indikatorNilai, { id: `ind_${Date.now()}`, nama: "Indikator Baru", bobot: 0 }]);
  const handleHapusIndikator = (id: string) => setIndikatorNilai(indikatorNilai.filter(i => i.id !== id));

  const hapusUjian = async (id: string) => { 
    if(confirm("Yakin ingin menghapus ujian ini?")) await deleteDoc(doc(db, "bank_soal", id)); 
  };

  const handleUploadLJK = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    alert(`Memproses LJK: ${file.name} dengan AI Vision... (Simulasi)`);
    setTimeout(() => { alert("Koreksi AI Selesai! Nilai telah diintegrasikan ke tab Rekap Nilai."); }, 2500);
  };

  const getInitialOpsi = () => {
    const num = cbtForm.opsiPG.includes("3") ? 3 : cbtForm.opsiPG.includes("5") ? 5 : 4;
    return Array.from({length: num}).map((_, i) => ({ id: ["A", "B", "C", "D", "E"][i], teks: "" }));
  };

  const tambahSoalManual = (tipe: string) => {
    const soalBaru = { id: Date.now().toString(), tipe: tipe, pertanyaan: "", opsi: (tipe === "PG" || tipe === "Benar/Salah") ? getInitialOpsi() : [], kunci: "A", panduanAI: "" };
    if (tipe === "Benar/Salah") soalBaru.opsi = [{ id: "A", teks: "Benar" }, { id: "B", teks: "Salah" }];
    setDaftarSoal([...daftarSoal, soalBaru]);
  };
  const hapusSoal = (id: string) => setDaftarSoal(daftarSoal.filter(s => s.id !== id));

  const prosesLanjutPembuatan = () => {
    if(!cbtForm.judul || !cbtForm.waktuMulai || !cbtForm.waktuSelesai) { alert("Mohon isi Judul Ujian dan Jadwal Pelaksanaan."); return; }
    setDaftarSoal([{ id: Date.now().toString(), tipe: "PG", pertanyaan: "", opsi: getInitialOpsi(), kunci: "A", panduanAI: "" }]);
    setIsCbtModalOpen(false); setIsEditorOpen(true);
  };

  const simpanUjianKeDatabase = async () => {
    try {
      await addDoc(collection(db, "bank_soal"), { kelasId: selectedClass.id, pengaturan: cbtForm, soal: daftarSoal, guruId: userUid, timestamp: serverTimestamp() });
      alert("Ujian berhasil disimpan!"); setIsEditorOpen(false); setActiveTab("cbt");
    } catch (error) { alert("Gagal menyimpan soal."); }
  };

  // --- GENERATOR PDF / PRINT ---
  const handlePrintLJK = (ujian: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Izinkan pop-up browser untuk mencetak LJK.");

    const jmlSoal = ujian.soal?.length || 50;
    const renderBulatan = (nomor: number) => `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-family: monospace; font-size: 11px;">
        <span style="width: 20px; text-align: right; padding-right: 5px;">${nomor}.</span>
        <div style="display: flex; gap: 5px;">
          <span style="border: 1px solid black; border-radius: 50%; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px;">A</span>
          <span style="border: 1px solid black; border-radius: 50%; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px;">B</span>
          <span style="border: 1px solid black; border-radius: 50%; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px;">C</span>
          <span style="border: 1px solid black; border-radius: 50%; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px;">D</span>
          <span style="border: 1px solid black; border-radius: 50%; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px;">E</span>
        </div>
      </div>
    `;

    let soalHtml = '';
    for(let i=0; i<Math.ceil(jmlSoal/10); i++){
      soalHtml += `<div style="flex: 1; padding: 0 10px;">`;
      for(let j=1; j<=10; j++) {
        let num = (i*10)+j;
        if(num <= jmlSoal) soalHtml += renderBulatan(num);
      }
      soalHtml += `</div>`;
    }

    const html = `
      <html><head><title>LJK - ${ujian.pengaturan.judul}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: black; max-width: 800px; margin: auto; }
          .header { text-align: center; border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
          .header h3 { margin: 5px 0 0 0; font-size: 14px; font-weight: normal; }
          .box-outline { border: 2px solid black; padding: 15px; margin-bottom: 20px; }
          .info-grid { display: flex; gap: 20px; margin-bottom: 20px; }
          .info-col { flex: 1; border: 1px solid black; padding: 10px; }
          .judul-info { font-size: 12px; font-weight: bold; border-bottom: 1px dashed black; padding-bottom: 5px; margin-bottom: 10px; }
          .isian-titik { border-bottom: 1px dotted black; width: 100%; height: 20px; margin-bottom: 10px; }
        </style>
      </head><body>
        <div class="header"><h2>LEMBAR JAWABAN KOMPUTER (LJK)</h2><h3>SIMULASI UJIAN BERBASIS KERTAS DAN SCAN AI</h3></div>
        <div class="info-grid">
          <div class="info-col" style="flex: 2;"><div class="judul-info">IDENTITAS PESERTA</div><div style="display: flex; margin-bottom: 10px;"><span style="width: 100px; font-size: 12px;">Nama Lengkap</span><div class="isian-titik"></div></div><div style="display: flex; margin-bottom: 10px;"><span style="width: 100px; font-size: 12px;">Nomor Ujian</span><div class="isian-titik"></div></div><div style="display: flex; margin-bottom: 10px;"><span style="width: 100px; font-size: 12px;">Kelas</span><div class="isian-titik"></div></div></div>
          <div class="info-col"><div class="judul-info">DATA UJIAN</div><div style="font-size: 11px; margin-bottom: 5px;">Mata Pelajaran: <b>${selectedClass?.mapel || '-'}</b></div><div style="font-size: 11px; margin-bottom: 5px;">Judul: <b>${ujian.pengaturan.judul}</b></div><div style="font-size: 11px; margin-bottom: 5px;">Waktu: <b>${ujian.pengaturan.waktuMenit} Menit</b></div><div style="font-size: 11px;">Tanggal: ......................</div></div>
        </div>
        <div class="box-outline"><div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 15px; border-bottom: 1px solid black; padding-bottom: 5px;">JAWABAN (Hitamkan salah satu pilihan yang benar)</div><div style="display: flex; justify-content: space-between;">${soalHtml}</div></div>
        <div style="text-align: center; font-size: 10px; margin-top: 20px;">Gunakan Pensil 2B atau Pulpen Hitam Pekat. Jangan melipat atau mencoret area luar kotak.<br/>LJK ini akan dipindai menggunakan teknologi AI Vision.</div>
      </body></html>
    `;
    printWindow.document.write(html); printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 800);
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
        </style>
      </head><body>
        <div class="header"><h2>LEMBAR SOAL UJIAN</h2><h3>${ujian.pengaturan.judul}</h3></div>
        <div class="meta"><span>Mata Pelajaran: ${selectedClass?.mapel || '-'}</span><span>Waktu: ${ujian.pengaturan.waktuMenit} Menit</span></div>
        <div class="content">
          ${(ujian.soal || []).map((s: any, idx: number) => `
            <div class="soal-container">
              <div style="display: flex; gap: 8px;"><strong>${idx + 1}.</strong> <div>${(s.pertanyaan || '').replace(/\n/g, '<br/>')}</div></div>
              ${s.tipe === 'PG' && s.opsi ? `<ul class="opsi-list">${s.opsi.map((opt: any) => `<li>${opt.id}. ${opt.teks || ''}</li>`).join('')}</ul>` : '<div style="margin-top: 20px; margin-bottom: 10px; height: 100px; border: 1px dashed #999;"></div>'}
            </div>
          `).join('')}
        </div>
      </body></html>
    `;
    printWindow.document.write(html); printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 800);
  };

  const handleDownloadAbsenExcel = () => {
    const siswaKelasAsli = selectedClass ? daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama) : [];
    if (siswaKelasAsli.length === 0) return alert("Belum ada data siswa.");
    
    // Simple CSV export based on view mode
    const [yearStr, monthStr] = filterBulan.split('-');
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
    
    let csvRows = [];
    if (absenViewMode === "bulan") {
      const headers = ["No", "NISN", "Nama", ...Array.from({length: daysInMonth}).map((_, i) => `${i+1}`), "S", "I", "A"];
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
      
      const headers = ["No", "NISN", "Nama", "L/P", ...months.map(m => `Bulan ${m} (S)`), ...months.map(m => `Bulan ${m} (I)`), ...months.map(m => `Bulan ${m} (A)`), "Total S", "Total I", "Total A"];
      csvRows.push(headers.join(","));
      
      siswaKelasAsli.forEach((siswa, idx) => {
        const jk = siswa.jenisKelamin === 'Perempuan' ? 'P' : (siswa.jenisKelamin === 'Laki-laki' ? 'L' : '-');
        const rowData = [idx + 1, `="${siswa.nisn || '-'}"`, `"${siswa.nama}"`, jk];
        
        let totalS=0, totalI=0, totalA=0;
        let sArr:number[]=[], iArr:number[]=[], aArr:number[]=[];
        
        months.forEach(m => {
          const y = m >= 7 ? startYear : endYear;
          const prefix = `${y}-${m.toString().padStart(2, '0')}`;
          let s=0, i=0, a=0;
          riwayatAbsenData.forEach(record => {
            if (record.tanggal && record.tanggal.startsWith(prefix) && record.dataKehadiran?.[siswa.id]) {
               const val = record.dataKehadiran[siswa.id];
               if (val === "Sakit") s++; else if (val === "Izin") i++; else if (val === "Alpha") a++;
            }
          });
          sArr.push(s); iArr.push(i); aArr.push(a);
          totalS+=s; totalI+=i; totalA+=a;
        });
        
        rowData.push(...sArr.map(String), ...iArr.map(String), ...aArr.map(String), totalS.toString(), totalI.toString(), totalA.toString());
        csvRows.push(rowData.join(","));
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); 
    link.setAttribute("download", `Rekap_Absensi_${selectedClass.nama}_${absenViewMode}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handlePrintAbsenPDF = () => {
    alert("Mempersiapkan dokumen PDF untuk dicetak...");
    window.print();
  };

  if (isLoading) return <div className="w-full h-[70vh] flex flex-col justify-center items-center"><Loader2 size={40} className="animate-spin text-blue-600 mb-4" /></div>;

  const realClassData = selectedClass ? (kelasData.find(k => k.id === selectedClass.id) || selectedClass) : null;
  const siswaKelasAsli = realClassData ? daftarSiswaGlobal.filter(s => realClassData.peserta?.includes(s.id) || s.kelas === realClassData.nama) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-full lg:max-w-6xl mx-auto space-y-6 pb-10 relative px-2 md:px-0">
      
      {/* ========================================================
          TAMPILAN 1: DAFTAR KELAS (HOME)
      ======================================================== */}
      {!selectedClass && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Kelas & Akademik</h1>
              <p className="text-slate-500 text-sm mt-1">Pilih kelas di bawah ini untuk mengelola Rekap Nilai, CBT, dan Siswa.</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 shrink-0">
              <Plus size={18} /> Buat Kelas Baru
            </button>
          </div>

          <AnimatePresence>
            {kelasData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0">
                {kelasData.map((kelas) => (
                  <motion.div key={kelas.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative" onClick={() => setSelectedClass(kelas)}>
                    <div className="p-5 pb-4 flex justify-between items-start">
                      <div className="min-w-0">
                        <h3 className={`text-xl font-bold text-slate-800 truncate ${teachersFont.className}`}>{kelas.nama}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 truncate">{kelas.mapel}</p>
                      </div>
                      <div className="bg-blue-50 text-blue-700 font-mono text-xs font-bold px-2 py-1 rounded-md border border-blue-100 shrink-0 ml-2">{kelas.kode}</div>
                    </div>
                    <div className="px-5 py-4 border-t border-slate-50">
                      <div className="flex justify-between items-center text-sm"><span className="text-slate-500 flex items-center gap-2"><Users size={16}/> Siswa Terdaftar</span><span className="font-bold text-slate-700">{kelas.peserta?.length || 0}</span></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-xl border border-dashed border-slate-300 w-full">
                <GraduationCap size={48} className="mx-auto text-blue-200 mb-4" />
                <h3 className="font-bold text-slate-700">Belum Ada Kelas</h3>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ========================================================
          TAMPILAN 2: DETAIL KELAS & TABS
      ======================================================== */}
      {selectedClass && !isEditorOpen && (
        <>
          <button onClick={() => { setSelectedClass(null); setIsEditorOpen(false); }} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-bold w-fit">
            <ArrowLeft size={16} /> Kembali ke Daftar Kelas
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-4 w-full">
            <div className="w-full min-w-0">
              <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className} truncate`}>{realClassData.nama}</h1>
              <p className="text-slate-500 text-sm mt-1">{realClassData.mapel} • {siswaKelasAsli.length} Peserta Didik</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-lg flex items-center justify-between md:justify-start gap-4 shrink-0">
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Kode Akses</p>
                <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">{realClassData.kode}</p>
              </div>
              <Key size={24} className="text-blue-300" />
            </div>
          </div>

          <div className="flex gap-4 md:gap-8 border-b border-slate-200 overflow-x-auto custom-scrollbar pt-2 px-2 w-full whitespace-nowrap" style={{ WebkitOverflowScrolling: 'touch' }}>
            {["siswa", "absensi", "jurnal", "rekap", "cbt", "koreksi"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === tab ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                {tab === "siswa" ? "Daftar Siswa" : tab === "absensi" ? "Absensi" : tab === "jurnal" ? "Jurnal KBM" : tab === "rekap" ? "Rekap Nilai" : tab === "cbt" ? "E-Ujian (CBT)" : "Koreksi AI"} 
                {activeTab === tab && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-200 min-h-[400px] w-full min-w-0">
            
            {/* TAB 1: SISWA */}
            {activeTab === "siswa" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0 h-full">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Database Siswa</h3>
                    <p className="text-xs text-slate-500 mt-1">Daftar peserta didik yang tergabung dalam kelas ini.</p>
                  </div>
                  <button onClick={handleDownloadCSVSiswa} className="w-full sm:w-auto bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0">
                    <ArrowDownToLine size={16} /> Unduh CSV
                  </button>
                </div>
                <div className="w-full border border-slate-200 rounded-lg overflow-hidden">
                  <div className="w-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-widest font-bold border-b border-slate-200">
                          <th className="px-6 py-4 text-center w-16">No</th>
                          <th className="px-6 py-4">Nama Lengkap</th>
                          <th className="px-6 py-4">NISN / Email</th>
                          <th className="px-6 py-4 text-center w-32">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {siswaKelasAsli.length > 0 ? (
                          siswaKelasAsli.map((siswa, idx) => (
                            <tr key={siswa.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-center text-sm font-bold text-slate-400">{idx + 1}</td>
                              <td className="px-6 py-4 text-sm font-bold text-slate-800">{siswa.nama}</td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-mono text-slate-600">{siswa.nisn || "-"}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{siswa.email || "-"}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap"><CheckCircle2 size={12}/> Aktif</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-500">Belum ada siswa di kelas ini.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: ABSENSI */}
            {activeTab === "absensi" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Absensi Harian</h3>
                    <p className="text-xs text-slate-500 mt-1">Catat kehadiran peserta didik secara real-time.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg w-full sm:w-auto">
                      <CalendarDays size={16} className="text-slate-500"/>
                      <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-transparent w-full sm:w-auto text-sm font-bold text-slate-700 outline-none" />
                    </div>
                    <button type="button" onClick={() => setIsRiwayatAbsenOpen(true)} className="w-full sm:w-auto justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                      <FileSpreadsheet size={16} /> Lihat Riwayat Absen
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {statusPesanAbsen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`w-full p-3 rounded-lg flex items-center gap-2 border text-sm font-bold ${statusPesanAbsen.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {statusPesanAbsen.tipe === 'sukses' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>} {statusPesanAbsen.teks}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-full bg-white rounded-lg shadow-sm border border-slate-300 flex flex-col overflow-hidden">
                  <form onSubmit={handleSimpanAbsensi} className="w-full flex flex-col min-w-0">
                    <div className="w-full overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-600 font-bold border-b border-slate-300">
                            <th className="px-4 py-3 text-center border-r border-slate-200 w-12">No</th>
                            <th className="px-4 py-3 border-r border-slate-200">Identitas Siswa</th>
                            <th className="px-4 py-3 text-center">Keterangan Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {siswaKelasAsli.map((siswa, idx) => (
                            <tr key={siswa.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-center text-xs font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                              <td className="px-4 py-3 border-r border-slate-200">
                                <p className="text-sm font-bold text-slate-800">{siswa.nama}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-2 sm:gap-4">
                                  {["Hadir", "Sakit", "Izin", "Alpha"].map((opsi) => (
                                    <label key={opsi} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border transition-all ${absensi[siswa.id] === opsi ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-100'}`}>
                                      <input type="radio" name={`absen-${siswa.id}`} value={opsi} checked={absensi[siswa.id] === opsi} onChange={(e) => setAbsensi(prev => ({ ...prev, [siswa.id]: e.target.value }))} className="w-3.5 h-3.5 accent-blue-600" />
                                      <span className={`text-xs font-bold ${absensi[siswa.id] === opsi ? 'text-blue-700' : 'text-slate-600'}`}>{opsi}</span>
                                    </label>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {siswaKelasAsli.length === 0 && (
                            <tr><td colSpan={3} className="p-6 text-center text-sm font-bold text-slate-400">Belum ada siswa.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end w-full">
                      <button type="submit" disabled={isSubmittingAbsen || siswaKelasAsli.length === 0} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center gap-2 shadow-sm disabled:opacity-50">
                        {isSubmittingAbsen ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan Absensi
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* === TAB 3: JURNAL === */}
            {activeTab === "jurnal" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Jurnal Mengajar</h3>
                    <p className="text-xs text-slate-500 mt-1">Laporan aktivitas KBM harian.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg w-full sm:w-auto">
                      <CalendarDays size={16} className="text-slate-500"/>
                      <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-transparent w-full sm:w-auto text-sm font-bold text-slate-700 outline-none" />
                    </div>
                    <button type="button" onClick={() => setIsRiwayatJurnalOpen(true)} className="w-full sm:w-auto justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                      <FileSpreadsheet size={16} /> Lihat Riwayat
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {statusPesanJurnal && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`w-full p-3 rounded-lg flex items-center gap-2 border text-sm font-bold ${statusPesanJurnal.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {statusPesanJurnal.tipe === 'sukses' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>} {statusPesanJurnal.teks}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSimpanJurnal} className="space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Materi Pembelajaran <span className="text-rose-500">*</span></label>
                      <input type="text" required value={jurnal.materi} onChange={(e) => setJurnal({...jurnal, materi: e.target.value})} placeholder="Topik yang diajarkan hari ini..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Uraian Kegiatan Belajar <span className="text-rose-500">*</span></label>
                      <textarea required rows={4} value={jurnal.kegiatan} onChange={(e) => setJurnal({...jurnal, kegiatan: e.target.value})} placeholder="1. Pendahuluan... 2. Kegiatan Inti... 3. Penutup..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Hambatan <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
                        <textarea rows={3} value={jurnal.hambatan} onChange={(e) => setJurnal({...jurnal, hambatan: e.target.value})} placeholder="Kendala KBM..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"></textarea>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Solusi <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
                        <textarea rows={3} value={jurnal.solusi} onChange={(e) => setJurnal({...jurnal, solusi: e.target.value})} placeholder="Tindakan mengatasi kendala..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isSubmittingJurnal} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50">
                      {isSubmittingJurnal ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Kirim Jurnal KBM
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* === TAB 4: REKAP NILAI === */}
            {activeTab === "rekap" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Buku Nilai Digital</h3>
                    <p className="text-xs text-slate-500 mt-1">Sistem otomatis menghitung Nilai Akhir Kognitif berdasar bobot indikator.</p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
                    <button type="button" onClick={() => setIsPengaturanNilaiOpen(true)} className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                      <SlidersHorizontal size={14} /> Indikator
                    </button>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md justify-center whitespace-nowrap">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">KKM:</label>
                      <input type="number" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className="w-10 sm:w-12 bg-white border border-slate-300 rounded text-center text-[10px] sm:text-xs font-bold outline-none py-0.5" />
                    </div>
                    <button type="button" onClick={handleDownloadExcel} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap">
                      <ArrowDownToLine size={14} /> CSV
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {statusPesanRekap && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`w-full p-3 rounded-lg flex items-center gap-2 border text-sm font-bold ${statusPesanRekap.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {statusPesanRekap.tipe === 'sukses' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>} {statusPesanRekap.teks}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-full bg-white rounded-lg shadow-sm border border-slate-300 flex flex-col overflow-hidden">
                  <form onSubmit={handleSimpanRekap} className="w-full flex flex-col min-w-0">
                    <div className="w-full overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-600 font-bold border-b border-slate-300">
                            <th className="px-3 py-3 text-center border-r border-slate-200 w-10">No</th>
                            <th className="px-4 py-3 border-r border-slate-200 min-w-[150px]">Nama Siswa</th>
                            {indikatorNilai.map(ind => (
                              <th key={ind.id} className="px-2 py-3 text-center border-r border-slate-200">
                                {ind.nama} <span className="block text-[8px] font-normal">({ind.bobot > 0 ? `${ind.bobot}%` : 'Opsional'})</span>
                              </th>
                            ))}
                            <th className="px-4 py-3 text-center bg-slate-200 border-l border-slate-300">Nilai Akhir <span className="block text-[8px] font-normal">Kognitif</span></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {siswaKelasAsli.length > 0 ? (
                            siswaKelasAsli.map((siswa, idx) => {
                              const dataN = nilai[siswa.id] || {};
                              const nilaiAkhir = hitungNilaiAkhir(dataN);
                              const tuntas = nilaiAkhir >= kkm;
                              const dinilai = nilaiAkhir > 0;
                              return (
                                <tr key={siswa.id} className="hover:bg-blue-50/20">
                                  <td className="px-3 py-2 text-center text-xs font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                                  <td className="px-4 py-2 border-r border-slate-200">
                                    <p className="text-xs font-bold text-slate-800 truncate">{siswa.nama}</p>
                                  </td>
                                  {indikatorNilai.map(ind => (
                                    <td key={ind.id} className="px-2 py-2 border-r border-slate-200">
                                      <input type="number" min="0" max="100" value={dataN[ind.id] || ""} onChange={(e) => handleUbahNilai(siswa.id, ind.id, e.target.value)} className={`w-14 mx-auto block p-1.5 border rounded-md text-center text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none ${ind.bobot === 0 ? 'bg-slate-50 border-dashed border-slate-300 focus:ring-emerald-500' : 'bg-white border-slate-300'}`} />
                                    </td>
                                  ))}
                                  <td className={`px-4 py-2 text-center border-l border-slate-300 ${dinilai ? (tuntas ? 'bg-emerald-50/50' : 'bg-rose-50/50') : ''}`}>
                                    <span className={`text-base font-black ${dinilai ? (tuntas ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{nilaiAkhir}</span>
                                  </td>
                                </tr>
                              )
                            })
                          ) : (
                            <tr><td colSpan={indikatorNilai.length + 3} className="px-6 py-12 text-center text-slate-500 text-sm font-bold">Belum ada siswa di kelas ini.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end w-full">
                      <button type="submit" disabled={isSubmittingRekap || siswaKelasAsli.length === 0} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center gap-2 shadow-sm disabled:opacity-50">
                        {isSubmittingRekap ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan Buku Nilai
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* === TAB 5: CBT === */}
            {activeTab === "cbt" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                  <h3 className="font-bold text-slate-800 text-lg">Bank Soal & Penugasan CBT</h3>
                  <button type="button" onClick={() => setIsCbtModalOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto">
                    <Plus size={16}/> Pengaturan Ujian Baru
                  </button>
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
                        <div className="pt-4 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-3 gap-2">
                          <button type="button" onClick={() => handlePrintSoal(ujian)} className="flex justify-center items-center gap-1 text-[10px] font-bold bg-white border border-slate-200 py-1.5 rounded-md text-slate-600 hover:bg-slate-100">
                            <Printer size={12}/> Print Soal
                          </button>
                          <button type="button" onClick={() => handlePrintLJK(ujian)} className="flex justify-center items-center gap-1 text-[10px] font-bold bg-white border border-slate-200 py-1.5 rounded-md text-slate-600 hover:bg-slate-100">
                            <FileCheck size={12}/> Unduh LJK
                          </button>
                          <button type="button" onClick={() => { setSelectedUjianView(ujian); setIsHasilUjianOpen(true); }} className="col-span-2 lg:col-span-1 flex justify-center items-center gap-1 text-[10px] font-bold bg-blue-100 border border-blue-200 py-1.5 rounded-md text-blue-700 hover:bg-blue-200">
                            <Eye size={12}/> Lihat Hasil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 border border-dashed border-slate-300 rounded-lg text-center bg-slate-50 flex flex-col items-center">
                    <Settings2 size={40} className="text-slate-300 mb-4" />
                    <p className="font-bold text-slate-700">Belum Ada Ujian di Kelas Ini</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* === TAB 6: KOREKSI AI === */}
            {activeTab === "koreksi" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg"><BrainCircuit size={22} className="text-blue-600"/> Pengaturan Koreksi AI</h3>
                  <p className="text-sm text-slate-500 mb-5 leading-relaxed">Sistem AI akan memindai Lembar Jawaban (LJK) & mengoreksi jawaban uraian siswa secara otomatis berdasarkan rubrik.</p>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Pilih Rubrik Kunci Jawaban</label>
                  <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none mb-5 focus:border-blue-500">
                    <option>Pilih Rubrik Asesmen...</option>
                    {daftarUjian.map(u => <option key={u.id}>Kunci Jawaban: {u.pengaturan.judul}</option>)}
                  </select>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 text-lg">Unggah LJK / Jawaban Siswa</h3>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleUploadLJK} />
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/80 transition-colors h-[250px]">
                    <UploadCloud size={48} className="text-blue-400 mb-4" />
                    <p className="font-bold text-slate-700 text-sm mb-1">Klik untuk mengunggah Berkas LJK</p>
                    <p className="text-xs text-slate-500">Format: PNG, JPG, PDF</p>
                  </div>
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
              <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mt-2">{cbtForm.jenisUjian}</p>
            </div>
            <button type="button" onClick={simpanUjianKeDatabase} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all w-full md:w-auto justify-center">
              <Save size={16} /> Simpan Seluruh Ujian
            </button>
          </div>
          <div className="space-y-8">
            {daftarSoal.map((soal, index) => (
              <div key={soal.id} className="p-6 border border-slate-200 rounded-lg relative bg-slate-50/30">
                <button type="button" onClick={() => hapusSoal(soal.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 bg-white p-2 rounded-md border border-slate-200"><Trash2 size={16} /></button>
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-3">
                    <span className="font-black text-lg text-slate-800 bg-slate-200 w-8 h-8 flex items-center justify-center rounded-md">{index + 1}</span>
                    <select value={soal.tipe} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].tipe = e.target.value; setDaftarSoal(newSoal); }} className="text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-md px-3 py-1.5 outline-none">
                      <option value="PG">Pilihan Ganda</option>
                      <option value="Benar/Salah">Benar / Salah</option>
                      <option value="Jodohkan">Menjodohkan</option>
                      <option value="Isian">Isian Singkat</option>
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
                  </div>
                  
                  {/* Bagian Kunci Jawaban Berdasarkan Tipe */}
                  <div className="mt-4 bg-blue-50/50 p-4 rounded-md border border-blue-100">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-blue-800 uppercase mb-3"><Key size={14}/> Kunci Jawaban & Panduan Koreksi AI</label>
                    
                    {(soal.tipe === "PG" || soal.tipe === "Benar/Salah") && (
                      <div className="flex flex-col gap-2">
                        {soal.opsi?.map((opt: any, oIdx: number) => (
                          <div key={opt.id} className="flex items-center gap-3">
                            <input type="radio" name={`kunci-${soal.id}`} checked={soal.kunci === opt.id} onChange={() => { const newSoal = [...daftarSoal]; newSoal[index].kunci = opt.id; setDaftarSoal(newSoal); }} className="w-4 h-4 accent-blue-600" />
                            <span className="font-bold text-sm w-6">{opt.id}.</span>
                            <input type="text" value={opt.teks} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].opsi[oIdx].teks = e.target.value; setDaftarSoal(newSoal); }} placeholder={`Opsi ${opt.id}`} className="flex-1 bg-white border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500" />
                          </div>
                        ))}
                      </div>
                    )}

                    {(soal.tipe === "Isian" || soal.tipe === "Uraian" || soal.tipe === "Jodohkan") && (
                      <textarea className="w-full p-3 bg-white border border-blue-200 rounded-md text-sm outline-none focus:border-blue-500 resize-none min-h-[80px]" value={soal.panduanAI} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].panduanAI = e.target.value; setDaftarSoal(newSoal); }} placeholder="Tuliskan kata kunci wajib atau pedoman jawaban agar AI dapat mengoreksi dan memberikan poin secara otomatis..." />
                    )}
                  </div>

                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-200">
              <button type="button" onClick={() => tambahSoalManual("PG")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Pilihan Ganda</button>
              <button type="button" onClick={() => tambahSoalManual("Benar/Salah")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Benar / Salah</button>
              <button type="button" onClick={() => tambahSoalManual("Isian")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Isian Singkat</button>
              <button type="button" onClick={() => tambahSoalManual("Uraian")} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-slate-50"><Plus size={16}/> Uraian Lengkap</button>
            </div>
          </div>
        </motion.div>
      )}


      {/* ========================================================
          SEMUA MODAL (POP-UP) 
      ======================================================== */}
      
      {/* 1. Modal Buat Kelas Baru */}
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

      {/* 2. Modal Riwayat Absensi (Bulan & Semester) */}
      <AnimatePresence>
        {isRiwayatAbsenOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center bg-white shrink-0 gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><FileSpreadsheet size={20} className="text-indigo-600" /> Daftar Hadir Peserta Didik</h3>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-md">
                    <button onClick={() => setAbsenViewMode("bulan")} className={`px-4 py-1.5 text-xs font-bold rounded ${absenViewMode === 'bulan' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Data Per Bulan</button>
                    <button onClick={() => setAbsenViewMode("semester")} className={`px-4 py-1.5 text-xs font-bold rounded ${absenViewMode === 'semester' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Data Semester</button>
                  </div>
                  <button type="button" onClick={() => setIsRiwayatAbsenOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200 ml-2"><X size={20}/></button>
                </div>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto bg-slate-50 w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                  {absenViewMode === 'bulan' ? (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500">BULAN:</label>
                      <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-bold shadow-sm outline-none" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-bold shadow-sm outline-none">
                        <option value="Ganjil">Semester Ganjil</option>
                        <option value="Genap">Semester Genap</option>
                      </select>
                      <select value={filterTahunAjaran} onChange={(e) => setFilterTahunAjaran(e.target.value)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-bold shadow-sm outline-none">
                        <option value="2025/2026">2025/2026</option>
                        <option value="2026/2027">2026/2027</option>
                        <option value="2027/2028">2027/2028</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button onClick={handlePrintAbsenPDF} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-bold shadow-sm">Unduh PDF</button>
                    <button onClick={handleDownloadAbsenExcel} className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded text-xs font-bold shadow-sm">Unduh Excel</button>
                  </div>
                </div>

                <div className="bg-white border border-slate-300 shadow-sm rounded-md w-full overflow-hidden">
                  <div className="w-full overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    
                    {/* View Bulanan (Tabel 1-31 Hari) */}
                    {absenViewMode === "bulan" && (
                      <table className="w-full text-left border-collapse min-w-[1200px] text-xs">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-700 text-[10px] text-center">
                            <th className="p-2 border border-slate-300 w-8" rowSpan={2}>NO</th>
                            <th className="p-2 border border-slate-300 w-16" rowSpan={2}>NIS</th>
                            <th className="p-2 border border-slate-300 text-left min-w-[200px]" rowSpan={2}>N A M A</th>
                            <th className="p-1 border border-slate-300" colSpan={new Date(parseInt(filterBulan.split('-')[0]), parseInt(filterBulan.split('-')[1]), 0).getDate()}>TANGGAL</th>
                            <th className="p-1 border border-slate-300" colSpan={3}>JUMLAH</th>
                          </tr>
                          <tr className="bg-slate-50 font-bold text-slate-600 text-[9px] text-center">
                            {Array.from({length: new Date(parseInt(filterBulan.split('-')[0]), parseInt(filterBulan.split('-')[1]), 0).getDate()}).map((_, i) => <th key={i} className="p-1 border border-slate-300 w-6">{i+1}</th>)}
                            <th className="p-1 border border-slate-300 w-8 text-rose-600">S</th>
                            <th className="p-1 border border-slate-300 w-8 text-blue-600">I</th>
                            <th className="p-1 border border-slate-300 w-8 text-rose-800">A</th>
                          </tr>
                        </thead>
                        <tbody>
                          {daftarSiswaGlobal.length > 0 ? daftarSiswaGlobal.map((siswa, idx) => {
                            let totalS=0, totalI=0, totalA=0;
                            const [y, m] = filterBulan.split('-');
                            const days = new Date(parseInt(y), parseInt(m), 0).getDate();
                            
                            return (
                              <tr key={siswa.id} className="hover:bg-blue-50/30 text-center">
                                <td className="p-2 border border-slate-300">{idx + 1}</td>
                                <td className="p-2 border border-slate-300">{siswa.nisn || "-"}</td>
                                <td className="p-2 border border-slate-300 text-left font-bold truncate max-w-[200px]">{siswa.nama}</td>
                                
                                {Array.from({length: days}).map((_, d) => {
                                  const dateStr = `${y}-${m}-${(d+1).toString().padStart(2, '0')}`;
                                  const record = riwayatAbsenData.find(r => r.tanggal === dateStr);
                                  let status = "";
                                  if (record && record.dataKehadiran && record.dataKehadiran[siswa.id]) {
                                    const val = record.dataKehadiran[siswa.id];
                                    if (val === "Hadir") status = "•";
                                    else if (val === "Sakit") { status = "S"; totalS++; }
                                    else if (val === "Izin") { status = "I"; totalI++; }
                                    else if (val === "Alpha") { status = "A"; totalA++; }
                                  }
                                  return (
                                    <td key={d} className={`p-1 border border-slate-300 text-[10px] font-bold ${status === '•' ? 'text-emerald-600' : 'text-rose-600'}`}>{status}</td>
                                  )
                                })}
                                
                                <td className="p-1 border border-slate-300 font-bold text-rose-600 bg-rose-50/50">{totalS}</td>
                                <td className="p-1 border border-slate-300 font-bold text-blue-600 bg-blue-50/50">{totalI}</td>
                                <td className="p-1 border border-slate-300 font-bold text-rose-800 bg-rose-50/50">{totalA}</td>
                              </tr>
                            )
                          }) : <tr><td colSpan={37} className="p-6 text-center text-slate-400">Data tidak tersedia.</td></tr>}
                        </tbody>
                      </table>
                    )}

                    {/* View Semester (Rekap Bulanan) */}
                    {absenViewMode === "semester" && (
                      <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-700 text-[10px] text-center">
                            <th className="p-2 border border-slate-300 w-8" rowSpan={2}>NO</th>
                            <th className="p-2 border border-slate-300 w-16" rowSpan={2}>INDUK</th>
                            <th className="p-2 border border-slate-300 text-left min-w-[200px]" rowSpan={2}>N A M A</th>
                            <th className="p-2 border border-slate-300 w-8" rowSpan={2}>L/P</th>
                            {(filterSemester === "Ganjil" ? ["JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"] : ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI"]).map(bln => (
                              <th key={bln} className="p-1 border border-slate-300" colSpan={3}>{bln}</th>
                            ))}
                            <th className="p-1 border border-slate-300" colSpan={3}>TOTAL (S I A)</th>
                            <th className="p-2 border border-slate-300" rowSpan={2}>HADIR (%)</th>
                          </tr>
                          <tr className="bg-slate-50 font-bold text-slate-600 text-[9px] text-center">
                            {Array.from({length: 6}).map((_, i) => (
                              <><th key={`s${i}`} className="p-1 border border-slate-300 w-6">S</th><th key={`i${i}`} className="p-1 border border-slate-300 w-6">I</th><th key={`a${i}`} className="p-1 border border-slate-300 w-6">A</th></>
                            ))}
                            <th className="p-1 border border-slate-300 w-8 text-rose-600">S</th><th className="p-1 border border-slate-300 w-8 text-blue-600">I</th><th className="p-1 border border-slate-300 w-8 text-rose-800">A</th>
                          </tr>
                        </thead>
                        <tbody>
                          {siswaKelasAsli.length > 0 ? siswaKelasAsli.map((siswa, idx) => {
                            const months = filterSemester === "Ganjil" ? [7,8,9,10,11,12] : [1,2,3,4,5,6];
                            const startY = parseInt(filterTahunAjaran.split('/')[0]);
                            const endY = parseInt(filterTahunAjaran.split('/')[1]);
    
                            let totalS = 0, totalI = 0, totalA = 0, totalHadir = 0, totalHari = 0;
    
                            // Hitung data untuk tiap bulan
                            const rowData = months.map(m => {
                              const y = m >= 7 ? startY : endY;
                              const prefix = `${y}-${m.toString().padStart(2, '0')}`;
                              let s=0, i=0, a=0;
                              riwayatAbsenData.forEach(record => {
                                if (record.tanggal && record.tanggal.startsWith(prefix) && record.dataKehadiran?.[siswa.id]) {
                                  totalHari++;
                                  const val = record.dataKehadiran[siswa.id];
                                  if (val === "Sakit") s++; else if (val === "Izin") i++; else if (val === "Alpha") a++; else if (val === "Hadir") totalHadir++;
                                }
                              });
                              totalS += s; totalI += i; totalA += a;
                              return { s, i, a };
                            });
                        
                            const persentaseHadir = totalHari === 0 ? 100 : Math.round((totalHadir / totalHari) * 100);
                        
                            return (
                              <tr key={siswa.id} className="hover:bg-blue-50/30 text-center">
                                <td className="p-2 border border-slate-300">{idx + 1}</td>
                                <td className="p-2 border border-slate-300">{siswa.nisn || "-"}</td>
                                <td className="p-2 border border-slate-300 text-left font-bold truncate max-w-[200px]">{siswa.nama}</td>
                                <td className="p-2 border border-slate-300">{siswa.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                
                                {/* Render cell S-I-A per bulan tanpa span ilegal */}
                                {rowData.map((data, i) => (
                                  <React.Fragment key={i}>
                                    <td className="p-1 border border-slate-300 bg-amber-50/50 text-[10px]">{data.s}</td>
                                    <td className="p-1 border border-slate-300 bg-amber-50/50 text-[10px]">{data.i}</td>
                                    <td className="p-1 border border-slate-300 bg-amber-50/50 text-[10px]">{data.a}</td>
                                  </React.Fragment>
                                ))}
                                
                                <td className="p-1 border border-slate-300 font-bold text-rose-600 bg-slate-50">{totalS}</td>
                                <td className="p-1 border border-slate-300 font-bold text-blue-600 bg-slate-50">{totalI}</td>
                                <td className="p-1 border border-slate-300 font-bold text-rose-800 bg-slate-50">{totalA}</td>
                                <td className="p-2 border border-slate-300 font-black text-emerald-600">{persentaseHadir}%</td>
                              </tr>
                            )
                          }) : <tr><td colSpan={27} className="p-6 text-center text-slate-400">Data tidak tersedia.</td></tr>}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Modal Riwayat Jurnal */}
      <AnimatePresence>
        {isRiwayatJurnalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><FileSpreadsheet size={20} className="text-indigo-600" /> Riwayat Jurnal Mengajar</h3>
                <button type="button" onClick={() => setIsRiwayatJurnalOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200"><X size={20}/></button>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto w-full min-w-0 bg-slate-50">
                <div className="bg-white border border-slate-300 overflow-x-auto custom-scrollbar shadow-sm rounded-md" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <table className="w-full text-left border-collapse min-w-[800px] text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-[11px] uppercase">
                        <th className="p-4 border-r border-slate-300 w-28">Tanggal</th>
                        <th className="p-4 border-r border-slate-300 w-48">Materi</th>
                        <th className="p-4 border-r border-slate-300 min-w-[250px]">Kegiatan KBM</th>
                        <th className="p-4 border-r border-slate-300 min-w-[150px]">Hambatan</th>
                        <th className="p-4 min-w-[150px]">Solusi / Tindak Lanjut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {riwayatJurnalData.length > 0 ? (
                        riwayatJurnalData.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs text-slate-700">
                            <td className="p-4 border-r border-slate-200 whitespace-nowrap font-bold">{item.tanggal}</td>
                            <td className="p-4 border-r border-slate-200 font-bold text-slate-800">{item.materi}</td>
                            <td className="p-4 border-r border-slate-200 whitespace-pre-wrap leading-relaxed">{item.kegiatan}</td>
                            <td className="p-4 border-r border-slate-200 text-rose-600 italic">{item.hambatan || "-"}</td>
                            <td className="p-4 text-emerald-600 italic">{item.solusi || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-400">Belum ada riwayat jurnal.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Modal Pengaturan Ujian Baru (CBT) */}
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
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">1. Sumber Soal & Materi</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Judul Ujian / Penugasan <span className="text-rose-500">*</span></label>
                      <input type="text" value={cbtForm.judul} onChange={(e) => setCbtForm({...cbtForm, judul: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm font-bold focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Metode Import Soal</label>
                      <select value={cbtForm.sumberSoal} onChange={(e) => setCbtForm({...cbtForm, sumberSoal: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm font-bold text-blue-700 focus:border-blue-500 outline-none">
                        <option>Buat Manual (Ketik Sendiri)</option>
                        <option>Tarik dari Bank Soal AI (Generator)</option>
                        <option>Upload dari Kisi-kisi / LKPD (Word/PDF)</option>
                      </select>
                    </div>
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
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Waktu Buka</label>
                      <input type="datetime-local" value={cbtForm.waktuMulai} onChange={(e) => setCbtForm({...cbtForm, waktuMulai: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium outline-none" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Waktu Tutup</label>
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

      {/* 5. Modal Lihat Hasil Ujian CBT */}
      <AnimatePresence>
        {isHasilUjianOpen && selectedUjianView && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><Target size={20} className="text-indigo-600" /> Analisis Hasil Jawaban Siswa</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedUjianView.pengaturan.judul}</p>
                </div>
                <button type="button" onClick={() => setIsHasilUjianOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200"><X size={20}/></button>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto bg-slate-50">
                <div className="bg-white border border-slate-300 shadow-sm rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[700px] text-sm">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700 text-xs">
                        <th className="p-3 border-r border-slate-300 w-10 text-center">No</th>
                        <th className="p-3 border-r border-slate-300">Nama Siswa</th>
                        <th className="p-3 border-r border-slate-300 text-center">Nilai Ujian</th>
                        <th className="p-3 border-r border-slate-300 text-center">Jawaban Benar</th>
                        <th className="p-3 border-r border-slate-300 text-center">Jawaban Salah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaKelasAsli.length > 0 ? (
                        siswaKelasAsli.map((siswa, idx) => {
                          const hasilSiswa = hasilUjianData.find(h => h.siswaId === siswa.id);
                          const nilai = hasilSiswa ? hasilSiswa.nilai : "Belum Ujian";
                          const benar = hasilSiswa ? hasilSiswa.benar : "-";
                          const salah = hasilSiswa ? hasilSiswa.salah : "-";
                          
                          return (
                            <tr key={siswa.id} className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                              <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-3 border-r border-slate-200 font-bold text-slate-800">{siswa.nama}</td>
                              <td className={`p-3 border-r border-slate-200 text-center font-bold ${hasilSiswa ? 'text-blue-600' : 'text-slate-400 font-normal text-xs'}`}>{nilai}</td>
                              <td className="p-3 border-r border-slate-200 text-center font-bold text-emerald-600">{benar}</td>
                              <td className="p-3 text-center font-bold text-rose-600">{salah}</td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr><td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-400">Belum ada siswa di kelas ini.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Modal Pengaturan Indikator Nilai Dinamis */}
      <AnimatePresence>
        {isPengaturanNilaiOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><SlidersHorizontal size={20} className="text-amber-600" /> Atur Indikator Penilaian</h3>
                <button type="button" onClick={() => setIsPengaturanNilaiOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] bg-slate-50">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-3 mb-2">
                  <Percent size={18} className="text-amber-600 shrink-0 mt-0.5"/>
                  <p className="text-xs text-amber-800 font-medium">Atur bobot persentase nilai (Total maksimal 100%). Jika bobot diisi 0, maka kolom tersebut bersifat opsional dan tidak masuk ke hitungan Nilai Akhir Kognitif.</p>
                </div>
                
                {indikatorNilai.map((ind, idx) => (
                  <div key={ind.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
                    <div className="w-full sm:flex-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Kolom/Indikator</label>
                      <input type="text" value={ind.nama} onChange={(e) => { const newInd = [...indikatorNilai]; newInd[idx].nama = e.target.value; setIndikatorNilai(newInd); }} className="w-full font-bold text-slate-800 text-sm outline-none border-b border-slate-200 focus:border-blue-500 pb-1 mt-1" />
                    </div>
                    <div className="w-full sm:w-20">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Bobot (%)</label>
                      <input type="number" value={ind.bobot} onChange={(e) => { const newInd = [...indikatorNilai]; newInd[idx].bobot = Number(e.target.value); setIndikatorNilai(newInd); }} className="w-full text-center font-bold text-slate-800 text-sm outline-none border-b border-slate-200 focus:border-blue-500 pb-1 mt-1" />
                    </div>
                    <button type="button" onClick={() => handleHapusIndikator(ind.id)} className="w-full sm:w-auto mt-2 sm:mt-4 p-2 flex justify-center items-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md"><Trash2 size={16}/></button>
                  </div>
                ))}

                <button type="button" onClick={handleTambahIndikator} className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 py-3 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all mt-4">
                  <Plus size={16}/> Tambah Indikator Nilai
                </button>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-white shrink-0">
                <button type="button" onClick={() => setIsPengaturanNilaiOpen(false)} className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-md shadow-sm transition-colors">Terapkan Pengaturan</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}