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
  Sun
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
    // Smooth scrolling behavior untuk HTML document saat klik tautan navigasi
    document.documentElement.style.scrollBehavior = "smooth";
    if (isDarkMode) {
      document.body.style.backgroundColor = "#0f172a"; 
    } else {
      document.body.style.backgroundColor = "#f8fafc"; 
    }
  }, [isDarkMode]);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

  // Data gaya visual (Ikon & Warna)
  const featureStyles = [
    { icon: BookOpen, color: isDarkMode ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-blue-50 text-blue-700 border-blue-100" },
    { icon: MessageSquareShare, color: isDarkMode ? "bg-indigo-900/30 text-indigo-400 border-indigo-800" : "bg-indigo-50 text-indigo-700 border-indigo-100" },
    { icon: Globe, color: isDarkMode ? "bg-amber-900/30 text-amber-400 border-amber-800" : "bg-amber-50 text-amber-700 border-amber-100" },
    { icon: BrainCircuit, color: isDarkMode ? "bg-emerald-900/30 text-emerald-400 border-emerald-800" : "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { icon: RefreshCcw, color: isDarkMode ? "bg-cyan-900/30 text-cyan-400 border-cyan-800" : "bg-cyan-50 text-cyan-700 border-cyan-100" },
    { icon: Shield, color: isDarkMode ? "bg-rose-900/30 text-rose-400 border-rose-800" : "bg-rose-50 text-rose-700 border-rose-100" }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-x-hidden ${latoFont.className} ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER / NAVBAR */}
      <nav className={`fixed w-full top-0 z-50 backdrop-blur-md border-b transition-all duration-500 shadow-sm ${isDarkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-blue-100'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center border border-blue-800 shadow-md">
              <GraduationCap className="text-amber-400 w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold leading-none ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-blue-950'}`}>HARC-AI</h1>
              <p className={`text-[10px] uppercase tracking-widest font-bold hidden md:block ${isDarkMode ? 'text-amber-400' : 'text-blue-600'}`}>Educational Intelligence</p>
            </div>
          </div>
          
          <div className={`hidden md:flex items-center gap-8 text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <a href="#beranda" className={`transition-colors ${isDarkMode ? 'hover:text-amber-400' : 'hover:text-blue-900'}`}>Beranda</a>
            <a href="#tentang" className={`transition-colors ${isDarkMode ? 'hover:text-amber-400' : 'hover:text-blue-900'}`}>Tentang Sistem</a>
            <a href="#dimensi" className={`transition-colors ${isDarkMode ? 'hover:text-amber-400' : 'hover:text-blue-900'}`}>Dimensi HARC</a>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Tombol Toggle Mode Gelap */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-900'}`}
              title="Beralih Tema"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className={`hidden md:block w-px h-6 mx-2 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>

            {/* Tombol masuk desktop */}
            <Link href="/login" className="hidden md:block">
              <button className="bg-blue-900 hover:bg-blue-800 text-white px-5 md:px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md flex items-center gap-2 border border-blue-800">
                Masuk
              </button>
            </Link>

            <button 
              className={`md:hidden p-2 ml-1 rounded-md transition-colors ${isDarkMode ? 'text-white hover:bg-slate-800' : 'text-blue-900 hover:bg-blue-50'}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden px-4 pt-2 pb-6 shadow-lg overflow-hidden border-b ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-blue-100'}`}
            >
              <div className={`flex flex-col gap-4 text-sm font-bold mb-4 px-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <a href="#beranda" onClick={() => setIsMobileMenuOpen(false)} className={isDarkMode ? 'hover:text-amber-400' : 'hover:text-blue-900'}>Beranda</a>
                <a href="#tentang" onClick={() => setIsMobileMenuOpen(false)} className={isDarkMode ? 'hover:text-amber-400' : 'hover:text-blue-900'}>Tentang Sistem</a>
                <a href="#dimensi" onClick={() => setIsMobileMenuOpen(false)} className={isDarkMode ? 'hover:text-amber-400' : 'hover:text-blue-900'}>Dimensi HARC</a>
              </div>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full bg-blue-900 text-white px-6 py-3 rounded-lg font-bold flex justify-center items-center gap-2 shadow-md">
                  Masuk Portal Sistem
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO SECTION (ID: beranda) */}
      <main id="beranda" className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 md:px-8 max-w-7xl mx-auto flex flex-col text-center md:text-left scroll-mt-24">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="md:w-3/5">
            <div className={`inline-block mb-6 px-4 py-1.5 rounded-full font-bold text-xs tracking-widest uppercase border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              Platform Manajemen Pembelajaran
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.15] ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-blue-950'}`}>
              Harmonisasi Kecerdasan Buatan & Nilai Budaya
            </h1>
            
            {/* TENTANG SISTEM (ID: tentang) */}
            <p id="tentang" className={`text-base md:text-lg mb-10 leading-relaxed md:pr-10 scroll-mt-32 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Kerangka Humanistic, Adaptive, and Responsive-Cultural Assessment (HARC-AI). Dirancang secara presisi untuk memediasi pembelajaran bahasa daerah, mereduksi beban administratif pendidik, dan mengakselerasi pencapaian prestasi akademik siswa.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/login" className="w-full sm:w-auto">
                <button className="w-full bg-blue-900 hover:bg-blue-800 text-white px-8 py-4 rounded-md font-bold text-lg transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-3 border border-blue-800">
                  Mulai Evaluasi
                </button>
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }} className="hidden md:flex w-2/5 justify-end">
            <div className={`w-full max-w-sm aspect-square rounded-full border-[8px] shadow-2xl flex items-center justify-center relative overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-slate-900/50' : 'bg-gradient-to-tr from-blue-50 to-white border-white'}`}>
              <div className={`absolute inset-0 rounded-full border m-6 border-dashed animate-[spin_20s_linear_infinite] ${isDarkMode ? 'border-slate-600' : 'border-blue-200'}`}></div>
              <div className={`bg-blue-900 p-8 rounded-full shadow-inner z-10 border-4 ${isDarkMode ? 'border-slate-800' : 'border-white'}`}>
                <BrainCircuit className="w-20 h-20 text-amber-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* 6 DIMENSI HARC-AI (ID: dimensi) */}
        <div id="dimensi" className={`mt-32 md:mt-40 border-t pt-16 scroll-mt-24 ${isDarkMode ? 'border-slate-800' : 'border-blue-100'}`}>
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-blue-950'}`}>
              6 Dimensi Evaluasi HARC-AI
            </h2>
            <p className={`max-w-2xl mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Mengakomodasi keragaman dialek, tingkat tutur, serta etika digital dalam satu ekosistem asesmen yang terintegrasi.
            </p>
          </div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
            {featuresData.map((feature, idx) => {
              const style = featureStyles[idx];
              return (
                <motion.div key={idx} variants={itemVariants} className={`p-8 rounded-2xl shadow-sm border transition-all duration-300 group ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:shadow-slate-900/50' : 'bg-white border-slate-200 hover:shadow-lg'}`}>
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 border transition-transform group-hover:scale-110 duration-300 ${style.color}`}>
                    <style.icon className="w-7 h-7" />
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-blue-950'}`}>
                    {feature.title}
                  </h3>
                  <p className={`leading-relaxed text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-blue-950 text-blue-200 py-5 mt-12 border-t border-blue-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            <span className={`text-xl font-bold text-white tracking-wide ${teachersFont.className}`}>HARC-AI</span>
          </div>
          <p className="text-sm text-center md:text-left text-blue-300">
            © {new Date().getFullYear()} Hak Cipta Dilindungi. Harc-AI by Mahatma Academy.
          </p>
        </div>
      </footer>
    </div>
  );
}