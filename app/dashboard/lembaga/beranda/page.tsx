"use client";

import { motion } from "framer-motion";
import { 
  Users, GraduationCap, BookOpen, Activity, ArrowRight, 
  CheckCircle2, Clock, AlertTriangle, FileText, FileCheck2, BellRing 
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import Link from "next/link";
import { MemuatHalaman } from "@/components/Memuat";
import { kirimNotifikasiPwa } from "@/lib/notifikasiPwa";

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
  const menungguAwalRef = useRef<number | null>(null);

  useEffect(() => {
    // Tanggal untuk Aksesibilitas Screen Reader
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('id-ID', dateOptions));

    const waktuMs = (m: any) => {
      const t = m.createdAt || m.timestamp; // generator menulis createdAt
      if (!t) return 0;
      if (typeof t.toMillis === "function") return t.toMillis();
      if (t.seconds) return t.seconds * 1000;
      return typeof t === "number" ? t : 0;
    };

    const auth = getAuth();
    let unsubProfil: (() => void) | undefined;
    let unsubGuru: (() => void) | undefined;
    let unsubSiswa: (() => void) | undefined;
    let unsubModulTrigger: (() => void) | undefined;
    let unsubModul: (() => void) | undefined;

    const bersihkanListenerData = () => {
      unsubGuru?.(); unsubGuru = undefined;
      unsubSiswa?.(); unsubSiswa = undefined;
      unsubModulTrigger?.(); unsubModulTrigger = undefined;
      unsubModul?.(); unsubModul = undefined;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubProfil?.();
      unsubProfil = undefined;
      bersihkanListenerData();

      if (!user) {
        setNamaInstansi("");
        setStats({ totalGuru: 0, totalSiswa: 0, totalModul: 0, menungguValidasi: 0 });
        setLogAktivitas([]);
        setIsLoading(false);
        return;
      }

      unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap: any) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const npsn = data.npsn || data.instansi;
        const namaLembaga = data.namaLembaga || data.namaInstansi || `NPSN: ${npsn}`;

        setNamaInstansi(namaLembaga);

        // Bersihkan listener data lama sebelum membuat yang baru (mencegah kebocoran)
        bersihkanListenerData();

        if (npsn) {
          // 1. Hitung Total Guru
          const qGuru = query(collection(db, "users"), where("role", "==", "guru"), where("npsn", "==", npsn));
          unsubGuru = onSnapshot(qGuru, (snap) => setStats(prev => ({ ...prev, totalGuru: snap.size })));

          // 2. Hitung Total Siswa
          const qSiswa = query(collection(db, "users"), where("role", "==", "siswa"), where("npsn", "==", npsn));
          unsubSiswa = onSnapshot(qSiswa, (snap) => setStats(prev => ({ ...prev, totalSiswa: snap.size })));

          // 3. Data Modul & Aktivitas Guru
          unsubModulTrigger = onSnapshot(qGuru, (guruSnap) => {
            const guruIds = guruSnap.docs.map(g => g.id);
            const guruMap = new Map(guruSnap.docs.map(g => [g.id, g.data().nama]));

            // Bersihkan listener modul sebelumnya agar tidak menumpuk (mencegah kebocoran)
            unsubModul?.(); unsubModul = undefined;

            if (guruIds.length > 0) {
              // Karena Firebase 'in' max 10, untuk skala R&D kita filter di Client Side
              unsubModul = onSnapshot(collection(db, "modul_ajar"), (modulSnap) => {
                const modulSekolahIni = modulSnap.docs
                  .map(d => ({ id: d.id, ...d.data() } as any))
                  .filter(m => guruIds.includes(m.userId));

                const menunggu = modulSekolahIni.filter(m => m.statusValidasi === "menunggu").length;
                if (menungguAwalRef.current !== null && menunggu > menungguAwalRef.current) {
                  void kirimNotifikasiPwa({
                    judul: "Perangkat Ajar Baru Menunggu ACC",
                    isi: `Terdapat ${menunggu} perangkat pembelajaran menunggu validasi Anda.`,
                    url: "/dashboard/lembaga/bahan-ajar",
                  });
                }
                menungguAwalRef.current = menunggu;

                setStats(prev => ({
                  ...prev,
                  totalModul: modulSekolahIni.length,
                  menungguValidasi: menunggu
                }));

                // Generate Log Aktivitas Guru (Pembuatan Modul Ajar)
                const logGuru = modulSekolahIni.map(m => ({
                  id: m.id,
                  tipe: 'guru',
                  aktor: guruMap.get(m.userId) || "Guru",
                  aksi: `Membuat Modul Ajar: ${m.mapel || m.topik}`,
                  waktu: waktuMs(m),
                  status: m.statusValidasi
                }));

                setLogAktivitas(logGuru.sort((a, b) => b.waktu - a.waktu).slice(0, 5));
                setIsLoading(false);
              });
            } else {
              setIsLoading(false);
            }
          });
        } else {
          setIsLoading(false);
        }
      });
    });

    return () => { unsubscribeAuth(); unsubProfil?.(); bersihkanListenerData(); };
  }, []);

  if (isLoading) {
    return <MemuatHalaman label="Memuat Ekosistem..." subLabel="Mengambil data dari database instansi" />;
  }

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-5 md:space-y-7 pb-4">
      
      {/* Banner Utama - Aksesibel */}
      <header className="bg-gradient-to-br from-[#2e1065] via-purple-900 to-indigo-900 rounded-2xl md:rounded-3xl p-5 sm:p-7 md:p-10 text-white shadow-lg shadow-purple-900/20 relative overflow-hidden" tabIndex={0}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" aria-hidden="true"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
          <div className="min-w-0">
            <p className="text-purple-200 text-xs sm:text-sm md:text-base font-medium mb-1">Pusat Komando Institusi,</p>
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 break-words ${teachersFont.className}`}>
              Dasbor {namaInstansi}
            </h1>
            <p className="text-purple-200/90 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed mt-2">
              Pantau aktivitas pendidik, sebaran siswa, dan kualitas bahan ajar secara terpusat untuk memastikan ekosistem belajar yang optimal.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 sm:px-5 py-3 rounded-2xl text-center flex flex-col justify-center w-full md:w-auto md:min-w-[160px] shrink-0">
            <p className="text-[10px] sm:text-xs text-purple-100 font-medium uppercase tracking-wider mb-0.5 sm:mb-1">Tanggal Sistem</p>
            <p className="text-xs sm:text-sm font-bold text-white">{currentDate}</p>
          </div>
        </div>
      </header>

      {/* Notifikasi Tindakan Cepat */}
      {stats.menungguValidasi > 0 && (
        <section aria-labelledby="alert-validasi" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm" role="alert" aria-live="assertive">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="p-2.5 sm:p-3 bg-amber-100 text-amber-600 rounded-xl shrink-0 mt-0.5" aria-hidden="true">
              <BellRing size={22} />
            </div>
            <div className="min-w-0">
              <h2 id="alert-validasi" className="text-sm sm:text-base font-bold text-amber-900">Tindakan Diperlukan: Validasi Dokumen</h2>
              <p className="text-xs sm:text-sm text-amber-800 mt-1">
                Terdapat <strong className="text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded">{stats.menungguValidasi}</strong> modul ajar / bahan ajar baru yang menunggu persetujuan (ACC) dari Anda sebelum bisa diakses siswa.
              </p>
            </div>
          </div>
          <Link href="/dashboard/lembaga/bahan-ajar" className="w-full sm:w-auto shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-xl">
            <button className="w-full sm:w-auto px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm" aria-label={`Tinjau ${stats.menungguValidasi} dokumen sekarang`}>
              <FileCheck2 size={17} aria-hidden="true" /> Tinjau Sekarang
            </button>
          </Link>
        </section>
      )}

      {/* Kartu Metrik - Aksesibel & Simetris */}
      <section aria-label="Metrik Utama Institusi" className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        
        <article className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-300 focus-within:ring-2 focus-within:ring-purple-500 transition-all group flex flex-col h-full relative overflow-hidden" tabIndex={0}>
          <div className="hidden sm:block absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true"><Users size={80}/></div>
          <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4 relative z-10">
            <div className="p-2.5 sm:p-3 bg-purple-50 text-purple-700 rounded-xl group-hover:scale-110 transition-transform shrink-0" aria-hidden="true"><Users size={20} /></div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md border border-slate-200 truncate">Pendidik</span>
          </div>
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-1 relative z-10 tabular-nums ${teachersFont.className}`}>
            <span className="sr-only">Total pendidik terdaftar adalah </span>{stats.totalGuru}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 font-medium mb-4 sm:mb-5 relative z-10">Guru terdaftar di institusi ini</p>
          <Link href="/dashboard/lembaga/guru" className="mt-auto flex items-center text-xs sm:text-sm font-bold text-purple-700 hover:text-purple-900 gap-1.5 pt-3 sm:pt-4 border-t border-slate-100 focus:outline-none focus:underline" aria-label="Buka halaman kelola data guru">
            Kelola Guru <ArrowRight size={15} aria-hidden="true"/>
          </Link>
        </article>
      
        <article className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500 transition-all group flex flex-col h-full relative overflow-hidden" tabIndex={0}>
          <div className="hidden sm:block absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true"><GraduationCap size={80}/></div>
          <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4 relative z-10">
            <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-700 rounded-xl group-hover:scale-110 transition-transform shrink-0" aria-hidden="true"><GraduationCap size={20} /></div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md border border-slate-200 truncate">Siswa</span>
          </div>
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-1 relative z-10 tabular-nums ${teachersFont.className}`}>
            <span className="sr-only">Total siswa terdaftar adalah </span>{stats.totalSiswa}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 font-medium mb-4 sm:mb-5 relative z-10">Peserta didik aktif tersinkronisasi</p>
          <Link href="/dashboard/lembaga/siswa" className="mt-auto flex items-center text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 gap-1.5 pt-3 sm:pt-4 border-t border-slate-100 focus:outline-none focus:underline" aria-label="Buka halaman kelola data siswa">
            Kelola Siswa <ArrowRight size={15} aria-hidden="true"/>
          </Link>
        </article>
      
        <article className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500 transition-all group flex flex-col h-full col-span-2 lg:col-span-1 relative overflow-hidden" tabIndex={0}>
          <div className="hidden sm:block absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity" aria-hidden="true"><BookOpen size={80}/></div>
          <div className="flex justify-between items-start gap-2 mb-3 sm:mb-4 relative z-10">
            <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform shrink-0" aria-hidden="true"><BookOpen size={20} /></div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md border border-slate-200 truncate">Dokumen</span>
          </div>
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-1 relative z-10 tabular-nums ${teachersFont.className}`}>
            <span className="sr-only">Total dokumen bahan ajar adalah </span>{stats.totalModul}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 font-medium mb-4 sm:mb-5 relative z-10">Bahan ajar & soal digenerate AI</p>
          <Link href="/dashboard/lembaga/bahan-ajar" className="mt-auto flex items-center text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-900 gap-1.5 pt-3 sm:pt-4 border-t border-slate-100 focus:outline-none focus:underline" aria-label="Buka halaman tinjauan dokumen">
            Tinjau Dokumen <ArrowRight size={15} aria-hidden="true"/>
          </Link>
        </article>

      </section>

      {/* Bagian Log Aktivitas */}
      <section aria-labelledby="log-heading" className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <header className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 id="log-heading" className={`text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
            <Activity size={20} className="text-purple-600 shrink-0" aria-hidden="true" /> Log Aktivitas Ekosistem
          </h2>
        </header>
        
        <div className="p-2">
          {logAktivitas.length > 0 ? (
            <ul className="divide-y divide-slate-50" role="list">
              {logAktivitas.map((log: any, idx: number) => (
                <li key={log.id || idx} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 rounded-xl focus-within:ring-2 focus-within:ring-purple-100 outline-none" tabIndex={0}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0" aria-hidden="true">
                      {log.tipe === 'guru' ? (
                        <div className="p-2 sm:p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100"><FileText size={17}/></div>
                      ) : (
                        <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><Users size={17}/></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 break-words">{log.aksi}</p>
                      <p className="text-[11px] sm:text-xs text-slate-600 mt-1">
                        Oleh: <strong className="text-slate-800">{log.aktor}</strong> • 
                        <span className="text-slate-500 ml-1">
                          {log.waktu ? `${new Date(log.waktu).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})} • ${new Date(log.waktu).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB` : 'Baru saja'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 pl-11 sm:pl-0" aria-hidden="true">
                    {log.status === "disetujui" ? (
                       <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 inline-flex items-center gap-1"><CheckCircle2 size={12}/> Disetujui</span>
                    ) : log.status === "menunggu" ? (
                       <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 inline-flex items-center gap-1"><Clock size={12}/> Menunggu</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-slate-500 px-4">
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