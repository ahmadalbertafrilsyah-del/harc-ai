"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  User, BookOpen, ShieldCheck, ArrowLeft, ArrowRight, 
  Mail, Lock, Eye, EyeOff, Building, Send, Loader2, AlertCircle, Wrench, Landmark, Hash, BrainCircuit
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";

import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; 

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function LoginPage() {
  const [step, setStep] = useState(1); 
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [adminPhone, setAdminPhone] = useState("6281234567890"); 
  const [isRegOpen, setIsRegOpen] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [regNama, setRegNama] = useState(""); 
  const [regNamaLembaga, setRegNamaLembaga] = useState(""); 
  const [regNPSN, setRegNPSN] = useState(""); 
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const roles = [
    { id: "admin", name: "Admin", icon: ShieldCheck, desc: "Manajemen sistem", activeColor: "bg-blue-50 border-blue-900 text-blue-950 ring-2 ring-blue-900/20" },
    { id: "lembaga", name: "Lembaga", icon: Landmark, desc: "Kelola guru & siswa", activeColor: "bg-slate-100 border-slate-700 text-slate-900 ring-2 ring-slate-700/20" },
    { id: "guru", name: "Guru", icon: BookOpen, desc: "Kelas & bahan ajar", activeColor: "bg-amber-50 border-amber-600 text-amber-950 ring-2 ring-amber-600/20" },
    { id: "siswa", name: "Siswa", icon: User, desc: "Asesmen & belajar", activeColor: "bg-blue-50 border-blue-800 text-blue-900 ring-2 ring-blue-800/20" }
  ];

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "sistem_stats", "pengaturan_global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.adminWhatsApp) setAdminPhone(data.adminWhatsApp);
        if (data.bukaPendaftaran !== undefined) setIsRegOpen(data.bukaPendaftaran);
        if (data.maintenanceMode !== undefined) setIsMaintenance(data.maintenanceMode);
      }
    });
    return () => unsubConfig();
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
        
        if (userData.status === "Dibekukan" || userData.status === "dibekukan") {
          await signOut(auth);
          alert("Akses Ditolak! Akun Anda sedang DIBEKUKAN oleh Administrator. Silakan hubungi Admin untuk info lebih lanjut.");
          setIsLoading(false);
          return;
        }

        if (isMaintenance && userData.role !== "admin") {
          await signOut(auth);
          alert("Sistem sedang dalam mode pemeliharaan (Maintenance). Akses ditutup sementara, silakan coba beberapa saat lagi.");
          setIsLoading(false);
          return;
        }

        if (userData.role === selectedRole) {
          document.cookie = `userRole=${userData.role}; path=/; max-age=86400; SameSite=Strict`;
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

  // Fungsi Baru: Pemulihan Kata Sandi
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      alert("Silakan ketikkan alamat email Anda terlebih dahulu di kolom 'Kredensial Email', lalu klik 'Lupa Sandi?' kembali.");
      return;
    }
    
    setIsLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      alert(`Tautan pemulihan kata sandi telah dikirim ke ${email}.\n\nSilakan periksa kotak masuk (Inbox) atau folder Spam email Anda.`);
    } catch (error: any) {
      console.error("Reset Password Error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        alert("Alamat email tidak valid atau belum terdaftar di sistem.");
      } else {
        alert("Gagal mengirim tautan. Pastikan format email benar dan coba lagi.");
      }
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

      const roleDiajukan = selectedRole || "guru";
      
      const dataPengajuan: any = {
        uid: newUser.uid,
        nama: regNama,
        email: regEmail,
        npsn: regNPSN,
        instansi: regNPSN, 
        role: roleDiajukan, 
        status: "pending",
        timestamp: serverTimestamp()
      };

      if (roleDiajukan === "lembaga") {
        dataPengajuan.namaLembaga = regNamaLembaga;
        dataPengajuan.namaInstansi = regNamaLembaga; 
      }

      await setDoc(doc(db, "pengajuan_akun", newUser.uid), dataPengajuan);

      const namaPeran = roleDiajukan === "lembaga" ? "Lembaga" : roleDiajukan === "guru" ? "Guru" : "Siswa";
      let detailPendaftar = `- Nama: *${regNama}*%0A- NPSN: *${regNPSN}*%0A- Email: *${regEmail}*`;
      if (roleDiajukan === "lembaga") {
        detailPendaftar = `- Penanggung Jawab: *${regNama}*%0A- Nama Lembaga: *${regNamaLembaga}*%0A- NPSN: *${regNPSN}*%0A- Email: *${regEmail}*`;
      }

      const message = `Halo Admin Harc-AI,%0A%0ASaya ingin mengajukan pembuatan akun ${namaPeran}. Berikut data saya:%0A${detailPendaftar}%0A%0AStatus pendaftaran saya ada di Dasbor Admin. Mohon persetujuannya (ACC) agar saya dapat mengakses sistem. Terima kasih.`;
      const waUrl = `https://wa.me/${adminPhone}?text=${message}`;

      alert("Pendaftaran berhasil direkam! Anda akan dialihkan ke WhatsApp Admin.");
      window.open(waUrl, '_blank');
      
      setStep(1);
      setSelectedRole(null);
      setRegPassword(""); 
      setRegNama("");
      setRegEmail("");
      setRegNPSN("");
      setRegNamaLembaga("");
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
      
      {/* Kolom Kiri: Visual Institusi Formal */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-gradient-to-br from-[#050810] via-[#0f172a] to-blue-950 p-10 flex-col justify-between relative border-r border-slate-800" aria-hidden="true">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/globe.svg')] bg-repeat opacity-5 pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-800/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-600/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg" tabIndex={-1}>
            <div className="w-[42px] h-[42px] flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Logo HARC-AI" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className={`text-[20px] font-[900] text-white tracking-wide block leading-none ${teachersFont.className}`}>MAHATMA ACADEMY</span>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mt-0.5">Portal Akademik</span>
            </div>
          </Link>
        </div>
        
        <div className="relative z-10 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-bold text-xs mb-5 border bg-slate-800/60 border-slate-700 text-amber-400">
            <BrainCircuit size={14} className="text-amber-400" />
            <span className="uppercase tracking-wider">Sistem Terintegrasi HARC-AI</span>
          </div>
          <h2 className={`text-3xl lg:text-4xl font-black text-white mb-5 leading-[1.2] ${teachersFont.className}`}>
            Portal Pembelajaran <br />
            <span className="text-amber-500">Responsif Budaya.</span>
          </h2>
          <p className="text-slate-300 text-sm lg:text-base leading-relaxed max-w-sm text-justify">
            Sistem evaluasi cerdas yang memadukan keandalan teknologi kecerdasan buatan dengan pelestarian nilai sosiolinguistik dan kearifan lokal.
          </p>
        </div>
        
        <div className="relative z-10 text-slate-400 text-xs font-medium">
          © {new Date().getFullYear()} Mahatma Academy. Hak Cipta Dilindungi.
        </div>
      </div>

      <main className="w-full md:w-7/12 lg:w-1/2 h-full flex items-center justify-center p-6 bg-slate-50 relative overflow-y-auto" role="main">
        {step !== 1 && (
          <button 
            onClick={handleBack}
            aria-label={step === 3 ? 'Batal Mengajukan dan kembali' : 'Ganti Peran login'}
            className="absolute top-6 left-6 md:top-8 md:right-8 md:left-auto text-slate-500 hover:text-blue-950 flex items-center gap-2 transition-colors text-xs font-bold bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 z-20 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {step === 3 ? 'Kembali' : 'Ganti Peran'}
          </button>
        )}

        <div className="w-full max-w-[420px] my-auto">
          
          <AnimatePresence>
            {isMaintenance && step === 1 && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-sm" role="alert" aria-live="assertive">
                <Wrench className="text-amber-600 shrink-0 mt-0.5" size={20} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900 mb-1">Pemeliharaan Sistem Terjadwal</h3>
                  <p className="text-xs text-amber-700 leading-relaxed">Sistem saat ini hanya dapat diakses oleh Administrator. Proses registrasi dan evaluasi ditutup sementara.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            
            {/* TAHAP 1: PILIH PERAN */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center md:text-left mb-8">
                  <h1 className={`text-3xl font-black text-[#0f172a] mb-2 ${teachersFont.className}`} tabIndex={0}>Selamat Datang</h1>
                  <p className="text-slate-500 font-medium text-sm">Silakan pilih otoritas peran Anda untuk mengakses sistem akademik.</p>
                </div>
    
                <div className="grid grid-cols-2 gap-4" role="group" aria-label="Pilihan Peran Pengguna">
                  {roles.map((role) => (
                    <motion.button 
                      key={role.id} 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }} 
                      onClick={() => setSelectedRole(role.id)} 
                      aria-pressed={selectedRole === role.id}
                      aria-label={`Masuk sebagai ${role.name}`}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-200 text-center focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 ${selectedRole === role.id ? role.activeColor : 'bg-white border-slate-200 hover:border-blue-200 shadow-sm'}`}
                    >
                      <div className={`p-3 rounded-xl mb-3 transition-colors ${selectedRole === role.id ? 'bg-white shadow-sm' : 'bg-slate-100 text-slate-500'}`} aria-hidden="true">
                        <role.icon className="w-7 h-7" />
                      </div>
                      <div className={`text-sm font-bold ${teachersFont.className} ${selectedRole === role.id ? 'text-inherit' : 'text-slate-800'}`}>
                        {role.name}
                      </div>
                      <div className={`text-[11px] mt-1.5 leading-tight ${selectedRole === role.id ? 'opacity-90 font-medium' : 'text-slate-500'}`}>
                        {role.desc}
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                <button 
                  onClick={() => setStep(2)} 
                  disabled={!selectedRole} 
                  aria-disabled={!selectedRole}
                  aria-label="Lanjutkan ke tahap login"
                  className={`w-full mt-8 py-4 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 ${selectedRole ? 'bg-[#1e3a8a] hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  Lanjutkan Autentikasi <ArrowRight size={18} aria-hidden="true" />
                </button>
              </motion.div>
            )}

            {/* TAHAP 2: LOGIN FORM */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                <div className="text-center md:text-left mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-[#1e3a8a] rounded-md text-[10px] font-bold mb-3 border border-slate-200 uppercase tracking-widest" aria-hidden="true">
                    Otoritas: {roles.find(r => r.id === selectedRole)?.name}
                  </div>
                  <h1 className={`text-2xl lg:text-3xl font-black text-[#0f172a] mb-2 ${teachersFont.className}`} tabIndex={0}>Masuk Sistem</h1>
                </div>

                <form onSubmit={handleLogin} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="login-email" className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider ml-1">Kredensial Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" aria-hidden="true"><Mail className="h-5 w-5 text-slate-400" /></div>
                      <input id="login-email" type="email" aria-required="true" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-900/10 focus:border-[#1e3a8a] outline-none text-slate-700 text-sm transition-all" placeholder="admin@mahatma.ac.id" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label htmlFor="login-password" className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Kata Sandi</label>
                      <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-blue-800 hover:text-blue-950 hover:underline focus:outline-none">Lupa Sandi?</button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" aria-hidden="true"><Lock className="h-5 w-5 text-slate-400" /></div>
                      <input id="login-password" type={showPassword ? "text" : "password"} aria-required="true" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-900/10 focus:border-[#1e3a8a] outline-none text-slate-700 text-sm transition-all" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#1e3a8a] focus:outline-none">
                        {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} aria-disabled={isLoading} aria-live="polite" className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm text-white bg-[#1e3a8a] hover:bg-blue-800 shadow-lg hover:shadow-blue-900/20 transition-all flex justify-center items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 active:scale-95">
                    {isLoading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Memverifikasi...</> : "Masuk ke Dasbor"}
                  </button>
                </form>

                {(selectedRole !== "admin") && isRegOpen && (
                  <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                    <button onClick={() => setStep(3)} className="w-full py-3 rounded-xl font-bold text-xs text-blue-800 bg-white hover:bg-slate-50 border-2 border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2">
                      Ajukan Akun {selectedRole === "lembaga" ? "Lembaga" : selectedRole === "guru" ? "Pendidik" : "Peserta Didik"} Baru
                    </button>
                  </div>
                )}
                {(selectedRole !== "admin") && !isRegOpen && (
                  <div className="mt-8 pt-6 border-t border-slate-200 text-center flex items-center justify-center gap-2 text-rose-600" role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    <span className="text-sm font-bold">Pendaftaran Institusi Ditutup</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAHAP 3: REGISTRASI FORM */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                <div className="text-center md:text-left mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold mb-3 border border-amber-200 uppercase tracking-widest" aria-hidden="true">
                    Pengajuan Akses Baru
                  </div>
                  <h1 className={`text-2xl font-black text-[#0f172a] mb-1 ${teachersFont.className}`} tabIndex={0}>
                    Registrasi {selectedRole === "lembaga" ? "Lembaga" : selectedRole === "guru" ? "Pendidik" : "Peserta Didik"}
                  </h1>
                </div>
                
                <form onSubmit={handleRegister} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="reg-nama" className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider ml-1">
                      {selectedRole === "lembaga" ? "Nama Penanggung Jawab" : "Nama Lengkap"}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" aria-hidden="true"><User className="h-4 w-4 text-slate-400" /></div>
                      <input id="reg-nama" type="text" aria-required="true" value={regNama} onChange={(e) => setRegNama(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 text-sm transition-all" />
                    </div>
                  </div>

                  {selectedRole === "lembaga" && (
                    <div>
                      <label htmlFor="reg-lembaga" className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider ml-1">
                        Nama Lembaga/Instansi
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" aria-hidden="true"><Building className="h-4 w-4 text-slate-400" /></div>
                        <input id="reg-lembaga" type="text" aria-required="true" value={regNamaLembaga} onChange={(e) => setRegNamaLembaga(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 text-sm transition-all" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="reg-npsn" className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider flex items-center justify-between ml-1">
                      <span>NPSN Pokok</span>
                      {selectedRole !== "lembaga" && <span className="text-[9px] text-slate-400 normal-case tracking-normal">(Samakan dengan NPSN Institusi)</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" aria-hidden="true"><Hash className="h-4 w-4 text-slate-400" /></div>
                      <input 
                        id="reg-npsn"
                        type="text" 
                        aria-required="true"
                        value={regNPSN} 
                        onChange={(e) => setRegNPSN(e.target.value)} 
                        required 
                        placeholder="Contoh: 69725804"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 text-sm transition-all" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="reg-email" className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider ml-1">Alamat Email Resmi</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" aria-hidden="true"><Mail className="h-4 w-4 text-slate-400" /></div>
                      <input id="reg-email" type="email" aria-required="true" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 text-sm transition-all" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider ml-1">Buat Kata Sandi</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" aria-hidden="true"><Lock className="h-4 w-4 text-slate-400" /></div>
                      <input id="reg-password" type={showPassword ? "text" : "password"} aria-required="true" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} minLength={6} placeholder="Minimal 6 karakter" required className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 text-sm transition-all" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-amber-600 focus:outline-none">
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  
                  <button type="submit" disabled={isLoading} aria-disabled={isLoading} aria-live="polite" className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-lg hover:shadow-amber-600/20 transition-all flex justify-center items-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 active:scale-95">
                    {isLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <>Kirim Dokumen Pengajuan <Send size={16} aria-hidden="true" /></>}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}