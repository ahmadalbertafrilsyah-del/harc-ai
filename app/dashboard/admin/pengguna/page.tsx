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
  const [isProcessingAcc, setIsProcessingAcc] = useState(false);
  
  const [daftarPengguna, setDaftarPengguna] = useState<any[]>([]);
  const [daftarPengajuan, setDaftarPengajuan] = useState<any[]>([]);
  const [detailPengguna, setDetailPengguna] = useState<any | null>(null);

  useEffect(() => {
    const qUsers = query(collection(db, "users"), where("role", "in", ["lembaga", "guru", "siswa"]));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaftarPengguna(users);
    });

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

  const getNamaLembagaDariNPSN = (npsn: string) => {
    if (!npsn) return "NPSN Tidak Diketahui";
    const lembaga = daftarPengguna.find(u => u.role === "lembaga" && (u.npsn === npsn || u.instansi === npsn));
    return lembaga ? (lembaga.namaLembaga || lembaga.namaInstansi) : `NPSN: ${npsn}`;
  };

  const filteredTabUsers = daftarPengguna.filter(user => {
    if (user.role !== activeTab) return false;
    const keyword = searchQuery.toLowerCase();
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

  const handleAccAkun = async (pengajuan: any) => {
    const roleReq = pengajuan.role || "guru";
    const konfirmasi = confirm(`Apakah Anda yakin ingin meng-ACC akun ${roleReq.toUpperCase()} untuk ${pengajuan.nama}?`);
    if (!konfirmasi) return;

    setIsProcessingAcc(true);

    try {
      const targetUid = pengajuan.uid || pengajuan.id; 
      
      const dataBaru: any = {
        nama: pengajuan.nama,
        email: pengajuan.email,
        role: roleReq,
        status: "Aktif",
        npsn: pengajuan.npsn || pengajuan.instansi || "", 
        instansi: pengajuan.npsn || pengajuan.instansi || "", 
        createdAt: serverTimestamp()
      };

      if (roleReq === "lembaga") {
        dataBaru.aiTokens = 50000;
        dataBaru.namaLembaga = pengajuan.namaLembaga || pengajuan.namaInstansi || ""; 
        dataBaru.namaInstansi = pengajuan.namaLembaga || pengajuan.namaInstansi || ""; 
      } else {
        dataBaru.aiTokens = 10000;
        dataBaru.spesialisasi = pengajuan.spesialisasi || "Pendidik";
      }

      await setDoc(doc(db, "users", targetUid), dataBaru);
      await deleteDoc(doc(db, "pengajuan_akun", pengajuan.id));

      try {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pengajuan.email,
            nama: pengajuan.nama,
            role: roleReq.toUpperCase(),
            passwordAwal: null
          })
        });

        if (!response.ok) throw new Error("Gagal mengirim email.");
        alert(`Akun ${roleReq.toUpperCase()} berhasil di-ACC dan email konfirmasi telah dikirim!`);
      } catch (emailError) {
        console.error("Gagal mengirim email:", emailError);
        alert(`Akun berhasil di-ACC, namun pengiriman email otomatis gagal.`);
      }

    } catch (error) {
      console.error("Gagal melakukan ACC:", error);
      alert("Terjadi kesalahan saat memproses data ke database.");
    } finally {
      setIsProcessingAcc(false);
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
      alert("Masukkan angka yang valid!");
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
    if (!confirm(`Ubah status akun ${nama} menjadi ${newStatus.toUpperCase()}?`)) return;

    try {
      await updateDoc(doc(db, "users", id), { status: newStatus });
    } catch (error) {
      console.error("Gagal mengubah status:", error);
    }
  };

  const handleHapusPengguna = async (id: string, nama: string) => {
    if (!confirm(`PERINGATAN: Hapus permanen seluruh data profil ${nama}?`)) return;

    try {
      await deleteDoc(doc(db, "users", id));
      setDetailPengguna(null); 
    } catch (error) {
      console.error("Gagal menghapus akun:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500" role="status">
        <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-bold text-slate-700">Memuat Database Pengguna...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-5 pb-6 relative">
      
      {/* OVERLAY LOADING ACC */}
      {isProcessingAcc && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <Loader2 size={40} className="animate-spin text-white mb-3" />
          <p className="text-xs font-bold text-white tracking-widest uppercase">Memproses Persetujuan...</p>
        </div>
      )}

      {/* HEADER DESKTOP */}
      <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Pengguna</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola akses, pembekuan akun, dan distribusi Token AI secara terpusat.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl w-64 shadow-sm">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau npsn..." 
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder:text-slate-400" 
          />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>
      </header>

      {/* HEADER MOBILE (App-Like Card) */}
      <div className="md:hidden bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">User Directory</span>
        <h2 className={`text-xl font-bold mt-1 ${teachersFont.className}`}>Manajemen Pengguna</h2>
        <p className="text-xs text-indigo-100 mt-1">Kelola lembaga, guru, siswa, dan antrean ACC akun.</p>
      </div>

      {/* PENCARIAN MOBILE */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2.5 rounded-xl w-full shadow-sm">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, atau NPSN..." 
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder:text-slate-400" 
          />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>
      </div>

      {/* TABS KONTROL */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none pb-0" style={{ scrollbarWidth: 'none' }}>
        <button onClick={() => setActiveTab("lembaga")} className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all relative flex items-center gap-1.5 shrink-0 ${activeTab === "lembaga" ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}>
          <Building2 size={15} /> Lembaga ({countLembaga})
          {activeTab === "lembaga" && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("guru")} className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all relative flex items-center gap-1.5 shrink-0 ${activeTab === "guru" ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}>
          <UserCircle size={15} /> Guru ({countGuru})
          {activeTab === "guru" && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("siswa")} className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all relative flex items-center gap-1.5 shrink-0 ${activeTab === "siswa" ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}>
          <GraduationCap size={15} /> Siswa ({countSiswa})
          {activeTab === "siswa" && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab("pengajuan")} className={`pb-3 px-3 text-xs md:text-sm font-bold transition-all relative flex items-center gap-1.5 shrink-0 ${activeTab === "pengajuan" ? "text-indigo-600 font-extrabold" : "text-slate-500 hover:text-slate-700"}`}>
          <span>ACC Akun</span>
          {filteredPengajuan.length > 0 && <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">{filteredPengajuan.length}</span>}
          {activeTab === "pengajuan" && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>}
        </button>
      </div>

      {/* TAB: DAFTAR PENGGUNA */}
      {(activeTab === "lembaga" || activeTab === "guru" || activeTab === "siswa") && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Mobile Card View */}
          <div className="block md:hidden p-3 space-y-3 bg-slate-50/30">
            <AnimatePresence>
              {filteredTabUsers.length > 0 ? filteredTabUsers.map((user) => (
                <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        user.status === 'Dibekukan' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {user.role === 'lembaga' ? <Building2 size={14} /> : user.role === 'siswa' ? <GraduationCap size={14} /> : (user.nama ? user.nama.charAt(0).toUpperCase() : "U")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{user.nama}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {user.role === 'lembaga' ? (user.namaLembaga || user.namaInstansi || `NPSN: ${user.npsn}`) : getNamaLembagaDariNPSN(user.npsn || user.instansi)}
                        </p>
                      </div>
                    </div>
                    
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${
                      user.status === 'Dibekukan' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {user.status || "Aktif"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      {user.role === "siswa" ? (
                        <span className="font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-[10px]">
                          {user.kelas || user.fase || "Siswa Aktif"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-mono text-[11px] font-bold">
                          <Coins size={12} /> {(user.aiTokens || 0).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetailPengguna(user)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl" title="Detail"><Eye size={15} /></button>
                      {user.role !== "siswa" && (
                        <button onClick={() => handleUpdateToken(user.id, user.aiTokens, user.nama)} className="p-2 text-slate-400 hover:text-amber-600 bg-slate-50 rounded-xl" title="Token"><Coins size={15} /></button>
                      )}
                      <button onClick={() => handleToggleStatus(user.id, user.status || 'Aktif', user.nama)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl" title="Status"><Lock size={15} /></button>
                      <button onClick={() => handleHapusPengguna(user.id, user.nama)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl" title="Hapus"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400">Tidak ada data ditemukan.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-5 py-3.5">Identitas Pengguna</th>
                  <th className="px-5 py-3.5 text-center">Status Akun</th>
                  <th className="px-5 py-3.5 text-center">{activeTab === "siswa" ? "Tingkat/Kelas" : "Kuota AI"}</th>
                  <th className="px-5 py-3.5 text-center">Panel Kendali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <AnimatePresence>
                  {filteredTabUsers.length > 0 ? filteredTabUsers.map((user) => (
                    <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            user.status === 'Dibekukan' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {user.role === 'lembaga' ? <Building2 size={15} /> : user.role === 'siswa' ? <GraduationCap size={15} /> : (user.nama ? user.nama.charAt(0).toUpperCase() : "U")}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.nama}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {user.role === 'lembaga' ? (user.namaLembaga || user.namaInstansi || `NPSN: ${user.npsn}`) : getNamaLembagaDariNPSN(user.npsn || user.instansi)}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${
                          user.status === 'Dibekukan' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {user.status || "Aktif"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {user.role === "siswa" ? (
                          <span className="font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-[11px]">
                            {user.kelas || user.fase || "Siswa Aktif"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-mono text-xs font-bold">
                            <Coins size={13} /> {(user.aiTokens || 0).toLocaleString('id-ID')}
                          </span>
                        )}
                      </td>
                      
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setDetailPengguna(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Detail"><Eye size={16} /></button>
                          {user.role !== "siswa" && (
                            <button onClick={() => handleUpdateToken(user.id, user.aiTokens, user.nama)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors" title="Token"><Coins size={16} /></button>
                          )}
                          <button onClick={() => handleToggleStatus(user.id, user.status || 'Aktif', user.nama)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Status"><Lock size={16} /></button>
                          <button onClick={() => handleHapusPengguna(user.id, user.nama)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Hapus"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-xs">Tidak ada data ditemukan.</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ANTREAN PENGAJUAN */}
      {activeTab === "pengajuan" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Mobile Card View */}
          <div className="block md:hidden p-3 space-y-3 bg-slate-50/30">
            <AnimatePresence>
              {filteredPengajuan.length > 0 ? filteredPengajuan.map((pengajuan) => (
                <motion.div key={pengajuan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {pengajuan.role === 'lembaga' ? <Building2 size={14} /> : <UserCircle size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{pengajuan.nama}</p>
                        <p className="text-[10px] text-slate-400 truncate">{pengajuan.email}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                      {pengajuan.role || "Guru"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400">
                      {pengajuan.timestamp ? new Date(pengajuan.timestamp.toDate()).toLocaleDateString('id-ID') : "Baru saja"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleTolakAkun(pengajuan.id)} disabled={isProcessingAcc} className="px-3 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 rounded-xl">Tolak</button>
                      <button onClick={() => handleAccAkun(pengajuan)} disabled={isProcessingAcc} className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 rounded-xl shadow-sm">ACC</button>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-400">Tidak ada pengajuan akun baru.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-5 py-3.5">Data Pemohon</th>
                  <th className="px-5 py-3.5 text-center">Tipe Pengajuan</th>
                  <th className="px-5 py-3.5 text-center">Waktu</th>
                  <th className="px-5 py-3.5 text-right">Tindakan Persetujuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <AnimatePresence>
                  {filteredPengajuan.length > 0 ? filteredPengajuan.map((pengajuan) => (
                    <motion.tr key={pengajuan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {pengajuan.role === 'lembaga' ? <Building2 size={15} /> : <UserCircle size={15} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{pengajuan.nama}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{pengajuan.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          {pengajuan.role || "Guru"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-500">
                        {pengajuan.timestamp ? new Date(pengajuan.timestamp.toDate()).toLocaleDateString('id-ID') : "Baru saja"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleTolakAkun(pengajuan.id)} disabled={isProcessingAcc} className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all">Tolak</button>
                          <button onClick={() => handleAccAkun(pengajuan)} disabled={isProcessingAcc} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm">ACC Akses</button>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-xs">Tidak ada pengajuan akun baru.</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PENGGUNA */}
      <AnimatePresence>
        {detailPengguna && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className={`text-sm font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
                  <UserCircle size={16} className="text-indigo-600"/> Detail Profil Pengguna
                </h3>
                <button onClick={() => setDetailPengguna(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors"><X size={18} /></button>
              </div>
              
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">
                    {detailPengguna.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-base truncate">{detailPengguna.nama}</h4>
                    <p className="text-xs text-slate-400 truncate">{detailPengguna.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Role Sistem</p>
                    <p className="font-bold text-indigo-700 uppercase">{detailPengguna.role}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Status Akun</p>
                    <p className={`font-bold ${detailPengguna.status === 'Dibekukan' ? 'text-rose-600' : 'text-emerald-600'}`}>{detailPengguna.status || 'Aktif'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                    <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Instansi / Sekolah</p>
                    <p className="font-medium text-slate-800 truncate">{detailPengguna.role === 'lembaga' ? (detailPengguna.namaLembaga || detailPengguna.namaInstansi) : getNamaLembagaDariNPSN(detailPengguna.npsn || detailPengguna.instansi)}</p>
                  </div>
                </div>

                {detailPengguna.role !== 'siswa' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Sisa Kuota Token AI</p>
                      <p className="text-xl font-bold text-amber-600 mt-0.5">{(detailPengguna.aiTokens || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <Coins size={28} className="text-amber-400 opacity-60" />
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