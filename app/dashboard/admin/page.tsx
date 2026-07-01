"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, MoreVertical, Edit, Trash2, ShieldCheck, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";

// PENTING: Sesuaikan import ini dengan lokasi file konfigurasi Firebase Anda nanti
// import { db } from "@/lib/firebase"; 
// import { collection, onSnapshot, setDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
// import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenPengguna() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk daftar pengguna
  const [daftarGuru, setDaftarGuru] = useState<any[]>([]);

  // State untuk form tambah guru
  const [formData, setFormData] = useState({
    namaLengkap: "",
    email: "",
    password: "", // Hanya untuk inisialisasi awal oleh admin
    spesialisasi: "Bahasa Daerah",
  });

  useEffect(() => {
    // ----------------------------------------------------------------------
    // BLOK INTEGRASI FIREBASE REALTIME (Uncomment saat database siap)
    // ----------------------------------------------------------------------
    /*
    const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaftarGuru(users);
      setIsLoading(false);
    });

    return () => unsubUsers();
    */

    // SIMULASI LOADING DATABASE
    const timer = setTimeout(() => {
      setDaftarGuru([
        { id: "guru_ahmad", nama: "Ahmad Albert Arilsyah", email: "ahmadalbertafrilsyah@gmail.com", peran: "Pendidik", status: "Aktif", spesialisasi: "Bahasa Daerah" },
        { id: "guru_siti", nama: "Siti Aminah", email: "siti.aminah@syntax.web.id", peran: "Pendidik", status: "Aktif", spesialisasi: "Sastra Lokal" }
      ]);
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDaftarkanGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // ----------------------------------------------------------------------
    // BLOK PEMBUATAN AKUN & DOKUMEN FIREBASE (Uncomment saat Auth siap)
    // ----------------------------------------------------------------------
    /*
    try {
      const auth = getAuth();
      // 1. Buat user di Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Buat dokumen profil di Firestore (Ini yang mencegah error 'null' di dasbor guru)
      await setDoc(doc(db, "users", user.uid), {
        nama: formData.namaLengkap,
        email: formData.email,
        peran: "Pendidik Bahasa Daerah",
        spesialisasi: formData.spesialisasi,
        telepon: "",
        lokasi: "",
        fokus: "Sosiolinguistik & Interpretasi",
        fotoUrl: "", // Kosongkan agar pakai inisial nama dulu
        createdAt: serverTimestamp()
      });

      alert("Akun pendidik berhasil dibuat dan dokumen diinisialisasi!");
      setFormData({ namaLengkap: "", email: "", password: "", spesialisasi: "Bahasa Daerah" });
    } catch (error: any) {
      console.error("Gagal membuat akun:", error);
      alert("Gagal mendaftarkan pengguna: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
    */

    // Simulasi Proses
    setTimeout(() => {
      // Optimistic UI Update untuk prototipe
      const guruBaru = {
        id: `guru_baru_${Date.now()}`,
        nama: formData.namaLengkap,
        email: formData.email,
        peran: "Pendidik",
        status: "Aktif",
        spesialisasi: formData.spesialisasi
      };
      
      setDaftarGuru([guruBaru, ...daftarGuru]);
      alert("Simulasi: Akun guru berhasil dibuat dan ditambahkan ke database!");
      
      setFormData({ namaLengkap: "", email: "", password: "", spesialisasi: "Bahasa Daerah" });
      setIsSubmitting(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="font-bold">Memuat Data Pengguna...</p>
        <p className="text-sm">Menarik daftar entitas dari Firebase Authentication</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-6xl mx-auto space-y-6 pb-10">
      
      <div className="border-b border-slate-200 pb-5">
        <h1 className={`text-2xl font-bold text-slate-900 ${teachersFont.className}`}>Manajemen Pengguna Sistem</h1>
        <p className="text-slate-500 text-sm mt-1">Registrasi akun pendidik baru dan kelola akses (Role-Based Access Control).</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Panel Kiri: Form Registrasi Akun Baru */}
        <div className="lg:w-4/12">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80 sticky top-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <UserPlus size={18} className="text-indigo-600" />
              <h2 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>Registrasi Pendidik</h2>
            </div>

            <form onSubmit={handleDaftarkanGuru} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" 
                  name="namaLengkap"
                  value={formData.namaLengkap}
                  onChange={handleInputChange}
                  placeholder="Cth: Ahmad Frilsyah" 
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Alamat Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@institusi.com" 
                    className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kata Sandi Awal</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Minimal 6 karakter" 
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Spesialisasi</label>
                <select 
                  name="spesialisasi"
                  value={formData.spesialisasi}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="Bahasa Daerah">Bahasa Daerah</option>
                  <option value="Sastra Lokal">Sastra Lokal</option>
                  <option value="Seni Budaya">Seni Budaya</option>
                </select>
              </div>

              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-start gap-2 mt-2">
                <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-700 font-medium">
                  Sistem akan secara otomatis mengalokasikan dokumen profil (Firestore) untuk mencegah error saat pengguna masuk pertama kali.
                </p>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full mt-2 py-3 rounded-lg text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 ${
                  isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-800 shadow-indigo-700/20'
                }`}
              >
                {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : "Daftarkan Guru"}
              </button>
            </form>
          </div>
        </div>

        {/* Panel Kanan: Tabel Daftar Pengguna */}
        <div className="lg:w-8/12">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <h3 className={`text-base font-bold text-slate-800 flex items-center gap-2 ${teachersFont.className}`}>
                Daftar Pendidik Terdaftar
              </h3>
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg w-full sm:w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                <Search size={14} className="text-slate-400" />
                <input type="text" placeholder="Cari nama/email..." className="bg-transparent border-none outline-none text-xs w-full text-slate-700" />
              </div>
            </div>
            
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4">Identitas Guru</th>
                    <th className="px-6 py-4">Peran & Spesialisasi</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <AnimatePresence>
                    {daftarGuru.map((guru) => (
                      <motion.tr 
                        key={guru.id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {guru.nama.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{guru.nama}</p>
                              <p className="text-xs text-slate-500">{guru.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-700">{guru.peran}</p>
                          <p className="text-xs text-slate-500">{guru.spesialisasi}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 size={12} /> {guru.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit Data">
                              <Edit size={16} />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Cabut Akses">
                              <Trash2 size={16} />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}