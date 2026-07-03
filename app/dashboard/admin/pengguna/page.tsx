"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Trash2, ShieldCheck, Loader2, CheckCircle2, 
  XCircle, Coins, Lock, Unlock, Eye, X 
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE REAL-TIME
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenPenggunaAdmin() {
  const [activeTab, setActiveTab] = useState("aktif"); 
  const [isLoading, setIsLoading] = useState(true);
  
  // State Real-time dari Firebase
  const [daftarGuru, setDaftarGuru] = useState<any[]>([]);
  const [daftarPengajuan, setDaftarPengajuan] = useState<any[]>([]);

  // State untuk Modal Detail Guru
  const [detailGuru, setDetailGuru] = useState<any | null>(null);

  useEffect(() => {
    // 1. PULL REAL-TIME: Daftar Guru 
    const qUsers = query(collection(db, "users"), where("role", "==", "guru"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaftarGuru(users);
    });

    // 2. PULL REAL-TIME: Daftar Pengajuan Akun
    const qPengajuan = query(collection(db, "pengajuan_akun"), where("status", "==", "pending"));
    const unsubPengajuan = onSnapshot(qPengajuan, (snapshot) => {
      const pengajuan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaftarPengajuan(pengajuan);
      setIsLoading(false); 
    });

    return () => {
      unsubUsers();
      unsubPengajuan();
    };
  }, []);

  // ==========================================
  // FUNGSI KENDALI ADMIN
  // ==========================================

  // 1. ACC Akun Baru
  const handleAccAkun = async (pengajuan: any) => {
    const konfirmasi = confirm(`Apakah Anda yakin ingin meng-ACC akun untuk ${pengajuan.nama}?`);
    if (!konfirmasi) return;

    try {
      const targetUid = pengajuan.uid || pengajuan.id; 
      await setDoc(doc(db, "users", targetUid), {
        nama: pengajuan.nama,
        email: pengajuan.email,
        instansi: pengajuan.instansi,
        role: "guru",
        spesialisasi: "Bahasa Daerah",
        status: "Aktif",
        aiTokens: 10, // Alokasi token awal untuk guru baru
        createdAt: serverTimestamp()
      });

      await deleteDoc(doc(db, "pengajuan_akun", pengajuan.id));
      alert("Akun berhasil di-ACC! Guru telah diberikan 10.000 Token AI awal.");
    } catch (error) {
      console.error("Gagal melakukan ACC:", error);
      alert("Terjadi kesalahan saat memproses data ke Firestore.");
    }
  };

  // 2. Tolak Pengajuan
  const handleTolakAkun = async (id: string) => {
    if (!confirm("Tolak dan hapus pengajuan ini?")) return;
    try {
      await deleteDoc(doc(db, "pengajuan_akun", id));
    } catch (error) {
      console.error("Gagal menolak akun:", error);
    }
  };

  // 3. Update Token AI Guru
  const handleUpdateToken = async (id: string, currentTokens: number, nama: string) => {
    const input = prompt(`Atur ulang jumlah Token AI untuk ${nama} (Saat ini: ${currentTokens || 0}):`, currentTokens?.toString() || "0");
    if (input === null) return; 

    const newTokens = parseInt(input);
    if (isNaN(newTokens) || newTokens < 0) {
      alert("Masukkan angka yang valid (minimal 0)!");
      return;
    }

    try {
      await updateDoc(doc(db, "users", id), { aiTokens: newTokens });
    } catch (error) {
      console.error("Gagal update token:", error);
      alert("Gagal mengubah token. Periksa koneksi.");
    }
  };

  // 4. Toggle Status (Bekukan / Aktifkan)
  const handleToggleStatus = async (id: string, currentStatus: string, nama: string) => {
    const newStatus = currentStatus === "Aktif" ? "Dibekukan" : "Aktif";
    const konfirmasi = confirm(`Anda yakin ingin merubah status akun ${nama} menjadi: ${newStatus.toUpperCase()}?`);
    if (!konfirmasi) return;

    try {
      await updateDoc(doc(db, "users", id), { status: newStatus });
    } catch (error) {
      console.error("Gagal mengubah status:", error);
    }
  };

  // 5. Hapus Permanen
  const handleHapusGuru = async (id: string, nama: string) => {
    const konfirmasi = confirm(`PERINGATAN FATAL!\n\nApakah Anda yakin ingin MENGHAPUS PERMANEN seluruh data profil ${nama}? Tindakan ini tidak dapat dibatalkan.`);
    if (!konfirmasi) return;

    try {
      await deleteDoc(doc(db, "users", id));
      setDetailGuru(null); // Tutup modal jika sedang dibuka
    } catch (error) {
      console.error("Gagal menghapus akun:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Memuat Data Pengguna...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6 pb-10 relative">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Pengguna</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola akses, pembekuan akun, dan distribusi Token AI Pendidik.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg w-full md:w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
          <Search size={16} className="text-slate-400" />
          <input type="text" placeholder="Cari pendidik..." className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400" />
        </div>
      </div>

      {/* TABS KONTROL */}
      <div className="flex gap-6 border-b border-slate-200">
        <button onClick={() => setActiveTab("aktif")} className={`pb-3 text-sm font-bold transition-all relative ${activeTab === "aktif" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>
          Database Pendidik ({daftarGuru.length})
          {activeTab === "aktif" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("pengajuan")} className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === "pengajuan" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>
          Antrean Pengajuan
          {daftarPengajuan.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{daftarPengajuan.length}</span>}
          {activeTab === "pengajuan" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
      </div>

      {/* TAB 1: DAFTAR GURU AKTIF & KENDALI */}
      {activeTab === "aktif" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-5 py-4">Identitas Pendidik</th>
                  <th className="px-5 py-4">Status Akun</th>
                  <th className="px-5 py-4 text-center">Kuota AI</th>
                  <th className="px-5 py-4 text-center">Panel Kendali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {daftarGuru.length > 0 ? daftarGuru.map((guru) => (
                    <motion.tr key={guru.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${guru.status === 'Dibekukan' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-700'}`}>
                            {guru.nama ? guru.nama.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{guru.nama}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[150px]" title={guru.instansi}>{guru.instansi || "Instansi tidak diisi"}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border flex items-center gap-1 w-fit ${
                          guru.status === 'Dibekukan' 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {guru.status === 'Dibekukan' ? <Lock size={12} /> : <CheckCircle2 size={12} />} 
                          {guru.status || "Aktif"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-mono text-xs font-bold">
                          <Coins size={14} />
                          {(guru.aiTokens || 0).toLocaleString('id-ID')}
                        </div>
                      </td>
                      
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setDetailGuru(guru)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Lihat Detail Database">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => handleUpdateToken(guru.id, guru.aiTokens, guru.nama)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100" title="Atur Kuota Token">
                            <Coins size={16} />
                          </button>
                          <button onClick={() => handleToggleStatus(guru.id, guru.status || 'Aktif', guru.nama)} className={`p-2 rounded-lg transition-colors border border-transparent ${guru.status === 'Dibekukan' ? 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100'}`} title={guru.status === 'Dibekukan' ? 'Aktifkan Akun' : 'Bekukan Akun'}>
                            {guru.status === 'Dibekukan' ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                          <button onClick={() => handleHapusGuru(guru.id, guru.nama)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Hapus Permanen">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-500 text-sm">Belum ada pendidik yang aktif dalam database.</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 2: ANTREAN PENGAJUAN (Tetap sama, disesuaikan tampilannya) */}
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

      {/* OVERLAY MODAL DETAIL GURU */}
      <AnimatePresence>
        {detailGuru && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              {/* Header Modal */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>Detail Database Pendidik</h3>
                <button onClick={() => setDetailGuru(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              {/* Body Modal */}
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl shrink-0">
                    {detailGuru.nama.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{detailGuru.nama}</h4>
                    <p className="text-sm text-blue-600 font-medium">{detailGuru.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">ID Firestore</p>
                    <p className="text-xs font-mono text-slate-700 truncate" title={detailGuru.id}>{detailGuru.id}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Status Akun</p>
                    <p className={`text-xs font-bold ${detailGuru.status === 'Dibekukan' ? 'text-rose-600' : 'text-emerald-600'}`}>{detailGuru.status || 'Aktif'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Instansi</p>
                    <p className="text-xs font-medium text-slate-700 truncate">{detailGuru.instansi || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Spesialisasi</p>
                    <p className="text-xs font-medium text-slate-700">{detailGuru.spesialisasi || 'Bahasa Daerah'}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Sisa Token AI</p>
                    <p className="text-2xl font-bold text-amber-600 mt-0.5">{(detailGuru.aiTokens || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <Coins size={32} className="text-amber-300 opacity-50" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}