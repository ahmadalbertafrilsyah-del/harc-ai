"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Teachers, Lato } from "next/font/google";
import { 
  BookOpen, 
  Globe, 
  Shield, 
  BrainCircuit, 
  MessageSquareShare, 
  RefreshCcw, 
  Menu, 
  X,
  GraduationCap,
  Moon,
  Sun,
  CheckCircle2,
  PenTool,
  Activity,
  Target,
  ChevronRight,
  Library
} from "lucide-react";
import { useState, useEffect } from "react";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

const featuresData = [
  { title: "Penguasaan Linguistik", desc: "Evaluasi ketepatan makna, kosakata, dan keterpahaman materi oleh siswa secara real-time." },
  { title: "Ketepatan Sosiolinguistik", desc: "Menganalisis kesesuaian tingkat tutur dan dialek dengan lawan bicara serta tujuan komunikasi." },
  { title: "Interpretasi Budaya", desc: "Menghormati dan memvalidasi nilai lokal, sejarah, serta praktik sosial yang hidup di masyarakat." },
  { title: "Mediasi Adaptif", desc: "Memberikan petunjuk bertahap (scaffolding) untuk memandirikan siswa saat menghadapi kesulitan." },
  { title: "Refleksi & Umpan Balik", desc: "Mendorong siswa untuk menjelaskan alasan perbaikan dan menentukan strategi belajar selanjutnya." },
  { title: "Adab & Etika Digital", desc: "Menjamin kejujuran akademik, kesantunan interaksi, dan transparansi perlindungan data pribadi." }
];

