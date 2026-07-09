"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, BookOpen, Plus, ChevronRight, GraduationCap, Loader2, Key, ArrowLeft, UploadCloud, BrainCircuit, CheckCircle2, FileText, X, Clock, CalendarDays, Save, Trash2, Target, Settings2, Database, Edit3, FileUp, FileArchive } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where } from "firebase/firestore";
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

  const [isCbtModalOpen, setIsCbtModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [metodePembuatan, setMetodePembuatan] = useState<"bank" | "manual" | "import">("manual");
  
  const [cbtForm, setCbtForm] = useState({
    judul: "",
    jenisUjian: "Asesmen Formatif",
    opsiPG: "A - D (4 Opsi)",
    jmlPgBiasa: 5, jmlPgKompleks: 0, jmlMenjodohkan: 0, jmlBenarSalah: 0, jmlIsianSingkat: 0, jmlUraian: 5,
    waktuMenit: 60, waktuMulai: "", waktuSelesai: ""
  });

  const importFileRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Data Kelas & Profil Guru
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        
        // Tarik profil guru untuk dapat NPSN
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
           if(docSnap.exists()){
             setGuruNpsn(docSnap.data().npsn || docSnap.data().instansi || "");
           }
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

  // 2. Fetch Siswa berdasarkan NPSN (Terhubung Real-Time)
  useEffect(() => {
    if (guruNpsn) {
      const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", guruNpsn));
      const unsubSiswa = onSnapshot(qSiswa, (snap) => {
        setDaftarSiswaGlobal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubSiswa();
    }
  }, [guruNpsn]);

  // 3. Fetch Bank Soal khusus kelas terpilih
  useEffect(() => {
    if (selectedClass) {
      const qUjian = query(collection(db, "bank_soal"), where("kelasId", "==", selectedClass.id));
      const unsubUjian = onSnapshot(qUjian, (snapshot) => {
        setDaftarUjian(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubUjian();
    }
  }, [selectedClass]);

  const handleBuatKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.nama || !newClass.mapel || !userUid) return;
    setIsSubmitting(true);
    const kodeUnik = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await addDoc(collection(db, "manajemen_kelas"), {
        nama: newClass.nama, mapel: newClass.mapel, kode: kodeUnik,
        siswa: 0, peserta: [], modulAktif: 0, status: "Aktif", guruId: userUid, timestamp: serverTimestamp()
      });
      setIsModalOpen(false); setNewClass({ nama: "", mapel: "" });
    } catch (error) { alert("Gagal membuat kelas."); } finally { setIsSubmitting(false); }
  };

  const hapusUjian = async (id: string) => {
    if(confirm("Yakin ingin menghapus ujian ini?")) await deleteDoc(doc(db, "bank_soal", id));
  };

  const getInitialOpsi = () => {
    const num = cbtForm.opsiPG.includes("3") ? 3 : cbtForm.opsiPG.includes("5") ? 5 : 4;
    const labels = ["A", "B", "C", "D", "E"];
    return Array.from({length: num}).map((_, i) => ({ id: labels[i], teks: "" }));
  };

  const tambahSoalManual = (tipe: "PG" | "Esai") => {
    setDaftarSoal([...daftarSoal, { id: Date.now().toString(), tipe: tipe, pertanyaan: "", opsi: tipe === "PG" ? getInitialOpsi() : [], kunci: tipe === "PG" ? "A" : "" }]);
  };

  const hapusSoal = (id: string) => setDaftarSoal(daftarSoal.filter(s => s.id !== id));

  const prosesLanjutPembuatan = () => {
    if(!cbtForm.judul || !cbtForm.waktuMulai || !cbtForm.waktuSelesai) { 
      alert("Mohon isi Judul Ujian dan Jadwal Pelaksanaan (Mulai & Selesai) terlebih dahulu."); return; 
    }
    if (metodePembuatan === "bank" || metodePembuatan === "import") {
      alert("Metode ini siap di versi berikutnya."); return;
    }

    let soalBaru: any[] = [];
    for(let i=0; i<cbtForm.jmlPgBiasa; i++) soalBaru.push({ id: `pg_${Date.now()}_${i}`, tipe: "PG", pertanyaan: "", opsi: getInitialOpsi(), kunci: "A" });
    for(let i=0; i<cbtForm.jmlUraian; i++) soalBaru.push({ id: `esai_${Date.now()}_${i}`, tipe: "Esai", pertanyaan: "", opsi: [], kunci: "" });

    setDaftarSoal(soalBaru);
    setIsCbtModalOpen(false);
    setIsEditorOpen(true);
  };

  const simpanUjianKeDatabase = async () => {
    try {
      await addDoc(collection(db, "bank_soal"), {
        kelasId: selectedClass.id, pengaturan: cbtForm, soal: daftarSoal, guruId: userUid, timestamp: serverTimestamp()
      });
      alert("Ujian berhasil disimpan!");
      setIsEditorOpen(false); setActiveTab("cbt");
    } catch (error) { alert("Gagal menyimpan soal."); }
  };

  if (isLoading) return <div className="w-full h-[70vh] flex flex-col justify-center items-center"><Loader2 size={40} className="animate-spin text-blue-600 mb-4" /></div>;

  if (selectedClass) {
    // Pastikan data kelas di update realtime dari array aslinya
    const realClassData = kelasData.find(k => k.id === selectedClass.id) || selectedClass;
    
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-6xl mx-auto space-y-6 pb-10 relative">
        <button onClick={() => { setSelectedClass(null); setIsEditorOpen(false); }} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-bold mb-2 w-fit">
          <ArrowLeft size={16} /> Kembali ke Daftar Kelas
        </button>

        {!isEditorOpen ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>{realClassData.nama}</h1>
                <p className="text-slate-500 text-sm mt-1">{realClassData.mapel} • {realClassData.peserta?.length || 0} Peserta Didik</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 px-5 py-3 rounded-xl flex items-center justify-between md:justify-start gap-4">
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Kode Akses</p>
                  <p className="text-2xl font-mono font-bold text-blue-700 tracking-widest">{realClassData.kode}</p>
                </div>
                <Key size={24} className="text-blue-300" />
              </div>
            </div>

            <div className="flex gap-4 md:gap-6 border-b border-slate-200 overflow-x-auto custom-scrollbar pt-2 px-2">
              <button onClick={() => setActiveTab("siswa")} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === "siswa" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                Daftar Siswa {activeTab === "siswa" && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
              <button onClick={() => setActiveTab("cbt")} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === "cbt" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                E-Ujian (CBT) {activeTab === "cbt" && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
              <button onClick={() => setActiveTab("koreksi")} className={`pb-3 text-sm font-bold shrink-0 relative transition-colors ${activeTab === "koreksi" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                Koreksi Otomatis AI {activeTab === "koreksi" && <motion.span layoutId="activeTab" className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600"></motion.span>}
              </button>
            </div>

            <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
              
              {/* TAB SISWA REALTIME */}
              {activeTab === "siswa" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                  <h3 className="font-bold text-slate-800 text-lg mb-6">Database Siswa (Berdasarkan NPSN)</h3>
                  {daftarSiswaGlobal.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {daftarSiswaGlobal.map(siswa => {
                        const isJoined = realClassData.peserta?.includes(siswa.id);
                        return (
                          <div key={siswa.id} className={`p-4 border rounded-xl flex justify-between items-center transition-all ${isJoined ? 'bg-blue-50/30 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${isJoined ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                {siswa.nama?.charAt(0).toUpperCase() || "S"}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800">{siswa.nama}</p>
                                <p className="text-[11px] text-slate-500">{siswa.kelas || "Kelas Belum Diatur"} • {siswa.email}</p>
                              </div>
                            </div>
                            {isJoined ? (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"><CheckCircle2 size={12}/> Bergabung</span>
                            ) : (
                              <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2.5 py-1.5 rounded-lg">Belum Masuk</span>
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

              {/* TAB CBT */}
              {activeTab === "cbt" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">Bank Soal Ujian</h3>
                    <button onClick={() => setIsCbtModalOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
                      <Plus size={16}/> Pengaturan Ujian Baru
                    </button>
                  </div>
                  
                  {daftarUjian.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {daftarUjian.map((ujian) => (
                        <div key={ujian.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all group relative">
                          <button onClick={() => hapusUjian(ujian.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors p-1"><Trash2 size={18} /></button>
                          <h4 className="font-bold text-slate-800 text-lg pr-8">{ujian.pengaturan.judul}</h4>
                          <p className="text-xs font-bold text-blue-600 mt-1 mb-3">{ujian.pengaturan.jenisUjian}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
                            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200"><Target size={12}/> {ujian.soal?.length || 0} Soal</span>
                            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200"><Clock size={12}/> {ujian.pengaturan.waktuMenit} Menit</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 border border-dashed border-slate-300 rounded-xl text-center bg-slate-50/50 flex flex-col items-center justify-center min-h-[250px]">
                      <Settings2 size={40} className="text-slate-300 mb-4" />
                      <p className="text-base font-bold text-slate-700 mb-1">Belum Ada Ujian</p>
                      <p className="text-sm text-slate-500 max-w-md mx-auto">Klik tombol di atas untuk mengatur spesifikasi dan membuat soal CBT.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB KOREKSI AI */}
              {activeTab === "koreksi" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg"><BrainCircuit size={22} className="text-blue-600"/> Pengaturan Koreksi AI</h3>
                    <p className="text-sm text-slate-500 mb-5 leading-relaxed">AI akan memindai LJK & mengoreksi jawaban siswa secara presisi.</p>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-2">Standar Penilaian (Rubrik)</label>
                    <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none mb-5 focus:border-blue-500">
                      <option>Pilih Rubrik Evaluasi...</option><option>Standar Kemenag</option><option>Standar Kemdikbud</option>
                    </select>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3 text-lg">Unggah LJK / Jawaban Siswa</h3>
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/80 transition-colors h-[250px]">
                      <UploadCloud size={48} className="text-blue-400 mb-4" />
                      <p className="font-bold text-slate-700 text-sm mb-1">Klik untuk mengunggah Berkas</p>
                      <p className="text-xs text-slate-500">Mendukung format PDF, PNG, JPG</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-100 gap-4">
              <div>
                <h2 className={`text-xl md:text-2xl font-bold text-slate-900 ${teachersFont.className} leading-tight`}>{cbtForm.judul}</h2>
                <p className="text-sm text-slate-500 mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs"><Clock size={12}/> {cbtForm.waktuMenit} Menit</span>
                  <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs"><Target size={12}/> {cbtForm.jenisUjian}</span>
                </p>
              </div>
              <button onClick={simpanUjianKeDatabase} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm flex justify-center items-center gap-2 transition-all">
                <Save size={18} /> Simpan Ujian
              </button>
            </div>

            <div className="space-y-6 md:space-y-8">
              {daftarSoal.map((soal, index) => (
                <div key={soal.id} className="p-5 md:p-6 border border-slate-200 rounded-2xl bg-white shadow-sm relative group">
                  <button onClick={() => hapusSoal(soal.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors p-2 bg-slate-50 rounded-lg hover:bg-rose-50"><Trash2 size={16} /></button>
                  <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-6">
                    <span className="font-bold text-lg md:text-xl text-slate-700 mt-1">{index + 1}.</span>
                    <textarea className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-blue-500 resize-none font-medium" rows={2} value={soal.pertanyaan} onChange={(e) => { const newSoal = [...daftarSoal]; newSoal[index].pertanyaan = e.target.value; setDaftarSoal(newSoal); }} />
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-100">
                <button onClick={() => tambahSoalManual("PG")} className="px-5 py-2.5 bg-blue-50 text-blue-700 text-sm font-bold rounded-xl"><Plus size={16}/> Pilihan Ganda</button>
                <button onClick={() => tambahSoalManual("Esai")} className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl"><Plus size={16}/> Uraian / Esai</button>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {isCbtModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
                <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                  <h3 className={`font-bold text-slate-800 flex items-center gap-2 text-lg ${teachersFont.className}`}><FileText size={20} className="text-blue-600" /> Pengaturan Ujian Baru</h3>
                  <button onClick={() => setIsCbtModalOpen(false)} className="text-slate-400 bg-slate-100 p-1.5 rounded-md"><X size={20}/></button>
                </div>
                <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Pilih Sumber Soal Ujian</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                      <div onClick={() => setMetodePembuatan("manual")} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-2 ${metodePembuatan === "manual" ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                        <Edit3 size={24} className={metodePembuatan === "manual" ? "text-blue-600" : "text-slate-400"} />
                        <div><p className="text-sm font-bold">Buat Manual</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Judul Ujian / Materi</label>
                      <input type="text" value={cbtForm.judul} onChange={(e) => setCbtForm({...cbtForm, judul: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-rose-800 mb-2">Jenis Ujian</label>
                      <select value={cbtForm.jenisUjian} onChange={(e) => setCbtForm({...cbtForm, jenisUjian: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-rose-500 shadow-sm">
                        <option>Ulangan Harian</option><option>Asesmen Formatif</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button type="button" onClick={() => prosesLanjutPembuatan()} className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl">Lanjutkan <ChevronRight size={18} /></button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Kelas & Akademik</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola data peserta didik, rancang set CBT, dan evaluasi hasil belajar.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2">
          <Plus size={18} /> Buat Kelas Baru
        </button>
      </div>
      <AnimatePresence>
        {kelasData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kelasData.map((kelas) => (
              <motion.div key={kelas.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer" onClick={() => setSelectedClass(kelas)}>
                <div className={`absolute top-0 left-0 w-full h-1.5 ${kelas.status === 'Aktif' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                <div className="p-5 pb-4 flex justify-between items-start">
                  <div>
                    <h3 className={`text-xl font-bold text-slate-800 ${teachersFont.className}`}>{kelas.nama}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">{kelas.mapel}</p>
                  </div>
                  <div className="bg-blue-50 text-blue-700 font-mono text-xs font-bold px-2 py-1 rounded border border-blue-100">{kelas.kode}</div>
                </div>
                <div className="px-5 py-4 border-t border-slate-50">
                  <div className="flex justify-between items-center text-sm"><span className="text-slate-500 flex items-center gap-2"><Users size={16}/> Jumlah Siswa Terdaftar</span><span className="font-bold text-slate-700">{kelas.peserta?.length || 0}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
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