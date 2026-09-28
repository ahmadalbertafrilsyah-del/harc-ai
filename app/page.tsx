"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Spectral, IBM_Plex_Sans } from "next/font/google";
import { Menu, X, Sun, Moon, Send, Loader2, MessageCircle, ArrowRight, Languages, Users, Landmark, LifeBuoy, NotebookPen, ShieldCheck, Sparkles, CircleCheck, FilePenLine, ClipboardList, UserCheck, } from "lucide-react";
import { useTema } from "@/lib/useTema";

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
  --shadow-soft:0 1px 2px rgba(26,31,46,.04), 0 8px 24px -12px rgba(26,31,46,.14);
  --shadow-lift:0 2px 4px rgba(26,31,46,.05), 0 18px 40px -18px rgba(26,31,46,.22);
  --texture:rgba(26,31,46,.022);
  --glow-a:rgba(31,48,83,.16);
  --glow-b:rgba(20,106,94,.15);
  --band:#14203A;
  --band-2:#0F3B39;
  --band-ink:#F4F2ED;
  --band-ink-2:#B3BBCB;
  --band-line:rgba(255,255,255,.12);
}
[data-theme="dark"]{
  --bg:#12151C;
  --bg-2:#161A23;
  --surface:#1A1F2A;
  --surface-2:#222735;
  --ink:#EDEEF1;
  --ink-2:#A5AAB8;
  --ink-3:#757B8B;
  --line:#2C3340;
  --line-soft:#242A35;
  --brand:#B9C7E8;
  --brand-soft:#232A3A;
  --brand-ink:#12151C;
  --accent:#6FC3B4;
  --accent-soft:#1B2A2A;
  --focus:#B9C7E8;
  --shadow-soft:0 1px 2px rgba(0,0,0,.3), 0 8px 24px -12px rgba(0,0,0,.6);
  --shadow-lift:0 2px 4px rgba(0,0,0,.35), 0 18px 40px -18px rgba(0,0,0,.7);
  --texture:rgba(255,255,255,.018);
  --glow-a:rgba(120,150,210,.16);
  --glow-b:rgba(80,180,165,.14);
  --band:#1B2438;
  --band-2:#123532;
  --band-ink:#F4F2ED;
  --band-ink-2:#A9B2C4;
  --band-line:rgba(255,255,255,.1);
}