const panduanData = [
  {
    icon: Target,
    title: "1. Desain Asesmen Responsif",
    desc: "Guru memasukkan Kompetensi Dasar (KD) dan AI merancang instrumen evaluasi yang mengintegrasikan aspek linguistik dan budaya lokal."
  },
  {
    icon: BrainCircuit,
    title: "2. Mediasi Ujian Bertahap",
    desc: "Siswa mengerjakan tes terkomputerisasi. Asisten AI memberikan petunjuk terstruktur tanpa memberikan jawaban langsung untuk melatih kemandirian."
  },
  {
    icon: PenTool,
    title: "3. Jurnal Refleksi Siswa",
    desc: "Sebelum mengumpulkan ujian, siswa menuliskan kendala belajarnya guna membangun kesadaran diri (metakognisi) dan adab digital."
  },
  {
    icon: Activity,
    title: "4. Analitik & Otoritas Guru",
    desc: "Sistem menyajikan analitik kemandirian. Guru memegang otoritas penuh untuk mengoreksi nilai AI jika jawaban merupakan dialek lokal yang sah."
  }
];

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);
  
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  const featureStyles = [
    { icon: BookOpen, color: isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-900 text-white" },
    { icon: MessageSquareShare, color: isDarkMode ? "bg-slate-800 text-amber-400" : "bg-amber-600 text-white" },
    { icon: Globe, color: isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-900 text-white" },
    { icon: BrainCircuit, color: isDarkMode ? "bg-slate-800 text-amber-400" : "bg-amber-600 text-white" },
    { icon: RefreshCcw, color: isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-900 text-white" },
    { icon: Shield, color: isDarkMode ? "bg-slate-800 text-amber-400" : "bg-amber-600 text-white" }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 overflow-x-hidden relative ${latoFont.className} ${isDarkMode ? 'bg-[#0a0f1c] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Header Institusi */}
      <header className={`fixed w-full top-0 z-50 transition-all duration-300 border-b ${isDarkMode ? 'bg-[#0a0f1c]/95 border-slate-800 shadow-md' : 'bg-white/95 border-slate-200 shadow-sm'} backdrop-blur-sm`} role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex justify-between items-center">
          
          {/* Logo Resmi */}
          <Link href="#beranda" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 rounded-lg" aria-label="Beranda Akademi">
            <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center shadow-md border border-blue-800" aria-hidden="true">
              <Library className="text-amber-400 w-7 h-7" />
            </div>
            <div>
              <span className={`text-xl sm:text-2xl font-extrabold tracking-tight block ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                MAHATMA ACADEMY
              </span>
              <span className={`text-[10px] sm:text-xs tracking-wider font-semibold block uppercase ${isDarkMode ? 'text-amber-400' : 'text-blue-800'}`}>
                Sistem Evaluasi HARC-AI
              </span>
            </div>
          </Link>
          
          {/* Navigasi Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-wide" aria-label="Navigasi Utama">
            <a href="#beranda" className={`transition-colors focus-visible:outline-none rounded px-2 py-1 ${isDarkMode ? 'text-slate-300 hover:text-amber-400' : 'text-slate-700 hover:text-blue-900'}`}>Beranda</a>
            <a href="#dimensi" className={`transition-colors focus-visible:outline-none rounded px-2 py-1 ${isDarkMode ? 'text-slate-300 hover:text-amber-400' : 'text-slate-700 hover:text-blue-900'}`}>Dimensi Evaluasi</a>
            <a href="#panduan" className={`transition-colors focus-visible:outline-none rounded px-2 py-1 ${isDarkMode ? 'text-slate-300 hover:text-amber-400' : 'text-slate-700 hover:text-blue-900'}`}>Panduan Sistem</a>
          </nav>
          
          {/* Tombol Aksi */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap"}
              className={`p-2.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link href="/login" className="hidden sm:block" tabIndex={-1}>
              <button className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md flex items-center gap-2 border border-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-900">
                <span>Portal Akademik</span>
                <ChevronRight size={16} />
              </button>
            </Link>

            {/* Menu Mobile */}
            <button 
              aria-label={isMobileMenuOpen ? "Tutup Menu Navigasi" : "Buka Menu Navigasi"}
              className={`md:hidden p-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Laci Navigasi Mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden border-b px-4 pt-3 pb-6 space-y-4 shadow-lg ${isDarkMode ? 'bg-[#0a0f1c] border-slate-800' : 'bg-white border-slate-200'}`}
              role="navigation"
            >
              <div className="flex flex-col gap-2 font-bold text-sm uppercase tracking-wide">
                <a href="#beranda" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Beranda</a>
                <a href="#dimensi" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Dimensi Evaluasi</a>
                <a href="#panduan" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Panduan Sistem</a>
              </div>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block pt-2">
                <button className="w-full bg-blue-900 text-white py-3.5 rounded-lg font-bold flex justify-center items-center gap-2 shadow-md">
                  <span>Portal Akademik</span>
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main role="main">
        {/* BAGIAN UTAMA (HERO) */}
        <section id="beranda" className={`relative z-10 pt-32 pb-24 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-28 ${isDarkMode ? 'bg-[#0a0f1c]' : 'bg-slate-50'}`} aria-labelledby="hero-title">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
            
            {/* Kolom Teks Akademik */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6 }} 
              className="w-full lg:w-6/12 text-center lg:text-left flex flex-col items-center lg:items-start"
            >
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs mb-6 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-blue-900'}`} role="status">
                <GraduationCap size={16} className="text-amber-500 shrink-0" aria-hidden="true" />
                <span className="uppercase tracking-wider">Pusat Asesmen Pendidikan</span>
              </div>
              
              <h1 id="hero-title" className={`text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-[1.15] ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-blue-950'}`}>
                Integrasi <span className="text-amber-500">Kecerdasan Buatan</span> dalam Evaluasi Akademik
              </h1>
              
              <p className={`text-base lg:text-lg mb-10 leading-relaxed max-w-2xl text-justify ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Platform <strong>Humanistic, Adaptive, and Responsive-Cultural Assessment (HARC-AI)</strong> berfungsi untuk memediasi pembelajaran bahasa daerah, mereduksi beban administratif tenaga pendidik, dan meningkatkan prestasi akademik peserta didik secara sistematis.
              </p>
              
              <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-center gap-4">
                <Link href="/login" className="w-full sm:w-auto" tabIndex={-1}>
                  <button className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white px-8 py-4 rounded-lg font-bold text-base transition-all shadow-lg flex items-center justify-center gap-3">
                    <span>Mulai Evaluasi</span>
                    <ChevronRight size={18} />
                  </button>
                </Link>
    
                <a href="#panduan" className="w-full sm:w-auto text-center">
                  <button className={`w-full sm:w-auto px-8 py-4 rounded-lg font-bold text-base transition-all border flex items-center justify-center gap-2 ${isDarkMode ? 'bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'}`}>
                    Pelajari Alur Sistem
                  </button>
                </a>
              </div>
            </motion.div>

            {/* Kolom Visual Institusi */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.7, delay: 0.1 }} 
              className="w-full sm:w-3/4 lg:w-5/12 flex justify-center"
              aria-hidden="true"
            >
              <div className={`w-full max-w-md aspect-square rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden border-2 shadow-xl ${isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
                {/* Animasi Akademik */}
                <div className={`absolute w-[280px] h-[280px] rounded-full border-[1.5px] border-dashed animate-[spin_40s_linear_infinite] pointer-events-none ${isDarkMode ? 'border-slate-600' : 'border-slate-300'}`} />
                <div className={`absolute w-[200px] h-[200px] rounded-full border-[1.5px] border-dashed animate-[spin_25s_linear_infinite_reverse] pointer-events-none ${isDarkMode ? 'border-slate-500' : 'border-slate-400'}`} />
                
                <div className="relative z-10 w-28 h-28 bg-blue-900 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50 dark:border-slate-800">
                  <BrainCircuit className="w-12 h-12 text-amber-400 animate-pulse" />
                </div>
                
                <div className={`relative z-10 mt-8 text-center px-6 py-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-400 uppercase tracking-widest">Status Sistem</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Modul AI Aktif</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ALUR KERJA SISTEM */}
        <section id="panduan" className={`py-24 border-t ${isDarkMode ? 'bg-[#0a0f1c] border-slate-800' : 'bg-white border-slate-200'}`} aria-labelledby="panduan-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-3 block">Prosedur Operasional</span>
              <h2 id="panduan-title" className={`text-3xl sm:text-4xl font-black mb-5 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-blue-950'}`}>
                Alur Kerja Evaluasi Akademik
              </h2>
              <p className={`text-base leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Struktur operasional sistem memastikan kolaborasi yang transparan antara tenaga pendidik, peserta didik, dan asisten kecerdasan buatan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {panduanData.map((step, idx) => (
                <article key={idx} className={`p-8 rounded-xl border-2 flex flex-col items-center text-center transition-all hover:-translate-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}>
                  <div className="w-16 h-16 bg-blue-900 rounded-lg flex items-center justify-center mb-6 shadow-md text-amber-400">
                    <step.icon size={28} aria-hidden="true" />
                  </div>
                  <h3 className={`text-lg font-bold mb-4 ${teachersFont.className} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {step.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 6 DIMENSI HARC-AI */}
        <section id="dimensi" className={`py-24 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'}`} aria-labelledby="dimensi-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-3 block">Kerangka Teoritis</span>
              <h2 id="dimensi-title" className={`text-3xl sm:text-4xl font-black mb-5 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-blue-950'}`}>
                6 Dimensi Evaluasi Institusional
              </h2>
              <p className={`text-base leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Indikator penilaian dirancang secara empiris untuk menjaga integritas akademik dan memvalidasi kecerdasan kultural peserta didik.
              </p>
            </div>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" 
              variants={containerVariants} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true, margin: "-50px" }}
            >
              {featuresData.map((feature, idx) => {
                const style = featureStyles[idx];
                return (
                  <motion.article 
                    key={idx} 
                    variants={itemVariants} 
                    tabIndex={0}
                    className={`p-8 rounded-xl border-l-4 shadow-sm transition-all duration-300 flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 ${isDarkMode ? 'bg-[#0a0f1c] border-slate-700 hover:border-blue-500' : 'bg-white border-slate-300 hover:border-blue-900'}`}
                  >
                    <div>
                      <div className={`w-12 h-12 rounded-md flex items-center justify-center mb-6 shadow-sm ${style.color}`} aria-hidden="true">
                        <style.icon className="w-6 h-6" />
                      </div>
                      <h3 className={`text-xl font-bold mb-3 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {feature.title}
                      </h3>
                      <p className={`leading-relaxed text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {feature.desc}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className={`border-t py-10 ${isDarkMode ? 'bg-[#050810] border-slate-800 text-slate-400' : 'bg-blue-950 border-blue-900 text-slate-300'}`} role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center" aria-hidden="true">
              <Library className="w-6 h-6 text-blue-900" />
            </div>
            <div>
              <span className={`text-xl font-black text-white tracking-wide block ${teachersFont.className}`}>MAHATMA ACADEMY</span>
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Lembaga Riset & Pendidikan</span>
            </div>
          </div>
          <div className="text-sm font-medium">
            <p className="mb-1">© {new Date().getFullYear()} Mahatma Academy. Hak Cipta Dilindungi.</p>
            <p>Platform Asesmen <span className="text-white font-bold">HARC-AI</span> Berlisensi Resmi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}