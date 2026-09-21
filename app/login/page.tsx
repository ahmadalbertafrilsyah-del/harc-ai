"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Spectral, IBM_Plex_Sans } from "next/font/google";
import {
  User,
  BookOpen,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building,
  Send,
  Loader2,
  AlertCircle,
  Wrench,
  Landmark,
  Hash,
  KeyRound,
  CheckCircle2,
  X,
} from "lucide-react";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ------------------------------------------------------------------
   TIPOGRAFI — sama dengan halaman beranda
------------------------------------------------------------------- */
const display = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-display",
});
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans",
});

/* ------------------------------------------------------------------
   TOKEN DESAIN
   Sama persis dengan halaman beranda. Sebaiknya nanti dipindahkan
   ke app/globals.css agar tidak ditulis dua kali.
------------------------------------------------------------------- */
const TOKENS = `
[data-theme="light"]{
  --bg:#F7F5F1;
  --bg-2:#F1EDE6;
  --surface:#FFFDFA;
  --surface-2:#F3F0EA;
  --ink:#1A1F2E;
  --ink-2:#5B6274;
  --ink-3:#8E93A1;
  --line:#E3DED4;
  --line-soft:#EDE9E1;
  --brand:#1F3053;
  --brand-soft:#E8EBF2;
  --brand-ink:#FFFFFF;
  --accent:#146A5E;
  --accent-soft:#E4EFEC;
  --focus:#1F3053;
  --danger:#9B2C2C;
  --danger-soft:#FBEAEA;
  --shadow-soft:0 1px 2px rgba(26,31,46,.04), 0 8px 24px -12px rgba(26,31,46,.14);
  --shadow-lift:0 2px 4px rgba(26,31,46,.05), 0 18px 40px -18px rgba(26,31,46,.22);
  --texture:rgba(26,31,46,.022);
}

.tekstur{
  background-image:
    repeating-linear-gradient(45deg, var(--texture) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(-45deg, var(--texture) 0 1px, transparent 1px 7px);
}
/* Panel kiri: navy tenang dengan anyaman terang tipis. */
.panel-merek{
  background-color:#1B2B4A;
  background-image:
    repeating-linear-gradient(45deg, rgba(255,255,255,.028) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(-45deg, rgba(255,255,255,.028) 0 1px, transparent 1px 8px),
    radial-gradient(760px 420px at 18% 8%, rgba(255,255,255,.07), transparent 60%);
}

html{ -webkit-text-size-adjust:100%; }
::selection{ background:var(--brand); color:var(--brand-ink); }

.focusable:focus-visible{
  outline:2px solid var(--focus);
  outline-offset:3px;
  border-radius:8px;
}
.kolom{
  width:100%;
  border-radius:10px;
  border:1px solid var(--line);
  background:var(--surface);
  color:var(--ink);
  font-size:16px;
  padding:.875rem 1rem .875rem 2.75rem;
  transition:border-color .25s ease, box-shadow .25s ease;
}
.kolom::placeholder{ color:var(--ink-3); }
.kolom:focus{
  outline:none;
  border-color:var(--brand);
  box-shadow:0 0 0 3px rgba(31,48,83,.10);
}
.kolom:disabled{ background:var(--surface-2); color:var(--ink-3); cursor:not-allowed; }
@media (min-width:640px){ .kolom{ font-size:14.5px; } }

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:.01ms !important;
    transition-duration:.01ms !important;
  }
}
`;

const HALUS = [0.22, 1, 0.36, 1] as const;

const roles = [
  { id: "admin", name: "Admin", icon: ShieldCheck, desc: "Manajemen sistem" },
  { id: "lembaga", name: "Lembaga", icon: Landmark, desc: "Kelola guru dan siswa" },
  { id: "guru", name: "Guru", icon: BookOpen, desc: "Kelas dan bahan ajar" },
  { id: "siswa", name: "Siswa", icon: User, desc: "Asesmen dan belajar" },
];

