"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarDays, BookOpen, CheckCircle2, AlertCircle, 
  Users, Save, Loader2, ClipboardCheck, Clock
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, FormEvent } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function AdministrasiKelasGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"absensi" | "jurnal">("absensi");
  const [userUid, setUserUid] = useState<string | null>(null);
  
  // Data Master
  const [daftarKelas, setDaftarKelas] = useState<any[]>([]);
  const [kelasTerpilih, setKelasTerpilih] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  // State Absensi
  const [daftarSiswa, setDaftarSiswa] = useState<any[]>([]);
  const [absensi, setAbsensi] = useState<Record<string, string>>({});
  const [isSubmittingAbsen, setIsSubmittingAbsen] = useState(false);

  // State Jurnal KBM
  const [jurnal, setJurnal] = useState({
    materi: "",
    kegiatan: "",
    hambatan: "",
    solusi: ""
  });
  const [isSubmittingJurnal, setIsSubmittingJurnal] = useState(false);
  const [statusPesan, setStatusPesan] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        // Tarik daftar kelas yang diajar oleh guru ini
        const qKelas = query(collection(db, "manajemen_kelas"), where("guruId", "==", user.uid));
        const unsubKelas = onSnapshot(qKelas, (snapshot) => {
          const kelasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDaftarKelas(kelasData);
          if (kelasData.length > 0) setKelasTerpilih(kelasData[0].id);
          setIsLoading(false);
        });

        return () => unsubKelas();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Tarik data siswa jika kelas terpilih berubah (Simulasi: Menarik dari relasi peserta kelas)
  useEffect(() => {
    if (kelasTerpilih) {
      const kelas = daftarKelas.find(k => k.id === kelasTerpilih);
      if (kelas && kelas.peserta) {
        // Di aplikasi nyata, Anda bisa melakukan query ke 'users' dengan where('uid', 'in', kelas.peserta)
        // Untuk UI demo R&D, kita buat mock data berdasarkan jumlah peserta
        const mockSiswa = Array.from({ length: kelas.siswa || 0 }).map((_, i) => ({
          id: `siswa-${i}`,
          nama: `Siswa ${i + 1} (${kelas.nama})`,
          nisn: `00${Math.floor(Math.random() * 100000000)}`
        }));
        setDaftarSiswa(mockSiswa);
        
        // Reset state absensi default ke "Hadir"
        const defaultAbsen: Record<string, string> = {};
        mockSiswa.forEach(s => defaultAbsen[s.id] = "Hadir");
        setAbsensi(defaultAbsen);
      } else {
        setDaftarSiswa([]);
      }
    }
  }, [kelasTerpilih, daftarKelas]);

  const handleSimpanAbsensi = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid || !kelasTerpilih) return;
    
    setIsSubmittingAbsen(true);
    try {
      await addDoc(collection(db, "absensi_siswa"), {
        guruId: userUid,
        kelasId: kelasTerpilih,
        tanggal: tanggal,
        dataKehadiran: absensi,
        timestamp: serverTimestamp()
      });
      setStatusPesan({ tipe: "sukses", teks: "Data absensi harian berhasil disimpan." });
      setTimeout(() => setStatusPesan(null), 3000);
    } catch (error) {
      setStatusPesan({ tipe: "error", teks: "Gagal menyimpan absensi." });
    } finally {
      setIsSubmittingAbsen(false);
    }
  };

  const handleSimpanJurnal = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid || !kelasTerpilih) return;
    
    setIsSubmittingJurnal(true);
    try {
      const kelas = daftarKelas.find(k => k.id === kelasTerpilih);
      await addDoc(collection(db, "jurnal_kbm"), {
        guruId: userUid,
        kelasId: kelasTerpilih,
        mapel: kelas?.mapel || "Umum",
        tanggal: tanggal,
        ...jurnal,
        timestamp: serverTimestamp()
      });
      
      setJurnal({ materi: "", kegiatan: "", hambatan: "", solusi: "" });
      setStatusPesan({ tipe: "sukses", teks: "Jurnal KBM berhasil dikirim ke Kepala Sekolah." });
      setTimeout(() => setStatusPesan(null), 3000);
    } catch (error) {
      setStatusPesan({ tipe: "error", teks: "Gagal menyimpan jurnal KBM." });
    } finally {
      setIsSubmittingJurnal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500" role="status" aria-live="polite">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" aria-hidden="true" />
        <p className="font-bold text-lg">Memuat Modul Administrasi...</p>
      </div>
    );
  }

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-10">
      
      {/* Header Halaman */}
      <header className="border-b border-slate-200 pb-5">
        <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`} tabIndex={0}>
          <CalendarDays className="text-blue-600" aria-hidden="true"/> Administrasi Kelas
        </h1>
        <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
          Kelola kehadiran siswa dan catat jurnal Kegiatan Belajar Mengajar (KBM) secara digital. Laporan akan otomatis terhubung dengan dasbor Supervisi Lembaga.
        </p>
      </header>

      {/* Kontrol Utama: Pilih Kelas & Tanggal */}
      <section aria-label="Pengaturan Administrasi" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="pilih-kelas" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Pilih Kelas</label>
          <select 
            id="pilih-kelas"
            value={kelasTerpilih}
            onChange={(e) => setKelasTerpilih(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          >
            {daftarKelas.length > 0 ? (
              daftarKelas.map(kelas => (
                <option key={kelas.id} value={kelas.id}>{kelas.nama} - {kelas.mapel}</option>
              ))
            ) : (
              <option value="">Belum ada kelas</option>
            )}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="pilih-tanggal" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Tanggal Pelaksanaan</label>
          <input 
            type="date" 
            id="pilih-tanggal"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </section>

      {/* Tab Navigasi */}
      <nav aria-label="Tab Administrasi" className="flex border-b border-slate-200" role="tablist">
        <button 
          role="tab"
          aria-selected={activeTab === "absensi"}
          aria-controls="panel-absensi"
          id="tab-absensi"
          onClick={() => setActiveTab("absensi")}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all focus:outline-none focus:bg-slate-50 ${activeTab === "absensi" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
        >
          <Users size={18} aria-hidden="true"/> Absensi Harian
        </button>
        <button 
          role="tab"
          aria-selected={activeTab === "jurnal"}
          aria-controls="panel-jurnal"
          id="tab-jurnal"
          onClick={() => setActiveTab("jurnal")}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all focus:outline-none focus:bg-slate-50 ${activeTab === "jurnal" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
        >
          <BookOpen size={18} aria-hidden="true"/> Jurnal KBM
        </button>
      </nav>

      {/* Status Pesan Aksesibel */}
      <AnimatePresence>
        {statusPesan && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-xl flex items-center gap-3 border ${statusPesan.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}
            role="alert" aria-live="assertive"
          >
            {statusPesan.tipe === 'sukses' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
            <p className="text-sm font-bold">{statusPesan.teks}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        {/* PANEL 1: ABSENSI */}
        {activeTab === "absensi" && (
          <section id="panel-absensi" role="tabpanel" aria-labelledby="tab-absensi" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <form onSubmit={handleSimpanAbsensi}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">Tabel Presensi Siswa</caption>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                      <th scope="col" className="px-6 py-4 w-12 text-center">No</th>
                      <th scope="col" className="px-6 py-4">Nama Siswa</th>
                      <th scope="col" className="px-6 py-4 text-center">Keterangan Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {daftarSiswa.length > 0 ? (
                      daftarSiswa.map((siswa, idx) => (
                        <tr key={siswa.id} className="hover:bg-slate-50/50 transition-colors focus-within:bg-blue-50/30">
                          <td className="px-6 py-4 text-center text-sm font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-800">{siswa.nama}</p>
                            <p className="text-xs text-slate-500">NISN: {siswa.nisn}</p>
                          </td>
                          <td className="px-6 py-4">
                            <fieldset className="flex justify-center gap-2 sm:gap-4">
                              <legend className="sr-only">Pilih kehadiran untuk {siswa.nama}</legend>
                              {["Hadir", "Sakit", "Izin", "Alpha"].map((opsi) => (
                                <label key={opsi} className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-2 rounded-lg cursor-pointer border-2 transition-all ${absensi[siswa.id] === opsi ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-100'}`}>
                                  <input 
                                    type="radio" 
                                    name={`absen-${siswa.id}`} 
                                    value={opsi}
                                    checked={absensi[siswa.id] === opsi}
                                    onChange={(e) => setAbsensi(prev => ({ ...prev, [siswa.id]: e.target.value }))}
                                    className="w-4 h-4 accent-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                    aria-label={`${opsi} untuk ${siswa.nama}`}
                                  />
                                  <span className={`text-xs sm:text-sm font-bold ${absensi[siswa.id] === opsi ? 'text-blue-700' : 'text-slate-600'}`}>{opsi}</span>
                                </label>
                              ))}
                            </fieldset>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center">
                          <Users size={32} className="mx-auto text-slate-300 mb-2" aria-hidden="true"/>
                          <p className="text-sm font-bold text-slate-600">Siswa tidak ditemukan.</p>
                          <p className="text-xs text-slate-500 mt-1">Pilih kelas lain atau pastikan kelas memiliki peserta.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmittingAbsen || daftarSiswa.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  aria-label="Simpan Data Absensi Hari Ini"
                >
                  {isSubmittingAbsen ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <Save size={18} aria-hidden="true"/>}
                  Simpan Absensi
                </button>
              </div>
            </form>
          </section>
        )}

        {/* PANEL 2: JURNAL KBM */}
        {activeTab === "jurnal" && (
          <section id="panel-jurnal" role="tabpanel" aria-labelledby="tab-jurnal" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <form onSubmit={handleSimpanJurnal} className="p-5 md:p-8 space-y-6">
              
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                <ClipboardCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" aria-hidden="true"/>
                <div>
                  <h3 className="text-sm font-bold text-indigo-900">Petunjuk Pengisian</h3>
                  <p className="text-xs text-indigo-700 mt-1">Jurnal ini akan direkap secara otomatis dan diserahkan kepada Kepala Sekolah pada akhir bulan. Isi dengan jelas dan terstruktur.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="materi" className="block text-sm font-bold text-slate-700 mb-1.5">Materi Pembelajaran <span className="text-rose-500" aria-label="Wajib diisi">*</span></label>
                  <input 
                    type="text" 
                    id="materi"
                    required
                    value={jurnal.materi}
                    onChange={(e) => setJurnal(prev => ({...prev, materi: e.target.value}))}
                    placeholder="Contoh: Menelaah Struktur Teks Observasi..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="kegiatan" className="block text-sm font-bold text-slate-700 mb-1.5">Uraian Kegiatan Belajar <span className="text-rose-500" aria-label="Wajib diisi">*</span></label>
                  <textarea 
                    id="kegiatan"
                    required
                    rows={4}
                    value={jurnal.kegiatan}
                    onChange={(e) => setJurnal(prev => ({...prev, kegiatan: e.target.value}))}
                    placeholder="1. Pendahuluan... 2. Kegiatan Inti... 3. Penutup..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="hambatan" className="block text-sm font-bold text-slate-700 mb-1.5">Hambatan Kelas <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
                    <textarea 
                      id="hambatan"
                      rows={3}
                      value={jurnal.hambatan}
                      onChange={(e) => setJurnal(prev => ({...prev, hambatan: e.target.value}))}
                      placeholder="Kendala yang terjadi selama KBM berlangsung..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    ></textarea>
                  </div>
                  <div>
                    <label htmlFor="solusi" className="block text-sm font-bold text-slate-700 mb-1.5">Solusi / Tindak Lanjut <span className="text-slate-400 font-normal text-xs">(Opsional)</span></label>
                    <textarea 
                      id="solusi"
                      rows={3}
                      value={jurnal.solusi}
                      onChange={(e) => setJurnal(prev => ({...prev, solusi: e.target.value}))}
                      placeholder="Tindakan yang dilakukan untuk mengatasi hambatan..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmittingJurnal || !kelasTerpilih}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  aria-label="Kirim Jurnal KBM"
                >
                  {isSubmittingJurnal ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <Save size={18} aria-hidden="true"/>}
                  Kirim Jurnal KBM
                </button>
              </div>
            </form>
          </section>
        )}
      </div>

    </motion.main>
  );
}