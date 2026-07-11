"use client";

import { motion } from "framer-motion";
import { 
  Users, GraduationCap, BookOpen, Activity, Loader2, ArrowRight, 
  CheckCircle2, Clock, AlertTriangle, FileText, FileCheck2, BellRing 
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, orderBy, limit, doc } from "firebase/firestore";
import Link from "next/link";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function LembagaBeranda() {
  const [isLoading, setIsLoading] = useState(true);
  const [namaInstansi, setNamaInstansi] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  
  const [stats, setStats] = useState({
    totalGuru: 0,
    totalSiswa: 0,
    totalModul: 0,
    menungguValidasi: 0
  });

  const [logAktivitas, setLogAktivitas] = useState<any[]>([]);

  useEffect(() => {
    // Tanggal untuk Aksesibilitas Screen Reader
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('id-ID', dateOptions));

    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap: any) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const npsn = data.npsn || data.instansi; 
            const namaLembaga = data.namaLembaga || data.namaInstansi || `NPSN: ${npsn}`;
            
            setNamaInstansi(namaLembaga);

            if (npsn) {
              // 1. Hitung Total Guru
              const qGuru = query(collection(db, "users"), where("role", "==", "guru"), where("npsn", "==", npsn));
              const unsubGuru = onSnapshot(qGuru, (snap) => setStats(prev => ({ ...prev, totalGuru: snap.size })));

              // 2. Hitung Total Siswa
              const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn));
              const unsubSiswa = onSnapshot(qSiswa, (snap) => setStats(prev => ({ ...prev, totalSiswa: snap.size })));

              // 3. Data Modul & Aktivitas Guru
              const unsubModulTrigger = onSnapshot(qGuru, (guruSnap) => {
                const guruIds = guruSnap.docs.map(g => g.id);
                const guruMap = new Map(guruSnap.docs.map(g => [g.id, g.data().nama]));

                if (guruIds.length > 0) {
                  // Karena Firebase 'in' max 10, untuk skala R&D kita filter di Client Side
                  const qModul = query(collection(db, "modul_ajar"));
                  onSnapshot(qModul, (modulSnap) => {
                    const modulSekolahIni = modulSnap.docs
                      .map(d => ({ id: d.id, ...d.data() } as any))
                      .filter(m => guruIds.includes(m.userId));
                    
                    const menunggu = modulSekolahIni.filter(m => m.statusValidasi === "menunggu").length;
                    
                    setStats(prev => ({ 
                      ...prev, 
                      totalModul: modulSekolahIni.length,
                      menungguValidasi: menunggu
                    }));

                    // Generate Log Aktivitas Guru (Pembuatan Modul)
                    const logGuru = modulSekolahIni.map(m => ({
                      id: m.id,
                      tipe: 'guru',
                      aktor: guruMap.get(m.userId) || "Guru",
                      aksi: `Membuat Modul Ajar: ${m.mapel || m.topik}`,
                      timestamp: m.timestamp,
                      status: m.statusValidasi
                    }));

                    setLogAktivitas(logGuru.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 5));
                    setIsLoading(false);
                  });
                } else {
                  setIsLoading(false);
                }
              });

              return () => { unsubGuru(); unsubSiswa(); unsubModulTrigger(); };
            } else {
              setIsLoading(false);
            }
          }
        });
        return () => unsubProfil();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-purple-600" role="status" aria-live="polite">
        <Loader2 size={40} className="animate-spin text-purple-600 mb-4" aria-hidden="true" />
        <p className="font-bold text-lg text-slate-700 tracking-widest">Memuat Ekosistem...</p>
        <p className="text-sm mt-1 text-slate-500">Mengambil data dari database instansi</p>
        <span className="sr-only">Harap tunggu, dasbor sedang dimuat.</span>
      </div>
    );
  }

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* Banner Utama - Aksesibel */}
      <header className="bg-gradient-to-br from-[#2e1065] via-purple-900 to-indigo-900 rounded-3xl p-8 md:p-10 text-white shadow-lg shadow-purple-900/20 relative overflow-hidden" tabIndex={0}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" aria-hidden="true"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-purple-200 text-sm md:text-base font-medium mb-1">Pusat Komando Institusi,</p>
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${teachersFont.className}`}>
              Dasbor {namaInstansi}
            </h1>
            <p className="text-purple-200/90 max-w-xl text-sm md:text-base leading-relaxed mt-2">
              Pantau aktivitas pendidik, sebaran siswa, dan kualitas bahan ajar secara terpusat untuk memastikan ekosistem belajar yang optimal.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3 rounded-2xl text-center flex flex-col justify-center min-w-[150px]">
            <p className="text-xs text-purple-100 font-medium uppercase tracking-wider mb-1">Tanggal Sistem</p>
            <p className="text-sm font-bold text-white">{currentDate}</p>
          </div>
        </div>
      </header>

      {/* Notifikasi Tindakan Cepat */}
      {stats.menungguValidasi > 0 && (
        <section aria-labelledby="alert-validasi" className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm" role="alert" aria-live="assertive">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl shrink-0 mt-0.5" aria-hidden="true">
              <BellRing size={24} />
            </div>
            <div>
              <h2 id="alert-validasi" className="text-base font-bold text-amber-900">Tindakan Diperlukan: Validasi Dokumen</h2>
              <p className="text-sm text-amber-800 mt-1">
                Terdapat <strong className="text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded">{stats.menungguValidasi}</strong> modul ajar / bahan ajar baru yang menunggu persetujuan (ACC) dari Anda sebelum bisa diakses siswa.
              </p>
            </div>
          </div>
          <Link href="/dashboard/lembaga/bahan-ajar" className="shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-xl">
            <button className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm" aria-label={`Tinjau ${stats.menungguValidasi} dokumen sekarang`}>
              <FileCheck2 size={18} aria-hidden="true" /> Tinjau Sekarang
            </button>
          </Link>
        </section>
      )}

      {/* Kartu Metrik - Aksesibel */}
      <section aria-label="Metrik Utama Institusi" className="grid grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        
        <article className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-300 focus-within:ring-2 focus-within:ring-purple-500 transition-all group flex flex-col h-full relative overflow-hidden" tabIndex={0}>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true"><Users size={80}/></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-purple-50 text-purple-700 rounded-xl group-hover:scale-110 transition-transform" aria-hidden="true"><Users size={24} /></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Pendidik</span>
          </div>
          <h2 className={`text-4xl font-black text-slate-900 mb-1 relative z-10 ${teachersFont.className}`}>
            <span className="sr-only">Total pendidik terdaftar adalah </span>{stats.totalGuru}
          </h2>
          <p className="text-xs text-slate-600 font-medium mb-5 relative z-10">Guru terdaftar di institusi ini</p>
          <Link href="/dashboard/lembaga/guru" className="mt-auto flex items-center text-sm font-bold text-purple-700 hover:text-purple-900 gap-1.5 pt-4 border-t border-slate-100 focus:outline-none focus:underline" aria-label="Buka halaman kelola data guru">
            Kelola Guru <ArrowRight size={16} aria-hidden="true"/>
          </Link>
        </article>
      
        <article className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500 transition-all group flex flex-col h-full relative overflow-hidden" tabIndex={0}>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true"><GraduationCap size={80}/></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl group-hover:scale-110 transition-transform" aria-hidden="true"><GraduationCap size={24} /></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Siswa</span>
          </div>
          <h2 className={`text-4xl font-black text-slate-900 mb-1 relative z-10 ${teachersFont.className}`}>
            <span className="sr-only">Total siswa terdaftar adalah </span>{stats.totalSiswa}
          </h2>
          <p className="text-xs text-slate-600 font-medium mb-5 relative z-10">Peserta didik aktif tersinkronisasi</p>
          <Link href="/dashboard/lembaga/siswa" className="mt-auto flex items-center text-sm font-bold text-blue-700 hover:text-blue-900 gap-1.5 pt-4 border-t border-slate-100 focus:outline-none focus:underline" aria-label="Buka halaman kelola data siswa">
            Kelola Siswa <ArrowRight size={16} aria-hidden="true"/>
          </Link>
        </article>
      
        <article className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500 transition-all group flex flex-col h-full col-span-2 lg:col-span-1 relative overflow-hidden" tabIndex={0}>
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true"><BookOpen size={80}/></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform" aria-hidden="true"><BookOpen size={24} /></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Dokumen</span>
          </div>
          <h2 className={`text-4xl font-black text-slate-900 mb-1 relative z-10 ${teachersFont.className}`}>
            <span className="sr-only">Total dokumen bahan ajar adalah </span>{stats.totalModul}
          </h2>
          <p className="text-xs text-slate-600 font-medium mb-5 relative z-10">Bahan ajar & soal digenerate AI</p>
          <Link href="/dashboard/lembaga/bahan-ajar" className="mt-auto flex items-center text-sm font-bold text-emerald-700 hover:text-emerald-900 gap-1.5 pt-4 border-t border-slate-100 focus:outline-none focus:underline" aria-label="Buka halaman tinjauan dokumen">
            Tinjau Dokumen <ArrowRight size={16} aria-hidden="true"/>
          </Link>
        </article>

      </section>

      {/* Bagian Log Aktivitas */}
      <section aria-labelledby="log-heading" className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <header className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 id="log-heading" className={`text-lg font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
            <Activity size={20} className="text-purple-600" aria-hidden="true" /> Log Aktivitas Ekosistem
          </h2>
        </header>
        
        <div className="p-2">
          {logAktivitas.length > 0 ? (
            <ul className="divide-y divide-slate-50" role="list">
              {logAktivitas.map((log: any, idx: number) => (
                <li key={log.id || idx} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 rounded-xl focus-within:ring-2 focus-within:ring-purple-100 outline-none" tabIndex={0}>
                  <div className="mt-0.5 shrink-0" aria-hidden="true">
                    {log.tipe === 'guru' ? (
                      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100"><FileText size={18}/></div>
                    ) : (
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><Users size={18}/></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{log.aksi}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Oleh: <strong className="text-slate-800">{log.aktor}</strong> • 
                      <span className="text-slate-500 ml-1">
                        {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : 'Baru saja'} WIB
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 hidden md:block" aria-hidden="true">
                    {log.status === "disetujui" ? (
                       <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1"><CheckCircle2 size={12}/> Disetujui</span>
                    ) : log.status === "menunggu" ? (
                       <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1"><Clock size={12}/> Menunggu</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-slate-500">
              <AlertTriangle size={36} className="mb-4 text-slate-300" aria-hidden="true" />
              <p className="text-base font-bold text-slate-700">Belum ada aktivitas terekam.</p>
              <p className="text-sm mt-1 text-center max-w-sm">Riwayat pembuatan modul ajar oleh guru dan pendaftaran siswa akan muncul di sini.</p>
            </div>
          )}
        </div>
      </section>

    </motion.main>
  );
}