/* Tekstur anyaman halus — nyaris tak terlihat, memberi "kertas" pada latar. */
.tekstur{
  background-image:
    repeating-linear-gradient(45deg, var(--texture) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(-45deg, var(--texture) 0 1px, transparent 1px 7px);
}
/* Kisi tipis di hero, memudar ke bawah. */
.kisi{
  background-image:
    linear-gradient(var(--line-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
  background-size:44px 44px;
  -webkit-mask-image:radial-gradient(ellipse 85% 70% at 50% 0%, #000 25%, transparent 75%);
          mask-image:radial-gradient(ellipse 85% 70% at 50% 0%, #000 25%, transparent 75%);
}
/* Cahaya latar yang melayang pelan. Tanpa filter blur agar ringan di ponsel. */
.cahaya{
  position:absolute; border-radius:9999px; pointer-events:none;
  animation:melayang 16s ease-in-out infinite alternate;
}
.cahaya-a{ background:radial-gradient(circle, var(--glow-a), transparent 66%); }
.cahaya-b{ background:radial-gradient(circle, var(--glow-b), transparent 66%); animation-delay:-8s; }
@keyframes melayang{
  0%{ transform:translate3d(0,0,0) scale(1); }
  100%{ transform:translate3d(36px,28px,0) scale(1.1); }
}
.teks-gradasi{
  background:linear-gradient(100deg, var(--brand) 5%, var(--accent) 95%);
  -webkit-background-clip:text; background-clip:text;
  color:transparent;
}
.titik-denyut{ position:relative; }
.titik-denyut::after{
  content:""; position:absolute; inset:0; border-radius:9999px;
  background:var(--accent); animation:denyut 2.2s ease-out infinite;
}
@keyframes denyut{
  0%{ transform:scale(1); opacity:.6; }
  100%{ transform:scale(3.2); opacity:0; }
}
.pita{
  background:
    radial-gradient(700px 360px at 100% 0%, rgba(111,195,180,.18), transparent 60%),
    radial-gradient(600px 320px at 0% 100%, rgba(185,199,232,.14), transparent 60%),
    linear-gradient(135deg, var(--band), var(--band-2));
}
.geser-x{ scrollbar-width:none; -webkit-overflow-scrolling:touch; }
.geser-x::-webkit-scrollbar{ display:none; }

html{ scroll-behavior:smooth; -webkit-text-size-adjust:100%; }
body{ overflow-x:hidden; }
::selection{ background:var(--brand); color:var(--brand-ink); }

.focusable:focus-visible{
  outline:2px solid var(--focus);
  outline-offset:3px;
  border-radius:8px;
}
.kartu{
  transition: transform .45s cubic-bezier(.22,1,.36,1),
              box-shadow .45s cubic-bezier(.22,1,.36,1),
              border-color .45s ease;
}
@media (hover:hover){
  .kartu:hover{
    transform: translateY(-4px);
    box-shadow: var(--shadow-lift);
    border-color: var(--line);
  }
  .kartu:hover .ikon-kartu{
    background:var(--brand); color:var(--brand-ink);
  }
}
.ikon-kartu{ transition: background-color .35s ease, color .35s ease; }
@media (prefers-reduced-motion: reduce){
  html{ scroll-behavior:auto; }
  *,*::before,*::after{
    animation-duration:.01ms !important;
    animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
  .kartu:hover{ transform:none; }
}
`;

const NAV = [
  { href: "#dimensi", label: "Dimensi penilaian" },
  { href: "#alur", label: "Cara kerja" },
  { href: "#otoritas", label: "Peran guru" },
];

const dimensi = [
  {
    nama: "Penguasaan linguistik",
    isi: "Ketepatan makna, kosakata, dan pemahaman siswa atas materi yang diujikan.",
    ikon: Languages,
  },
  {
    nama: "Ketepatan sosiolinguistik",
    isi: "Kesesuaian tingkat tutur dan dialek dengan lawan bicara serta tujuan komunikasi.",
    ikon: Users,
  },
  {
    nama: "Interpretasi budaya",
    isi: "Nilai lokal, sejarah, dan praktik sosial yang hidup di masyarakat diperlakukan sebagai jawaban sah.",
    ikon: Landmark,
  },
  {
    nama: "Mediasi adaptif",
    isi: "Petunjuk diberikan bertahap ketika siswa tersendat, tanpa membuka jawaban.",
    ikon: LifeBuoy,
  },
  {
    nama: "Refleksi belajar",
    isi: "Siswa menjelaskan alasan perbaikannya sendiri dan memilih langkah belajar berikutnya.",
    ikon: NotebookPen,
  },
  {
    nama: "Adab dan etika digital",
    isi: "Kejujuran akademik, kesantunan interaksi, dan transparansi penggunaan data pribadi.",
    ikon: ShieldCheck,
  },
];

const alur = [
  {
    judul: "Guru menyusun asesmen",
    isi: "Guru memasukkan Kompetensi Dasar. Sistem menyusun instrumen yang memuat aspek kebahasaan sekaligus konteks budaya setempat.",
    ikon: ClipboardList,
  },
  {
    judul: "Siswa mengerjakan dengan pendampingan",
    isi: "Selama ujian berlangsung, siswa yang tersendat menerima petunjuk bertahap. Jawaban tidak pernah diberikan langsung.",
    ikon: LifeBuoy,
  },
  {
    judul: "Siswa menulis jurnal refleksi",
    isi: "Sebelum mengumpulkan, siswa mencatat kendala yang dialaminya. Catatan ini menjadi bagian dari penilaian.",
    ikon: NotebookPen,
  },
  {
    judul: "Guru meninjau dan memutuskan",
    isi: "Sistem menyajikan analitik kemandirian. Nilai akhir tetap ditetapkan guru, termasuk saat dialek lokal perlu dibenarkan.",
    ikon: UserCheck,
  },
];

const angka = [
  { nilai: "15.000+", label: "peserta didik aktif" },
  { nilai: "1.200+", label: "modul tervalidasi" },
  { nilai: "50", label: "sekolah mitra" },
  { nilai: "6", label: "dimensi penilaian" },
];

const contohSkor = [
  { nama: "Linguistik", skor: 88 },
  { nama: "Sosiolinguistik", skor: 74 },
  { nama: "Interpretasi budaya", skor: 91 },
  { nama: "Mediasi adaptif", skor: 69 },
  { nama: "Refleksi belajar", skor: 80 },
  { nama: "Adab digital", skor: 95 },
];
const rataRata = Math.round(contohSkor.reduce((t, d) => t + d.skor, 0) / contohSkor.length);

const jaminan = [
  "Dialek lokal diakui sah",
  "Guru pemegang nilai akhir",
  "Data siswa tidak melatih model",
];

const komitmen = [
  { ikon: FilePenLine, judul: "Setiap skor bisa diubah", isi: "Guru menyesuaikan nilai usulan sebelum disimpan." },
  { ikon: ClipboardList, judul: "Setiap perubahan tercatat", isi: "Riwayat koreksi tersimpan dan dapat ditelusuri." },
  { ikon: ShieldCheck, judul: "Data siswa terlindungi", isi: "Jawaban siswa tidak dipakai untuk melatih model." },
];

const saranPertanyaan = [
  "Apa saja fitur HARC-AI?",
  "Bagaimana sekolah mendaftar?",
  "Bagaimana cara penilaiannya?",
];

const HALUS = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: "-60px" };

const masuk = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay: 0.06 + i * 0.07, ease: HALUS },
});

const muncul = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT,
  transition: { duration: 0.55, delay: i * 0.07, ease: HALUS },
});

const KELILING = 2 * Math.PI * 34;

export default function LandingPage() {
  /* Tema dipakai bersama halaman login lewat satu hook, sehingga pilihan
     pengguna terbawa antar halaman dan <html> ikut berubah. */
  const { tema: theme, gantiTema: toggleTheme } = useTema();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lewatHero, setLewatHero] = useState(false);
  const [dimAktif, setDimAktif] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Selamat datang. Saya asisten informasi HARC-AI. Tanyakan soal fitur, pendaftaran sekolah, atau cara kerja penilaiannya.",
    },
  ]);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dimRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setLewatHero(window.scrollY > 560);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Kunci gulir latar saat panel menutupi layar. */
  useEffect(() => {
    document.body.style.overflow = menuOpen || chatOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, chatOpen]);

  useEffect(() => {
    const pelan = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: pelan ? "auto" : "smooth" });
  }, [messages, loadingChat]);

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setChatOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onGeserDimensi = () => {
    const el = dimRef.current;
    const kartu = el?.firstElementChild as HTMLElement | null;
    if (!el || !kartu) return;
    const langkah = kartu.offsetWidth + 16;
    setDimAktif(Math.min(dimensi.length - 1, Math.round(el.scrollLeft / langkah)));
  };

  const keDimensi = (i: number) => {
    const el = dimRef.current;
    const kartu = el?.children[i] as HTMLElement | undefined;
    if (!el || !kartu) return;
    el.scrollTo({ left: kartu.offsetLeft - el.offsetLeft - 16, behavior: "smooth" });
  };

  const kirim = async (teksMentah: string) => {
    const teks = teksMentah.trim();
    if (!teks || loadingChat) return;

    const riwayat = [...messages, { role: "user", content: teks }];
    setMessages(riwayat);
    setChatInput("");
    setLoadingChat(true);

    try {
      const res = await fetch("/api/chat-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: riwayat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Permintaan ditolak server.");

      const balasan =
        data?.choices?.[0]?.message?.content ??
        "Jawaban tidak terbaca. Coba ulangi pertanyaannya.";
      setMessages((prev) => [...prev, { role: "assistant", content: balasan }]);
    } catch (err) {
      const pesan = err instanceof Error ? err.message : "Koneksi terputus.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Pesan gagal terkirim: ${pesan} Periksa koneksi lalu kirim ulang.`,
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const kirimPesan = (e: React.FormEvent) => {
    e.preventDefault();
    kirim(chatInput);
  };

  const judulSerif = { fontFamily: "var(--font-display), Georgia, serif" };
  const tampilDock = lewatHero && !chatOpen && !menuOpen;

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-theme={theme}
        suppressHydrationWarning
        className={`${sans.variable} ${display.variable} tekstur min-h-screen bg-[color:var(--bg)] text-[color:var(--ink)] antialiased`}
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        <style dangerouslySetInnerHTML={{ __html: TOKENS }} />

        <a
          href="#konten"
          className="focusable sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[color:var(--surface)] focus:px-4 focus:py-2 focus:text-sm focus:shadow-[var(--shadow-soft)]"
        >
          Lompat ke konten utama
        </a>

        <header
          className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-[box-shadow,border-color,background-color] duration-500 ${
            scrolled
              ? "border-[color:var(--line)] bg-[color:var(--bg)]/80 shadow-[var(--shadow-soft)]"
              : "border-transparent bg-transparent"
          }`}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-8">
            <Link href="#beranda" className="focusable flex shrink-0 items-center gap-3">
              <img src="/logo.png" alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
              <span className="leading-tight">
                <span className="block text-[17px] font-semibold tracking-tight" style={judulSerif}>
                  HARC&#8209;AI
                </span>
                <span className="block text-[11px] text-[color:var(--ink-2)]">Mahatma Academy</span>
              </span>
            </Link>

            <nav
              aria-label="Navigasi utama"
              className="hidden items-center gap-1 rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface)]/70 p-1 lg:flex"
            >
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="focusable rounded-full px-4 py-2 text-[14px] text-[color:var(--ink-2)] transition-colors duration-300 hover:bg-[color:var(--surface-2)] hover:text-[color:var(--ink)]"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap"}
                className="focusable grid h-10 w-10 place-items-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--ink-2)] transition-colors duration-300 hover:text-[color:var(--ink)]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid place-items-center"
                  >
                    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  </motion.span>
                </AnimatePresence>
              </button>

              <Link
                href="/login"
                className="focusable hidden items-center gap-2 rounded-full bg-[color:var(--brand)] px-5 py-2.5 text-[14px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-px hover:shadow-[var(--shadow-lift)] sm:inline-flex"
              >
                Masuk portal
                <ArrowRight size={15} />
              </Link>

              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Buka menu"
                aria-expanded={menuOpen}
                className="focusable grid h-10 w-10 place-items-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--ink-2)] lg:hidden"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-[60] bg-[#0D1119]/40 backdrop-blur-[3px] lg:hidden"
                aria-hidden="true"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.38, ease: HALUS }}
                role="dialog"
                aria-modal="true"
                aria-label="Menu navigasi"
                className="fixed inset-y-0 right-0 z-[70] flex w-[88%] max-w-sm flex-col bg-[color:var(--bg)] shadow-[var(--shadow-lift)] lg:hidden"
              >
                <div className="flex h-16 items-center justify-between border-b border-[color:var(--line-soft)] px-5">
                  <span className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
                    <span className="text-[17px] font-medium" style={judulSerif}>
                      HARC&#8209;AI
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Tutup menu"
                    className="focusable grid h-10 w-10 place-items-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)]"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="flex flex-col px-5 pt-2" aria-label="Navigasi seluler">
                  {[{ href: "#beranda", label: "Beranda" }, ...NAV].map((item, i) => (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: HALUS }}
                      className="focusable group flex items-center justify-between border-b border-[color:var(--line-soft)] py-5 text-[20px]"
                      style={judulSerif}
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="text-[12px] tabular-nums text-[color:var(--ink-3)]">
                          0{i + 1}
                        </span>
                        {item.label}
                      </span>
                      <ArrowRight
                        size={16}
                        className="text-[color:var(--ink-3)] transition-transform group-active:translate-x-1"
                      />
                    </motion.a>
                  ))}
                </nav>

                <div className="mt-auto space-y-3 p-5" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="focusable flex items-center justify-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] py-3.5 text-[14px] text-[color:var(--ink-2)]"
                    >
                      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                      {theme === "dark" ? "Terang" : "Gelap"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setChatOpen(true);
                      }}
                      className="focusable flex items-center justify-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] py-3.5 text-[14px] text-[color:var(--ink-2)]"
                    >
                      <MessageCircle size={16} className="text-[color:var(--accent)]" />
                      Asisten
                    </button>
                  </div>
                  <Link
                    href="/login"
                    className="focusable flex items-center justify-center gap-2 rounded-xl bg-[color:var(--brand)] px-5 py-4 text-center text-[15px] font-medium text-[color:var(--brand-ink)]"
                  >
                    Masuk portal
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main id="konten">
          <section
            id="beranda"
            className="relative -mt-16 overflow-hidden border-b border-[color:var(--line-soft)] pt-16 sm:-mt-[72px] sm:pt-[72px]"
            aria-labelledby="judul-hero"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="kisi absolute inset-0" />
              <div className="cahaya cahaya-a -left-40 -top-40 h-[520px] w-[520px] sm:h-[680px] sm:w-[680px]" />
              <div className="cahaya cahaya-b -right-48 top-10 h-[460px] w-[460px] sm:h-[620px] sm:w-[620px]" />
            </div>

            <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-12 lg:items-center lg:gap-14 lg:pb-28 lg:pt-20">
              <div className="lg:col-span-7">
                <motion.p
                  {...masuk(0)}
                  className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)]/80 px-3.5 py-1.5 text-[12.5px] text-[color:var(--ink-2)] shadow-[var(--shadow-soft)] backdrop-blur sm:text-[13px]"
                >
                  <span
                    aria-hidden="true"
                    className="titik-denyut h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]"
                  />
                  <Sparkles size={13} className="text-[color:var(--accent)]" aria-hidden="true" />
                  Asesmen sekolah berbasis AI
                </motion.p>

                <motion.h1
                  {...masuk(1)}
                  id="judul-hero"
                  className="max-w-[15ch] text-[clamp(34px,9vw,60px)] font-normal leading-[1.08] tracking-[-0.025em]"
                  style={judulSerif}
                >
                  Menilai bahasa daerah tanpa mengabaikan{" "}
                  <span className="teks-gradasi italic">konteks budayanya.</span>
                </motion.h1>

                <motion.p
                  {...masuk(2)}
                  className="mt-6 max-w-[56ch] text-[15.5px] leading-[1.75] text-[color:var(--ink-2)] sm:text-[17px]"
                >
                  HARC-AI menyusun instrumen ujian, mendampingi siswa selama mengerjakan, dan
                  merangkum hasilnya menjadi analitik yang bisa dibaca guru dalam hitungan menit.
                  Dialek dan kearifan setempat diperlakukan sebagai jawaban yang sah, bukan
                  kesalahan.
                </motion.p>

                <motion.div
                  {...masuk(3)}
                  className="mt-9 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:flex sm:items-center sm:gap-4"
                >
                  <Link
                    href="/login"
                    className="focusable group inline-flex items-center justify-center gap-2.5 rounded-xl bg-[color:var(--brand)] px-7 py-4 text-[15px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-lift)] transition-all duration-300 hover:-translate-y-0.5 active:scale-[.98] sm:py-3.5"
                  >
                    Mulai evaluasi
                    <ArrowRight
                      size={17}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                  <a
                    href="#alur"
                    className="focusable inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)]/80 px-6 py-4 text-[15px] text-[color:var(--ink)] backdrop-blur transition-colors duration-300 hover:bg-[color:var(--surface)] active:scale-[.98] sm:py-3.5"
                  >
                    Lihat cara kerja
                  </a>
                </motion.div>

                <motion.ul
                  {...masuk(4)}
                  className="mt-8 flex flex-col gap-2.5 text-[13.5px] text-[color:var(--ink-2)] sm:flex-row sm:flex-wrap sm:gap-x-6"
                >
                  {jaminan.map((j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CircleCheck size={16} className="shrink-0 text-[color:var(--accent)]" aria-hidden="true" />
                      {j}
                    </li>
                  ))}
                </motion.ul>
              </div>

              {/* Panel contoh hasil — memperlihatkan produknya, bukan ilustrasi */}
              <div className="relative lg:col-span-5">
                <motion.figure
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.24, ease: HALUS }}
                  className="relative overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[var(--shadow-lift)]"
                >
                  <figcaption className="flex items-center justify-between border-b border-[color:var(--line-soft)] bg-[color:var(--surface-2)]/60 px-5 py-3.5 sm:px-6">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--line)]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--line)]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--line)]" />
                      </span>
                      <span className="ml-2 text-[13.5px] font-medium">Ringkasan penilaian</span>
                    </span>
                    <span className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-1 text-[11px] text-[color:var(--accent)]">
                      Contoh
                    </span>
                  </figcaption>

                  <div className="px-5 py-5 sm:px-6 sm:py-6">
                    {/* Skor rata-rata */}
                    <div className="mb-6 flex items-center gap-5 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-2)]/50 p-4">
                      <div className="relative h-[84px] w-[84px] shrink-0">
                        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
                          <defs>
                            <linearGradient id="gradasi-cincin" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" style={{ stopColor: "var(--brand)" }} />
                              <stop offset="100%" style={{ stopColor: "var(--accent)" }} />
                            </linearGradient>
                          </defs>
                          <circle cx="40" cy="40" r="34" fill="none" strokeWidth="7" style={{ stroke: "var(--surface-2)" }} />
                          <motion.circle
                            cx="40"
                            cy="40"
                            r="34"
                            fill="none"
                            strokeWidth="7"
                            strokeLinecap="round"
                            stroke="url(#gradasi-cincin)"
                            strokeDasharray={KELILING}
                            initial={{ strokeDashoffset: KELILING }}
                            animate={{ strokeDashoffset: KELILING * (1 - rataRata / 100) }}
                            transition={{ duration: 1.4, delay: 0.5, ease: HALUS }}
                          />
                        </svg>
                        <span
                          className="absolute inset-0 grid place-items-center text-[24px] tabular-nums"
                          style={judulSerif}
                        >
                          {rataRata}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] uppercase tracking-[0.08em] text-[color:var(--ink-3)]">
                          Skor rata-rata
                        </p>
                        <p className="mt-1 text-[15px] font-medium leading-snug">Tugas 4 — Ragam krama</p>
                        <p className="mt-0.5 text-[13px] text-[color:var(--ink-2)]">Kelas VIII&nbsp;B</p>
                      </div>
                    </div>

                    <ul className="space-y-3.5">
                      {contohSkor.map((d, i) => (
                        <motion.li key={d.nama} {...muncul(i)}>
                          <div className="mb-1.5 flex items-baseline justify-between text-[13.5px]">
                            <span className="text-[color:var(--ink-2)]">{d.nama}</span>
                            <span className="tabular-nums text-[15px]" style={judulSerif}>
                              {d.skor}
                            </span>
                          </div>
                          <div
                            className="h-[6px] w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]"
                            role="img"
                            aria-label={`${d.nama}: ${d.skor} dari 100`}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              style={{
                                background: "linear-gradient(90deg, var(--brand), var(--accent))",
                              }}
                              initial={{ width: "0%" }}
                              whileInView={{ width: `${d.skor}%` }}
                              viewport={VIEWPORT}
                              transition={{ duration: 1.1, ease: HALUS, delay: 0.3 + i * 0.07 }}
                            />
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <p className="flex items-start gap-2.5 border-t border-[color:var(--line-soft)] bg-[color:var(--surface-2)]/50 px-5 py-4 text-[13px] leading-relaxed text-[color:var(--ink-2)] sm:px-6">
                    <UserCheck size={16} className="mt-0.5 shrink-0 text-[color:var(--accent)]" aria-hidden="true" />
                    Nilai ini usulan sistem. Guru dapat menyesuaikannya sebelum disimpan.
                  </p>
                </motion.figure>

                {/* Kartu melayang — hanya di layar lebar */}
                <motion.div
                  aria-hidden="true"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.9, ease: HALUS }}
                  className="absolute -left-10 top-24 hidden items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 shadow-[var(--shadow-lift)] xl:flex"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                    <LifeBuoy size={16} />
                  </span>
                  <span className="text-[12.5px] leading-tight">
                    <span className="block font-medium">Petunjuk ke-2</span>
                    <span className="text-[color:var(--ink-3)]">diberikan bertahap</span>
                  </span>
                </motion.div>
                <motion.div
                  aria-hidden="true"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.1, ease: HALUS }}
                  className="absolute -bottom-6 -right-6 hidden items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 shadow-[var(--shadow-lift)] xl:flex"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
                    <CircleCheck size={16} />
                  </span>
                  <span className="text-[12.5px] leading-tight">
                    <span className="block font-medium">Disetujui guru</span>
                    <span className="text-[color:var(--ink-3)]">2 skor disesuaikan</span>
                  </span>
                </motion.div>
              </div>
            </div>
          </section>

          <section
            aria-label="Cakupan penggunaan"
            className="border-b border-[color:var(--line-soft)] bg-[color:var(--bg-2)]"
          >
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-8 sm:gap-4 sm:px-8 sm:py-10 md:grid-cols-4">
              {angka.map((a, i) => (
                <motion.div
                  key={a.label}
                  {...muncul(i)}
                  className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] px-4 py-5 shadow-[var(--shadow-soft)] sm:px-6 sm:py-7"
                >
                  <p
                    className="teks-gradasi text-[clamp(28px,7vw,40px)] leading-none tracking-tight"
                    style={judulSerif}
                  >
                    {a.nilai}
                  </p>
                  <p className="mt-2.5 text-[12.5px] leading-snug text-[color:var(--ink-2)] sm:text-[13.5px]">
                    {a.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>

          <section
            id="dimensi"
            className="scroll-mt-16 border-b border-[color:var(--line-soft)]"
            aria-labelledby="judul-dimensi"
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
              <div className="max-w-[56ch]">
                <motion.p
                  {...muncul(0)}
                  className="mb-3 text-[12.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--accent)]"
                >
                  Dimensi penilaian
                </motion.p>
                <motion.h2
                  {...muncul(0)}
                  id="judul-dimensi"
                  className="text-[clamp(28px,6vw,42px)] font-normal leading-[1.15] tracking-[-0.02em]"
                  style={judulSerif}
                >
                  Enam sudut untuk <span className="teks-gradasi italic">satu jawaban</span>
                </motion.h2>
                <motion.p
                  {...muncul(1)}
                  className="mt-5 text-[15.5px] leading-[1.75] text-[color:var(--ink-2)] sm:text-[16.5px]"
                >
                  Setiap jawaban ditimbang dari enam sudut. Rinciannya terbuka, sehingga guru tahu
                  persis dari mana sebuah angka berasal dan di mana ia perlu dikoreksi.
                </motion.p>
              </div>

              <motion.ul
                {...muncul(2)}
                ref={dimRef}
                onScroll={onGeserDimensi}
                className="geser-x -mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
              >
                {dimensi.map((d, i) => {
                  const Ikon = d.ikon;
                  return (
                    <li
                      key={d.nama}
                      className="kartu relative w-[80%] shrink-0 snap-start overflow-hidden rounded-3xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)] min-[480px]:w-[62%] sm:w-auto sm:p-7"
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-3 -top-6 select-none text-[96px] leading-none text-[color:var(--line-soft)]"
                        style={judulSerif}
                      >
                        {i + 1}
                      </span>
                      <span
                        aria-hidden="true"
                        className="ikon-kartu relative mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                      >
                        <Ikon size={20} />
                      </span>
                      <h3 className="relative mb-2.5 text-[19px] font-medium leading-snug" style={judulSerif}>
                        {d.nama}
                      </h3>
                      <p className="relative text-[14.5px] leading-[1.7] text-[color:var(--ink-2)]">{d.isi}</p>
                    </li>
                  );
                })}
              </motion.ul>

              <div className="mt-4 flex items-center justify-center gap-2 sm:hidden">
                {dimensi.map((d, i) => (
                  <button
                    key={d.nama}
                    type="button"
                    onClick={() => keDimensi(i)}
                    aria-label={`Tampilkan ${d.nama}`}
                    aria-current={dimAktif === i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      dimAktif === i ? "w-6 bg-[color:var(--accent)]" : "w-2 bg-[color:var(--line)]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            id="alur"
            className="scroll-mt-16 border-b border-[color:var(--line-soft)] bg-[color:var(--bg-2)]"
            aria-labelledby="judul-alur"
          >
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-28">
                  <motion.p
                    {...muncul(0)}
                    className="mb-3 text-[12.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--accent)]"
                  >
                    Cara kerja
                  </motion.p>
                  <motion.h2
                    {...muncul(0)}
                    id="judul-alur"
                    className="text-[clamp(28px,6vw,42px)] font-normal leading-[1.15] tracking-[-0.02em]"
                    style={judulSerif}
                  >
                    Dari kompetensi dasar sampai nilai akhir
                  </motion.h2>
                  <motion.p
                    {...muncul(1)}
                    className="mt-5 max-w-[44ch] text-[15.5px] leading-[1.75] text-[color:var(--ink-2)] sm:text-[16.5px]"
                  >
                    Empat tahap, dengan keputusan akhir selalu berada di tangan guru.
                  </motion.p>
                </div>
              </div>

              <ol className="relative space-y-4 sm:space-y-5 lg:col-span-8">
                {/* Garis penghubung tahap */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-10 left-[21px] top-10 w-px sm:left-[27px]"
                  style={{ background: "linear-gradient(var(--brand), var(--accent))", opacity: 0.35 }}
                />
                {alur.map((t, i) => {
                  const Ikon = t.ikon;
                  return (
                    <motion.li
                      key={t.judul}
                      {...muncul(i)}
                      className="relative grid grid-cols-[2.75rem_1fr] gap-x-3 sm:grid-cols-[3.5rem_1fr] sm:gap-x-5"
                    >
                      <span
                        aria-hidden="true"
                        className="z-10 mt-4 grid h-11 w-11 place-items-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--accent)] shadow-[var(--shadow-soft)] sm:h-14 sm:w-14"
                      >
                        <Ikon size={19} />
                      </span>
                      <div className="kartu rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
                        <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                          Tahap {i + 1}
                        </p>
                        <h3 className="mb-2 text-[18.5px] font-medium leading-snug sm:text-[20px]" style={judulSerif}>
                          {t.judul}
                        </h3>
                        <p className="max-w-[58ch] text-[14.5px] leading-[1.75] text-[color:var(--ink-2)] sm:text-[15px]">
                          {t.isi}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          </section>

          <section
            id="otoritas"
            className="pita scroll-mt-16 text-[color:var(--band-ink)]"
            aria-labelledby="judul-otoritas"
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
              <h2 id="judul-otoritas" className="sr-only">
                Peran guru
              </h2>
              <blockquote className="relative max-w-[30ch]">
                <span
                  aria-hidden="true"
                  className="absolute -left-1 -top-10 select-none text-[110px] leading-none text-white/10 sm:-top-14 sm:text-[150px]"
                  style={judulSerif}
                >
                  &ldquo;
                </span>
                <motion.p
                  {...muncul(0)}
                  className="relative text-[clamp(26px,6vw,44px)] font-normal leading-[1.25] tracking-[-0.02em]"
                  style={judulSerif}
                >
                  Sistem ini menyiapkan bahan dan menghitung.{" "}
                  <em className="text-[#8FD6C8]">Yang menilai tetap guru.</em>
                </motion.p>
              </blockquote>
              <motion.p
                {...muncul(1)}
                className="mt-6 max-w-[56ch] text-[15.5px] leading-[1.75] text-[color:var(--band-ink-2)] sm:text-[16.5px]"
              >
                Guru menghemat waktu pemeriksaan tanpa menyerahkan kewenangan akademiknya.
              </motion.p>

              <ul className="mt-10 grid gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-5">
                {komitmen.map((k, i) => {
                  const Ikon = k.ikon;
                  return (
                    <motion.li
                      key={k.judul}
                      {...muncul(i)}
                      className="flex gap-4 rounded-2xl border border-[color:var(--band-line)] bg-white/[0.04] p-5 backdrop-blur-sm sm:flex-col sm:gap-0 sm:p-6"
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#8FD6C8] sm:mb-4"
                      >
                        <Ikon size={18} />
                      </span>
                      <span>
                        <span className="block text-[16px] font-medium" style={judulSerif}>
                          {k.judul}
                        </span>
                        <span className="mt-1 block text-[14px] leading-[1.6] text-[color:var(--band-ink-2)]">
                          {k.isi}
                        </span>
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="border-b border-[color:var(--line-soft)]">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
              <motion.div
                {...muncul(0)}
                className="relative overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface)] p-7 shadow-[var(--shadow-lift)] sm:p-12"
              >
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <div className="cahaya cahaya-b -right-24 -top-32 h-[380px] w-[380px]" />
                  <div className="cahaya cahaya-a -bottom-40 -left-20 h-[340px] w-[340px]" />
                </div>
                <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2
                      className="max-w-[20ch] text-[clamp(26px,5.5vw,38px)] font-normal leading-[1.2] tracking-[-0.02em]"
                      style={judulSerif}
                    >
                      Ingin mencobanya di <span className="teks-gradasi">sekolah Anda?</span>
                    </h2>
                    <p className="mt-4 max-w-[50ch] text-[15px] leading-[1.7] text-[color:var(--ink-2)] sm:text-[16px]">
                      Masuk dengan akun sekolah, atau tanyakan dulu apa saja yang perlu disiapkan.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:shrink-0">
                    <Link
                      href="/login"
                      className="focusable group inline-flex items-center justify-center gap-2.5 rounded-xl bg-[color:var(--brand)] px-7 py-4 text-[15px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-lift)] transition-all duration-300 hover:-translate-y-0.5 active:scale-[.98] sm:py-3.5"
                    >
                      Masuk portal
                      <ArrowRight
                        size={17}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setChatOpen(true)}
                      className="focusable inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] px-6 py-4 text-[15px] text-[color:var(--ink)] transition-colors duration-300 hover:bg-[color:var(--surface-2)] active:scale-[.98] sm:py-3.5"
                    >
                      <MessageCircle size={17} className="text-[color:var(--accent)]" />
                      Tanya asisten
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <footer className="mx-auto max-w-6xl px-4 pb-28 pt-10 text-[13px] text-[color:var(--ink-2)] sm:px-8 sm:pb-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
              <span>
                <span className="block text-[15px] text-[color:var(--ink)]" style={judulSerif}>
                  Mahatma Academy
                </span>
                <span className="block text-[12px]">for Sustainable Education</span>
              </span>
            </div>
            <nav aria-label="Navigasi kaki" className="flex flex-wrap gap-x-6 gap-y-3">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="focusable transition-colors hover:text-[color:var(--ink)]"
                >
                  {item.label}
                </a>
              ))}
              <Link href="/login" className="focusable transition-colors hover:text-[color:var(--ink)]">
                Masuk portal
              </Link>
            </nav>
          </div>
          <p className="mt-8 border-t border-[color:var(--line-soft)] pt-6 text-[12.5px]">
            © 2026 Mahatma Academy. Platform asesmen HARC-AI.
          </p>
        </footer>

        <AnimatePresence>
          {tampilDock && (
            <motion.div
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 90, opacity: 0 }}
              transition={{ duration: 0.35, ease: HALUS }}
              className="fixed inset-x-3 bottom-3 z-[55] flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)]/90 p-2 shadow-[var(--shadow-lift)] backdrop-blur-xl sm:hidden"
              style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <Link
                href="/login"
                className="focusable flex flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--brand)] py-3.5 text-[15px] font-medium text-[color:var(--brand-ink)] active:scale-[.98]"
              >
                Masuk portal
                <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                aria-label="Tanya asisten"
                className="focusable grid h-[50px] w-[50px] shrink-0 place-items-center rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--accent)] active:scale-95"
              >
                <MessageCircle size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!chatOpen && (
            <motion.button
              type="button"
              onClick={() => setChatOpen(true)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: HALUS }}
              aria-label="Tanya asisten"
              className={`focusable fixed bottom-5 right-4 z-[55] flex h-14 w-14 items-center justify-center gap-2.5 rounded-full bg-[color:var(--brand)] text-[14px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-lift)] transition-transform duration-300 hover:-translate-y-0.5 sm:right-6 sm:h-auto sm:w-auto sm:px-5 sm:py-3.5 ${
                lewatHero ? "max-sm:hidden" : ""
              }`}
              style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <MessageCircle size={20} className="shrink-0 sm:hidden" />
              <MessageCircle size={17} className="hidden shrink-0 sm:block" />
              <span className="hidden sm:inline">Tanya asisten</span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {chatOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setChatOpen(false)}
                className="fixed inset-0 z-[60] bg-[#0D1119]/40 backdrop-blur-[3px]"
                aria-hidden="true"
              />
              <motion.section
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 28 }}
                transition={{ duration: 0.32, ease: HALUS }}
                role="dialog"
                aria-modal="true"
                aria-label="Asisten informasi HARC-AI"
                className="fixed inset-x-0 bottom-0 z-[70] flex h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[var(--shadow-lift)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-3rem)] sm:w-[400px] sm:rounded-3xl"
              >
                <span
                  aria-hidden="true"
                  className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[color:var(--line)] sm:hidden"
                />
                <header className="flex items-center justify-between border-b border-[color:var(--line-soft)] px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="relative grid h-10 w-10 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                    >
                      <Sparkles size={18} />
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[color:var(--surface)] bg-[color:var(--accent)]" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-medium">Asisten informasi</span>
                      <span className="block text-[12px] text-[color:var(--ink-3)]">
                        Jawaban dihasilkan otomatis
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    aria-label="Tutup asisten"
                    className="focusable grid h-10 w-10 place-items-center rounded-full border border-[color:var(--line)] text-[color:var(--ink-2)]"
                  >
                    <X size={17} />
                  </button>
                </header>

                <div
                  className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5"
                  aria-live="polite"
                >
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: HALUS }}
                      className={m.role === "user" ? "flex justify-end" : "flex"}
                    >
                      <p
                        className={`max-w-[85%] whitespace-pre-wrap px-4 py-3 text-[14.5px] leading-[1.65] ${
                          m.role === "user"
                            ? "rounded-2xl rounded-br-md bg-[color:var(--brand)] text-[color:var(--brand-ink)]"
                            : "rounded-2xl rounded-bl-md border border-[color:var(--line-soft)] bg-[color:var(--surface-2)] text-[color:var(--ink)]"
                        }`}
                      >
                        {m.content}
                      </p>
                    </motion.div>
                  ))}

                  {messages.length === 1 && !loadingChat && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {saranPertanyaan.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => kirim(s)}
                          className="focusable rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] px-3.5 py-2 text-[13px] text-[color:var(--ink-2)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] active:scale-[.97]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {loadingChat && (
                    <p className="flex items-center gap-2 px-1 text-[13px] text-[color:var(--ink-3)]">
                      <Loader2 size={14} className="animate-spin" />
                      Menyusun jawaban
                    </p>
                  )}
                  <div ref={endRef} />
                </div>

                <form
                  onSubmit={kirimPesan}
                  className="flex gap-2 border-t border-[color:var(--line-soft)] bg-[color:var(--surface-2)]/50 p-3"
                  style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
                >
                  <label htmlFor="pesan" className="sr-only">
                    Tulis pertanyaan
                  </label>
                  <input
                    id="pesan"
                    ref={inputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Tulis pertanyaan Anda"
                    disabled={loadingChat}
                    enterKeyHint="send"
                    className="focusable min-w-0 flex-1 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3.5 text-[16px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-3)] sm:text-[14.5px]"
                  />
                  <button
                    type="submit"
                    disabled={loadingChat || !chatInput.trim()}
                    aria-label="Kirim pertanyaan"
                    className="focusable grid w-12 shrink-0 place-items-center rounded-xl bg-[color:var(--brand)] text-[color:var(--brand-ink)] transition-opacity duration-300 hover:opacity-90 active:scale-95 disabled:opacity-40"
                  >
                    <Send size={17} />
                  </button>
                </form>
              </motion.section>
            </>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}