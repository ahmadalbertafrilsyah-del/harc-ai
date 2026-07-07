"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  User, BookOpen, ShieldCheck, ArrowLeft, ArrowRight, 
  GraduationCap, Mail, Lock, Eye, EyeOff, Building, Send, Loader2, AlertCircle, Wrench
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";

// IMPORT FIREBASE SEBENARNYA
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; 

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700", "800"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function LoginPage() {
  const [step, setStep] = useState(1); 
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State Pengaturan Global dari Firestore
  const [adminPhone, setAdminPhone] = useState("6281234567890"); 
  const [isRegOpen, setIsRegOpen] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // State Login & Register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [regNama, setRegNama] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regInstansi, setRegInstansi] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const roles = [
    { id: "admin", name: "Admin", icon: ShieldCheck, desc: "Manajemen sistem & kurikulum", activeColor: "bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20" },
    { id: "guru", name: "Guru", icon: BookOpen, desc: "Validasi budaya & analitik kelas", activeColor: "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20" },
    { id: "siswa", name: "Siswa", icon: User, desc: "Asesmen dinamis & ruang belajar", activeColor: "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20" }
  ];

  // REAL-TIME FETCH PENGATURAN GLOBAL
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sistem_stats", "pengaturan_global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.adminWhatsApp) setAdminPhone(data.adminWhatsApp);
        if (data.bukaPendaftaran !== undefined) setIsRegOpen(data.bukaPendaftaran);
        if (data.maintenanceMode !== undefined) setIsMaintenance(data.maintenanceMode);
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // 1. PENGECEKAN AKUN DIBEKUKAN (BLOKIR)
        if (userData.status === "Dibekukan" || userData.status === "dibekukan") {
          await signOut(auth); // Langsung tendang keluar
          alert("Akses Ditolak! Akun Anda sedang DIBEKUKAN oleh Administrator. Silakan hubungi Admin untuk info lebih lanjut.");
          setIsLoading(false);
          return;
        }

        // 2. PENGECEKAN MAINTENANCE MODE (Kecuali Admin)
        if (isMaintenance && userData.role !== "admin") {
          await signOut(auth);
          alert("Sistem sedang dalam mode pemeliharaan (Maintenance). Akses ditutup sementara, silakan coba beberapa saat lagi.");
          setIsLoading(false);
          return;
        }

        // 3. PENGECEKAN KECOCOKAN ROLE
        if (userData.role === selectedRole) {
          window.location.href = `/dashboard/${selectedRole}/beranda`;
        } else {
          await signOut(auth);
          alert(`Akses Ditolak! Akun Anda terdaftar sebagai ${userData.role || 'Peran Lain'}.`);
        }
      } else {
        await signOut(auth);
        alert("Akses Ditolak! Akun Anda mungkin sedang dalam antrean ACC Administrator.");
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      alert("Gagal masuk! Periksa kembali Email dan Kata Sandi Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const newUser = userCredential.user;
      
      await signOut(auth);

      await setDoc(doc(db, "pengajuan_akun", newUser.uid), {
        uid: newUser.uid,
        nama: regNama,
        email: regEmail,
        instansi: regInstansi,
        role: "guru",
        status: "pending",
        timestamp: serverTimestamp()
      });

      const message = `Halo Admin Syntax LMS,%0A%0ASaya ingin mengajukan pembuatan akun Pendidik. Berikut data saya:%0A- Nama: *${regNama}*%0A- Email: *${regEmail}*%0A- Instansi: *${regInstansi}*%0A%0AStatus pendaftaran saya ada di Dasbor Admin. Mohon persetujuannya (ACC) agar saya dapat mengakses sistem. Terima kasih.`;
      const waUrl = `https://wa.me/${adminPhone}?text=${message}`;

      alert("Pendaftaran berhasil direkam! Anda akan dialihkan ke WhatsApp Admin.");
      window.open(waUrl, '_blank');
      
      setStep(1);
      setSelectedRole(null);
      setRegPassword(""); 
    } catch (error: any) {
      console.error("Gagal mengajukan akun:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert("Email ini sudah terdaftar! Silakan langsung login atau hubungi Admin jika butuh ACC.");
      } else {
        alert("Terjadi kesalahan jaringan atau kata sandi terlalu lemah (minimal 6 karakter).");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) window.location.href = '/';
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  return (
    <div className={`h-screen w-full bg-slate-50 flex flex-col md:flex-row ${latoFont.className} overflow-hidden`}>
      
      {/* Panel Kiri - Dekorasi */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-blue-950 p-8 flex-col justify-between relative">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-900/50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-600/20 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 w-fit hover:opacity-80 transition-opacity">
            <GraduationCap className="w-7 h-7 text-amber-400" />
            <span className={`text-xl font-bold text-white tracking-wide ${teachersFont.className}`}>HARC-AI</span>
          </Link>
        </div>
        <div className="relative z-10 mb-10">
          <h2 className={`text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight ${teachersFont.className}`}>
            Portal Pembelajaran <br />
            <span className="text-amber-400 italic">Responsif Budaya</span>
          </h2>
          <p className="text-blue-200 text-sm lg:text-base leading-relaxed max-w-sm">
            Sistem evaluasi cerdas yang memadukan teknologi dengan nilai sosiolinguistik lokal.
          </p>
        </div>
        <div className="relative z-10 text-blue-400 text-xs">
          © {new Date().getFullYear()} Hak Cipta Dilindungi.
        </div>
      </div>

      {/* Panel Kanan - Dinamis */}
      <div className="w-full md:w-7/12 lg:w-1/2 h-full flex items-center justify-center p-6 bg-slate-50 relative overflow-y-auto">
        {step !== 1 && (
          <button 
            onClick={handleBack}
            className="absolute top-6 left-6 md:top-6 md:right-6 md:left-auto text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors text-xs font-bold bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 z-20"
          >
            <ArrowLeft size={14} /> {step === 3 ? 'Batal Mengajukan' : 'Ganti Peran'}
          </button>
        )}

        <div className="w-full max-w-[380px] my-auto">
          
          {/* BANNER MAINTENANCE UNTUK STEP 1 */}
          <AnimatePresence>
            {isMaintenance && step === 1 && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-sm">
                <Wrench className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-amber-900 mb-1">Mode Pemeliharaan Aktif</h3>
                  <p className="text-xs text-amber-700 leading-relaxed">Sistem saat ini hanya dapat diakses oleh Administrator. Proses evaluasi ditutup sementara.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            
            {/* STEP 1: Pilih Peran */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center md:text-left mb-6">
                  <h1 className={`text-2xl font-bold text-blue-950 mb-1 ${teachersFont.className}`}>Selamat Datang</h1>
                  <p className="text-slate-500 font-medium text-xs">Silakan pilih peran Anda untuk mengakses sistem.</p>
                </div>
                <div className="space-y-3">
                  {roles.map((role) => (
                    <motion.button key={role.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedRole(role.id)} className={`w-full flex items-center p-3 rounded-xl border transition-all duration-200 text-left ${selectedRole === role.id ? role.activeColor : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                      <div className={`p-2 rounded-lg mr-3 ${selectedRole === role.id ? 'bg-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                        <role.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${teachersFont.className} ${selectedRole === role.id ? 'text-inherit' : 'text-slate-800'}`}>{role.name}</div>
                        <div className={`text-[11px] mt-0.5 ${selectedRole === role.id ? 'opacity-90' : 'text-slate-500'}`}>{role.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
                <button onClick={() => setStep(2)} disabled={!selectedRole} className={`w-full mt-6 py-3 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 ${selectedRole ? 'bg-blue-900 hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                  Lanjutkan <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* STEP 2: Form Login */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center md:text-left mb-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold mb-2 border border-blue-100 uppercase tracking-wide">
                    Login {roles.find(r => r.id === selectedRole)?.name}
                  </div>
                  <h1 className={`text-2xl font-bold text-blue-950 mb-1 ${teachersFont.className}`}>Masuk Sistem</h1>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Alamat Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400" /></div>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none text-slate-700 text-sm shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Kata Sandi</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-400" /></div>
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none text-slate-700 text-sm shadow-sm" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-blue-900 hover:bg-blue-800 shadow-md transition-all flex justify-center items-center gap-2">
                    {isLoading ? <><Loader2 size={16} className="animate-spin" /> Verifikasi...</> : "Masuk ke Dashboard"}
                  </button>
                </form>

                {selectedRole === "guru" && isRegOpen && (
                  <div className="mt-5 pt-4 border-t border-slate-200 text-center">
                    <button onClick={() => setStep(3)} className="w-full py-2.5 rounded-lg font-bold text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all">
                      Ajukan Akun Pendidik Baru
                    </button>
                  </div>
                )}
                {selectedRole === "guru" && !isRegOpen && (
                  <div className="mt-5 pt-4 border-t border-slate-200 text-center flex items-center justify-center gap-2 text-rose-600">
                    <AlertCircle size={14} />
                    <span className="text-xs font-bold">Pendaftaran Pendidik Sedang Ditutup</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: Form Pengajuan */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center md:text-left mb-5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold mb-2 border border-amber-100 uppercase tracking-wide">
                    Pengajuan Akses
                  </div>
                  <h1 className={`text-xl font-bold text-blue-950 mb-1 ${teachersFont.className}`}>Pendidik Baru</h1>
                </div>
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Nama Lengkap</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-3.5 w-3.5 text-slate-400" /></div>
                      <input type="text" value={regNama} onChange={(e) => setRegNama(e.target.value)} required className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Alamat Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-3.5 w-3.5 text-slate-400" /></div>
                      <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Asal Instansi</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building className="h-3.5 w-3.5 text-slate-400" /></div>
                      <input type="text" value={regInstansi} onChange={(e) => setRegInstansi(e.target.value)} required className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Buat Kata Sandi</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-3.5 w-3.5 text-slate-400" /></div>
                      <input type={showPassword ? "text" : "password"} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} minLength={6} placeholder="Minimal 6 karakter" required className="w-full pl-8 pr-9 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm shadow-sm" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-all flex justify-center items-center gap-2">
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Kirim & Hubungi Admin <Send size={14} /></>}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}