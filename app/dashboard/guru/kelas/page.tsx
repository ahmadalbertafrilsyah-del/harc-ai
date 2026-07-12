"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, BookOpen, Plus, ChevronRight, GraduationCap, Loader2, Key, 
  ArrowLeft, UploadCloud, BrainCircuit, CheckCircle2, FileText, X, Clock, 
  CalendarDays, Save, Trash2, Target, Settings2, Database, Edit3, FileSpreadsheet, 
  ArrowDownToLine, Calculator, AlertCircle, ClipboardCheck, List, Eye, Printer, 
  SlidersHorizontal, Percent, FileCheck
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef, FormEvent } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, where, getDoc, setDoc, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface NilaiSiswa {
  harian: number;
  pts: number;
  pas: number;
  praktik: number;
}

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
  const [riwayatAbsenData, setRiwayatAbsenData] = useState<any[]>([]); 
  
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
  
  // STATE BARU UNTUK HASIL UJIAN & DATA CBT
  const [selectedUjianView, setSelectedUjianView] = useState<any | null>(null);
  const [hasilUjianData, setHasilUjianData] = useState<any[]>([]);

  const [cbtForm, setCbtForm] = useState({
    judul: "", jenisUjian: "Asesmen Formatif", sumberSoal: "Buat Manual", bahanBacaan: "", opsiPG: "A - D (4 Opsi)",
    jmlPgBiasa: 5, jmlUraian: 5, waktuMenit: 60, waktuMulai: "", waktuSelesai: ""
  });

  // === STATE REKAP NILAI DINAMIS ===
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

  // === 1. TARIK DATA DASAR (KELAS, PROFIL, SISWA, UJIAN) ===
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
           if(docSnap.exists()){ setGuruNpsn(docSnap.data().npsn || docSnap.data().instansi || ""); }
        });
        const qKelas = query(collection(db, "manajemen_kelas"), where("guruId", "==", user.uid));
        const unsubKelas = onSnapshot(qKelas, (snapshot) => {
          setKelasData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        });
        return () => { unsubProfil(); unsubKelas(); };
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (guruNpsn) {
      const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", guruNpsn));
      const unsubSiswa = onSnapshot(qSiswa, (snap) => {
        setDaftarSiswaGlobal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubSiswa();
    }
  }, [guruNpsn]);

  useEffect(() => {
    if (selectedClass) {
      const qUjian = query(collection(db, "bank_soal"), where("kelasId", "==", selectedClass.id));
      const unsubUjian = onSnapshot(qUjian, (snapshot) => {
        setDaftarUjian(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubUjian();
    }
  }, [selectedClass]);

  // === 2. FETCH REKAP NILAI & INDIKATOR ===
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

  // === 3. FETCH ABSENSI HARIAN ===
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
        if (absenSnap.exists()) {
          const dataServer = absenSnap.data();
          if (dataServer.dataKehadiran) { currentAbsen = { ...currentAbsen, ...dataServer.dataKehadiran }; }
        }
        setAbsensi(currentAbsen);
      } catch (error) { console.error("Gagal menarik data absensi:", error); }
    };
    fetchAbsensi();
  }, [selectedClass, tanggal, daftarSiswaGlobal]);

  // === 4. FETCH DATA RIWAYAT (MODAL) ===
  useEffect(() => {
    if (selectedClass && isRiwayatAbsenOpen) {
      const q = query(collection(db, "absensi_siswa"), where("kelasId", "==", selectedClass.id));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => {
          const timeA = a.tanggal ? new Date(a.tanggal).getTime() : 0;
          const timeB = b.tanggal ? new Date(b.tanggal).getTime() : 0;
          return timeB - timeA;
        });
        setRiwayatAbsenData(data);
      });
      return () => unsub();
    }
  }, [selectedClass, isRiwayatAbsenOpen]);

  useEffect(() => {
    if (selectedClass && isRiwayatJurnalOpen) {
      const q = query(collection(db, "jurnal_kbm"), where("kelasId", "==", selectedClass.id));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => {
          const timeA = a.tanggal ? new Date(a.tanggal).getTime() : 0;
          const timeB = b.tanggal ? new Date(b.tanggal).getTime() : 0;
          return timeB - timeA;
        });
        setRiwayatJurnalData(data);
      });
      return () => unsub();
    }
  }, [selectedClass, isRiwayatJurnalOpen]);

  // === FETCH DATA HASIL UJIAN ===
  useEffect(() => {
    if (isHasilUjianOpen && selectedUjianView) {
      // Menarik data jawaban siswa jika mereka sudah pernah submit
      const q = query(collection(db, "hasil_ujian"), where("ujianId", "==", selectedUjianView.id));
      const unsub = onSnapshot(q, (snap) => {
        setHasilUjianData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [isHasilUjianOpen, selectedUjianView]);


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
    indikatorNilai.forEach(ind => {
      if (ind.bobot > 0) { total += (dataN[ind.id] || 0) * (ind.bobot / 100); }
    });
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Rekap_Nilai_${selectedClass.nama}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleDownloadCSVSiswa = () => {
    const siswaKelasAsli = selectedClass ? daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama) : [];
    if (siswaKelasAsli.length === 0) {
      alert("Tidak ada data siswa untuk diunduh.");
      return;
    }

    const headers = ["No", "Nama Lengkap", "NISN", "Email", "Status"];
    const csvRows = [headers.join(",")];
    
    siswaKelasAsli.forEach((siswa: any, idx: number) => {
      const row = [
        idx + 1, 
        `"${siswa.nama || '-'}"`, 
        `"${siswa.nisn || '-'}"`,
        `"${siswa.email || '-'}"`,
        "Aktif"
      ];
      csvRows.push(row.join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Siswa_${selectedClass?.nama?.replace(/\s+/g, '_') || 'Kelas'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTambahIndikator = () => setIndikatorNilai([...indikatorNilai, { id: `ind_${Date.now()}`, nama: "Indikator Baru", bobot: 0 }]);
  const handleHapusIndikator = (id: string) => setIndikatorNilai(indikatorNilai.filter(i => i.id !== id));

  const hapusUjian = async (id: string) => { 
    if(confirm("Yakin ingin menghapus ujian ini?")) await deleteDoc(doc(db, "bank_soal", id)); 
  };

  const getInitialOpsi = () => {
    const num = cbtForm.opsiPG.includes("3") ? 3 : cbtForm.opsiPG.includes("5") ? 5 : 4;
    return Array.from({length: num}).map((_, i) => ({ id: ["A", "B", "C", "D", "E"][i], teks: "" }));
  };

  const tambahSoalManual = (tipe: "PG" | "Esai") => {
    setDaftarSoal([...daftarSoal, { id: Date.now().toString(), tipe: tipe, pertanyaan: "", opsi: tipe === "PG" ? getInitialOpsi() : [], kunci: tipe === "PG" ? "A" : "" }]);
  };
  
  const hapusSoal = (id: string) => setDaftarSoal(daftarSoal.filter(s => s.id !== id));

  const prosesLanjutPembuatan = () => {
    if(!cbtForm.judul || !cbtForm.waktuMulai || !cbtForm.waktuSelesai) { alert("Mohon isi Judul Ujian dan Jadwal Pelaksanaan."); return; }
    let soalBaru: any[] = [];
    for(let i=0; i<cbtForm.jmlPgBiasa; i++) soalBaru.push({ id: `pg_${Date.now()}_${i}`, tipe: "PG", pertanyaan: "", opsi: getInitialOpsi(), kunci: "A" });
    for(let i=0; i<cbtForm.jmlUraian; i++) soalBaru.push({ id: `esai_${Date.now()}_${i}`, tipe: "Esai", pertanyaan: "", opsi: [], kunci: "" });
    setDaftarSoal(soalBaru); setIsCbtModalOpen(false); setIsEditorOpen(true);
  };

  const simpanUjianKeDatabase = async () => {
    try {
      await addDoc(collection(db, "bank_soal"), { kelasId: selectedClass.id, pengaturan: cbtForm, soal: daftarSoal, guruId: userUid, timestamp: serverTimestamp() });
      alert("Ujian berhasil disimpan!"); setIsEditorOpen(false); setActiveTab("cbt");
    } catch (error) { alert("Gagal menyimpan soal."); }
  };

  const handleUploadLJK = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    alert(`Memproses LJK: ${file.name} dengan AI Vision... (Simulasi)`);
    setTimeout(() => alert("Koreksi AI Selesai! Nilai telah diintegrasikan ke tab Rekap Nilai."), 2500);
  };

  // HANDLER PRINT SOAL
  const handlePrintSoal = (ujian: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Izinkan pop-up browser untuk mencetak.");

    const html = `
      <html>
        <head>
          <title>Soal Ujian - ${ujian.pengaturan.judul}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; padding: 40px; color: black; font-size: 14px; }
            .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 15px; margin-bottom: 20px; }
            .header h2, .header h3 { margin: 0; padding: 3px 0; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-weight: bold; border-bottom: 1px dashed black; padding-bottom: 10px; }
            .soal-container { margin-bottom: 20px; page-break-inside: avoid; }
            .opsi-list { list-style-type: none; padding-left: 20px; margin-top: 5px; }
            .opsi-list li { margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>LEMBAR SOAL UJIAN</h2>
            <h3>${ujian.pengaturan.judul}</h3>
          </div>
          <div class="meta">
            <span>Mata Pelajaran: ${selectedClass?.mapel || '-'}</span>
            <span>Waktu: ${ujian.pengaturan.waktuMenit} Menit</span>
          </div>
          <div class="content">
            ${(ujian.soal || []).map((s: any, idx: number) => `
              <div class="soal-container">
                <div style="display: flex; gap: 8px;">
                  <strong>${idx + 1}.</strong> 
                  <div>${(s.pertanyaan || '').replace(/\n/g, '<br/>')}</div>
                </div>
                ${s.tipe === 'PG' && s.opsi ? `
                  <ul class="opsi-list">
                    ${s.opsi.map((opt: any) => `<li>${opt.id}. ${opt.teks || ''}</li>`).join('')}
                  </ul>
                ` : '<div style="margin-top: 20px; margin-bottom: 10px; height: 100px; border: 1px dashed #999;"></div>'}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 800);
  };

  // HANDLER UNDUH LJK
  const handleDownloadLJK = (ujian: any) => {
    const siswaKelasAsli = selectedClass ? daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id) || s.kelas === selectedClass.nama) : [];
    if (siswaKelasAsli.length === 0) return alert("Belum ada siswa di kelas ini.");

    const headers = ["No", "NISN", "Nama Siswa"];
    (ujian.soal || []).forEach((_: any, idx: number) => headers.push(`Soal_${idx + 1}`));
    
    const csvRows = [headers.join(",")];
    
    siswaKelasAsli.forEach((siswa, idx) => {
      const row = [idx + 1, `="${siswa.nisn || '-'}"`, `"${siswa.nama}"`];
      (ujian.soal || []).forEach(() => row.push("")); 
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Format_LJK_${ujian.pengaturan.judul.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // HANDLER BUKA MODAL HASIL
  const bukaHasilUjian = (ujian: any) => {
    setSelectedUjianView(ujian);
    setIsHasilUjianOpen(true);
  };

  if (isLoading) return <div className="w-full h-[70vh] flex flex-col justify-center items-center"><Loader2 size={40} className="animate-spin text-blue-600 mb-4" /></div>;

  const realClassData = selectedClass ? (kelasData.find(k => k.id === selectedClass.id) || selectedClass) : null;
  const siswaKelasAsli = realClassData ? daftarSiswaGlobal.filter(s => realClassData.peserta?.includes(s.id) || s.kelas === realClassData.nama) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-full md:max-w-6xl mx-auto space-y-6 pb-10 relative">
      
      {/* ========================================================
          TAMPILAN 1: SAAT KELAS BELUM DIPILIH (DAFTAR KELAS)
      ======================================================== */}
      {!selectedClass && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Kelas & Akademik</h1>
              <p className="text-slate-500 text-sm mt-1">Pilih kelas di bawah ini untuk mengelola Rekap Nilai, CBT, dan Siswa.</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-bold shadow-sm flex items-center justify-center gap-2 shrink-0">
              <Plus size={18} /> Buat Kelas Baru
            </button>
          </div>

          <AnimatePresence>
            {kelasData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0">
                {kelasData.map((kelas) => (
                  <motion.div key={kelas.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative" onClick={() => setSelectedClass(kelas)}>
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
              <div className="text-center py-24 bg-white rounded-md border border-dashed border-slate-300 w-full">
                <GraduationCap size={48} className="mx-auto text-blue-200 mb-4" />
                <h3 className="font-bold text-slate-700">Belum Ada Kelas</h3>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ========================================================
          TAMPILAN 2: SAAT KELAS DIPILIH (DETAIL KELAS & TAB)
      ======================================================== */}
      {selectedClass && !isEditorOpen && (
        <>
          <button onClick={() => { setSelectedClass(null); setIsEditorOpen(false); }} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-bold w-fit">
            <ArrowLeft size={16} /> Kembali ke Daftar Kelas
          </button>

          <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-4 w-full">
            <div className="w-full min-w-0">
              <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className} truncate`}>{realClassData.nama}</h1>
              <p className="text-slate-500 text-sm mt-1">{realClassData.mapel} • {siswaKelasAsli.length} Peserta Didik</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-md flex items-center justify-between md:justify-start gap-4 shrink-0">
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Kode Akses</p>
                <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">{realClassData.kode}</p>
              </div>
              <Key size={24} className="text-blue-300" />
            </div>
          </div>

          <div className="flex gap-4 md:gap-8 border-b overflow-x-auto border-slate-200 pt-2 px-2 w-full whitespace-nowrap">
            {["siswa", "absensi", "jurnal", "rekap", "cbt", "koreksi"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === tab ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                {tab === "siswa" ? "Daftar Siswa" : tab === "absensi" ? "Absensi" : tab === "jurnal" ? "Jurnal KBM" : tab === "rekap" ? "Rekap Nilai" : tab === "cbt" ? "E-Ujian (CBT)" : "Koreksi AI"} 
                {activeTab === tab && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 md:p-8 rounded-md shadow-sm border border-slate-200 min-h-[400px] w-full min-w-0">
            
            {/* TAB 1: SISWA DENGAN TABEL RESPONSIF & DOWNLOAD CSV */}
            {activeTab === "siswa" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0 h-full">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Database Siswa</h3>
                    <p className="text-xs text-slate-500 mt-1">Daftar peserta didik yang tergabung dalam kelas ini.</p>
                  </div>
                  <button 
                    onClick={handleDownloadCSVSiswa} 
                    className="w-full sm:w-auto bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 px-4 py-2.5 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
                  >
                    <ArrowDownToLine size={16} /> Unduh CSV
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden w-full">
                  <div className="w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 text-[11px] uppercase tracking-widest font-bold border-b border-slate-200">
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
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                                  <CheckCircle2 size={12}/> Aktif
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-16 text-center">
                              <Users size={36} className="mx-auto text-slate-300 mb-3" />
                              <h3 className="font-bold text-slate-700 text-lg">Belum ada siswa di kelas ini.</h3>
                              <p className="text-xs text-slate-500 mt-1">Minta siswa mendaftar dengan kode kelas: <strong className="text-blue-600">{realClassData.kode}</strong></p>
                            </td>
                          </tr>
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
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-md w-full sm:w-auto">
                      <CalendarDays size={16} className="text-slate-500"/>
                      <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-transparent w-full sm:w-auto text-sm font-bold text-slate-700 outline-none" />
                    </div>
                    <button type="button" onClick={() => setIsRiwayatAbsenOpen(true)} className="w-full sm:w-auto justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-2.5 sm:py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors">
                      <FileSpreadsheet size={14} /> Lihat Riwayat
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {statusPesanAbsen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`w-full p-3 rounded-md flex items-center gap-2 border text-sm font-bold ${statusPesanAbsen.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {statusPesanAbsen.tipe === 'sukses' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>} {statusPesanAbsen.teks}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-full bg-white rounded-md shadow-sm border border-slate-300 flex flex-col overflow-hidden">
                  <form onSubmit={handleSimpanAbsensi} className="w-full flex flex-col min-w-0">
                    <div className="w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                                <p className="text-xs text-slate-500">NISN: {siswa.nisn}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-2 sm:gap-4">
                                  {["Hadir", "Sakit", "Izin", "Alpha"].map((opsi) => (
                                    <label key={opsi} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer border transition-all ${absensi[siswa.id] === opsi ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-100'}`}>
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
                      <button type="submit" disabled={isSubmittingAbsen || siswaKelasAsli.length === 0} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md text-xs font-bold flex justify-center items-center gap-2 shadow-sm disabled:opacity-50">
                        {isSubmittingAbsen ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan Absensi
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* === TAB 3: JURNAL KBM === */}
            {activeTab === "jurnal" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Jurnal Mengajar</h3>
                    <p className="text-xs text-slate-500 mt-1">Laporan aktivitas KBM akan diserahkan ke Kepala Sekolah.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-md w-full sm:w-auto">
                      <CalendarDays size={16} className="text-slate-500"/>
                      <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-transparent w-full sm:w-auto text-sm font-bold text-slate-700 outline-none" />
                    </div>
                    <button type="button" onClick={() => setIsRiwayatJurnalOpen(true)} className="w-full sm:w-auto justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-2.5 sm:py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors">
                      <FileSpreadsheet size={14} /> Lihat Riwayat
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {statusPesanJurnal && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`w-full p-3 rounded-md flex items-center gap-2 border text-sm font-bold ${statusPesanJurnal.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {statusPesanJurnal.tipe === 'sukses' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>} {statusPesanJurnal.teks}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSimpanJurnal} className="space-y-5">
                  <div className="bg-blue-50/50 p-4 rounded-md border border-blue-100 flex items-start gap-3">
                    <ClipboardCheck size={20} className="text-blue-600 shrink-0 mt-0.5"/>
                    <p className="text-xs text-blue-700 mt-1 font-medium leading-relaxed">Pastikan materi dan uraian kegiatan diisi secara jelas karena ini akan divalidasi oleh Lembaga sebagai bentuk supervisi digital Anda.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Materi Pembelajaran <span className="text-rose-500">*</span></label>
                      <input type="text" required value={jurnal.materi} onChange={(e) => setJurnal({...jurnal, materi: e.target.value})} placeholder="Topik yang diajarkan hari ini..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Uraian Kegiatan Belajar <span className="text-rose-500">*</span></label>
                      <textarea required rows={4} value={jurnal.kegiatan} onChange={(e) => setJurnal({...jurnal, kegiatan: e.target.value})} placeholder="1. Pendahuluan... 2. Kegiatan Inti... 3. Penutup..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Hambatan <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
                        <textarea rows={3} value={jurnal.hambatan} onChange={(e) => setJurnal({...jurnal, hambatan: e.target.value})} placeholder="Kendala KBM..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"></textarea>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Solusi <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
                        <textarea rows={3} value={jurnal.solusi} onChange={(e) => setJurnal({...jurnal, solusi: e.target.value})} placeholder="Tindakan mengatasi kendala..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isSubmittingJurnal} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50">
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
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button type="button" onClick={() => setIsPengaturanNilaiOpen(true)} className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto">
                      <SlidersHorizontal size={14} /> Atur Indikator
                    </button>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-md flex-1 sm:flex-initial justify-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">KKM:</label>
                      <input type="number" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className="w-12 bg-white border border-slate-300 rounded text-center text-xs font-bold outline-none" />
                    </div>
                    <button type="button" onClick={handleDownloadExcel} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3 py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto">
                      <ArrowDownToLine size={14} /> Unduh CSV
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {statusPesanRekap && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`w-full p-3 rounded-md flex items-center gap-2 border text-sm font-bold ${statusPesanRekap.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {statusPesanRekap.tipe === 'sukses' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>} {statusPesanRekap.teks}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-full bg-white rounded-md shadow-sm border border-slate-300 flex flex-col overflow-hidden">
                  <form onSubmit={handleSimpanRekap} className="w-full flex flex-col min-w-0">
                    <div className="w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                      <button type="submit" disabled={isSubmittingRekap || siswaKelasAsli.length === 0} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md text-xs font-bold flex justify-center items-center gap-2 shadow-sm disabled:opacity-50">
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
                  <button type="button" onClick={() => setIsCbtModalOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-md text-sm font-bold flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto">
                    <Plus size={16}/> Pengaturan Ujian Baru
                  </button>
                </div>
                {daftarUjian.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {daftarUjian.map((ujian) => (
                      <div key={ujian.id} className="p-5 rounded-md border border-slate-200 bg-slate-50 relative group flex flex-col justify-between">
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
                          <button type="button" onClick={() => handleDownloadLJK(ujian)} className="flex justify-center items-center gap-1 text-[10px] font-bold bg-white border border-slate-200 py-1.5 rounded-md text-slate-600 hover:bg-slate-100">
                            <FileCheck size={12}/> Unduh LJK
                          </button>
                          <button type="button" onClick={() => bukaHasilUjian(ujian)} className="col-span-2 lg:col-span-1 flex justify-center items-center gap-1 text-[10px] font-bold bg-blue-100 border border-blue-200 py-1.5 rounded-md text-blue-700 hover:bg-blue-200">
                            <Eye size={12}/> Lihat Hasil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 border border-dashed border-slate-300 rounded-md text-center bg-slate-50 flex flex-col items-center">
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
                  <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium outline-none mb-5 focus:border-blue-500">
                    <option>Pilih Rubrik Asesmen...</option>
                    {daftarUjian.map(u => <option key={u.id}>Kunci Jawaban: {u.pengaturan.judul}</option>)}
                  </select>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 text-lg">Unggah LJK / Jawaban Siswa</h3>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleUploadLJK} />
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-md p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/80 transition-colors h-[250px]">
                    <UploadCloud size={48} className="text-blue-400 mb-4" />
                    <p className="font-bold text-slate-700 text-sm mb-1">Klik untuk mengunggah Berkas</p>
                    <p className="text-xs text-slate-500">Mendukung LJK Kertas (PNG/JPG) & PDF</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* ========================================================
          TAMPILAN 3: SAAT BUAT UJIAN BARU (EDITOR SOAL)
      ======================================================== */}
      {selectedClass && isEditorOpen && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-md shadow-sm border border-slate-200 p-5 md:p-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 pb-6 border-b border-slate-100 gap-4">
            <div>
              <h2 className={`text-xl font-bold text-slate-900 ${teachersFont.className}`}>{cbtForm.judul}</h2>
              <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mt-2">{cbtForm.jenisUjian}</p>
            </div>
            <button type="button" onClick={simpanUjianKeDatabase} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md text-sm font-bold shadow-sm flex items-center gap-2 transition-all w-full md:w-auto justify-center">
              <Save size={16} /> Simpan Soal
            </button>
          </div>
          <div className="space-y-6">
            {daftarSoal.map((soal, index) => (
              <div key={soal.id} className="p-5 border border-slate-200 rounded-md relative">
                <button type="button" onClick={() => hapusSoal(soal.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                <div className="flex gap-3 mb-4">
                  <span className="font-bold text-lg text-slate-700">{index + 1}.</span>
                  <textarea className="w-full bg-slate-50 border border-slate-200 p-3 rounded-md text-sm outline-none focus:border-blue-500 resize-none font-medium" rows={2} value={soal.pertanyaan} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].pertanyaan = e.target.value; setDaftarSoal(newSoal); }} placeholder="Ketik pertanyaan di sini..." />
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => tambahSoalManual("PG")} className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-md flex items-center gap-1"><Plus size={14}/> Pilihan Ganda</button>
              <button type="button" onClick={() => tambahSoalManual("Esai")} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-md flex items-center gap-1"><Plus size={14}/> Esai</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          SEMUA MODAL (POP-UP) DITEMPATKAN DI ROOT LEVEL INI
      ======================================================== */}
      
      {/* 1. Modal Buat Kelas Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-md shadow-xl w-full max-w-md overflow-hidden">
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

      {/* 2. Modal Riwayat Absensi */}
      <AnimatePresence>
        {isRiwayatAbsenOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-md shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><FileSpreadsheet size={20} className="text-indigo-600" /> Rekapitulasi Riwayat Absensi</h3>
                <button type="button" onClick={() => setIsRiwayatAbsenOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200"><X size={20}/></button>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto bg-slate-50">
                <div className="bg-white border border-slate-300 shadow-sm rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[600px] text-sm">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700 text-xs">
                        <th className="p-3 border-r border-slate-300 w-10 text-center">No</th>
                        <th className="p-3 border-r border-slate-300 w-32">Tanggal</th>
                        <th className="p-3 text-left">Detail Kehadiran Siswa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riwayatAbsenData.length > 0 ? (
                        riwayatAbsenData.map((item, idx) => {
                          const dataHadir = item.dataKehadiran || {};
                          const jumlahHadir = Object.values(dataHadir).filter(v => v === "Hadir").length;
                          
                          const getNama = (id: string) => {
                            const s = daftarSiswaGlobal.find(siswa => siswa.id === id);
                            return s ? s.nama : "Anonim";
                          };
                          
                          const sakit = Object.keys(dataHadir).filter(k => dataHadir[k] === "Sakit").map(getNama);
                          const izin = Object.keys(dataHadir).filter(k => dataHadir[k] === "Izin").map(getNama);
                          const alpha = Object.keys(dataHadir).filter(k => dataHadir[k] === "Alpha").map(getNama);

                          return (
                            <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                              <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500 align-top">{idx + 1}</td>
                              <td className="p-3 border-r border-slate-200 font-bold text-slate-700 align-top">{item.tanggal}</td>
                              <td className="p-3 align-top">
                                <div className="flex flex-wrap gap-2 mb-1.5">
                                  <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[11px] font-bold">Hadir: {jumlahHadir}</span>
                                  {sakit.length > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[11px] font-bold">Sakit: {sakit.length}</span>}
                                  {izin.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[11px] font-bold">Izin: {izin.length}</span>}
                                  {alpha.length > 0 && <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-md text-[11px] font-bold">Alpha: {alpha.length}</span>}
                                </div>
                                {(sakit.length > 0 || izin.length > 0 || alpha.length > 0) && (
                                  <div className="text-[11px] text-slate-600 mt-2 space-y-1">
                                    {sakit.length > 0 && <p><span className="font-bold text-amber-600">Sakit:</span> {sakit.join(", ")}</p>}
                                    {izin.length > 0 && <p><span className="font-bold text-blue-600">Izin:</span> {izin.join(", ")}</p>}
                                    {alpha.length > 0 && <p><span className="font-bold text-rose-600">Alpha:</span> {alpha.join(", ")}</p>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-sm font-bold text-slate-400">Belum ada riwayat absensi.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-md shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><FileSpreadsheet size={20} className="text-indigo-600" /> Riwayat Jurnal KBM</h3>
                <button type="button" onClick={() => setIsRiwayatJurnalOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200"><X size={20}/></button>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto bg-slate-50">
                <div className="bg-white border border-slate-300 shadow-sm rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse min-w-[800px] text-sm">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-300 font-bold text-slate-700 text-xs">
                        <th className="p-3 border-r border-slate-300 w-24">Tanggal</th>
                        <th className="p-3 border-r border-slate-300 w-48">Materi</th>
                        <th className="p-3 border-r border-slate-300">Kegiatan KBM</th>
                        <th className="p-3 border-r border-slate-300">Hambatan</th>
                        <th className="p-3">Solusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {riwayatJurnalData.length > 0 ? (
                        riwayatJurnalData.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-100 transition-colors text-xs text-slate-700">
                            <td className="p-3 border-r border-slate-200 whitespace-nowrap font-bold">{item.tanggal}</td>
                            <td className="p-3 border-r border-slate-200 font-bold text-slate-800">{item.materi}</td>
                            <td className="p-3 border-r border-slate-200 whitespace-pre-wrap leading-relaxed">{item.kegiatan}</td>
                            <td className="p-3 border-r border-slate-200 text-rose-600 italic">{item.hambatan || "-"}</td>
                            <td className="p-3 text-emerald-600 italic">{item.solusi || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-sm font-bold text-slate-400">Belum ada riwayat jurnal.</td>
                        </tr>
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-md shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Target size={20} className="text-blue-600"/> Pengaturan Ujian Baru</h3>
                <button type="button" onClick={() => setIsCbtModalOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md hover:bg-slate-200"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto bg-slate-50">
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-md shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-md shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
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