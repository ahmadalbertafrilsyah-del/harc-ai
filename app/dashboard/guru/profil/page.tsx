"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, Award, BookOpen, Edit, Loader2, Camera, User, Save, X, Building, Coins, Fingerprint, ShieldCheck, Activity } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// IMPORT FIREBASE
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, orderBy, limit, setDoc, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ProfilGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [profilData, setProfilData] = useState<any>({});
  const [aktivitas, setAktivitas] = useState<any[]>([]);

  // State untuk Modal Edit
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    nip: "",
    telepon: "",
    lokasi: "",
    spesialisasi: ""
  });

  // 1. CEK STATUS LOGIN & AMBIL UID
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
      } else {
        window.location.href = "/login";
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. TARIK DATA DARI FIRESTORE BERDASARKAN UID LOGIN
  useEffect(() => {
    if (!userUid) return;

    // Ambil data profil dari koleksi 'users'
    const unsubProfil = onSnapshot(doc(db, "users", userUid), (docSnap) => {
      if (docSnap.exists()) {
        setProfilData(docSnap.data());
      } else {
        setProfilData({ nama: "Pengguna Baru", role: "guru", status: "Aktif" });
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Gagal memuat profil:", error);
      setIsLoading(false);
    });

    // Ambil riwayat aktivitas guru
    const qAktivitas = query(collection(db, "aktivitas_guru"), orderBy("timestamp", "desc"), limit(5));
    const unsubAktivitas = onSnapshot(qAktivitas, (snapshot) => {
      setAktivitas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubProfil(); unsubAktivitas(); };
  }, [userUid]);

  const bukaModalEdit = () => {
    setFormData({
      nama: profilData?.nama || "",
      nip: profilData?.nip || "",
      telepon: profilData?.telepon || "",
      lokasi: profilData?.lokasi || "",
      spesialisasi: profilData?.spesialisasi || ""
    });
    setIsEditing(true);
  };

  const simpanProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid) return;
    
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", userUid), {
        ...formData,
        lastUpdate: serverTimestamp()
      }, { merge: true }); // Merge agar Token AI & data inti tidak hilang
      
      setIsEditing(false);
      alert("Profil berhasil diperbarui!");
    } catch (error) {
      console.error("Gagal menyimpan profil:", error);
      alert("Terjadi kesalahan jaringan saat menyimpan profil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col justify-center items-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="font-bold">Memuat Identitas...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-10">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Profil Pendidik</h1>
          <p className="text-slate-500 text-sm mt-1">Informasi personal dan rekam jejak mengajar.</p>
        </div>
        <button onClick={bukaModalEdit} className="bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 w-full md:w-auto">
          <Edit size={16} /> Lengkapi Profil
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* KOLOM KIRI: Identitas Utama */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80 text-center flex flex-col items-center relative overflow-hidden">
            
            <div className="relative mb-5 group cursor-pointer" onClick={() => alert("Fitur Upload Foto akan ditenagai oleh Cloudinary di pembaruan berikutnya!")}>
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-4xl font-bold">
                {profilData?.fotoUrl ? (
                  <img src={profilData.fotoUrl} alt={profilData?.nama} className="w-full h-full object-cover" />
                ) : (
                  profilData?.nama ? profilData.nama.charAt(0).toUpperCase() : "U"
                )}
              </div>
              <div className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={24} className="text-white" />
              </div>
            </div>

            <h2 className={`text-xl md:text-2xl font-bold text-slate-800 leading-tight ${teachersFont.className}`}>{profilData?.nama || "Pendidik Baru"}</h2>
            <p className="text-sm text-blue-600 font-medium mt-1">{profilData?.email}</p>
            
            <div className="flex gap-2 mt-4">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{profilData?.role === 'guru' ? 'Pendidik' : profilData?.role}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${profilData?.status === 'Dibekukan' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                {profilData?.status || "Aktif"}
              </span>
            </div>
          </div>

          {/* Sisa Token AI (Tampilan Highlight) */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Sisa Token AI Anda</p>
              <p className={`text-3xl font-bold ${teachersFont.className} text-amber-600`}>{(profilData?.aiTokens || 0).toLocaleString('id-ID')}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center">
              <Coins size={24} />
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Detail Database & Aktivitas */}
        <div className="lg:w-2/3 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80">
            <h3 className={`text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 ${teachersFont.className}`}>
              <ShieldCheck size={20} className="text-blue-500" /> Detail Database Pendidik
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Fingerprint size={18} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID Data Akun</p>
                  <p className="text-xs font-mono text-slate-700 mt-1 truncate" title={userUid || ""}>{userUid || "Memuat..."}</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Building size={18} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instansi / Sekolah</p>
                  <p className="text-sm font-bold text-slate-700 mt-1 truncate">{profilData?.instansi || "Belum diatur"}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Award size={18} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomor Induk (NIP/NUPTK)</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{profilData?.nip || "Belum diatur"}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <BookOpen size={18} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spesialisasi Mapel</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{profilData?.spesialisasi || "Belum diatur"}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Phone size={18} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telepon / WhatsApp</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{profilData?.telepon || "Belum diatur"}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3 sm:col-span-2">
                <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="overflow-hidden w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lokasi / Alamat Domisili</p>
                  <p className="text-sm font-medium text-slate-700 mt-1 leading-relaxed">{profilData?.lokasi || "Belum diatur"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/80">
            <h3 className={`text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-4 ${teachersFont.className}`}>
              <Activity size={20} className="text-emerald-500" /> Log Aktivitas Sistem
            </h3>
            <div className="space-y-4">
              {aktivitas.length > 0 ? (
                aktivitas.map((akt) => (
                  <div key={akt.id} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{akt.deskripsi}</p>
                      <p className="text-xs text-slate-500 mt-1">{akt.timestamp ? new Date(akt.timestamp.toDate()).toLocaleString('id-ID') : "Baru saja"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Belum ada log aktivitas yang tercatat untuk akun ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT PROFIL */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className={`text-lg font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}><Edit size={18} className="text-blue-600" /> Perbarui Data Diri</h3>
                <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1 rounded-md transition-colors"><X size={20} /></button>
              </div>
              
              <form onSubmit={simpanProfil} className="p-6 space-y-5 overflow-y-auto">
                
                {/* Info Read-Only */}
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 space-y-2">
                  <p className="text-xs text-slate-600 flex justify-between"><span>Email:</span> <span className="font-bold">{profilData?.email}</span></p>
                  <p className="text-xs text-slate-600 flex justify-between"><span>Instansi:</span> <span className="font-bold truncate max-w-[200px]">{profilData?.instansi}</span></p>
                  <p className="text-[10px] text-blue-500 mt-1 italic">*Hubungi Admin jika ingin mengubah Email atau Instansi.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap beserta Gelar</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={16} className="text-slate-400" /></div>
                    <input type="text" required value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">NIP / NUPTK</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Award size={16} className="text-slate-400" /></div>
                      <input type="text" value={formData.nip} onChange={(e) => setFormData({...formData, nip: e.target.value})} className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Telepon / WA</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone size={16} className="text-slate-400" /></div>
                      <input type="text" value={formData.telepon} onChange={(e) => setFormData({...formData, telepon: e.target.value})} className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Spesialisasi Mata Pelajaran</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><BookOpen size={16} className="text-slate-400" /></div>
                    <input type="text" value={formData.spesialisasi} onChange={(e) => setFormData({...formData, spesialisasi: e.target.value})} className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all" placeholder="Contoh: Guru Bahasa Daerah" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Alamat Domisili</label>
                  <textarea value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all resize-none" rows={3}></textarea>
                </div>

                <div className="pt-5 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Perubahan
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}