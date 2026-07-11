"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  FileSpreadsheet, Save, Loader2, CheckCircle2, AlertCircle, 
  Users, Calculator, Download, ArrowDownToLine
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, FormEvent } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface NilaiSiswa {
  harian: number;
  pts: number;
  pas: number;
  praktik: number;
}

export default function RekapNilaiGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  
  const [daftarKelas, setDaftarKelas] = useState<any[]>([]);
  const [kelasTerpilih, setKelasTerpilih] = useState("");
  const [daftarSiswa, setDaftarSiswa] = useState<any[]>([]);
  const [kkm, setKkm] = useState(75); 

  const [nilai, setNilai] = useState<Record<string, NilaiSiswa>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusPesan, setStatusPesan] = useState<{tipe: "sukses"|"error", teks: string} | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
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

  // PERBAIKAN: Menarik Data Historis Nilai dari Firestore
  useEffect(() => {
    const fetchSiswaDanNilai = async () => {
      if (!kelasTerpilih) return;
      
      const kelas = daftarKelas.find(k => k.id === kelasTerpilih);
      if (!kelas) return;

      // 1. Siapkan daftar siswa (Simulasi/Relasi)
      const mockSiswa = Array.from({ length: kelas.siswa || 0 }).map((_, i) => ({
        id: `siswa-${kelasTerpilih}-${i}`,
        nama: `Siswa ${i + 1} (${kelas.nama})`,
        nisn: `00${Math.floor(Math.random() * 100000000)}`
      }));
      setDaftarSiswa(mockSiswa);
      
      // 2. Siapkan Nilai Kosong
      let currentNilai: Record<string, NilaiSiswa> = {};
      mockSiswa.forEach(s => {
        currentNilai[s.id] = { harian: 0, pts: 0, pas: 0, praktik: 0 };
      });

      // 3. Tarik Data Historis dari Firestore untuk Mencegah Timpa Data
      try {
        const rekapRef = doc(db, "rekap_nilai", kelasTerpilih);
        const rekapSnap = await getDoc(rekapRef);
        
        if (rekapSnap.exists()) {
          const dataServer = rekapSnap.data();
          if (dataServer.kkm) setKkm(dataServer.kkm);
          if (dataServer.dataNilai) {
            // Gabungkan nilai lama dengan format nilai kosong
            currentNilai = { ...currentNilai, ...dataServer.dataNilai };
          }
        }
      } catch (error) {
        console.error("Gagal menarik data nilai historis:", error);
      }

      setNilai(currentNilai);
    };

    fetchSiswaDanNilai();
  }, [kelasTerpilih, daftarKelas]);

  const handleUbahNilai = (idSiswa: string, jenis: keyof NilaiSiswa, value: string) => {
    let numValue = parseInt(value) || 0;
    if (numValue > 100) numValue = 100; 
    if (numValue < 0) numValue = 0;

    setNilai(prev => ({
      ...prev,
      [idSiswa]: {
        ...prev[idSiswa],
        [jenis]: numValue
      }
    }));
  };

  const hitungNilaiAkhir = (dataNilai: NilaiSiswa) => {
    return Math.round((dataNilai.harian * 0.4) + (dataNilai.pts * 0.3) + (dataNilai.pas * 0.3));
  };

  // PERBAIKAN: Penanganan Error Timeout untuk Mencegah Infinite Loading
  const handleSimpanRekap = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid || !kelasTerpilih) return;
    
    setIsSubmitting(true);
    setStatusPesan(null);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 10000)
    );

    try {
      await Promise.race([
        setDoc(doc(db, "rekap_nilai", kelasTerpilih), {
          guruId: userUid,
          kelasId: kelasTerpilih,
          kkm: kkm,
          dataNilai: nilai, // Sekarang menyimpan seluruh nilai lama + baru
          terakhirDiperbarui: serverTimestamp()
        }, { merge: true }),
        timeoutPromise
      ]);
      
      setStatusPesan({ tipe: "sukses", teks: "Rekap Nilai berhasil disimpan dan disinkronisasi ke server." });
    } catch (error: any) {
      if (error.message === "Timeout") {
        setStatusPesan({ tipe: "error", teks: "Koneksi lambat. Gagal terhubung ke server." });
      } else {
        setStatusPesan({ tipe: "error", teks: "Gagal menyimpan rekap nilai. Pastikan koneksi stabil." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500" role="status" aria-live="polite">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" aria-hidden="true" />
        <p className="font-bold text-lg">Memuat Buku Nilai Digital...</p>
      </div>
    );
  }

  const siswaDievaluasi = daftarSiswa.filter(s => hitungNilaiAkhir(nilai[s.id] || {harian:0,pts:0,pas:0,praktik:0}) > 0);
  const siswaRemedial = siswaDievaluasi.filter(s => hitungNilaiAkhir(nilai[s.id]) < kkm).length;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-10">
      
      <header className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`} tabIndex={0}>
            <FileSpreadsheet className="text-blue-600" aria-hidden="true"/> Pengolahan Rekap Nilai
          </h1>
          <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Sistem akan otomatis menghitung Nilai Akhir (NA) berdasar bobot dan menyeleksi status kelulusan siswa sesuai KKM yang ditetapkan.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300">
            <ArrowDownToLine size={16} aria-hidden="true"/> Unduh Format Excel
          </button>
        </div>
      </header>

      <section aria-label="Pengaturan Tabel Nilai" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-5">
        <div className="flex-1">
          <label htmlFor="pilih-kelas" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Filter Kelas</label>
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
              <option value="">Belum ada kelas yang diampu</option>
            )}
          </select>
        </div>
        <div className="w-full md:w-48">
          <label htmlFor="input-kkm" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Batas KKM</label>
          <input 
            type="number" 
            id="input-kkm"
            value={kkm}
            onChange={(e) => setKkm(Number(e.target.value))}
            min="0" max="100"
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-center"
          />
        </div>
        
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex-1 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0" aria-hidden="true"><Calculator size={20}/></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status Analisis</p>
            <p className="text-sm font-bold text-slate-800">
              {siswaRemedial > 0 ? (
                <span className="text-rose-600">{siswaRemedial} Siswa Butuh Remedial</span>
              ) : (
                <span className="text-emerald-600">Seluruh Siswa Tuntas</span>
              )}
            </p>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {statusPesan && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`p-4 rounded-xl flex items-center gap-3 border ${statusPesan.tipe === 'sukses' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`} role="alert" aria-live="assertive">
            {statusPesan.tipe === 'sukses' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
            <p className="text-sm font-bold">{statusPesan.teks}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <section aria-label="Tabel Input Rekap Nilai" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSimpanRekap}>
          <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Buku Nilai Digital Kelas</caption>
              <thead>
                <tr className="bg-slate-900 text-[10px] uppercase tracking-widest text-slate-300 font-bold border-b border-slate-800">
                  <th scope="col" className="px-6 py-4 text-center w-16">No</th>
                  <th scope="col" className="px-6 py-4 w-64">Identitas Siswa</th>
                  <th scope="col" className="px-4 py-4 text-center">N. Harian <br/><span className="text-[9px] text-slate-500 font-normal">(40%)</span></th>
                  <th scope="col" className="px-4 py-4 text-center">N. PTS <br/><span className="text-[9px] text-slate-500 font-normal">(30%)</span></th>
                  <th scope="col" className="px-4 py-4 text-center">N. PAS <br/><span className="text-[9px] text-slate-500 font-normal">(30%)</span></th>
                  <th scope="col" className="px-4 py-4 text-center">Praktik <br/><span className="text-[9px] text-slate-500 font-normal">(Non-Kognitif)</span></th>
                  <th scope="col" className="px-6 py-4 text-center bg-blue-900 text-white border-l border-slate-700">Nilai Akhir <br/><span className="text-[9px] text-blue-300 font-normal">Kognitif</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftarSiswa.length > 0 ? (
                  daftarSiswa.map((siswa, idx) => {
                    const dataN = nilai[siswa.id] || { harian: 0, pts: 0, pas: 0, praktik: 0 };
                    const nilaiAkhir = hitungNilaiAkhir(dataN);
                    const tuntas = nilaiAkhir >= kkm;
                    const dinilai = nilaiAkhir > 0;

                    return (
                      <tr key={siswa.id} className="hover:bg-slate-50/70 transition-colors focus-within:bg-blue-50/30">
                        <td className="px-6 py-4 text-center text-sm font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{siswa.nama}</p>
                          <p className="text-xs text-slate-500 mt-0.5">NISN: {siswa.nisn}</p>
                        </td>
                        
                        <td className="px-4 py-4">
                          <label htmlFor={`harian-${siswa.id}`} className="sr-only">Nilai Harian {siswa.nama}</label>
                          <input 
                            type="number" id={`harian-${siswa.id}`} min="0" max="100"
                            value={dataN.harian || ""}
                            onChange={(e) => handleUbahNilai(siswa.id, 'harian', e.target.value)}
                            className="w-16 mx-auto block p-2 bg-slate-50 border border-slate-300 rounded-lg text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        
                        <td className="px-4 py-4">
                          <label htmlFor={`pts-${siswa.id}`} className="sr-only">Nilai PTS {siswa.nama}</label>
                          <input 
                            type="number" id={`pts-${siswa.id}`} min="0" max="100"
                            value={dataN.pts || ""}
                            onChange={(e) => handleUbahNilai(siswa.id, 'pts', e.target.value)}
                            className="w-16 mx-auto block p-2 bg-slate-50 border border-slate-300 rounded-lg text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <label htmlFor={`pas-${siswa.id}`} className="sr-only">Nilai PAS {siswa.nama}</label>
                          <input 
                            type="number" id={`pas-${siswa.id}`} min="0" max="100"
                            value={dataN.pas || ""}
                            onChange={(e) => handleUbahNilai(siswa.id, 'pas', e.target.value)}
                            className="w-16 mx-auto block p-2 bg-slate-50 border border-slate-300 rounded-lg text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <label htmlFor={`praktik-${siswa.id}`} className="sr-only">Nilai Praktik {siswa.nama}</label>
                          <input 
                            type="number" id={`praktik-${siswa.id}`} min="0" max="100"
                            value={dataN.praktik || ""}
                            onChange={(e) => handleUbahNilai(siswa.id, 'praktik', e.target.value)}
                            className="w-16 mx-auto block p-2 bg-slate-50 border border-slate-200 border-dashed rounded-lg text-center text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>

                        <td className={`px-6 py-4 text-center border-l border-slate-100 ${dinilai ? (tuntas ? 'bg-emerald-50/50' : 'bg-rose-50/50') : 'bg-slate-50/50'}`}>
                          <div className="flex flex-col items-center justify-center">
                            <span className={`text-lg font-black ${dinilai ? (tuntas ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400'}`}>
                              {nilaiAkhir}
                            </span>
                            {dinilai && (
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mt-1 ${tuntas ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {tuntas ? 'Tuntas' : 'Remedial'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <Users size={36} className="mx-auto text-slate-300 mb-3" aria-hidden="true"/>
                      <p className="text-sm font-bold text-slate-600">Siswa tidak ditemukan.</p>
                      <p className="text-xs text-slate-500 mt-1">Silakan pilih kelas lain yang memiliki data siswa aktif.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <p className="text-xs font-medium text-slate-500 hidden sm:block">
              Perubahan nilai akan disinkronisasikan langsung ke server dan otomatis terhubung dengan Modul Feedback AI.
            </p>
            <button 
              type="submit" 
              disabled={isSubmitting || daftarSiswa.length === 0}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              aria-label="Simpan seluruh rekap nilai ke database"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <Save size={18} aria-hidden="true"/>}
              Simpan Rekap Nilai
            </button>
          </div>
        </form>
      </section>

    </motion.main>
  );
}