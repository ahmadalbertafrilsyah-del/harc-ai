"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, MoreVertical, Edit, Trash2, ShieldCheck, Loader2, CheckCircle2, UserPlus, XCircle } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE SEBENARNYA (REAL-TIME)
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenPenggunaAdmin() {
  const [activeTab, setActiveTab] = useState("aktif"); // 'aktif' atau 'pengajuan'
  const [isLoading, setIsLoading] = useState(true);
  
  // State Real-time dari Firebase
  const [daftarGuru, setDaftarGuru] = useState<any[]>([]);
  const [daftarPengajuan, setDaftarPengajuan] = useState<any[]>([]);

  useEffect(() => {
    // 1. PULL REAL-TIME: Daftar Guru Aktif
    const qUsers = query(collection(db, "users"), where("role", "==", "guru"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaftarGuru(users);
    });

    // 2. PULL REAL-TIME: Daftar Pengajuan Akun (Status Pending)
    const qPengajuan = query(collection(db, "pengajuan_akun"), where("status", "==", "pending"));
    const unsubPengajuan = onSnapshot(qPengajuan, (snapshot) => {
      const pengajuan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaftarPengajuan(pengajuan);
      setIsLoading(false); // Matikan loading setelah fetch selesai
    });

    return () => {
      unsubUsers();
      unsubPengajuan();
    };
  }, []);

  // Fungsi ACC (Persetujuan) Akun
  const handleAccAkun = async (pengajuan: any) => {
    const konfirmasi = confirm(`Apakah Anda yakin ingin meng-ACC akun untuk ${pengajuan.nama}?`);
    if (!konfirmasi) return;

    try {
      // Kita menggunakan ID dokumen pengajuan yang sama persis dengan UID Firebase Auth guru tersebut
      const targetUid = pengajuan.uid || pengajuan.id; 

      // 1. Buat profil resmi di koleksi 'users' dengan UID yang sinkron
      await setDoc(doc(db, "users", targetUid), {
        nama: pengajuan.nama,
        email: pengajuan.email,
        instansi: pengajuan.instansi,
        role: "guru",
        spesialisasi: "Bahasa Daerah",
        status: "Aktif",
        createdAt: serverTimestamp()
      });

      // 2. Hapus dokumen dari antrean 'pengajuan_akun'
      await deleteDoc(doc(db, "pengajuan_akun", pengajuan.id));
      
      alert("Akun berhasil di-ACC! Guru kini sudah bisa login menggunakan password yang mereka buat.");
    } catch (error) {
      console.error("Gagal melakukan ACC:", error);
      alert("Terjadi kesalahan saat memproses data ke Firestore.");
    }
  };

  // Fungsi Tolak Pengajuan
  const handleTolakAkun = async (id: string) => {
    const konfirmasi = confirm("Tolak dan hapus pengajuan ini?");
    if (!konfirmasi) return;

    try {
      await deleteDoc(doc(db, "pengajuan_akun", id));
    } catch (error) {
      console.error("Gagal menolak akun:", error);
    }
  };

  // Fungsi Hapus Guru Aktif
  const handleHapusGuru = async (id: string, nama: string) => {
    const konfirmasi = confirm(`PERINGATAN! Cabut akses sistem untuk guru: ${nama}?`);
    if (!konfirmasi) return;

    try {
      await deleteDoc(doc(db, "users", id));
    } catch (error) {
      console.error("Gagal menghapus akun:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Memuat Data Pengguna...</p>
        <p className="text-sm">Sinkronisasi real-time dengan Firestore</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Pengguna</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola akses pendidik dan validasi pengajuan akun baru secara real-time.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg w-full md:w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
          <Search size={16} className="text-slate-400" />
          <input type="text" placeholder="Cari pendidik..." className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400" />
        </div>
      </div>

      {/* TABS KONTROL */}
      <div className="flex gap-6 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("aktif")}
          className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "aktif" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
        >
          Pendidik Aktif ({daftarGuru.length})
          {activeTab === "aktif" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button 
          onClick={() => setActiveTab("pengajuan")}
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === "pengajuan" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
        >
          Pengajuan Akun Baru
          {daftarPengajuan.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{daftarPengajuan.length}</span>
          )}
          {activeTab === "pengajuan" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
      </div>

      {/* TAB 1: DAFTAR GURU AKTIF */}
      {activeTab === "aktif" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-4">Identitas Guru</th>
                  <th className="px-6 py-4">Instansi</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {daftarGuru.length > 0 ? daftarGuru.map((guru) => (
                    <motion.tr key={guru.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {guru.nama ? guru.nama.charAt(0) : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{guru.nama}</p>
                            <p className="text-xs text-slate-500">{guru.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">{guru.instansi || "Tidak diketahui"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 size={12} /> {guru.status || "Aktif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleHapusGuru(guru.id, guru.nama)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Cabut Akses">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500 text-sm">Belum ada pendidik yang aktif.</td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 2: ANTREAN PENGAJUAN AKUN */}
      {activeTab === "pengajuan" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-amber-50/50 border-b border-amber-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-4">Data Pemohon</th>
                  <th className="px-6 py-4">Asal Instansi</th>
                  <th className="px-6 py-4 text-center">Waktu Pengajuan</th>
                  <th className="px-6 py-4 text-right">Tindakan Persetujuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {daftarPengajuan.length > 0 ? daftarPengajuan.map((pengajuan) => (
                    <motion.tr key={pengajuan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {pengajuan.nama ? pengajuan.nama.charAt(0) : "?"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{pengajuan.nama}</p>
                            <p className="text-xs text-slate-500">{pengajuan.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">{pengajuan.instansi}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {pengajuan.timestamp ? new Date(pengajuan.timestamp.toDate()).toLocaleDateString('id-ID') : "Baru saja"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleTolakAkun(pengajuan.id)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-all flex items-center gap-1">
                            <XCircle size={14} /> Tolak
                          </button>
                          <button onClick={() => handleAccAkun(pengajuan)} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 rounded-lg transition-all flex items-center gap-1">
                            <CheckCircle2 size={14} /> ACC Akses
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-center py-16 text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <ShieldCheck size={32} className="text-slate-300 mb-3" />
                          <p className="text-sm font-bold text-slate-700">Tidak ada pengajuan baru.</p>
                          <p className="text-xs text-slate-400 mt-1">Semua pendaftaran telah divalidasi.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

    </motion.div>
  );
}