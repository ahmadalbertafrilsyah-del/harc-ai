"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Spectral, IBM_Plex_Sans } from "next/font/google";
import { Menu, X, Sun, Moon, Send, Loader2, MessageCircle, ArrowRight } from "lucide-react";

/* ------------------------------------------------------------------
   TIPOGRAFI
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
  --shadow-soft:0 1px 2px rgba(26,31,46,.04), 0 8px 24px -12px rgba(26,31,46,.14);
  --shadow-lift:0 2px 4px rgba(26,31,46,.05), 0 18px 40px -18px rgba(26,31,46,.22);
  --texture:rgba(26,31,46,.022);
  --wash-a:rgba(31,48,83,.07);
  --wash-b:rgba(20,106,94,.06);
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
  --wash-a:rgba(120,150,210,.07);
  --wash-b:rgba(80,180,165,.06);
}

/* Tekstur anyaman halus — nyaris tak terlihat, memberi "kertas" pada latar. */
.tekstur{
  background-image:
    repeating-linear-gradient(45deg, var(--texture) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(-45deg, var(--texture) 0 1px, transparent 1px 7px);
}
/* Sapuan warna lembut di kepala halaman saja. */
.wash{
  background-image:
    radial-gradient(900px 480px at 8% -20%, var(--wash-a), transparent 62%),
    radial-gradient(760px 420px at 96% -10%, var(--wash-b), transparent 58%);
}

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
    transform: translateY(-3px);
    box-shadow: var(--shadow-lift);
    border-color: var(--line);
  }
}
@media (prefers-reduced-motion: reduce){
  html{ scroll-behavior:auto; }
  *,*::before,*::after{
    animation-duration:.01ms !important;
    transition-duration:.01ms !important;
  }
  .kartu:hover{ transform:none; }
}
`;

/* ------------------------------------------------------------------
   KONTEN
------------------------------------------------------------------- */
const NAV = [
  { href: "#dimensi", label: "Dimensi penilaian" },
  { href: "#alur", label: "Cara kerja" },
  { href: "#otoritas", label: "Peran guru" },
];

const dimensi = [
  {
    nama: "Penguasaan linguistik",
    isi: "Ketepatan makna, kosakata, dan pemahaman siswa atas materi yang diujikan.",
  },
  {
    nama: "Ketepatan sosiolinguistik",
    isi: "Kesesuaian tingkat tutur dan dialek dengan lawan bicara serta tujuan komunikasi.",
  },
  {
    nama: "Interpretasi budaya",
    isi: "Nilai lokal, sejarah, dan praktik sosial yang hidup di masyarakat diperlakukan sebagai jawaban sah.",
  },
  {
    nama: "Mediasi adaptif",
    isi: "Petunjuk diberikan bertahap ketika siswa tersendat, tanpa membuka jawaban.",
  },
  {
    nama: "Refleksi belajar",
    isi: "Siswa menjelaskan alasan perbaikannya sendiri dan memilih langkah belajar berikutnya.",
  },
  {
    nama: "Adab dan etika digital",
    isi: "Kejujuran akademik, kesantunan interaksi, dan transparansi penggunaan data pribadi.",
  },
];

const alur = [
  {
    judul: "Guru menyusun asesmen",
    isi: "Guru memasukkan Kompetensi Dasar. Sistem menyusun instrumen yang memuat aspek kebahasaan sekaligus konteks budaya setempat.",
  },
  {
    judul: "Siswa mengerjakan dengan pendampingan",
    isi: "Selama ujian berlangsung, siswa yang tersendat menerima petunjuk bertahap. Jawaban tidak pernah diberikan langsung.",
  },
  {
    judul: "Siswa menulis jurnal refleksi",
    isi: "Sebelum mengumpulkan, siswa mencatat kendala yang dialaminya. Catatan ini menjadi bagian dari penilaian.",
  },
  {
    judul: "Guru meninjau dan memutuskan",
    isi: "Sistem menyajikan analitik kemandirian. Nilai akhir tetap ditetapkan guru, termasuk saat dialek lokal perlu dibenarkan.",
  },
];

/* Ganti dengan angka yang dapat diverifikasi sebelum rilis publik. */
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

/* ------------------------------------------------------------------
   POLA GERAK
   Semua nilai bersifat tetap (tidak bergantung state atau media query),
   sehingga markup di server dan di klien identik — tidak ada
   hydration mismatch. Preferensi "reduce motion" ditangani oleh
   <MotionConfig reducedMotion="user">, yang tidak mengubah HTML.
------------------------------------------------------------------- */
const HALUS = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: "-60px" };

/* Masuk saat halaman dimuat (dipakai di hero). */
const masuk = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay: 0.06 + i * 0.07, ease: HALUS },
});

/* Masuk saat elemen tergulir ke layar. */
const muncul = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT,
  transition: { duration: 0.55, delay: i * 0.07, ease: HALUS },
});

export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  /* Tema mengikuti preferensi sistem, lalu pilihan pengguna disimpan.
     Dibaca setelah hidrasi, sehingga render pertama tetap sama
     dengan yang dikirim server. */
  useEffect(() => {
    const tersimpan =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("harc-theme") as "light" | "dark" | null)
        : null;
    if (tersimpan) return setTheme(tersimpan);
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem("harc-theme", next);
    } catch {
      /* penyimpanan tidak tersedia */
    }
  };

  /* Header memperoleh bayangan tipis begitu halaman digulir. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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

  /* Kontrak API tidak berubah: POST /api/chat-public */
  const kirimPesan = async (e: React.FormEvent) => {
    e.preventDefault();
    const teks = chatInput.trim();
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

  const judulSerif = { fontFamily: "var(--font-display), Georgia, serif" };

  return (
    <MotionConfig reducedMotion="user">
      <div
        data-theme={theme}
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

        {/* ================= HEADER ================= */}
        <header
          className={`sticky top-0 z-50 border-b bg-[color:var(--bg)]/85 backdrop-blur-md transition-[box-shadow,border-color] duration-500 ${
            scrolled
              ? "border-[color:var(--line)] shadow-[var(--shadow-soft)]"
              : "border-transparent"
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

            <nav aria-label="Navigasi utama" className="hidden items-center gap-8 lg:flex">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="focusable relative py-1 text-[14px] text-[color:var(--ink-2)] transition-colors duration-300 hover:text-[color:var(--ink)]
                             after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0
                             after:bg-[color:var(--accent)] after:transition-transform after:duration-300 hover:after:scale-x-100"
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
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <Link
                href="/login"
                className="focusable hidden rounded-[10px] bg-[color:var(--brand)] px-5 py-2.5 text-[14px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-px hover:shadow-[var(--shadow-lift)] sm:block"
              >
                Masuk portal
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

        {/* ================= MENU SELULER ================= */}
        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-[60] bg-[#0D1119]/35 backdrop-blur-[2px] lg:hidden"
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
                className="fixed inset-y-0 right-0 z-[70] flex w-[86%] max-w-sm flex-col bg-[color:var(--bg)] shadow-[var(--shadow-lift)] lg:hidden"
              >
                <div className="flex h-16 items-center justify-between border-b border-[color:var(--line-soft)] px-5">
                  <span className="text-[17px] font-medium" style={judulSerif}>
                    Menu
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

                <nav className="flex flex-col px-5" aria-label="Navigasi seluler">
                  {[{ href: "#beranda", label: "Beranda" }, ...NAV].map((item, i) => (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: HALUS }}
                      className="focusable flex items-center justify-between border-b border-[color:var(--line-soft)] py-5 text-[18px]"
                      style={judulSerif}
                    >
                      {item.label}
                      <ArrowRight size={16} className="text-[color:var(--ink-3)]" />
                    </motion.a>
                  ))}
                </nav>

                <div className="mt-auto p-5">
                  <Link
                    href="/login"
                    className="focusable block rounded-[10px] bg-[color:var(--brand)] px-5 py-3.5 text-center text-[15px] font-medium text-[color:var(--brand-ink)]"
                  >
                    Masuk portal
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main id="konten">
          {/* ================= HERO ================= */}
          <section
            id="beranda"
            className="wash scroll-mt-16 border-b border-[color:var(--line-soft)]"
            aria-labelledby="judul-hero"
          >
            <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-12 lg:gap-14 lg:pb-24 lg:pt-20">
              <div className="lg:col-span-7">
                <motion.p
                  {...masuk(0)}
                  className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[color:var(--line)] bg-[color:var(--accent-soft)] px-3.5 py-1.5 text-[12.5px] text-[color:var(--accent)] sm:text-[13px]"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]"
                  />
                  Asesmen sekolah berbasis Artificial Intelligence
                </motion.p>

                <motion.h1
                  {...masuk(1)}
                  id="judul-hero"
                  className="max-w-[16ch] text-[clamp(31px,8vw,52px)] font-normal leading-[1.12] tracking-[-0.02em]"
                  style={judulSerif}
                >
                  Menilai bahasa daerah tanpa mengabaikan konteks budayanya.
                </motion.h1>

                <motion.p
                  {...masuk(2)}
                  className="mt-6 max-w-[58ch] text-[15.5px] leading-[1.75] text-[color:var(--ink-2)] sm:text-[16.5px]"
                >
                  HARC-AI menyusun instrumen ujian, mendampingi siswa selama mengerjakan, dan
                  merangkum hasilnya menjadi analitik yang bisa dibaca guru dalam hitungan menit.
                  Dialek dan kearifan setempat diperlakukan sebagai jawaban yang sah, bukan
                  kesalahan.
                </motion.p>

                <motion.div
                  {...masuk(3)}
                  className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-7"
                >
                  <Link
                    href="/login"
                    className="focusable group inline-flex items-center justify-center gap-2.5 rounded-[10px] bg-[color:var(--brand)] px-7 py-4 text-[15px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-px hover:shadow-[var(--shadow-lift)] sm:py-3.5"
                  >
                    Mulai evaluasi
                    <ArrowRight
                      size={17}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                  <a
                    href="#alur"
                    className="focusable inline-flex items-center justify-center py-2 text-[15px] text-[color:var(--ink-2)] transition-colors duration-300 hover:text-[color:var(--ink)]"
                  >
                    Lihat cara kerjanya
                  </a>
                </motion.div>
              </div>

              {/* Panel contoh hasil — memperlihatkan produknya, bukan ilustrasi */}
              <motion.figure
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.24, ease: HALUS }}
                className="overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[var(--shadow-soft)] lg:col-span-5"
              >
                <figcaption className="flex items-baseline justify-between border-b border-[color:var(--line-soft)] bg-[color:var(--surface-2)]/60 px-5 py-4 sm:px-6">
                  <span className="text-[14px] font-medium">Ringkasan penilaian</span>
                  <span className="text-[12px] text-[color:var(--ink-3)]">Contoh tampilan</span>
                </figcaption>

                <div className="px-5 py-5 sm:px-6 sm:py-6">
                  <div className="mb-5 flex items-baseline justify-between text-[13px] text-[color:var(--ink-2)]">
                    <span>Tugas 4 — Ragam krama</span>
                    <span>Kelas VIII&nbsp;B</span>
                  </div>

                  <ul className="space-y-4">
                    {contohSkor.map((d, i) => (
                      <motion.li key={d.nama} {...muncul(i)}>
                        <div className="mb-2 flex items-baseline justify-between text-[13.5px]">
                          <span className="text-[color:var(--ink-2)]">{d.nama}</span>
                          <span className="tabular-nums text-[15px]" style={judulSerif}>
                            {d.skor}
                          </span>
                        </div>
                        <div
                          className="h-[5px] w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]"
                          role="img"
                          aria-label={`${d.nama}: ${d.skor} dari 100`}
                        >
                          <motion.div
                            className="h-full rounded-full bg-[color:var(--accent)]"
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

                <p className="border-t border-[color:var(--line-soft)] bg-[color:var(--surface-2)]/50 px-5 py-4 text-[13px] leading-relaxed text-[color:var(--ink-2)] sm:px-6">
                  Nilai ini usulan sistem. Guru dapat menyesuaikannya sebelum disimpan.
                </p>
              </motion.figure>
            </div>
          </section>

          {/* ================= ANGKA ================= */}
          <section
            aria-label="Cakupan penggunaan"
            className="border-b border-[color:var(--line-soft)] bg-[color:var(--bg-2)]"
          >
            <div className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-8 md:grid-cols-4">
              {angka.map((a, i) => (
                <motion.div
                  key={a.label}
                  {...muncul(i)}
                  className={`px-2 py-7 sm:px-6 sm:py-9 ${
                    i % 2 === 1 ? "border-l border-[color:var(--line-soft)] pl-5 sm:pl-6" : ""
                  } ${i > 1 ? "border-t border-[color:var(--line-soft)] md:border-t-0" : ""} ${
                    i === 2 ? "md:border-l md:border-[color:var(--line-soft)] md:pl-6" : ""
                  }`}
                >
                  <p
                    className="text-[clamp(26px,6vw,34px)] leading-none tracking-tight"
                    style={judulSerif}
                  >
                    {a.nilai}
                  </p>
                  <p className="mt-2.5 text-[12.5px] leading-snug text-[color:var(--ink-2)] sm:text-[13px]">
                    {a.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ================= DIMENSI ================= */}
          <section
            id="dimensi"
            className="scroll-mt-16 border-b border-[color:var(--line-soft)]"
            aria-labelledby="judul-dimensi"
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
              <div className="max-w-[56ch]">
                <motion.h2
                  {...muncul(0)}
                  id="judul-dimensi"
                  className="text-[clamp(26px,5.5vw,36px)] font-normal leading-[1.2] tracking-[-0.015em]"
                  style={judulSerif}
                >
                  Enam dimensi yang dinilai
                </motion.h2>
                <motion.p
                  {...muncul(1)}
                  className="mt-5 text-[15.5px] leading-[1.75] text-[color:var(--ink-2)] sm:text-[16.5px]"
                >
                  Setiap jawaban ditimbang dari enam sudut. Rinciannya terbuka, sehingga guru tahu
                  persis dari mana sebuah angka berasal dan di mana ia perlu dikoreksi.
                </motion.p>
              </div>

              <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {dimensi.map((d, i) => (
                  <motion.li
                    key={d.nama}
                    {...muncul(i % 3)}
                    className="kartu rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)] sm:p-7"
                  >
                    <span
                      aria-hidden="true"
                      className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-[color:var(--brand-soft)] text-[13px] tabular-nums text-[color:var(--brand)]"
                      style={judulSerif}
                    >
                      {i + 1}
                    </span>
                    <h3 className="mb-2.5 text-[19px] font-medium leading-snug" style={judulSerif}>
                      {d.nama}
                    </h3>
                    <p className="text-[14.5px] leading-[1.7] text-[color:var(--ink-2)]">{d.isi}</p>
                  </motion.li>
                ))}
              </ul>
            </div>
          </section>

          {/* ================= ALUR ================= */}
          <section
            id="alur"
            className="scroll-mt-16 border-b border-[color:var(--line-soft)] bg-[color:var(--bg-2)]"
            aria-labelledby="judul-alur"
          >
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-4">
                <motion.h2
                  {...muncul(0)}
                  id="judul-alur"
                  className="text-[clamp(26px,5.5vw,36px)] font-normal leading-[1.2] tracking-[-0.015em]"
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

              <ol className="relative lg:col-span-8">
                {/* Garis penghubung tahap */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-8 left-[17px] top-8 w-px bg-[color:var(--line)] sm:left-[19px]"
                />
                {alur.map((t, i) => (
                  <motion.li
                    key={t.judul}
                    {...muncul(i)}
                    className="relative grid grid-cols-[2.4rem_1fr] gap-x-4 pb-8 last:pb-0 sm:grid-cols-[2.8rem_1fr] sm:gap-x-6"
                  >
                    <span
                      className="z-10 grid h-9 w-9 place-items-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[14px] tabular-nums text-[color:var(--accent)] shadow-[var(--shadow-soft)] sm:h-10 sm:w-10"
                      style={judulSerif}
                    >
                      {i + 1}
                    </span>
                    <div className="pt-1">
                      <h3 className="mb-2 text-[18.5px] font-medium leading-snug" style={judulSerif}>
                        {t.judul}
                      </h3>
                      <p className="max-w-[58ch] text-[14.5px] leading-[1.75] text-[color:var(--ink-2)] sm:text-[15px]">
                        {t.isi}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </section>

          {/* ================= PERAN GURU ================= */}
          <section
            id="otoritas"
            className="scroll-mt-16 border-b border-[color:var(--line-soft)]"
            aria-labelledby="judul-otoritas"
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
              <blockquote className="relative max-w-[48ch] pl-6 sm:pl-8">
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-0 top-1 w-[3px] rounded-full bg-[color:var(--accent)]"
                />
                <h2 id="judul-otoritas" className="sr-only">
                  Peran guru
                </h2>
                <motion.p
                  {...muncul(0)}
                  className="text-[clamp(22px,5vw,31px)] font-normal leading-[1.4] tracking-[-0.015em]"
                  style={judulSerif}
                >
                  Sistem ini menyiapkan bahan dan menghitung. Yang menilai tetap guru.
                </motion.p>
                <motion.p
                  {...muncul(1)}
                  className="mt-6 max-w-[56ch] text-[15.5px] leading-[1.75] text-[color:var(--ink-2)] sm:text-[16px]"
                >
                  Setiap skor bisa diubah, setiap perubahan tercatat, dan data siswa tidak dipakai
                  untuk melatih model. Guru menghemat waktu pemeriksaan tanpa menyerahkan kewenangan
                  akademiknya.
                </motion.p>
              </blockquote>
            </div>
          </section>

          {/* ================= AJAKAN ================= */}
          <section className="border-b border-[color:var(--line-soft)] bg-[color:var(--bg-2)]">
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-16">
              <motion.div
                {...muncul(0)}
                className="flex flex-col gap-8 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface)] p-7 shadow-[var(--shadow-soft)] sm:p-10 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h2
                    className="max-w-[22ch] text-[clamp(23px,5vw,31px)] font-normal leading-[1.25] tracking-[-0.015em]"
                    style={judulSerif}
                  >
                    Ingin mencobanya di sekolah Anda?
                  </h2>
                  <p className="mt-4 max-w-[50ch] text-[15px] leading-[1.7] text-[color:var(--ink-2)]">
                    Masuk dengan akun sekolah, atau tanyakan dulu apa saja yang perlu disiapkan.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 md:shrink-0">
                  <Link
                    href="/login"
                    className="focusable group inline-flex items-center justify-center gap-2.5 rounded-[10px] bg-[color:var(--brand)] px-7 py-4 text-[15px] font-medium text-[color:var(--brand-ink)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-px hover:shadow-[var(--shadow-lift)] sm:py-3.5"
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
                    className="focusable inline-flex items-center justify-center rounded-[10px] border border-[color:var(--line)] px-6 py-4 text-[15px] text-[color:var(--ink-2)] transition-colors duration-300 hover:text-[color:var(--ink)] sm:border-0 sm:px-0 sm:py-2"
                  >
                    Tanya asisten
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        {/* ================= FOOTER ================= */}
        <footer className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 pb-24 text-[13px] text-[color:var(--ink-2)] sm:px-8 sm:pb-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            <span>
              <span className="block text-[color:var(--ink)]">Mahatma Academy</span>
              <span className="block text-[12px]">for Sustainable Education</span>
            </span>
          </div>
          <p>© 2026 Mahatma Academy. Platform asesmen HARC-AI.</p>
        </footer>

        {/* ================= TOMBOL ASISTEN ================= */}
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
              className="focusable fixed bottom-5 right-4 z-[55] flex h-14 w-14 items-center justify-center gap-2.5 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[14px] shadow-[var(--shadow-lift)] transition-transform duration-300 hover:-translate-y-0.5 sm:right-6 sm:h-auto sm:w-auto sm:px-5 sm:py-3.5"
              style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <MessageCircle size={20} className="shrink-0 text-[color:var(--accent)] sm:hidden" />
              <MessageCircle
                size={17}
                className="hidden shrink-0 text-[color:var(--accent)] sm:block"
              />
              <span className="hidden sm:inline">Tanya asisten</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ================= PANEL ASISTEN ================= */}
        <AnimatePresence>
          {chatOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setChatOpen(false)}
                className="fixed inset-0 z-[60] bg-[#0D1119]/35 backdrop-blur-[2px]"
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
                className="fixed inset-x-0 bottom-0 z-[70] flex h-[86dvh] flex-col overflow-hidden rounded-t-2xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[var(--shadow-lift)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[580px] sm:w-[400px] sm:rounded-2xl"
              >
                <header className="flex items-center justify-between border-b border-[color:var(--line-soft)] bg-[color:var(--surface-2)]/60 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                    >
                      <MessageCircle size={18} />
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
                  className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5"
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
                        className={`max-w-[85%] px-4 py-3 text-[14.5px] leading-[1.65] ${
                          m.role === "user"
                            ? "rounded-2xl rounded-br-md bg-[color:var(--brand)] text-[color:var(--brand-ink)]"
                            : "rounded-2xl rounded-bl-md border border-[color:var(--line-soft)] bg-[color:var(--surface-2)] text-[color:var(--ink)]"
                        }`}
                      >
                        {m.content}
                      </p>
                    </motion.div>
                  ))}

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
                    className="focusable min-w-0 flex-1 rounded-[10px] border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3.5 text-[16px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-3)] sm:text-[14.5px]"
                  />
                  <button
                    type="submit"
                    disabled={loadingChat || !chatInput.trim()}
                    aria-label="Kirim pertanyaan"
                    className="focusable grid w-12 shrink-0 place-items-center rounded-[10px] bg-[color:var(--brand)] text-[color:var(--brand-ink)] transition-opacity duration-300 hover:opacity-90 disabled:opacity-40"
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