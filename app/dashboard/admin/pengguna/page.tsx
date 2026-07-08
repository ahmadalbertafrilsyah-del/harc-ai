"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Trash2, ShieldCheck, Loader2, CheckCircle2, 
  XCircle, Coins, Lock, Unlock, Eye, X, Building2, UserCircle, GraduationCap 
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE REAL-TIME
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenPenggunaAdmin() {
  const [activeTab, setActiveTab] = useState("lembaga"); 
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [daftarPengguna, setDaftarPengguna] = useState<any[]>([]);
  const [daftarPengajuan, setDaftarPengajuan] = useState<any[]>([]);
  const [detailPengguna, setDetailPengguna] = useState<any | null>(null);

  useEffect(() => {
    // 1. PULL REAL-TIME: Daftar Pengguna
    const qUsers = query(collection(db, "users"), where("role", "in", ["lembaga", "guru", "siswa"]));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaftarPengguna(users);
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
  // LOGIKA CROSS-REFERENCING (MENCARI NAMA LEMBAGA DARI ANGKA NPSN)
  // ==========================================
  const getNamaLembagaDariNPSN = (npsn: string) => {
    if (!npsn) return "NPSN Tidak Diketahui";
    // Cari akun lembaga yang punya NPSN ini
    const lembaga = daftarPengguna.find(u => u.role === "lembaga" && (u.npsn === npsn || u.instansi === npsn));
    // Jika ketemu, kembalikan teks nama lembaganya. Jika tidak, tampilkan angka NPSN-nya
    return lembaga ? (lembaga.namaLembaga || lembaga.namaInstansi) : `NPSN: ${npsn}`;
  };

  // ==========================================
  // LOGIKA PENCARIAN & PEMISAHAN TAB
  // ==========================================
  const filteredTabUsers = daftarPengguna.filter(user => {
    if (user.role !== activeTab) return false;
    const keyword = searchQuery.toLowerCase();
    
    // Teks instansi yang akan dicari
    const teksInstansi = user.role === "lembaga" 
      ? (user.namaLembaga || user.namaInstansi) 
      : getNamaLembagaDariNPSN(user.npsn || user.instansi);
    
    return (
      (user.nama || "").toLowerCase().includes(keyword) ||
      (user.email || "").toLowerCase().includes(keyword) ||
      (user.npsn || "").toLowerCase().includes(keyword) ||
      (teksInstansi || "").toLowerCase().includes(keyword)
    );
  });

  const filteredPengajuan = daftarPengajuan.filter(pengajuan => {
    const keyword = searchQuery.toLowerCase();
    const teksInstansi = pengajuan.role === "lembaga" 
      ? (pengajuan.namaLembaga || pengajuan.namaInstansi) 
      : getNamaLembagaDariNPSN(pengajuan.npsn || pengajuan.instansi);
    
    return (
      (pengajuan.nama || "").toLowerCase().includes(keyword) ||
      (pengajuan.email || "").toLowerCase().includes(keyword) ||
      (pengajuan.npsn || "").toLowerCase().includes(keyword) ||
      (teksInstansi || "").toLowerCase().includes(keyword)
    );
  });

  const countLembaga = daftarPengguna.filter(u => u.role === "lembaga").length;
  const countGuru = daftarPengguna.filter(u => u.role === "guru").length;
  const countSiswa = daftarPengguna.filter(u => u.role === "siswa").length;

  // ==========================================
  // FUNGSI KENDALI ADMIN (SINKRONISASI DATABASE)
  // ==========================================

  const handleAccAkun = async (pengajuan: any) => {
    const roleReq = pengajuan.role || "guru";
    const konfirmasi = confirm(`Apakah Anda yakin ingin meng-ACC akun ${roleReq.toUpperCase()} untuk ${pengajuan.nama}?`);
    if (!konfirmasi) return;

    try {
      const targetUid = pengajuan.uid || pengajuan.id; 
      
      const dataBaru: any = {
        nama: pengajuan.nama,
        email: pengajuan.email,
        role: roleReq,
        status: "Aktif",
        npsn: pengajuan.npsn || pengajuan.instansi || "", // Set konsisten
        instansi: pengajuan.npsn || pengajuan.instansi || "", // Tetap simpan sebagai angka untuk query relasi
        createdAt: serverTimestamp()
      };

      if (roleReq === "lembaga") {
        dataBaru.aiTokens = 50000;
        dataBaru.namaLembaga = pengajuan.namaLembaga || pengajuan.namaInstansi || ""; 
        dataBaru.namaInstansi = pengajuan.namaLembaga || pengajuan.namaInstansi || ""; 
        alert("Akun Lembaga berhasil di-ACC!");
      } else {
        dataBaru.aiTokens = 10000;
        dataBaru.spesialisasi = pengajuan.spesialisasi || "Pendidik";
        alert(`Akun ${roleReq.toUpperCase()} berhasil di-ACC!`);
      }

      await setDoc(doc(db, "users", targetUid), dataBaru);
      await deleteDoc(doc(db, "pengajuan_akun", pengajuan.id));
    } catch (error) {
      console.error("Gagal melakukan ACC:", error);
      alert("Terjadi kesalahan saat memproses data ke Firestore.");
    }
  };

  const handleTolakAkun = async (id: string) => {
    if (!confirm("Tolak dan hapus pengajuan ini?")) return;
    try {
      await deleteDoc(doc(db, "pengajuan_akun", id));
    } catch (error) {
      console.error("Gagal menolak akun:", error);
    }
  };

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
    }
  };

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

  const handleHapusPengguna = async (id: string, nama: string) => {
    const konfirmasi = confirm(`PERINGATAN FATAL!\n\nApakah Anda yakin ingin MENGHAPUS PERMANEN seluruh data profil ${nama}? Tindakan ini tidak dapat dibatalkan.`);
    if (!konfirmasi) return;

    try {
      await deleteDoc(doc(db, "users", id));
      setDetailPengguna(null); 
    } catch (error) {
      console.error("Gagal menghapus akun:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Memuat Database Pengguna...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6 pb-24 md:pb-10 relative">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Pengguna</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola akses, pembekuan akun, dan distribusi Token AI untuk Lembaga, Guru, dan Siswa.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg w-full md:w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
          <Search size={16} className="text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, npsn, lembaga..." 
            className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400" 
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* TABS KONTROL */}
      <div className="flex flex-wrap gap-6 border-b border-slate-200 overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveTab("lembaga")} className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === "lembaga" ? "text-blue-700" : "text-slate-500 hover:text-slate-700"}`}>
          <Building2 size={16} /> Lembaga ({countLembaga})
          {activeTab === "lembaga" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("guru")} className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === "guru" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>
          <UserCircle size={16} /> Guru ({countGuru})
          {activeTab === "guru" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("siswa")} className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === "siswa" ? "text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}>
          <GraduationCap size={16} /> Siswa ({countSiswa})
          {activeTab === "siswa" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("pengajuan")} className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === "pengajuan" ? "text-amber-700" : "text-slate-500 hover:text-slate-700"}`}>
          Antrean Pengajuan
          {filteredPengajuan.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{filteredPengajuan.length}</span>}
          {activeTab === "pengajuan" && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-amber-600 rounded-t-full"></span>}
        </button>
      </div>

      {/* TAB: DAFTAR PENGGUNA (Lembaga / Guru / Siswa) */}
      {(activeTab === "lembaga" || activeTab === "guru" || activeTab === "siswa") && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-5 py-4 text-center whitespace-nowrap">Identitas Pengguna</th>
                  <th className="px-5 py-4 text-center whitespace-nowrap">Status Akun</th>
                  <th className="px-5 py-4 text-center whitespace-nowrap">{activeTab === "siswa" ? "Tingkat/Kelas" : "Kuota AI"}</th>
                  <th className="px-5 py-4 text-center whitespace-nowrap">Panel Kendali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {filteredTabUsers.length > 0 ? filteredTabUsers.map((user) => (
                    <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                            user.status === 'Dibekukan' ? 'bg-slate-100 text-slate-500' : 
                            user.role === 'lembaga' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                            user.role === 'siswa' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                            'bg-indigo-100 text-indigo-700'
                          }`}>
                            {user.role === 'lembaga' ? <Building2 size={16} /> : 
                             user.role === 'siswa' ? <GraduationCap size={16} /> : 
                             (user.nama ? user.nama.charAt(0).toUpperCase() : "U")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800 text-sm">{user.nama}</p>
                            </div>
                            <p className="text-xs text-slate-500 truncate max-w-[250px]">
                              {user.role === 'lembaga' ? (user.namaLembaga || user.namaInstansi || `NPSN: ${user.npsn}`) : getNamaLembagaDariNPSN(user.npsn || user.instansi)}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border items-center gap-1 ${
                          user.status === 'Dibekukan' 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {user.status === 'Dibekukan' ? <Lock size={12} /> : <CheckCircle2 size={12} />} 
                          {user.status || "Aktif"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {user.role === "siswa" ? (
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                            {user.kelas || user.fase || "Siswa Aktif"}
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-mono text-xs font-bold">
                            <Coins size={14} />
                            {(user.aiTokens || 0).toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setDetailPengguna(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Lihat Detail Database">
                            <Eye size={16} />
                          </button>
                          
                          {user.role !== "siswa" && (
                            <button onClick={() => handleUpdateToken(user.id, user.aiTokens, user.nama)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100" title="Atur Kuota Token">
                              <Coins size={16} />
                            </button>
                          )}

                          <button onClick={() => handleToggleStatus(user.id, user.status || 'Aktif', user.nama)} className={`p-2 rounded-lg transition-colors border border-transparent ${user.status === 'Dibekukan' ? 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-100' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100'}`} title={user.status === 'Dibekukan' ? 'Aktifkan Akun' : 'Bekukan Akun'}>
                            {user.status === 'Dibekukan' ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                          <button onClick={() => handleHapusPengguna(user.id, user.nama)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Hapus Permanen">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500 text-sm">
                        {searchQuery ? `Tidak ada data yang sesuai pencarian.` : `Belum ada data ${activeTab} di sistem.`}
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB: ANTREAN PENGAJUAN */}
      {activeTab === "pengajuan" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-amber-50/50 border-b border-amber-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-4 whitespace-nowrap">Data Pemohon</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Tipe Pengajuan</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Waktu Pengajuan</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Tindakan Persetujuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {filteredPengajuan.length > 0 ? filteredPengajuan.map((pengajuan) => (
                    <motion.tr key={pengajuan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${pengajuan.role === 'lembaga' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                             {pengajuan.role === 'lembaga' ? <Building2 size={16} /> : <UserCircle size={16} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{pengajuan.nama}</p>
                            <p className="text-xs text-slate-500">{pengajuan.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${pengajuan.role === 'lembaga' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {pengajuan.role || "Guru"}
                        </span>
                        <p className="text-[11px] font-medium text-slate-700 max-w-[200px] truncate mx-auto">
                          {pengajuan.role === "lembaga" ? (pengajuan.namaLembaga || pengajuan.namaInstansi) : getNamaLembagaDariNPSN(pengajuan.npsn || pengajuan.instansi)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {pengajuan.timestamp ? new Date(pengajuan.timestamp.toDate()).toLocaleDateString('id-ID') : "Baru saja"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleTolakAkun(pengajuan.id)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-all flex items-center gap-1">
                            <XCircle size={14} /> Tolak
                          </button>
                          <button onClick={() => handleAccAkun(pengajuan)} className={`px-3 py-1.5 text-xs font-bold text-white shadow-sm rounded-lg transition-all flex items-center gap-1 ${pengajuan.role === 'lembaga' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}>
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
                          <p className="text-sm font-bold text-slate-700">Tidak ada pengajuan akun baru.</p>
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

      {/* OVERLAY MODAL DETAIL PENGGUNA */}
      <AnimatePresence>
        {detailPengguna && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className={`text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
                  {detailPengguna.role === 'lembaga' ? <Building2 size={18} className="text-blue-600"/> : 
                   detailPengguna.role === 'siswa' ? <GraduationCap size={18} className="text-emerald-600"/> :
                   <UserCircle size={18} className="text-indigo-600"/>}
                  Profil & Database Akun
                </h3>
                <button onClick={() => setDetailPengguna(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-5 md:p-6 space-y-5 overflow-y-auto">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center font-bold text-xl md:text-2xl shrink-0 ${
                    detailPengguna.role === 'lembaga' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                    detailPengguna.role === 'siswa' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    'bg-indigo-100 text-indigo-700'
                  }`}>
                    {detailPengguna.role === 'lembaga' ? <Building2 size={24} /> : 
                     detailPengguna.role === 'siswa' ? <GraduationCap size={24} /> : 
                     detailPengguna.nama.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">{detailPengguna.nama}</h4>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        detailPengguna.role === 'lembaga' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        detailPengguna.role === 'siswa' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {detailPengguna.role}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">{detailPengguna.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">ID Data Akun</p>
                    <p className="text-xs font-mono text-slate-700 truncate" title={detailPengguna.id}>{detailPengguna.id}</p>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Status Akun</p>
                    <p className={`text-xs font-bold ${detailPengguna.status === 'Dibekukan' ? 'text-rose-600' : 'text-emerald-600'}`}>{detailPengguna.status || 'Aktif'}</p>
                  </div>
                  
                  <div className={`bg-slate-50 p-3 rounded-xl border border-slate-100 ${detailPengguna.role === 'lembaga' ? 'sm:col-span-2' : ''}`}>
                    <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Instansi / Sekolah</p>
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {detailPengguna.role === 'lembaga' ? (detailPengguna.namaLembaga || detailPengguna.namaInstansi) : getNamaLembagaDariNPSN(detailPengguna.npsn || detailPengguna.instansi)}
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      NPSN Sekolah
                    </p>
                    <p className="text-xs font-medium text-slate-700 truncate">{detailPengguna.npsn || detailPengguna.instansi || 'Belum diatur'}</p>
                  </div>
                  
                  {detailPengguna.role === 'guru' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Spesialisasi</p>
                      <p className="text-xs font-medium text-slate-700">{detailPengguna.spesialisasi || 'Belum diatur'}</p>
                    </div>
                  )}

                  {detailPengguna.role === 'siswa' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Tingkat / Kelas</p>
                      <p className="text-xs font-medium text-slate-700">{detailPengguna.kelas || detailPengguna.fase || 'Belum diatur'}</p>
                    </div>
                  )}
                </div>

                {detailPengguna.role !== 'siswa' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shrink-0 mt-2">
                    <div>
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Sisa Token AI</p>
                      <p className="text-2xl font-bold text-amber-600 mt-0.5">{(detailPengguna.aiTokens || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <Coins size={32} className="text-amber-300 opacity-50" />
                  </div>
                )}
                
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}