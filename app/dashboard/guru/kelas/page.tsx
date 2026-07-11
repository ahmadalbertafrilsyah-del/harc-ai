"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, BookOpen, Plus, ChevronRight, GraduationCap, Loader2, Key, 
  ArrowLeft, UploadCloud, BrainCircuit, CheckCircle2, FileText, X, Clock, 
  CalendarDays, Save, Trash2, Target, Settings2, Database, Edit3, FileSpreadsheet, 
  ArrowDownToLine, Calculator, AlertCircle 
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef, FormEvent } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, where, getDoc, setDoc } from "firebase/firestore";
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

  // State Ujian CBT
  const [isCbtModalOpen, setIsCbtModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [metodePembuatan, setMetodePembuatan] = useState<"bank" | "manual" | "import">("manual");
  
  const [cbtForm, setCbtForm] = useState({
    judul: "", jenisUjian: "Asesmen Formatif", opsiPG: "A - D (4 Opsi)",
    jmlPgBiasa: 5, jmlPgKompleks: 0, jmlMenjodohkan: 0, jmlBenarSalah: 0, jmlIsianSingkat: 0, jmlUraian: 5,
    waktuMenit: 60, waktuMulai: "", waktuSelesai: ""
  });

  // State Rekap Nilai
  const [kkm, setKkm] = useState(75); 
  const [nilai, setNilai] = useState<Record<string, NilaiSiswa>>({});
  const [isSubmittingRekap, setIsSubmittingRekap] = useState(false);
  const [statusPesanRekap, setStatusPesanRekap] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Data Kelas & Profil
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

  // 2. Fetch Siswa
  useEffect(() => {
    if (guruNpsn) {
      const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", guruNpsn));
      const unsubSiswa = onSnapshot(qSiswa, (snap) => {
        setDaftarSiswaGlobal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubSiswa();
    }
  }, [guruNpsn]);

  // 3. Fetch Bank Soal
  useEffect(() => {
    if (selectedClass) {
      const qUjian = query(collection(db, "bank_soal"), where("kelasId", "==", selectedClass.id));
      const unsubUjian = onSnapshot(qUjian, (snapshot) => {
        setDaftarUjian(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubUjian();
    }
  }, [selectedClass]);

  // 4. Fetch Rekap Nilai
  useEffect(() => {
    const fetchRekapNilai = async () => {
      if (!selectedClass) return;
      try {
        const rekapRef = doc(db, "rekap_nilai", selectedClass.id);
        const rekapSnap = await getDoc(rekapRef);
        
        let currentNilai: Record<string, NilaiSiswa> = {};
        const siswaKelas = daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id));
        siswaKelas.forEach(s => { currentNilai[s.id] = { harian: 0, pts: 0, pas: 0, praktik: 0 }; });

        if (rekapSnap.exists()) {
          const dataServer = rekapSnap.data();
          if (dataServer.kkm) setKkm(dataServer.kkm);
          if (dataServer.dataNilai) { currentNilai = { ...currentNilai, ...dataServer.dataNilai }; }
        }
        setNilai(currentNilai);
      } catch (error) { console.error("Gagal menarik data nilai:", error); }
    };
    fetchRekapNilai();
  }, [selectedClass, daftarSiswaGlobal]);

  // --- HANDLERS REKAP NILAI ---
  const handleUbahNilai = (idSiswa: string, jenis: keyof NilaiSiswa, value: string) => {
    let numValue = parseInt(value) || 0;
    if (numValue > 100) numValue = 100; if (numValue < 0) numValue = 0;
    setNilai(prev => ({ ...prev, [idSiswa]: { ...prev[idSiswa], [jenis]: numValue } }));
  };

  const hitungNilaiAkhir = (dataNilai: NilaiSiswa) => {
    return Math.round((dataNilai.harian * 0.4) + (dataNilai.pts * 0.3) + (dataNilai.pas * 0.3));
  };

  const handleSimpanRekap = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid || !selectedClass) return;
    setIsSubmittingRekap(true); setStatusPesanRekap(null);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
    try {
      await Promise.race([
        setDoc(doc(db, "rekap_nilai", selectedClass.id), {
          guruId: userUid, kelasId: selectedClass.id, kkm: kkm, dataNilai: nilai, terakhirDiperbarui: serverTimestamp()
        }, { merge: true }), timeoutPromise
      ]);
      setStatusPesanRekap({ tipe: "sukses", teks: "Rekap Nilai berhasil disimpan." });
      setTimeout(() => setStatusPesanRekap(null), 3000);
    } catch (error: any) {
      setStatusPesanRekap({ tipe: "error", teks: error.message === "Timeout" ? "Koneksi lambat." : "Gagal menyimpan nilai." });
    } finally { setIsSubmittingRekap(false); }
  };

  const handleDownloadExcel = () => {
    const siswaKelas = daftarSiswaGlobal.filter(s => selectedClass.peserta?.includes(s.id));
    if (siswaKelas.length === 0) return alert("Belum ada siswa di kelas ini.");
    const headers = ["No", "NISN", "Nama Siswa", "Harian (40%)", "PTS (30%)", "PAS (30%)", "Praktik", "Nilai Akhir", "Status"];
    const rows = siswaKelas.map((s, idx) => {
      const n = nilai[s.id] || {harian:0, pts:0, pas:0, praktik:0};
      const na = hitungNilaiAkhir(n);
      return [idx + 1, `="${s.nisn || '-'}"`, `"${s.nama}"`, n.harian, n.pts, n.pas, n.praktik, na, na >= kkm ? "Tuntas" : "Remedial"].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Rekap_Nilai_${selectedClass.nama}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- HANDLERS KELAS & CBT ---
  const handleBuatKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.nama || !newClass.mapel || !userUid) return;
    setIsSubmitting(true);
    const kodeUnik = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await addDoc(collection(db, "manajemen_kelas"), {
        nama: newClass.nama, mapel: newClass.mapel, kode: kodeUnik, siswa: 0, peserta: [], status: "Aktif", guruId: userUid, timestamp: serverTimestamp()
      });
      setIsModalOpen(false); setNewClass({ nama: "", mapel: "" });
    } catch (error) { alert("Gagal membuat kelas."); } finally { setIsSubmitting(false); }
  };

  const hapusUjian = async (id: string) => { if(confirm("Yakin ingin menghapus ujian ini?")) await deleteDoc(doc(db, "bank_soal", id)); };
  
  const getInitialOpsi = () => {
    const num = cbtForm.opsiPG.includes("3") ? 3 : cbtForm.opsiPG.includes("5") ? 5 : 4;
    return Array.from({length: num}).map((_, i) => ({ id: ["A", "B", "C", "D", "E"][i], teks: "" }));
  };

  const tambahSoalManual = (tipe: "PG" | "Esai") => setDaftarSoal([...daftarSoal, { id: Date.now().toString(), tipe: tipe, pertanyaan: "", opsi: tipe === "PG" ? getInitialOpsi() : [], kunci: tipe === "PG" ? "A" : "" }]);
  const hapusSoal = (id: string) => setDaftarSoal(daftarSoal.filter(s => s.id !== id));

  const prosesLanjutPembuatan = () => {
    if(!cbtForm.judul || !cbtForm.waktuMulai || !cbtForm.waktuSelesai) { alert("Mohon isi Judul Ujian dan Jadwal Pelaksanaan."); return; }
    if (metodePembuatan !== "manual") { alert("Metode ini siap di versi berikutnya."); return; }
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

  if (isLoading) return <div className="w-full h-[70vh] flex flex-col justify-center items-center"><Loader2 size={40} className="animate-spin text-blue-600 mb-4" /></div>;

  if (selectedClass) {
    const realClassData = kelasData.find(k => k.id === selectedClass.id) || selectedClass;
    const siswaKelasAsli = daftarSiswaGlobal.filter(s => realClassData.peserta?.includes(s.id));
    const siswaDievaluasi = siswaKelasAsli.filter(s => hitungNilaiAkhir(nilai[s.id] || {harian:0,pts:0,pas:0,praktik:0}) > 0);
    const siswaRemedial = siswaDievaluasi.filter(s => hitungNilaiAkhir(nilai[s.id]) < kkm).length;
    
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-full md:max-w-6xl mx-auto space-y-6 pb-10 relative">
        <button onClick={() => { setSelectedClass(null); setIsEditorOpen(false); }} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-bold w-fit">
          <ArrowLeft size={16} /> Kembali ke Daftar Kelas
        </button>

        {!isEditorOpen ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-4 w-full">
              <div className="w-full min-w-0">
                <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className} truncate`}>{realClassData.nama}</h1>
                <p className="text-slate-500 text-sm mt-1">{realClassData.mapel} • {realClassData.peserta?.length || 0} Peserta Didik</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-xl flex items-center justify-between md:justify-start gap-4 shrink-0">
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Kode Akses</p>
                  <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">{realClassData.kode}</p>
                </div>
                <Key size={24} className="text-blue-300" />
              </div>
            </div>

            {/* TAB NAVIGASI */}
            <div className="flex gap-4 md:gap-6 border-b border-slate-200 custom-scrollbar pt-2 px-2 w-full">
              <button onClick={() => setActiveTab("siswa")} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === "siswa" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                Daftar Siswa {activeTab === "siswa" && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
              <button onClick={() => setActiveTab("rekap")} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === "rekap" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                Rekap Nilai {activeTab === "rekap" && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
              <button onClick={() => setActiveTab("cbt")} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === "cbt" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                E-Ujian (CBT) {activeTab === "cbt" && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
              <button onClick={() => setActiveTab("koreksi")} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === "koreksi" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                Koreksi AI LJK {activeTab === "koreksi" && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
            </div>

            <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[400px] w-full min-w-0">
              
              {/* TAB 1: SISWA */}
              {activeTab === "siswa" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                  <h3 className="font-bold text-slate-800 text-lg mb-6">Database Siswa (Berdasarkan NPSN)</h3>
                  {daftarSiswaGlobal.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {daftarSiswaGlobal.map(siswa => {
                        const isJoined = realClassData.peserta?.includes(siswa.id);
                        return (
                          <div key={siswa.id} className={`p-4 border rounded-xl flex justify-between items-center transition-all ${isJoined ? 'bg-blue-50/30 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center font-bold shadow-sm ${isJoined ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                {siswa.nama?.charAt(0).toUpperCase() || "S"}
                              </div>
                              <div className="truncate">
                                <p className="font-bold text-sm text-slate-800 truncate">{siswa.nama}</p>
                                <p className="text-[11px] text-slate-500 truncate">{siswa.kelas || "Kelas Belum Diatur"} • {siswa.email}</p>
                              </div>
                            </div>
                            {isJoined ? (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm shrink-0"><CheckCircle2 size={12}/> Masuk</span>
                            ) : (
                              <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2.5 py-1.5 rounded-lg shrink-0">Tidak</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 h-full">
                      <div className="text-slate-200 mb-4"><Users size={64} strokeWidth={1.5} /></div>
                      <h3 className="font-bold text-slate-700 text-lg">Belum ada data siswa di NPSN ini.</h3>
                      <p className="text-slate-500 text-sm mt-2 max-w-md">Siswa yang mendaftar menggunakan NPSN sekolah Anda akan otomatis terdeteksi di sini.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: REKAP NILAI (Dipindahkan ke sini, Full Responsif) */}
              {activeTab === "rekap" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col space-y-5 w-full min-w-0">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Buku Nilai Digital</h3>
                      <p className="text-xs text-slate-500 mt-1">Sistem otomatis menghitung Nilai Akhir Kognitif berdasar bobot.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">KKM:</label>
                        <input type="number" value={kkm} onChange={(e) => setKkm(Number(e.target.value))} className="w-12 bg-white border border-slate-300 rounded text-center text-xs font-bold outline-none" />
                      </div>
                      <button onClick={handleDownloadExcel} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                        <ArrowDownToLine size={14} /> Unduh CSV
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {statusPesanRekap && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`w-full p-3 rounded-xl flex items-center gap-2 border text-sm font-bold ${statusPesanRekap.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                        {statusPesanRekap.tipe === 'sukses' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>} {statusPesanRekap.teks}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="w-full bg-white rounded-xl shadow-sm border border-slate-300 flex flex-col overflow-hidden">
                    <form onSubmit={handleSimpanRekap} className="w-full flex flex-col min-w-0">
                      {/* PENGUNCI OVERFLOW: w-full overflow-x-auto */}
                      <div className="w-full overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-600 font-bold border-b border-slate-300">
                              <th className="px-3 py-3 text-center border-r border-slate-200 w-10">No</th>
                              <th className="px-4 py-3 border-r border-slate-200 min-w-[150px]">Nama Siswa</th>
                              <th className="px-2 py-3 text-center border-r border-slate-200">Harian <span className="block text-[8px] font-normal">(40%)</span></th>
                              <th className="px-2 py-3 text-center border-r border-slate-200">PTS <span className="block text-[8px] font-normal">(30%)</span></th>
                              <th className="px-2 py-3 text-center border-r border-slate-200">PAS <span className="block text-[8px] font-normal">(30%)</span></th>
                              <th className="px-2 py-3 text-center border-r border-slate-200">Praktik <span className="block text-[8px] font-normal">(Opsional)</span></th>
                              <th className="px-4 py-3 text-center bg-slate-200 border-l border-slate-300">Nilai Akhir <span className="block text-[8px] font-normal">Kognitif</span></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {siswaKelasAsli.length > 0 ? (
                              siswaKelasAsli.map((siswa, idx) => {
                                const dataN = nilai[siswa.id] || { harian: 0, pts: 0, pas: 0, praktik: 0 };
                                const nilaiAkhir = hitungNilaiAkhir(dataN);
                                const tuntas = nilaiAkhir >= kkm;
                                const dinilai = nilaiAkhir > 0;
                                return (
                                  <tr key={siswa.id} className="hover:bg-blue-50/20">
                                    <td className="px-3 py-2 text-center text-xs font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                                    <td className="px-4 py-2 border-r border-slate-200">
                                      <p className="text-xs font-bold text-slate-800 truncate">{siswa.nama}</p>
                                    </td>
                                    <td className="px-2 py-2 border-r border-slate-200">
                                      <input type="number" min="0" max="100" value={dataN.harian || ""} onChange={(e) => handleUbahNilai(siswa.id, 'harian', e.target.value)} className="w-14 mx-auto block p-1.5 border rounded text-center text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </td>
                                    <td className="px-2 py-2 border-r border-slate-200">
                                      <input type="number" min="0" max="100" value={dataN.pts || ""} onChange={(e) => handleUbahNilai(siswa.id, 'pts', e.target.value)} className="w-14 mx-auto block p-1.5 border rounded text-center text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </td>
                                    <td className="px-2 py-2 border-r border-slate-200">
                                      <input type="number" min="0" max="100" value={dataN.pas || ""} onChange={(e) => handleUbahNilai(siswa.id, 'pas', e.target.value)} className="w-14 mx-auto block p-1.5 border rounded text-center text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" />
                                    </td>
                                    <td className="px-2 py-2 border-r border-slate-200">
                                      <input type="number" min="0" max="100" value={dataN.praktik || ""} onChange={(e) => handleUbahNilai(siswa.id, 'praktik', e.target.value)} className="w-14 mx-auto block p-1.5 bg-slate-50 border-dashed border-slate-300 rounded text-center text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none" />
                                    </td>
                                    <td className={`px-4 py-2 text-center border-l border-slate-300 ${dinilai ? (tuntas ? 'bg-emerald-50/50' : 'bg-rose-50/50') : ''}`}>
                                      <span className={`text-base font-black ${dinilai ? (tuntas ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>{nilaiAkhir}</span>
                                    </td>
                                  </tr>
                                )
                              })
                            ) : (
                              <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm font-bold">Belum ada siswa yang masuk di kelas ini.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center w-full">
                        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
                           <Calculator size={14} /> {siswaRemedial > 0 ? <span className="text-rose-600">{siswaRemedial} Butuh Remedial</span> : <span className="text-emerald-600">Semua Tuntas</span>}
                        </div>
                        <button type="submit" disabled={isSubmittingRekap || siswaKelasAsli.length === 0} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-xs font-bold flex justify-center items-center gap-2 shadow-sm disabled:opacity-50">
                          {isSubmittingRekap ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Simpan Nilai
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: CBT */}
              {activeTab === "cbt" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">Bank Soal Ujian Kelas</h3>
                    <button onClick={() => setIsCbtModalOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
                      <Plus size={16}/> Pengaturan Ujian Baru
                    </button>
                  </div>
                  {daftarUjian.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {daftarUjian.map((ujian) => (
                        <div key={ujian.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 relative group">
                          <button onClick={() => hapusUjian(ujian.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                          <h4 className="font-bold text-slate-800 text-lg pr-8">{ujian.pengaturan.judul}</h4>
                          <p className="text-xs font-bold text-blue-600 mt-1 mb-3">{ujian.pengaturan.jenisUjian}</p>
                          <div className="flex gap-3 text-xs text-slate-500 mb-4">
                            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200"><Target size={12}/> {ujian.soal?.length || 0} Soal</span>
                            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200"><Clock size={12}/> {ujian.pengaturan.waktuMenit} Mnt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 border border-dashed border-slate-300 rounded-xl text-center bg-slate-50 flex flex-col items-center">
                      <Settings2 size={40} className="text-slate-300 mb-4" />
                      <p className="font-bold text-slate-700">Belum Ada Ujian di Kelas Ini</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4: KOREKSI AI */}
              {activeTab === "koreksi" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg"><BrainCircuit size={22} className="text-blue-600"/> Pengaturan Koreksi AI</h3>
                    <p className="text-sm text-slate-500 mb-5 leading-relaxed">Sistem AI akan memindai Lembar Jawaban (LJK) & mengoreksi jawaban uraian siswa secara otomatis berdasarkan rubrik.</p>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Pilih Rubrik Kunci Jawaban</label>
                    <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none mb-5 focus:border-blue-500">
                      <option>Pilih Rubrik Asesmen...</option>
                      {daftarUjian.map(u => <option key={u.id}>Kunci Jawaban: {u.pengaturan.judul}</option>)}
                    </select>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3 text-lg">Unggah LJK / Jawaban Siswa</h3>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleUploadLJK} />
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/80 transition-colors h-[250px]">
                      <UploadCloud size={48} className="text-blue-400 mb-4" />
                      <p className="font-bold text-slate-700 text-sm mb-1">Klik untuk mengunggah Berkas</p>
                      <p className="text-xs text-slate-500">Mendukung LJK Kertas (PNG/JPG) & PDF</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 pb-6 border-b border-slate-100 gap-4">
              <div>
                <h2 className={`text-xl font-bold text-slate-900 ${teachersFont.className}`}>{cbtForm.judul}</h2>
                <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-2">{cbtForm.jenisUjian}</p>
              </div>
              <button onClick={simpanUjianKeDatabase} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all w-full md:w-auto justify-center">
                <Save size={16} /> Simpan Soal
              </button>
            </div>
            <div className="space-y-6">
              {daftarSoal.map((soal, index) => (
                <div key={soal.id} className="p-5 border border-slate-200 rounded-2xl relative">
                  <button onClick={() => hapusSoal(soal.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                  <div className="flex gap-3 mb-4">
                    <span className="font-bold text-lg text-slate-700">{index + 1}.</span>
                    <textarea className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 resize-none font-medium" rows={2} value={soal.pertanyaan} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].pertanyaan = e.target.value; setDaftarSoal(newSoal); }} placeholder="Ketik pertanyaan di sini..." />
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => tambahSoalManual("PG")} className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1"><Plus size={14}/> Pilihan Ganda</button>
                <button onClick={() => tambahSoalManual("Esai")} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"><Plus size={14}/> Esai</button>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {isCbtModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-lg">Parameter Ujian Baru</h3>
                  <button onClick={() => setIsCbtModalOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Judul Ujian</label>
                      <input type="text" value={cbtForm.judul} onChange={(e) => setCbtForm({...cbtForm, judul: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Mulai</label>
                      <input type="datetime-local" value={cbtForm.waktuMulai} onChange={(e) => setCbtForm({...cbtForm, waktuMulai: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Selesai</label>
                      <input type="datetime-local" value={cbtForm.waktuSelesai} onChange={(e) => setCbtForm({...cbtForm, waktuSelesai: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button onClick={prosesLanjutPembuatan} className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center gap-2">Lanjutkan <ChevronRight size={16} /></button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // TAMPILAN JIKA BELUM MEMILIH KELAS
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-full md:max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Kelas & Akademik</h1>
          <p className="text-slate-500 text-sm mt-1">Pilih kelas di bawah ini untuk mengelola Rekap Nilai, CBT, dan Siswa.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 shrink-0">
          <Plus size={18} /> Buat Kelas Baru
        </button>
      </div>

      <AnimatePresence>
        {kelasData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0">
            {kelasData.map((kelas) => (
              <motion.div key={kelas.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedClass(kelas)}>
                <div className={`absolute top-0 left-0 w-full h-1.5 ${kelas.status === 'Aktif' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                <div className="p-5 pb-4 flex justify-between items-start">
                  <div className="min-w-0">
                    <h3 className={`text-xl font-bold text-slate-800 truncate ${teachersFont.className}`}>{kelas.nama}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 truncate">{kelas.mapel}</p>
                  </div>
                  <div className="bg-blue-50 text-blue-700 font-mono text-xs font-bold px-2 py-1 rounded border border-blue-100 shrink-0 ml-2">{kelas.kode}</div>
                </div>
                <div className="px-5 py-4 border-t border-slate-50">
                  <div className="flex justify-between items-center text-sm"><span className="text-slate-500 flex items-center gap-2"><Users size={16}/> Siswa Terdaftar</span><span className="font-bold text-slate-700">{kelas.peserta?.length || 0}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300 w-full">
            <GraduationCap size={48} className="mx-auto text-blue-200 mb-4" />
            <h3 className="font-bold text-slate-700">Belum Ada Kelas</h3>
          </div>
        )}
      </AnimatePresence>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-800">Buat Kelas Baru</h3></div>
            <form onSubmit={handleBuatKelas} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Nama Kelas</label><input type="text" required value={newClass.nama} onChange={(e) => setNewClass({...newClass, nama: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-500" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Mata Pelajaran</label><input type="text" required value={newClass.mapel} onChange={(e) => setNewClass({...newClass, mapel: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-500" /></div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 rounded-xl">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl">Simpan</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}