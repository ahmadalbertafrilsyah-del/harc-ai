"use client";

import { useEffect, useRef, useState } from "react";
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
  Sun,
  Moon,
  PencilLine,
  RefreshCw,
  Sparkles,
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
import { useTema } from "@/lib/useTema";

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
   GAYA KHUSUS HALAMAN INI
   Token warna terang/gelap kini tinggal di app/globals.css, jadi
   tidak lagi ditulis ulang di sini.
------------------------------------------------------------------- */
const GAYA = `
.tekstur{
  background-image:
    repeating-linear-gradient(45deg, var(--texture) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(-45deg, var(--texture) 0 1px, transparent 1px 7px);
}
/* Panel kiri: navy tenang, sama di kedua tema. */
.panel-merek{
  background-color:#16233D;
  background-image:
    repeating-linear-gradient(45deg, rgba(255,255,255,.028) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(-45deg, rgba(255,255,255,.028) 0 1px, transparent 1px 8px),
    radial-gradient(820px 460px at 14% 4%, rgba(111,195,180,.16), transparent 62%),
    radial-gradient(680px 420px at 96% 92%, rgba(185,199,232,.14), transparent 60%);
}
/* Kisi tipis di belakang formulir, memudar ke bawah. */
.kisi{
  background-image:
    linear-gradient(var(--line-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
  background-size:46px 46px;
  -webkit-mask-image:radial-gradient(ellipse 80% 55% at 50% 0%, #000 10%, transparent 72%);
          mask-image:radial-gradient(ellipse 80% 55% at 50% 0%, #000 10%, transparent 72%);
}
.cahaya{
  position:absolute; border-radius:9999px; pointer-events:none;
  animation:melayang 18s ease-in-out infinite alternate;
}
.cahaya-a{ background:radial-gradient(circle, var(--glow-a), transparent 66%); }
.cahaya-b{ background:radial-gradient(circle, var(--glow-b), transparent 66%); animation-delay:-9s; }
@keyframes melayang{
  0%{ transform:translate3d(0,0,0) scale(1); }
  100%{ transform:translate3d(30px,24px,0) scale(1.12); }
}
.teks-gradasi{
  background:linear-gradient(100deg, #B9C7E8 5%, #6FC3B4 95%);
  -webkit-background-clip:text; background-clip:text;
  color:transparent;
}

html{ -webkit-text-size-adjust:100%; }
::selection{ background:var(--brand); color:var(--brand-ink); }

.focusable:focus-visible{
  outline:2px solid var(--focus);
  outline-offset:3px;
  border-radius:10px;
}

/* Kolom isian. 16px di ponsel supaya iOS tidak ikut memperbesar layar. */
.kolom{
  width:100%;
  border-radius:12px;
  border:1px solid var(--line);
  background:var(--surface);
  color:var(--ink);
  font-size:16px;
  padding:.9rem 1rem .9rem 2.85rem;
  transition:border-color .25s ease, box-shadow .25s ease, background-color .25s ease;
}
.kolom::placeholder{ color:var(--ink-3); }
.kolom:focus{
  outline:none;
  border-color:var(--brand);
  box-shadow:0 0 0 4px var(--ring);
}
.kolom:disabled{ background:var(--surface-2); color:var(--ink-3); cursor:not-allowed; }
@media (min-width:640px){ .kolom{ font-size:14.5px; } }

/* Ruang untuk tombol di dalam kolom (mis. mata sandi). Ditulis di sini,
   bukan lewat utility pr-*, karena .kolom tidak berada di dalam @layer
   sehingga selalu menang atas utility Tailwind. */
.kolom-aksi{ padding-right:3.25rem; }

/* Isian otomatis peramban memaksa latar putih — dikembalikan ke token. */
.kolom:-webkit-autofill,
.kolom:-webkit-autofill:hover,
.kolom:-webkit-autofill:focus{
  -webkit-text-fill-color:var(--ink);
  -webkit-box-shadow:0 0 0 1000px var(--surface) inset;
  caret-color:var(--ink);
}

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:.01ms !important;
    animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
}
`;

