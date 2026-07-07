"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Teachers, Lato } from "next/font/google";
import { 
  ArrowRight, 
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
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { useState, useEffect } from "react";

// Inisialisasi Font
const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

// Data Fitur 6 Dimensi HARC-AI
const featuresData = [
  { title: "Penguasaan Linguistik", desc: "Evaluasi ketepatan makna, kosakata, dan keterpahaman materi oleh siswa secara real-time." },
  { title: "Ketepatan Sosiolinguistik", desc: "Menganalisis kesesuaian tingkat tutur dan dialek dengan lawan bicara serta tujuan komunikasi." },
  { title: "Interpretasi Budaya", desc: "Menghormati dan memvalidasi nilai lokal, sejarah, serta praktik sosial yang hidup di masyarakat." },
  { title: "Mediasi Adaptif", desc: "Memberikan petunjuk bertahap (scaffolding) untuk memandirikan siswa saat menghadapi kesulitan." },
  { title: "Refleksi & Umpan Balik", desc: "Mendorong siswa untuk menjelaskan alasan perbaikan dan menentukan strategi belajar selanjutnya." },
  { title: "Adab & Etika Digital", desc: "Menjamin kejujuran akademik, kesantunan interaksi, dan transparansi perlindungan data pribadi." }
];

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);
  
  // Tambahkan kode ini tepat sebelum return (
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  const featureStyles = [
    { icon: BookOpen, color: isDarkMode ? "bg-blue-900/40 text-blue-400 border-blue-700/50" : "bg-blue-50 text-blue-600 border-blue-200/60" },
    { icon: MessageSquareShare, color: isDarkMode ? "bg-indigo-900/40 text-indigo-400 border-indigo-700/50" : "bg-indigo-50 text-indigo-600 border-indigo-200/60" },
    { icon: Globe, color: isDarkMode ? "bg-amber-900/40 text-amber-400 border-amber-700/50" : "bg-amber-50 text-amber-600 border-amber-200/60" },
    { icon: BrainCircuit, color: isDarkMode ? "bg-emerald-900/40 text-emerald-400 border-emerald-700/50" : "bg-emerald-50 text-emerald-600 border-emerald-200/60" },
    { icon: RefreshCcw, color: isDarkMode ? "bg-cyan-900/40 text-cyan-400 border-cyan-700/50" : "bg-cyan-50 text-cyan-600 border-cyan-200/60" },
    { icon: Shield, color: isDarkMode ? "bg-rose-900/40 text-rose-400 border-rose-700/50" : "bg-rose-50 text-rose-600 border-rose-200/60" }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 overflow-x-hidden relative ${latoFont.className} ${isDarkMode ? 'bg-[#0b1120] text-slate-100' : 'bg-[#f8fafc] text-slate-800'}`}>
      
      {/* AMBIENT BACKGROUND GLOW (Cahaya Latar Halus) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-100px] left-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full blur-[100px] opacity-30 transition-all ${isDarkMode ? 'bg-blue-600' : 'bg-blue-300'}`} />
        <div className={`absolute top-[50px] right-1/4 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full blur-[100px] opacity-20 transition-all ${isDarkMode ? 'bg-amber-500' : 'bg-indigo-300'}`} />
      </div>

      {/* NAVBAR */}
      <header className={`fixed w-full top-0 z-50 transition-all duration-300 backdrop-blur-md border-b ${isDarkMode ? 'bg-[#0b1120]/80 border-slate-800/80 shadow-lg shadow-black/20' : 'bg-white/80 border-slate-200/80 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
          
          {/* Logo */}
          <Link href="#beranda" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-700 to-blue-950 rounded-xl flex items-center justify-center border border-blue-600 shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="text-amber-400 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none block ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                HARC-AI
              </span>
              <span className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-bold block mt-0.5 ${isDarkMode ? 'text-amber-400' : 'text-blue-600'}`}>
                Educational Intelligence
              </span>
            </div>
          </Link>
          
          {/* Nav Links Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a href="#beranda" className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-amber-400' : 'text-slate-600 hover:text-blue-700'}`}>Beranda</a>
            <a href="#tentang" className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-amber-400' : 'text-slate-600 hover:text-blue-700'}`}>Tentang Sistem</a>
            <a href="#dimensi" className={`transition-colors ${isDarkMode ? 'text-slate-300 hover:text-amber-400' : 'text-slate-600 hover:text-blue-700'}`}>Dimensi HARC</a>
          </nav>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle Dark Mode"
              className={`p-2 sm:p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-800' : 'bg-slate-100/80 border-slate-200/80 text-slate-700 hover:bg-slate-200/80'}`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link href="/login" className="hidden sm:block">
              <button className="bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-900/20 hover:shadow-blue-900/30 active:scale-95 flex items-center gap-2 border border-blue-600/30">
                <span>Masuk Portal</span>
              </button>
            </Link>

            {/* Mobile Menu Button */}
            <button 
              aria-label="Toggle Menu"
              className={`md:hidden p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden border-b px-4 pt-3 pb-6 space-y-4 ${isDarkMode ? 'bg-[#0b1120]/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}
            >
              <div className="flex flex-col gap-2 font-semibold text-sm">
                <a 
                  href="#beranda" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={`px-3 py-2.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-blue-50/80 hover:text-blue-700'}`}
                >
                  Beranda
                </a>
                <a 
                  href="#tentang" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={`px-3 py-2.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-blue-50/80 hover:text-blue-700'}`}
                >
                  Tentang Sistem
                </a>
                <a 
                  href="#dimensi" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={`px-3 py-2.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-blue-50/80 hover:text-blue-700'}`}
                >
                  Dimensi HARC
                </a>
              </div>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block pt-1">
                <button className="w-full bg-gradient-to-r from-blue-700 to-blue-900 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md active:scale-95 transition-transform">
                  <span>Masuk Portal Sistem</span>
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <main id="beranda" className="relative z-10 pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-24">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
          
          {/* Kolom Teks Hero */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }} 
            className="w-full lg:w-7/12 text-center lg:text-left flex flex-col items-center lg:items-start"
          >
            {/* Badge Kompak Mobile & Desktop */}
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs mb-6 border shadow-sm ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-amber-400' : 'bg-white border-blue-200/80 text-blue-700'}`}>
              <Sparkles size={14} className="text-amber-400 animate-pulse shrink-0" />
              <span>Platform Evaluasi & Asesmen Pintar</span>
            </div>
            
            <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5 sm:mb-6 leading-[1.2] sm:leading-[1.15] ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Harmonisasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500">Kecerdasan Buatan</span> & Nilai Budaya
            </h1>
            
            <p id="tentang" className={`text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 leading-relaxed max-w-2xl scroll-mt-32 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Kerangka <span className="font-semibold text-blue-500">Humanistic, Adaptive, and Responsive-Cultural Assessment (HARC-AI)</span>. Dirancang presisi untuk memediasi pembelajaran bahasa daerah, mereduksi beban administratif, dan mengakselerasi prestasi akademik siswa.
            </p>
            
            {/* Tombol Aksi - Ubah bagian div ini */}
            <div className="flex flex-row w-full sm:w-auto items-center justify-center gap-3 sm:gap-4">
              <Link href="/login" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-gradient-to-r from-blue-700 via-blue-800 to-blue-950 hover:from-blue-600 hover:to-blue-900 text-white px-8 py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg shadow-blue-900/25 flex items-center justify-center gap-3 border border-blue-600/30 active:scale-95">
                  <span>Mulai Evaluasi</span>
                </button>
              </Link>
  
              <a href="#dimensi" className="w-full sm:w-auto">
                <button className={`w-full sm:w-auto px-6 py-4 rounded-xl font-bold text-sm sm:text-base transition-all border flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-300/80 text-slate-700 hover:bg-slate-50'}`}>
                  Pelajari Dimensi
                </button>
              </a>
            </div>

            {/* Poin Ringkas */}
            <div className="mt-10 pt-8 border-t w-full grid grid-cols-2 sm:grid-cols-3 gap-4 text-left border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">Real-time AI Scaffolding</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">Validasi Kearifan Lokal</span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">Efisiensi Pendidik</span>
              </div>
            </div>
          </motion.div>

          {/* Kolom Visual Hero (Tampil Optimal di Mobile & Desktop) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.7, delay: 0.1 }} 
            className="w-full sm:w-3/4 lg:w-5/12 flex justify-center mt-6 lg:mt-0"
          >
            <div className={`w-full max-w-md aspect-square rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden border shadow-2xl transition-all ${isDarkMode ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/80 shadow-black/50' : 'bg-gradient-to-b from-white to-blue-50/50 border-white shadow-blue-900/10'}`}>
              
              {/* Lingkaran Dekoratif Animasi */}
              <div className={`absolute w-64 sm:w-72 h-64 sm:h-72 rounded-full border border-dashed animate-[spin_30s_linear_infinite] pointer-events-none ${isDarkMode ? 'border-slate-700' : 'border-blue-200'}`} />
              <div className={`absolute w-48 sm:w-56 h-48 sm:h-56 rounded-full border border-dashed animate-[spin_20s_linear_infinite_reverse] pointer-events-none ${isDarkMode ? 'border-slate-700/60' : 'border-indigo-200'}`} />
              
              {/* Core Ikon */}
              <div className="relative z-10 w-24 sm:w-28 h-24 sm:h-28 bg-gradient-to-tr from-blue-700 via-blue-900 to-indigo-950 rounded-2xl flex items-center justify-center shadow-xl border border-blue-500/30">
                <BrainCircuit className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 animate-pulse" />
              </div>

              {/* Badge Overlay */}
              <div className={`relative z-10 mt-6 text-center px-5 py-3 rounded-xl border backdrop-blur-sm ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-blue-100 shadow-sm'}`}>
                <p className="text-xs sm:text-sm font-bold text-blue-500">Evaluasi Adaptif Terintegrasi</p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Bahasa & Kearifan Lokal Nusantara</p>
              </div>
            </div>
          </motion.div>

        </div>

        {/* 6 DIMENSI HARC-AI */}
        <div id="dimensi" className="mt-24 sm:mt-36 pt-12 sm:pt-16 border-t border-slate-200/80 dark:border-slate-800 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2 block">Pilar Utama Sistem</span>
            <h2 className={`text-2xl sm:text-4xl font-extrabold mb-4 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              6 Dimensi Evaluasi HARC-AI
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Mengakomodasi keragaman dialek, tingkat tutur, serta etika digital dalam satu ekosistem asesmen yang humanis dan adaptif.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6" 
            variants={containerVariants} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-50px" }}
          >
            {featuresData.map((feature, idx) => {
              const style = featureStyles[idx];
              return (
                <motion.div 
                  key={idx} 
                  variants={itemVariants} 
                  className={`p-6 sm:p-7 rounded-2xl border transition-all duration-300 flex flex-col justify-between group ${isDarkMode ? 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600' : 'bg-white border-slate-200/80 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5'}`}
                >
                  <div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border transition-transform duration-300 group-hover:scale-110 ${style.color}`}>
                      <style.icon className="w-6 h-6" />
                    </div>
                    <h3 className={`text-lg sm:text-xl font-bold mb-2.5 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {feature.title}
                    </h3>
                    <p className={`leading-relaxed text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className={`relative z-10 mt-20 border-t py-4 transition-colors ${isDarkMode ? 'bg-[#080d1a] border-slate-800 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-amber-400 shrink-0" />
            <span className={`text-lg font-bold text-white tracking-wide ${teachersFont.className}`}>HARC-AI</span>
          </div>
          <p className="text-xs sm:text-sm">
            © {new Date().getFullYear()} Hak Cipta Dilindungi. <span className="text-white font-medium">HARC-AI by Mahatma Academy</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}