"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Loader2, Key, ArrowLeft, CheckCircle2, X,
  CalendarDays, Save, Trash2, FileSpreadsheet, ArrowDownToLine,
  SlidersHorizontal,
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
  const [guruNama, setGuruNama] = useState<string>("");
  const [daftarSiswaGlobal, setDaftarSiswaGlobal] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClass, setNewClass] = useState({ nama: "", mapel: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("siswa"); 

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

  // === STATE REKAP NILAI ===
  const [kkm, setKkm] = useState(75); 
  const [nilai, setNilai] = useState<Record<string, Record<string, number>>>({});
  const [isPengaturanNilaiOpen, setIsPengaturanNilaiOpen] = useState(false);
  const [indikatorNilai, setIndikatorNilai] = useState([{ id: "harian", nama: "N. Harian", bobot: 40 }, { id: "pts", nama: "N. PTS", bobot: 30 }, { id: "pas", nama: "N. PAS", bobot: 30 }, { id: "praktik", nama: "Praktik", bobot: 0 } ]);
  const [isSubmittingRekap, setIsSubmittingRekap] = useState(false);
  const [statusPesanRekap, setStatusPesanRekap] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);


  // === 1. TARIK DATA AWAL ===
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        onSnapshot(doc(db, "users", user.uid), (docSnap) => { if(docSnap.exists()){ setGuruNpsn(docSnap.data().npsn || docSnap.data().instansi || ""); setGuruNama(docSnap.data().nama || ""); }});
        onSnapshot(query(collection(db, "manajemen_kelas"), where("guruId", "==", user.uid)), (snapshot) => {
          setKelasData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
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
      } catch {}
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
      } catch {}
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
    } catch {} finally { setIsSubmitting(false); }
  };

  const handleSimpanAbsensi = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingAbsen(true); setStatusPesanAbsen(null);
    try {
      await setDoc(doc(db, "absensi_siswa", `${selectedClass.id}_${tanggal}`), { guruId: userUid, kelasId: selectedClass.id, tanggal: tanggal, dataKehadiran: absensi, timestamp: serverTimestamp() }, { merge: true });
      setStatusPesanAbsen({ tipe: "sukses", teks: "Data absensi berhasil diperbarui." }); setTimeout(() => setStatusPesanAbsen(null), 3000);
    } catch { setStatusPesanAbsen({ tipe: "error", teks: "Gagal menyimpan absensi. Periksa koneksi." }); } finally { setIsSubmittingAbsen(false); }
  };

  const handleSimpanJurnal = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingJurnal(true); setStatusPesanJurnal(null);
    try {
      await addDoc(collection(db, "jurnal_kbm"), { guruId: userUid, namaGuru: guruNama || "", kelasId: selectedClass.id, namaKelas: selectedClass.nama || "", kelas: selectedClass.nama || "", mapel: selectedClass.mapel || "Umum", npsn: guruNpsn || "", tanggal: tanggal, ...jurnal, timestamp: serverTimestamp() });
      setJurnal({ materi: "", kegiatan: "", hambatan: "", solusi: "" });
      setStatusPesanJurnal({ tipe: "sukses", teks: "Jurnal KBM berhasil dikirim." }); setTimeout(() => setStatusPesanJurnal(null), 3000);
    } catch { setStatusPesanJurnal({ tipe: "error", teks: "Gagal mengirim jurnal. Periksa koneksi." }); } finally { setIsSubmittingJurnal(false); }
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
    } catch { setStatusPesanRekap({ tipe: "error", teks: "Gagal menyimpan rekap nilai. Periksa koneksi." }); } finally { setIsSubmittingRekap(false); }
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

  // === FITUR OFFLINE: CETAK KARTU ISYARAT (PLICKERS) ===
  const handlePrintKartuPlickers = (siswa: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Izinkan pop-up browser.");
    const qrTokenUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SISWA_${siswa.id}_${siswa.nama}`;
    const html = `
      <html><head><title>Kartu Isyarat - ${siswa.nama}</title><style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 30px; color: black; }
        .card-box { border: 4px dashed #333; padding: 40px; display: inline-block; border-radius: 20px; background: #fff; }
        h1 { font-size: 22px; margin-bottom: 5px; text-transform: uppercase; }
        p { font-size: 13px; color: #555; margin-bottom: 20px; }
        .instruction { margin-top: 20px; font-weight: bold; font-size: 13px; background: #f0f0f0; padding: 10px; border-radius: 8px; }
      </style></head><body>
        <div class="card-box">
          <h1>KARTU JAWABAN</h1>
          <p>Nama: <b>${siswa.nama}</b> | NISN: ${siswa.nisn || '-'}</p>
          <img src="${qrTokenUrl}" alt="QR Siswa" />
          <div class="instruction">Putar kartu ke arah atas untuk memilih opsi jawaban (A / B / C / D)</div>
        </div>
      </body></html>
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
      {selectedClass && (
        <>
          <button onClick={() => setSelectedClass(null)} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-sm">
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
            {["siswa", "absensi", "jurnal", "rekap"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-3 text-xs md:text-sm font-bold capitalize transition-all relative shrink-0 ${activeTab === tab ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}>
                {tab}
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
                        <th className="px-4 py-3 text-center w-40">Status & Kartu Offline</th>
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
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                                <CheckCircle2 size={11}/> Aktif
                              </span>
                              <button type="button" onClick={() => handlePrintKartuPlickers(siswa)} className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">
                                Cetak Kartu Offline
                              </button>
                            </div>
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
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                      {statusPesanAbsen ? (
                        <span className={`text-xs font-bold ${statusPesanAbsen.tipe === "sukses" ? "text-emerald-600" : "text-rose-600"}`}>{statusPesanAbsen.teks}</span>
                      ) : <span />}
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
                  <div className="pt-2 flex items-center justify-between gap-3">
                    {statusPesanJurnal ? (
                      <span className={`text-xs font-bold ${statusPesanJurnal.tipe === "sukses" ? "text-emerald-600" : "text-rose-600"}`}>{statusPesanJurnal.teks}</span>
                    ) : <span />}
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
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                      {statusPesanRekap ? (
                        <span className={`text-xs font-bold ${statusPesanRekap.tipe === "sukses" ? "text-emerald-600" : "text-rose-600"}`}>{statusPesanRekap.teks}</span>
                      ) : <span />}
                      <button type="submit" disabled={isSubmittingRekap} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50">
                        {isSubmittingRekap ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan Rekap Nilai
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

          </div>
        </>
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