const HALUS = [0.22, 1, 0.36, 1] as const;

/* Jeda sebelum kode verifikasi boleh dikirim ulang. */
const JEDA_KIRIM_ULANG = 60;

const roles = [
  { id: "admin", name: "Admin", icon: ShieldCheck, desc: "Manajemen sistem" },
  { id: "lembaga", name: "Lembaga", icon: Landmark, desc: "Kelola guru dan siswa" },
  { id: "guru", name: "Guru", icon: BookOpen, desc: "Kelas dan bahan ajar" },
  { id: "siswa", name: "Siswa", icon: User, desc: "Asesmen dan belajar" },
];

/* Label dipakai di beberapa tempat, jadi dikumpulkan di satu fungsi. */
const namaPeran = (id: string | null) =>
  id === "lembaga"
    ? "Lembaga"
    : id === "guru"
      ? "Pendidik"
      : id === "siswa"
        ? "Peserta didik"
        : id === "admin"
          ? "Administrator"
          : "Pengguna";

const keunggulan = [
  "Satu akun untuk asesmen, analitik, dan bahan ajar",
  "Data siswa tidak dipakai untuk melatih model",
  "Akses dipisahkan menurut peran pengguna",
];

export default function LoginPage() {
  const { tema, gantiTema } = useTema();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  /* Ditahan selama pengalihan halaman agar tombol tidak bisa ditekan dua kali. */
  const [mengalihkan, setMengalihkan] = useState(false);

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
  const [jedaKirimUlang, setJedaKirimUlang] = useState(0);

  // Notifikasi
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  /* Satu penunjuk waktu untuk notifikasi: pesan baru membatalkan hitungan
     pesan sebelumnya, sehingga keduanya tidak saling memotong. */
  const timerToast = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerAlih = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tombolPeran = useRef<(HTMLButtonElement | null)[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    if (timerToast.current) clearTimeout(timerToast.current);
    setToast({ message, type });
    timerToast.current = setTimeout(() => setToast(null), 5000);
  };

  useEffect(
    () => () => {
      if (timerToast.current) clearTimeout(timerToast.current);
      if (timerAlih.current) clearTimeout(timerAlih.current);
    },
    [],
  );

  /* Hitung mundur tombol kirim ulang kode. */
  useEffect(() => {
    if (jedaKirimUlang <= 0) return;
    const id = setInterval(() => setJedaKirimUlang((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(id);
  }, [jedaKirimUlang]);

  useEffect(() => {
    const unsubConfig = onSnapshot(
      doc(db, "sistem_stats", "pengaturan_global"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.adminWhatsApp) setAdminPhone(data.adminWhatsApp);
          if (data.bukaPendaftaran !== undefined) setIsRegOpen(data.bukaPendaftaran);
          if (data.maintenanceMode !== undefined) setIsMaintenance(data.maintenanceMode);
          if (data.metodeVerifikasi) setMetodeVerifikasi(data.metodeVerifikasi);
        }
      },
      /* Tanpa penangan ini, galat izin atau koneksi terputus tidak tertangkap. */
      (error) => {
        console.error("Gagal membaca pengaturan global:", error);
      },
    );
    return () => unsubConfig();
  }, []);

  /* Buka kembali kolom pendaftaran untuk diperbaiki, sekaligus batalkan kode lama. */
  const bukaUlangIsian = () => {
    setOtpSent(false);
    setInputOtp("");
    setGeneratedOtp("");
    setJedaKirimUlang(0);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    /* Spasi ikut tersalin saat email ditempel, dan itu membuat proses masuk gagal. */
    const emailBersih = email.trim().toLowerCase();

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, emailBersih, password);
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
          setMengalihkan(true);
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
    const emailBersih = email.trim().toLowerCase();
    if (!emailBersih) {
      showToast("Isi dulu kolom email, lalu tekan Lupa sandi.", "info");
      return;
    }

    setIsLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, emailBersih);
      showToast(
        `Tautan pemulihan dikirim ke ${emailBersih}. Periksa kotak masuk dan spam.`,
        "success",
      );
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
    const emailBersih = regEmail.trim().toLowerCase();
    if (!emailBersih) {
      showToast("Isi alamat email resmi terlebih dahulu.", "info");
      return;
    }
    if (jedaKirimUlang > 0) return;

    setIsSendingOtp(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailBersih,
          nama: regNama || "Pendaftar",
          role: selectedRole,
          tipeEmail: "otp",
          otpCode: otp,
        }),
      });

      if (!res.ok) throw new Error("Gagal mengirim email verifikasi");

      setOtpSent(true);
      setJedaKirimUlang(JEDA_KIRIM_ULANG);
      showToast("Kode dikirim. Periksa kotak masuk dan folder spam Anda.", "success");
    } catch (error) {
      console.error(error);
      /* Kode batal dipakai kalau emailnya sendiri gagal terkirim. */
      setGeneratedOtp("");
      showToast("Kode gagal dikirim. Pastikan alamat email aktif lalu coba lagi.", "error");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      showToast("Peran belum dipilih. Kembali ke langkah pertama.", "error");
      setStep(1);
      return;
    }

    /* Pemberitahuan pemeliharaan menyebut pendaftaran ditutup, jadi ditegakkan juga di sini. */
    if (isMaintenance) {
      showToast("Sistem sedang dipelihara. Pendaftaran ditutup sementara.", "info");
      return;
    }

    if (!isRegOpen) {
      showToast("Pendaftaran akun baru sedang ditutup.", "info");
      return;
    }

    if (metodeVerifikasi === "otp_email") {
      if (!otpSent || !generatedOtp) {
        showToast("Kirim kode verifikasi terlebih dahulu.", "error");
        return;
      }
      if (inputOtp !== generatedOtp) {
        showToast("Kode verifikasi tidak cocok. Periksa kembali email Anda.", "error");
        return;
      }
    }

    setIsLoading(true);
    const regEmailBersih = regEmail.trim().toLowerCase();

    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        regEmailBersih,
        regPassword,
      );
      const newUser = userCredential.user;
      const roleDiajukan = selectedRole;

      if (metodeVerifikasi === "otp_email") {
        const dataUser: Record<string, unknown> = {
          nama: regNama,
          email: regEmailBersih,
          npsn: regNPSN,
          instansi: regNPSN,
          role: roleDiajukan,
          status: "Aktif",
          aiTokens:
            roleDiajukan === "lembaga" ? 0 : roleDiajukan === "guru" ? 20000 : 10000,
          timestamp: serverTimestamp(),
        };

        if (roleDiajukan === "lembaga") {
          dataUser.namaLembaga = regNamaLembaga;
          dataUser.namaInstansi = regNamaLembaga;
        }

        await setDoc(doc(db, "users", newUser.uid), dataUser);

        setMengalihkan(true);
        showToast("Pendaftaran berhasil. Anda akan diarahkan ke dasbor.", "success");
        timerAlih.current = setTimeout(() => {
          document.cookie = `userRole=${roleDiajukan}; path=/; max-age=86400; SameSite=Strict`;
          window.location.href = `/dashboard/${roleDiajukan}/beranda`;
        }, 1500);
      } else {
        await signOut(auth);

        const dataPengajuan: Record<string, unknown> = {
          uid: newUser.uid,
          nama: regNama,
          email: regEmailBersih,
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
        let detailPendaftar = `- Nama: *${regNama}*%0A- NPSN: *${regNPSN || "Mandiri/Kosong"}*%0A- Email: *${regEmailBersih}*`;
        if (roleDiajukan === "lembaga") {
          detailPendaftar = `- Penanggung Jawab: *${regNama}*%0A- Nama Lembaga: *${regNamaLembaga}*%0A- NPSN: *${regNPSN}*%0A- Email: *${regEmailBersih}*`;
        }

        const message = `Halo Admin Harc-AI,%0A%0ASaya ingin mengajukan pembuatan akun ${peran}. Berikut data saya:%0A${detailPendaftar}%0A%0AStatus pendaftaran saya ada di Dasbor Admin. Mohon persetujuannya (ACC) agar saya dapat mengakses sistem. Terima kasih.`;
        const waUrl = `https://wa.me/${adminPhone}?text=${message}`;

        setMengalihkan(true);
        showToast("Pengajuan tersimpan. Anda akan diarahkan ke WhatsApp admin.", "success");
        timerAlih.current = setTimeout(() => {
          window.open(waUrl, "_blank");
          setStep(1);
          setSelectedRole(null);
          setRegPassword("");
          setRegNama("");
          setRegEmail("");
          setRegNPSN("");
          setRegNamaLembaga("");
          bukaUlangIsian();
          setMengalihkan(false);
        }, 2000);
      }
    } catch (error) {
      const kode = (error as { code?: string })?.code;
      if (kode === "auth/email-already-in-use") {
        showToast("Email ini sudah terdaftar. Silakan masuk atau hubungi admin.", "error");
      } else {
        showToast(
          "Pendaftaran gagal. Kata sandi minimal 6 karakter dan koneksi harus stabil.",
          "error",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (mengalihkan) return;
    if (step === 1) {
      window.location.href = "/";
      return;
    }
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 3) {
      setStep(2);
      bukaUlangIsian();
    }
  };

  /* role="radio" menjanjikan navigasi panah — tanpa ini janji itu tidak ditepati. */
  const onKeyPeran = (e: React.KeyboardEvent, i: number) => {
    const arah =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!arah) return;
    e.preventDefault();
    const berikut = (i + arah + roles.length) % roles.length;
    setSelectedRole(roles[berikut].id);
    tombolPeran.current[berikut]?.focus();
  };

  const judulSerif = { fontFamily: "var(--font-display), Georgia, serif" };
  const labelKelas = "mb-2 block text-[13px] font-medium text-[color:var(--ink-2)]";
  const ikonKelas =
    "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[color:var(--ink-3)]";
  const tombolUtama =
    "focusable inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[color:var(--brand)] px-6 py-4 text-[15px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)] active:scale-[.985] disabled:pointer-events-none disabled:opacity-55";
  const tombolBulat =
    "focusable grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--ink-2)] transition-colors duration-300 hover:text-[color:var(--ink)] active:scale-95";

  const sibuk = isLoading || mengalihkan;
  const totalLangkah = step === 3 ? 3 : 2;
  const bolehDaftar = isRegOpen && !isMaintenance;

  const tombolTema = (
    <button
      type="button"
      onClick={gantiTema}
      aria-label={tema === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap"}
      className={tombolBulat}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={tema}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="grid place-items-center"
        >
          {tema === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-theme={tema}
        suppressHydrationWarning
        className={`${sans.variable} ${display.variable} tekstur flex min-h-[100dvh] flex-col bg-[color:var(--bg)] text-[color:var(--ink)] antialiased md:flex-row`}
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        <style dangerouslySetInnerHTML={{ __html: GAYA }} />

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
              className="fixed left-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[var(--shadow-lift)] sm:left-auto sm:right-6 sm:translate-x-0"
              style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-1 ${
                  toast.type === "success"
                    ? "bg-[color:var(--accent)]"
                    : toast.type === "error"
                      ? "bg-[color:var(--danger)]"
                      : "bg-[color:var(--brand)]"
                }`}
              />
              <div className="flex items-start gap-3 p-4 pl-5">
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
        <aside className="panel-merek relative hidden flex-col justify-between overflow-hidden p-10 text-white md:flex md:w-[44%] lg:w-1/2 lg:p-14">
          <Link
            href="/"
            className="focusable relative z-10 flex w-fit items-center gap-3 transition-opacity duration-300 hover:opacity-85"
          >
            <img src="/logo.png" alt="" aria-hidden="true" className="h-11 w-11 object-contain" />
            <span className="leading-tight">
              <span className="block text-[19px] font-medium tracking-tight" style={judulSerif}>
                Mahatma Academy
              </span>
              <span className="block text-[12px] text-white/60">Portal akademik HARC-AI</span>
            </span>
          </Link>

          <div className="relative z-10 max-w-[27rem]">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] text-white/75 backdrop-blur-sm">
              <Sparkles size={13} className="text-[#6FC3B4]" aria-hidden="true" />
              Asesmen responsif budaya
            </span>
            <h2
              className="text-[clamp(28px,3.2vw,42px)] font-normal leading-[1.15] tracking-[-0.02em]"
              style={judulSerif}
            >
              Portal pembelajaran yang{" "}
              <span className="teks-gradasi italic">responsif budaya.</span>
            </h2>
            <p className="mt-6 text-[15.5px] leading-[1.8] text-white/70">
              Sistem evaluasi yang memadukan bantuan kecerdasan buatan dengan pelestarian nilai
              sosiolinguistik dan kearifan lokal. Keputusan penilaian tetap berada di tangan guru.
            </p>

            <ul className="mt-9 space-y-3.5 border-t border-white/[0.12] pt-7 text-[14px] text-white/70">
              {keunggulan.map((butir) => (
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

          <p className="relative z-10 text-[13px] text-white/45">
            © 2026 Mahatma Academy. Hak cipta dilindungi.
          </p>
        </aside>

        {/* ================= AREA FORMULIR ================= */}
        <main className="relative flex flex-1 flex-col md:w-[56%] lg:w-1/2">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="kisi absolute inset-0" />
            <div className="cahaya cahaya-a -right-32 -top-40 h-[420px] w-[420px]" />
            <div className="cahaya cahaya-b -left-40 top-1/3 h-[380px] w-[380px]" />
          </div>

          {/* Bilah atas ponsel — menempel seperti bilah aplikasi */}
          <div
            className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--line-soft)] bg-[color:var(--bg)]/85 px-4 py-3 backdrop-blur-xl md:hidden"
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
          >
            <button
              type="button"
              onClick={handleBack}
              aria-label={step === 1 ? "Kembali ke beranda" : "Kembali ke langkah sebelumnya"}
              className={tombolBulat}
            >
              <ArrowLeft size={17} />
            </button>
            <Link href="/" className="focusable flex min-w-0 flex-1 items-center gap-2.5">
              <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
              <span className="truncate text-[15px] font-medium" style={judulSerif}>
                Mahatma Academy
              </span>
            </Link>
            {tombolTema}
          </div>

          {/* Kendali khusus layar besar */}
          <div className="absolute right-8 top-8 z-30 hidden items-center gap-2 md:flex">
            {step !== 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="focusable inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-2.5 text-[13px] text-[color:var(--ink-2)] shadow-[var(--shadow-soft)] transition-colors duration-300 hover:text-[color:var(--ink)]"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                {step === 2 ? "Ganti peran" : "Kembali"}
              </button>
            )}
            {tombolTema}
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-y-auto px-5 py-8 sm:px-8 sm:py-14"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="w-full max-w-[440px]">
              {/* Penunjuk langkah */}
              <div className="mb-7 flex items-center gap-2" aria-hidden="true">
                {Array.from({ length: totalLangkah }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                      i < step ? "bg-[color:var(--brand)]" : "bg-[color:var(--line)]"
                    }`}
                  />
                ))}
              </div>

              {/* Pemberitahuan pemeliharaan */}
              <AnimatePresence>
                {isMaintenance && step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: HALUS }}
                    role="alert"
                    className="mb-7 flex items-start gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-soft)]"
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
                    <p className="mb-3 text-[12.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--accent)]">
                      Langkah 1 dari 2
                    </p>
                    <h1
                      className="text-[clamp(28px,7vw,36px)] font-normal leading-[1.15] tracking-[-0.02em]"
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
                      {roles.map((role, i) => {
                        const aktif = selectedRole === role.id;
                        return (
                          <button
                            key={role.id}
                            ref={(el) => {
                              tombolPeran.current[i] = el;
                            }}
                            type="button"
                            role="radio"
                            aria-checked={aktif}
                            tabIndex={aktif || (!selectedRole && i === 0) ? 0 : -1}
                            onKeyDown={(e) => onKeyPeran(e, i)}
                            onClick={() => setSelectedRole(role.id)}
                            className={`focusable relative flex flex-col items-start overflow-hidden rounded-2xl border p-5 text-left shadow-[var(--shadow-soft)] transition-all duration-300 active:scale-[.98] ${
                              aktif
                                ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
                                : "border-[color:var(--line-soft)] bg-[color:var(--surface)] hover:border-[color:var(--line)]"
                            }`}
                          >
                            <AnimatePresence>
                              {aktif && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.6 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.6 }}
                                  transition={{ duration: 0.2 }}
                                  aria-hidden="true"
                                  className="absolute right-3.5 top-3.5 text-[color:var(--brand)]"
                                >
                                  <CheckCircle2 size={18} />
                                </motion.span>
                              )}
                            </AnimatePresence>
                            <span
                              aria-hidden="true"
                              className={`mb-4 grid h-11 w-11 place-items-center rounded-xl transition-colors duration-300 ${
                                aktif
                                  ? "bg-[color:var(--brand)] text-[color:var(--brand-ink)]"
                                  : "bg-[color:var(--surface-2)] text-[color:var(--ink-2)]"
                              }`}
                            >
                              <role.icon size={20} />
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
                      className={`${tombolUtama} group mt-8 disabled:bg-[color:var(--surface-2)] disabled:text-[color:var(--ink-3)] disabled:opacity-100 disabled:shadow-none`}
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
                    className="rounded-3xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8"
                  >
                    <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 py-1.5 text-[12.5px] text-[color:var(--ink-2)]">
                      {(() => {
                        const peran = roles.find((r) => r.id === selectedRole);
                        if (!peran) return "Masuk ke sistem";
                        const Ikon = peran.icon;
                        return (
                          <>
                            <Ikon
                              size={14}
                              className="text-[color:var(--accent)]"
                              aria-hidden="true"
                            />
                            Masuk sebagai {peran.name}
                          </>
                        );
                      })()}
                    </span>
                    <h1
                      className="text-[clamp(24px,6vw,30px)] font-normal leading-[1.15] tracking-[-0.02em]"
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
                            autoCapitalize="none"
                            spellCheck={false}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={sibuk}
                            placeholder="nama@sekolah.sch.id"
                            className="kolom focusable"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <label
                            htmlFor="login-password"
                            className="text-[13px] font-medium text-[color:var(--ink-2)]"
                          >
                            Kata sandi
                          </label>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={sibuk}
                            className="focusable rounded text-[13px] text-[color:var(--accent)] transition-opacity duration-300 hover:opacity-75 disabled:opacity-50"
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
                            disabled={sibuk}
                            placeholder="Masukkan kata sandi"
                            className="kolom kolom-aksi focusable"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={
                              showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                            }
                            className="focusable absolute inset-y-0 right-0 flex items-center px-4 text-[color:var(--ink-3)] transition-colors duration-300 hover:text-[color:var(--ink)]"
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>

                      <button type="submit" disabled={sibuk} className={tombolUtama}>
                        {sibuk ? (
                          <>
                            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                            {mengalihkan ? "Mengarahkan" : "Memverifikasi"}
                          </>
                        ) : (
                          "Masuk"
                        )}
                      </button>
                    </form>

                    {selectedRole !== "admin" && bolehDaftar && (
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

                    {selectedRole !== "admin" && !bolehDaftar && (
                      <p
                        role="status"
                        className="mt-7 border-t border-[color:var(--line-soft)] pt-6 text-center text-[13.5px] text-[color:var(--ink-2)]"
                      >
                        {isMaintenance
                          ? "Pendaftaran ditutup selama pemeliharaan sistem."
                          : "Pendaftaran akun baru sedang ditutup. Hubungi administrator sekolah Anda."}
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
                    className="rounded-3xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8"
                  >
                    <p className="mb-3 text-[12.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--accent)]">
                      Pengajuan akun baru
                    </p>
                    <h1
                      className="text-[clamp(24px,6vw,30px)] font-normal leading-[1.15] tracking-[-0.02em]"
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
                            disabled={otpSent || sibuk}
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
                              disabled={otpSent || sibuk}
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
                            disabled={otpSent || sibuk}
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
                            autoCapitalize="none"
                            spellCheck={false}
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                            disabled={otpSent || sibuk}
                            className="kolom focusable"
                          />
                        </div>
                        {otpSent && (
                          <button
                            type="button"
                            onClick={bukaUlangIsian}
                            className="focusable mt-2.5 inline-flex items-center gap-1.5 rounded text-[13px] text-[color:var(--accent)] transition-opacity hover:opacity-75"
                          >
                            <PencilLine size={14} aria-hidden="true" />
                            Ubah data dan kirim ulang kode
                          </button>
                        )}
                      </div>

                      {/* Verifikasi kode */}
                      {metodeVerifikasi === "otp_email" && (
                        <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--accent-soft)]/60 p-4">
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
                                disabled={!otpSent || sibuk}
                                value={inputOtp}
                                onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ""))}
                                placeholder={otpSent ? "6 digit kode" : "Kirim kode dulu"}
                                className="kolom focusable tracking-[0.3em]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSendOTP}
                              disabled={
                                isSendingOtp || !regEmail.trim() || jedaKirimUlang > 0 || sibuk
                              }
                              className="focusable inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[color:var(--accent)] px-4 text-[13.5px] font-medium text-white transition-opacity duration-300 hover:opacity-90 active:scale-95 disabled:opacity-45"
                            >
                              {isSendingOtp ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : jedaKirimUlang > 0 ? (
                                `${jedaKirimUlang}s`
                              ) : otpSent ? (
                                <>
                                  <RefreshCw size={14} aria-hidden="true" />
                                  Kirim ulang
                                </>
                              ) : (
                                "Kirim kode"
                              )}
                            </button>
                          </div>
                          <p className="mt-2.5 text-[12.5px] leading-relaxed text-[color:var(--ink-2)]">
                            {jedaKirimUlang > 0
                              ? `Kode sudah dikirim. Bisa dikirim ulang dalam ${jedaKirimUlang} detik.`
                              : otpSent
                                ? "Kode belum masuk? Tekan Kirim ulang, lalu periksa folder spam."
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
                            disabled={sibuk}
                            placeholder="Minimal 6 karakter"
                            className="kolom kolom-aksi focusable"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={
                              showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                            }
                            className="focusable absolute inset-y-0 right-0 flex items-center px-4 text-[color:var(--ink-3)] transition-colors duration-300 hover:text-[color:var(--ink)]"
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={sibuk || (metodeVerifikasi === "otp_email" && !otpSent)}
                        className={tombolUtama}
                      >
                        {sibuk ? (
                          <>
                            <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                            {mengalihkan ? "Mengarahkan" : "Mengirim"}
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