/* Label dipakai di beberapa tempat, jadi dikumpulkan di satu fungsi. */
const namaPeran = (id: string | null) =>
  id === "lembaga" ? "Lembaga" : id === "guru" ? "Pendidik" : "Peserta didik";

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Konfigurasi global
  const [adminPhone, setAdminPhone] = useState("6281234567890");
  const [isRegOpen, setIsRegOpen] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [metodeVerifikasi, setMetodeVerifikasi] = useState("otp_email");

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registrasi
  const [regNama, setRegNama] = useState("");
  const [regNamaLembaga, setRegNamaLembaga] = useState("");
  const [regNPSN, setRegNPSN] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // OTP
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [inputOtp, setInputOtp] = useState("");

  // Notifikasi
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "sistem_stats", "pengaturan_global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.adminWhatsApp) setAdminPhone(data.adminWhatsApp);
        if (data.bukaPendaftaran !== undefined) setIsRegOpen(data.bukaPendaftaran);
        if (data.maintenanceMode !== undefined) setIsMaintenance(data.maintenanceMode);
        if (data.metodeVerifikasi) setMetodeVerifikasi(data.metodeVerifikasi);
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
          showToast("Akun Anda sedang dibekukan oleh administrator.", "error");
          setIsLoading(false);
          return;
        }

        if (isMaintenance && userData.role !== "admin") {
          await signOut(auth);
          showToast("Sistem sedang dalam pemeliharaan. Akses ditutup sementara.", "info");
          setIsLoading(false);
          return;
        }

        if (userData.role === selectedRole) {
          document.cookie = `userRole=${userData.role}; path=/; max-age=86400; SameSite=Strict`;
          window.location.href = `/dashboard/${selectedRole}/beranda`;
        } else {
          await signOut(auth);
          showToast(
            `Akun ini terdaftar sebagai ${userData.role || "peran lain"}. Pilih peran yang sesuai lalu coba lagi.`,
            "error",
          );
        }
      } else {
        await signOut(auth);
        showToast("Akun Anda masih menunggu persetujuan administrator.", "info");
      }
    } catch (error) {
      console.error("Login Error:", error);
      showToast("Email atau kata sandi tidak cocok. Periksa kembali keduanya.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showToast("Isi dulu kolom email, lalu tekan Lupa sandi.", "info");
      return;
    }

    setIsLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      showToast(`Tautan pemulihan dikirim ke ${email}. Periksa kotak masuk dan spam.`, "success");
    } catch (error) {
      const kode = (error as { code?: string })?.code;
      if (kode === "auth/user-not-found" || kode === "auth/invalid-email") {
        showToast("Email tidak valid atau belum terdaftar.", "error");
      } else {
        showToast("Tautan gagal dikirim. Periksa format email lalu coba lagi.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!regEmail.trim()) {
      showToast("Isi alamat email resmi terlebih dahulu.", "info");
      return;
    }

    setIsSendingOtp(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          nama: regNama || "Pendaftar",
          role: selectedRole,
          tipeEmail: "otp",
          otpCode: otp,
        }),
      });

      if (!res.ok) throw new Error("Gagal mengirim email verifikasi");

      setOtpSent(true);
      showToast("Kode dikirim. Periksa kotak masuk dan folder spam Anda.", "success");
    } catch (error) {
      console.error(error);
      showToast("Kode gagal dikirim. Pastikan alamat email aktif lalu coba lagi.", "error");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (metodeVerifikasi === "otp_email") {
      if (!otpSent) {
        showToast("Kirim kode verifikasi terlebih dahulu.", "error");
        return;
      }
      if (inputOtp !== generatedOtp) {
        showToast("Kode verifikasi tidak cocok. Periksa kembali email Anda.", "error");
        return;
      }
    }

    setIsLoading(true);

    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const newUser = userCredential.user;
      const roleDiajukan = selectedRole || "guru";

      if (metodeVerifikasi === "otp_email") {
        const dataUser: Record<string, unknown> = {
          nama: regNama,
          email: regEmail,
          npsn: regNPSN,
          instansi: regNPSN,
          role: roleDiajukan,
          status: "Aktif",
          aiTokens: roleDiajukan === "lembaga" ? 50000 : 10000,
          timestamp: serverTimestamp(),
        };

        if (roleDiajukan === "lembaga") {
          dataUser.namaLembaga = regNamaLembaga;
          dataUser.namaInstansi = regNamaLembaga;
        }

        await setDoc(doc(db, "users", newUser.uid), dataUser);

        showToast("Pendaftaran berhasil. Anda akan diarahkan ke dasbor.", "success");
        setTimeout(() => {
          document.cookie = `userRole=${roleDiajukan}; path=/; max-age=86400; SameSite=Strict`;
          window.location.href = `/dashboard/${roleDiajukan}/beranda`;
        }, 1500);
      } else {
        await signOut(auth);

        const dataPengajuan: Record<string, unknown> = {
          uid: newUser.uid,
          nama: regNama,
          email: regEmail,
          npsn: regNPSN,
          instansi: regNPSN,
          role: roleDiajukan,
          status: "pending",
          timestamp: serverTimestamp(),
        };

        if (roleDiajukan === "lembaga") {
          dataPengajuan.namaLembaga = regNamaLembaga;
          dataPengajuan.namaInstansi = regNamaLembaga;
        }

        await setDoc(doc(db, "pengajuan_akun", newUser.uid), dataPengajuan);

        const peran =
          roleDiajukan === "lembaga" ? "Lembaga" : roleDiajukan === "guru" ? "Guru" : "Siswa";
        let detailPendaftar = `- Nama: *${regNama}*%0A- NPSN: *${regNPSN || "Mandiri/Kosong"}*%0A- Email: *${regEmail}*`;
        if (roleDiajukan === "lembaga") {
          detailPendaftar = `- Penanggung Jawab: *${regNama}*%0A- Nama Lembaga: *${regNamaLembaga}*%0A- NPSN: *${regNPSN}*%0A- Email: *${regEmail}*`;
        }

        const message = `Halo Admin Harc-AI,%0A%0ASaya ingin mengajukan pembuatan akun ${peran}. Berikut data saya:%0A${detailPendaftar}%0A%0AStatus pendaftaran saya ada di Dasbor Admin. Mohon persetujuannya (ACC) agar saya dapat mengakses sistem. Terima kasih.`;
        const waUrl = `https://wa.me/${adminPhone}?text=${message}`;

        showToast("Pengajuan tersimpan. Anda akan diarahkan ke WhatsApp admin.", "success");
        setTimeout(() => {
          window.open(waUrl, "_blank");
          setStep(1);
          setSelectedRole(null);
          setRegPassword("");
          setRegNama("");
          setRegEmail("");
          setRegNPSN("");
          setRegNamaLembaga("");
        }, 2000);
      }
    } catch (error) {
      const kode = (error as { code?: string })?.code;
      if (kode === "auth/email-already-in-use") {
        showToast("Email ini sudah terdaftar. Silakan masuk atau hubungi admin.", "error");
      } else {
        showToast("Pendaftaran gagal. Kata sandi minimal 6 karakter dan koneksi harus stabil.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) window.location.href = "/";
    if (step === 2) setStep(1);
    if (step === 3) {
      setStep(2);
      setOtpSent(false);
      setInputOtp("");
    }
  };

  const judulSerif = { fontFamily: "var(--font-display), Georgia, serif" };
  const labelKelas =
    "mb-2 block text-[13px] font-medium text-[color:var(--ink-2)]";
  const ikonKelas =
    "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[color:var(--ink-3)]";

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-theme="light"
        className={`${sans.variable} ${display.variable} tekstur flex min-h-[100dvh] flex-col bg-[color:var(--bg)] text-[color:var(--ink)] antialiased md:flex-row`}
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        <style dangerouslySetInnerHTML={{ __html: TOKENS }} />

        {/* ================= NOTIFIKASI ================= */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3, ease: HALUS }}
              role="status"
              aria-live="polite"
              className="fixed left-1/2 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-lift)] sm:left-auto sm:right-6 sm:translate-x-0"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  {toast.type === "success" ? (
                    <CheckCircle2 size={18} className="text-[color:var(--accent)]" />
                  ) : toast.type === "error" ? (
                    <AlertCircle size={18} className="text-[color:var(--danger)]" />
                  ) : (
                    <AlertCircle size={18} className="text-[color:var(--brand)]" />
                  )}
                </span>
                <p className="flex-1 text-[14px] leading-[1.6] text-[color:var(--ink)]">
                  {toast.message}
                </p>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  aria-label="Tutup notifikasi"
                  className="focusable -mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-[color:var(--ink-3)] transition-colors hover:text-[color:var(--ink)]"
                >
                  <X size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= PANEL MEREK (DESKTOP) ================= */}
        <aside className="panel-merek relative hidden flex-col justify-between p-10 text-white md:flex md:w-[42%] lg:w-1/2 lg:p-14">
          <Link
            href="/"
            className="focusable flex w-fit items-center gap-3 transition-opacity duration-300 hover:opacity-85"
          >
            <img src="/logo.png" alt="" aria-hidden="true" className="h-11 w-11 object-contain" />
            <span className="leading-tight">
              <span className="block text-[19px] font-medium tracking-tight" style={judulSerif}>
                Mahatma Academy
              </span>
              <span className="block text-[12px] text-white/60">Portal akademik HARC-AI</span>
            </span>
          </Link>

          <div className="max-w-[26rem]">
            <h2
              className="text-[clamp(28px,3.2vw,40px)] font-normal leading-[1.2] tracking-[-0.02em]"
              style={judulSerif}
            >
              Portal pembelajaran yang responsif budaya.
            </h2>
            <p className="mt-6 text-[15.5px] leading-[1.8] text-white/70">
              Sistem evaluasi yang memadukan bantuan kecerdasan buatan dengan pelestarian nilai
              sosiolinguistik dan kearifan lokal. Keputusan penilaian tetap berada di tangan guru.
            </p>

            <ul className="mt-9 space-y-3 border-t border-white/12 pt-7 text-[14px] text-white/65">
              {[
                "Satu akun untuk asesmen, analitik, dan bahan ajar",
                "Data siswa tidak dipakai untuk melatih model",
                "Akses dipisahkan menurut peran pengguna",
              ].map((butir) => (
                <li key={butir} className="flex items-start gap-3">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-[#6FC3B4]"
                    aria-hidden="true"
                  />
                  {butir}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[13px] text-white/45">
            © 2026 Mahatma Academy. Hak cipta dilindungi.
          </p>
        </aside>

        {/* ================= AREA FORMULIR ================= */}
        <main className="relative flex flex-1 flex-col md:w-[58%] lg:w-1/2">
          {/* Kepala khusus layar kecil */}
          <div className="flex items-center justify-between border-b border-[color:var(--line-soft)] px-5 py-4 md:hidden">
            <Link href="/" className="focusable flex items-center gap-2.5">
              <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
              <span className="text-[15px] font-medium" style={judulSerif}>
                Mahatma Academy
              </span>
            </Link>
            {step !== 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="focusable inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-[color:var(--ink-2)]"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                {step === 2 ? "Ganti peran" : "Kembali"}
              </button>
            )}
          </div>

          {step !== 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="focusable absolute right-8 top-8 z-20 hidden items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-2 text-[13px] text-[color:var(--ink-2)] shadow-[var(--shadow-soft)] transition-colors duration-300 hover:text-[color:var(--ink)] md:inline-flex"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              {step === 2 ? "Ganti peran" : "Kembali"}
            </button>
          )}

          <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-10 sm:px-8 sm:py-14">
            <div className="w-full max-w-[430px]">
              {/* Pemberitahuan pemeliharaan */}
              <AnimatePresence>
                {isMaintenance && step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: HALUS }}
                    role="alert"
                    className="mb-8 flex items-start gap-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-soft)]"
                  >
                    <Wrench size={18} className="mt-0.5 shrink-0 text-[color:var(--accent)]" />
                    <div>
                      <h2 className="mb-1 text-[14.5px] font-medium">Sistem sedang dipelihara</h2>
                      <p className="text-[13.5px] leading-[1.65] text-[color:var(--ink-2)]">
                        Untuk sementara hanya administrator yang dapat masuk. Pendaftaran dan
                        evaluasi ditutup hingga pemeliharaan selesai.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {/* ---------- LANGKAH 1: PILIH PERAN ---------- */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.32, ease: HALUS }}
                  >
                    <p className="mb-3 text-[13px] text-[color:var(--ink-3)]">Langkah 1 dari 2</p>
                    <h1
                      className="text-[clamp(26px,6vw,33px)] font-normal leading-[1.2] tracking-[-0.015em]"
                      style={judulSerif}
                    >
                      Selamat datang
                    </h1>
                    <p className="mt-3 text-[15px] leading-[1.7] text-[color:var(--ink-2)]">
                      Pilih peran Anda untuk melanjutkan ke halaman masuk.
                    </p>

                    <div
                      className="mt-8 grid grid-cols-2 gap-3 sm:gap-4"
                      role="radiogroup"
                      aria-label="Pilihan peran pengguna"
                    >
                      {roles.map((role) => {
                        const aktif = selectedRole === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            role="radio"
                            aria-checked={aktif}
                            onClick={() => setSelectedRole(role.id)}
                            className={`focusable flex flex-col items-start rounded-2xl border p-5 text-left transition-all duration-300 ${
                              aktif
                                ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] shadow-[var(--shadow-soft)]"
                                : "border-[color:var(--line-soft)] bg-[color:var(--surface)] shadow-[var(--shadow-soft)] hover:border-[color:var(--line)]"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`mb-4 grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 ${
                                aktif
                                  ? "bg-[color:var(--brand)] text-[color:var(--brand-ink)]"
                                  : "bg-[color:var(--surface-2)] text-[color:var(--ink-2)]"
                              }`}
                            >
                              <role.icon size={19} />
                            </span>
                            <span className="text-[16px] font-medium" style={judulSerif}>
                              {role.name}
                            </span>
                            <span className="mt-1 text-[12.5px] leading-snug text-[color:var(--ink-2)]">
                              {role.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!selectedRole}
                      className="focusable group mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-[10px] bg-[color:var(--brand)] px-6 py-4 text-[15px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)] disabled:cursor-not-allowed disabled:bg-[color:var(--surface-2)] disabled:text-[color:var(--ink-3)] disabled:shadow-none"
                    >
                      Lanjutkan
                      <ArrowRight
                        size={17}
                        className="transition-transform duration-300 group-enabled:group-hover:translate-x-1"
                      />
                    </button>

                    {!selectedRole && (
                      <p className="mt-3 text-center text-[13px] text-[color:var(--ink-3)]">
                        Pilih salah satu peran di atas untuk melanjutkan.
                      </p>
                    )}
                  </motion.div>
                )}

                {/* ---------- LANGKAH 2: MASUK ---------- */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.32, ease: HALUS }}
                    className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8"
                  >
                    <p className="mb-3 text-[13px] text-[color:var(--ink-3)]">
                      Masuk sebagai {roles.find((r) => r.id === selectedRole)?.name}
                    </p>
                    <h1
                      className="text-[clamp(23px,5.5vw,29px)] font-normal leading-[1.2] tracking-[-0.015em]"
                      style={judulSerif}
                    >
                      Masuk ke sistem
                    </h1>

                    <form onSubmit={handleLogin} className="mt-7 space-y-5" noValidate>
                      <div>
                        <label htmlFor="login-email" className={labelKelas}>
                          Alamat email
                        </label>
                        <div className="relative">
                          <span className={ikonKelas} aria-hidden="true">
                            <Mail size={17} />
                          </span>
                          <input
                            id="login-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="nama@sekolah.sch.id"
                            className="kolom focusable"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <label htmlFor="login-password" className="text-[13px] font-medium text-[color:var(--ink-2)]">
                            Kata sandi
                          </label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="focusable rounded text-[13px] text-[color:var(--accent)] transition-opacity duration-300 hover:opacity-75"
                          >
                            Lupa sandi
                          </button>
                        </div>
                        <div className="relative">
                          <span className={ikonKelas} aria-hidden="true">
                            <Lock size={17} />
                          </span>
                          <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Masukkan kata sandi"
                            className="kolom focusable pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                            className="focusable absolute inset-y-0 right-0 flex items-center px-4 text-[color:var(--ink-3)] transition-colors duration-300 hover:text-[color:var(--ink)]"
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="focusable inline-flex w-full items-center justify-center gap-2.5 rounded-[10px] bg-[color:var(--brand)] px-6 py-4 text-[15px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)] disabled:opacity-60"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                            Memverifikasi
                          </>
                        ) : (
                          "Masuk"
                        )}
                      </button>
                    </form>

                    {selectedRole !== "admin" && isRegOpen && (
                      <div className="mt-7 border-t border-[color:var(--line-soft)] pt-6 text-center">
                        <p className="text-[13.5px] text-[color:var(--ink-2)]">
                          Belum punya akun?{" "}
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="focusable rounded font-medium text-[color:var(--accent)] underline underline-offset-4 transition-opacity duration-300 hover:opacity-75"
                          >
                            Ajukan akun {namaPeran(selectedRole).toLowerCase()}
                          </button>
                        </p>
                      </div>
                    )}

                    {selectedRole !== "admin" && !isRegOpen && (
                      <p
                        role="status"
                        className="mt-7 border-t border-[color:var(--line-soft)] pt-6 text-center text-[13.5px] text-[color:var(--ink-2)]"
                      >
                        Pendaftaran akun baru sedang ditutup. Hubungi administrator sekolah Anda.
                      </p>
                    )}
                  </motion.div>
                )}

                {/* ---------- LANGKAH 3: REGISTRASI ---------- */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.32, ease: HALUS }}
                    className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8"
                  >
                    <p className="mb-3 text-[13px] text-[color:var(--ink-3)]">Pengajuan akun baru</p>
                    <h1
                      className="text-[clamp(23px,5.5vw,29px)] font-normal leading-[1.2] tracking-[-0.015em]"
                      style={judulSerif}
                    >
                      Daftar sebagai {namaPeran(selectedRole).toLowerCase()}
                    </h1>

                    <form onSubmit={handleRegister} className="mt-7 space-y-5" noValidate>
                      <div>
                        <label htmlFor="reg-nama" className={labelKelas}>
                          {selectedRole === "lembaga" ? "Nama penanggung jawab" : "Nama lengkap"}
                        </label>
                        <div className="relative">
                          <span className={ikonKelas} aria-hidden="true">
                            <User size={17} />
                          </span>
                          <input
                            id="reg-nama"
                            type="text"
                            autoComplete="name"
                            value={regNama}
                            onChange={(e) => setRegNama(e.target.value)}
                            required
                            disabled={otpSent}
                            className="kolom focusable"
                          />
                        </div>
                      </div>

                      {selectedRole === "lembaga" && (
                        <div>
                          <label htmlFor="reg-lembaga" className={labelKelas}>
                            Nama lembaga
                          </label>
                          <div className="relative">
                            <span className={ikonKelas} aria-hidden="true">
                              <Building size={17} />
                            </span>
                            <input
                              id="reg-lembaga"
                              type="text"
                              autoComplete="organization"
                              value={regNamaLembaga}
                              onChange={(e) => setRegNamaLembaga(e.target.value)}
                              required
                              disabled={otpSent}
                              className="kolom focusable"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="reg-npsn" className={labelKelas}>
                          NPSN sekolah
                          {selectedRole !== "lembaga" && (
                            <span className="text-[color:var(--ink-3)]"> — opsional</span>
                          )}
                        </label>
                        <div className="relative">
                          <span className={ikonKelas} aria-hidden="true">
                            <Hash size={17} />
                          </span>
                          <input
                            id="reg-npsn"
                            type="text"
                            inputMode="numeric"
                            value={regNPSN}
                            onChange={(e) => setRegNPSN(e.target.value)}
                            required={selectedRole === "lembaga"}
                            disabled={otpSent}
                            placeholder={
                              selectedRole === "lembaga"
                                ? "Contoh: 69725804"
                                : "Kosongkan jika akun mandiri"
                            }
                            className="kolom focusable"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="reg-email" className={labelKelas}>
                          Alamat email resmi
                        </label>
                        <div className="relative">
                          <span className={ikonKelas} aria-hidden="true">
                            <Mail size={17} />
                          </span>
                          <input
                            id="reg-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                            disabled={otpSent}
                            className="kolom focusable"
                          />
                        </div>
                      </div>

                      {/* Verifikasi kode */}
                      {metodeVerifikasi === "otp_email" && (
                        <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--accent-soft)]/60 p-4">
                          <label htmlFor="reg-otp" className="mb-2 block text-[13px] font-medium">
                            Kode verifikasi email
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className={ikonKelas} aria-hidden="true">
                                <KeyRound size={16} />
                              </span>
                              <input
                                id="reg-otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                disabled={!otpSent}
                                value={inputOtp}
                                onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ""))}
                                placeholder={otpSent ? "6 digit kode" : "Kirim kode dulu"}
                                className="kolom focusable tracking-[0.3em]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSendOTP}
                              disabled={isSendingOtp || !regEmail || otpSent}
                              className="focusable shrink-0 whitespace-nowrap rounded-[10px] bg-[color:var(--accent)] px-4 text-[13.5px] font-medium text-white transition-opacity duration-300 hover:opacity-90 disabled:opacity-45"
                            >
                              {isSendingOtp ? (
                                <Loader2 size={16} className="mx-auto animate-spin" />
                              ) : otpSent ? (
                                "Terkirim"
                              ) : (
                                "Kirim kode"
                              )}
                            </button>
                          </div>
                          <p className="mt-2.5 text-[12.5px] leading-relaxed text-[color:var(--ink-2)]">
                            {otpSent
                              ? "Kode dikirim ke email Anda. Periksa juga folder spam."
                              : "Kode akan dikirim ke alamat email di atas."}
                          </p>
                        </div>
                      )}

                      <div>
                        <label htmlFor="reg-password" className={labelKelas}>
                          Buat kata sandi
                        </label>
                        <div className="relative">
                          <span className={ikonKelas} aria-hidden="true">
                            <Lock size={17} />
                          </span>
                          <input
                            id="reg-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            minLength={6}
                            required
                            placeholder="Minimal 6 karakter"
                            className="kolom focusable pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                            className="focusable absolute inset-y-0 right-0 flex items-center px-4 text-[color:var(--ink-3)] transition-colors duration-300 hover:text-[color:var(--ink)]"
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || (metodeVerifikasi === "otp_email" && !otpSent)}
                        className="focusable inline-flex w-full items-center justify-center gap-2.5 rounded-[10px] bg-[color:var(--brand)] px-6 py-4 text-[15px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)] disabled:opacity-55"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                            Mengirim
                          </>
                        ) : (
                          <>
                            Kirim pengajuan
                            <Send size={16} aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="mt-8 text-center text-[12.5px] text-[color:var(--ink-3)] md:hidden">
                © 2026 Mahatma Academy
              </p>
            </div>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}