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
  Library,
  Zap,
  Users,
  Award
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

const statsData = [
  { icon: Users, value: "15,000+", label: "Peserta Didik Aktif" },
  { icon: Library, value: "1,200+", label: "Modul Tervalidasi" },
  { icon: Zap, value: "98%", label: "Akurasi Sosiokultural" },
  { icon: Award, value: "50+", label: "Sekolah Bermitra" }
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
      
      {/* Background Pattern */}
      <div className={`absolute inset-0 z-0 pointer-events-none ${isDarkMode ? 'bg-[radial-gradient(#1e293b_1px,transparent_1px)]' : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)]'} [background-size:24px_24px] opacity-40 mix-blend-multiply`} aria-hidden="true" />
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-100px] left-[10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full blur-[120px] opacity-40 transition-all ${isDarkMode ? 'bg-blue-900' : 'bg-blue-200'}`} />
        <div className={`absolute top-[100px] right-[10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full blur-[100px] opacity-30 transition-all ${isDarkMode ? 'bg-amber-900' : 'bg-amber-100'}`} />
      </div>

      {/* HEADER INSTITUSI */}
      <header className={`fixed w-full top-0 z-50 transition-all duration-300 border-b ${isDarkMode ? 'bg-[#0a0f1c]/95 border-slate-800 shadow-md' : 'bg-white/95 border-slate-200 shadow-sm'} backdrop-blur-md`} role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[80px] flex justify-between items-center relative">
          
          {/* Logo Kiri Menggunakan File Public */}
          <Link href="#beranda" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 rounded-lg relative z-10">
            <div className="w-[44px] h-[44px] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0" aria-hidden="true">
              {/* LOGO DARI PUBLIC FOLDER */}
              <img src="/logo.png" alt="Logo HARC-AI" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center">
              <span className={`text-[18px] sm:text-xl font-[800] tracking-tight leading-none text-[#0f172a] dark:text-white ${teachersFont.className}`}>
                HARC-AI
              </span>
              <span className="text-[10px] font-bold tracking-wide mt-1 text-[#2563eb] dark:text-[#60a5fa] uppercase">
                BY MAHATMA ACADEMY
              </span>
            </div>
          </Link>
          
          {/* Navigasi Tengah Desktop */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-10 text-[13px] font-bold uppercase tracking-wider z-10" aria-label="Navigasi Utama">
            <a href="#beranda" className={`transition-all hover:-translate-y-0.5 ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-[#334155] hover:text-[#0f172a]'}`}>Beranda</a>
            <a href="#dimensi" className={`transition-all hover:-translate-y-0.5 ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-[#334155] hover:text-[#0f172a]'}`}>Dimensi Evaluasi</a>
            <a href="#panduan" className={`transition-all hover:-translate-y-0.5 ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-[#334155] hover:text-[#0f172a]'}`}>Panduan Sistem</a>
          </nav>
          
          {/* Tombol Aksi Kanan */}
          <div className="flex items-center gap-3 relative z-10">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap"}
              className={`p-2.5 rounded-xl border transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
            >
              <motion.div initial={false} animate={{ rotate: isDarkMode ? 180 : 0 }}>
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </motion.div>
            </button>

            <button 
              aria-label={isMobileMenuOpen ? "Tutup Menu Navigasi" : "Buka Menu Navigasi"}
              className={`md:hidden p-2.5 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* MENU MOBILE OVERLAY */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm md:hidden"
              />
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`fixed z-50 top-4 left-4 right-4 rounded-3xl shadow-2xl overflow-hidden border md:hidden ${isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}
                role="navigation"
              >
                <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                     <div className="w-[42px] h-[42px] flex items-center justify-center shrink-0">
                        {/* LOGO MOBILE DARI PUBLIC FOLDER */}
                        <img src="/logo.png" alt="Logo HARC-AI" className="w-full h-full object-contain" />
                     </div>
                     <div className="flex flex-col">
                        <span className={`text-lg font-[800] leading-none block ${isDarkMode ? 'text-white' : 'text-[#0f172a]'} ${teachersFont.className}`}>HARC-AI</span>
                        <span className="text-[9px] font-bold text-[#2563eb] dark:text-[#60a5fa] block mt-1 uppercase">BY MAHATMA ACADEMY</span>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                       {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
                    </button>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                       <X size={18}/>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col p-4 gap-1 text-[13px] font-bold uppercase tracking-wider text-[#334155] dark:text-slate-300">
                   <a href="#beranda" onClick={() => setIsMobileMenuOpen(false)} className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0f172a] dark:hover:text-white transition-colors">Beranda</a>
                   <a href="#dimensi" onClick={() => setIsMobileMenuOpen(false)} className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0f172a] dark:hover:text-white transition-colors">Dimensi Evaluasi</a>
                   <a href="#panduan" onClick={() => setIsMobileMenuOpen(false)} className="p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0f172a] dark:hover:text-white transition-colors">Panduan Sistem</a>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      <main role="main">
        {/* BAGIAN UTAMA (HERO) */}
        <section id="beranda" className="relative z-10 pt-28 lg:pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-28" aria-labelledby="hero-title">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
            
            {/* Kolom Teks Akademik */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.6, ease: "easeOut" }} 
              className="w-full lg:w-6/12 text-center lg:text-left flex flex-col items-center lg:items-start"
            >
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs mb-6 border shadow-sm backdrop-blur-sm ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-amber-400' : 'bg-white/80 border-blue-200 text-blue-900'}`} role="status"
              >
                <GraduationCap size={16} className="text-amber-500 shrink-0" aria-hidden="true" />
                <span className="uppercase tracking-wider">Pusat Asesmen Pendidikan AI</span>
              </motion.div>
              
              <h1 id="hero-title" className={`text-3xl sm:text-4xl lg:text-[44px] font-black mb-6 leading-tight ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-[#0f172a]'}`}>
                Integrasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-amber-500">Kecerdasan Buatan</span> dalam Evaluasi Akademik
              </h1>
              
              <p className={`text-sm lg:text-base mb-10 leading-relaxed max-w-2xl text-justify md:text-left ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Platform <strong>Humanistic, Adaptive, and Responsive-Cultural Assessment (HARC-AI)</strong> berfungsi untuk memediasi pembelajaran bahasa daerah, mereduksi beban administratif tenaga pendidik, dan meningkatkan prestasi akademik peserta didik secara sistematis.
              </p>
              
              <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-center gap-4">
                <Link href="/login" className="w-full sm:w-auto" tabIndex={-1}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-blue-800 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-3"
                  >
                    <span>Mulai Evaluasi</span>
                    <ChevronRight size={18} />
                  </motion.button>
                </Link>
    
                <a href="#panduan" className="w-full sm:w-auto text-center">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2 shadow-sm backdrop-blur-sm ${isDarkMode ? 'bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-800' : 'bg-white/80 border-slate-300 text-slate-800 hover:bg-white'}`}
                  >
                    Pelajari Alur Sistem
                  </motion.button>
                </a>
              </div>
            </motion.div>

            {/* Kolom Visual Institusi */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: -5 }} 
              animate={{ opacity: 1, scale: 1, rotate: 0 }} 
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }} 
              className="w-full sm:w-3/4 lg:w-5/12 flex justify-center relative"
              aria-hidden="true"
            >
              <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute -top-4 -left-4 w-12 h-12 bg-amber-400 rounded-full blur-xl opacity-60 z-0"></motion.div>
              <motion.div animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="absolute -bottom-6 -right-6 w-16 h-16 bg-blue-500 rounded-full blur-xl opacity-50 z-0"></motion.div>

              <div className={`w-full max-w-sm aspect-square rounded-[2rem] p-8 flex flex-col items-center justify-center relative overflow-hidden border shadow-2xl backdrop-blur-sm z-10 ${isDarkMode ? 'bg-[#0f172a]/80 border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white/90 border-slate-200/50 shadow-[0_20px_50px_rgba(30,58,138,0.1)]'}`}>
                <div className={`absolute w-[240px] h-[240px] rounded-full border-[1.5px] border-dashed animate-[spin_30s_linear_infinite] pointer-events-none ${isDarkMode ? 'border-slate-600/50' : 'border-blue-200'}`} />
                <div className={`absolute w-[180px] h-[180px] rounded-full border-[1.5px] border-dashed animate-[spin_20s_linear_infinite_reverse] pointer-events-none ${isDarkMode ? 'border-slate-500/50' : 'border-indigo-200'}`} />
                
                <motion.div 
                  animate={{ y: [0, -8, 0] }} 
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="relative z-10 w-28 h-28 bg-gradient-to-tr from-blue-900 to-indigo-800 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(30,58,138,0.4)] border-4 border-slate-50 dark:border-slate-800"
                >
                  <BrainCircuit className="w-12 h-12 text-amber-400 animate-pulse" />
                </motion.div>
                
                <div className={`relative z-10 mt-8 text-center px-6 py-4 rounded-xl border shadow-lg backdrop-blur-md ${isDarkMode ? 'bg-slate-800/90 border-slate-600' : 'bg-white/90 border-slate-100'}`}>
                  <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 uppercase tracking-widest">Status Sistem</p>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Modul AI Aktif & Sinkron</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* PITA STATISTIK (SOCIAL PROOF) */}
        <section className={`relative z-20 py-8 border-y ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-blue-900 border-blue-950'} backdrop-blur-md`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-x divide-white/10 dark:divide-slate-700/50">
              {statsData.map((stat, idx) => (
                <div key={idx} className={`flex flex-col items-center justify-center text-center ${idx % 2 !== 0 ? 'pl-6 md:pl-0' : ''} ${idx >= 2 ? 'pt-6 md:pt-0 border-t md:border-t-0 border-white/10 dark:border-slate-700/50' : ''}`}>
                  <stat.icon className={`w-6 h-6 mb-3 ${isDarkMode ? 'text-blue-400' : 'text-amber-400'}`} />
                  <h3 className={`text-2xl md:text-3xl font-black text-white mb-1 ${teachersFont.className}`}>{stat.value}</h3>
                  <p className={`text-[10px] md:text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-slate-400' : 'text-blue-200'}`}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ALUR KERJA SISTEM */}
        <section id="panduan" className={`py-24 border-t relative overflow-hidden ${isDarkMode ? 'bg-[#0a0f1c] border-slate-800' : 'bg-white border-slate-200'}`} aria-labelledby="panduan-title">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/50 to-transparent dark:from-slate-800/30 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-3 block">Prosedur Operasional</span>
              <h2 id="panduan-title" className={`text-3xl sm:text-4xl font-black mb-5 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-[#0f172a]'}`}>
                Alur Kerja Evaluasi Akademik
              </h2>
              <p className={`text-base leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Struktur operasional sistem memastikan kolaborasi yang transparan antara tenaga pendidik, peserta didik, dan asisten kecerdasan buatan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-slate-200 dark:bg-slate-800 border-t-2 border-dashed border-slate-300 dark:border-slate-700 z-0"></div>
              
              {panduanData.map((step, idx) => (
                <article key={idx} className={`relative z-10 p-8 rounded-2xl border-2 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-800' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg border-4 ${isDarkMode ? 'bg-slate-800 border-[#0a0f1c] text-amber-400' : 'bg-[#1e3a8a] border-white text-amber-400'}`}>
                    <step.icon size={32} aria-hidden="true" />
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
        <section id="dimensi" className={`py-24 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`} aria-labelledby="dimensi-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-3 block">Kerangka Teoritis</span>
              <h2 id="dimensi-title" className={`text-3xl sm:text-4xl font-black mb-5 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-[#0f172a]'}`}>
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
                    className={`p-8 rounded-2xl shadow-sm transition-all duration-300 flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 border-b-4 hover:-translate-y-1 ${isDarkMode ? 'bg-[#0a0f1c] border-slate-700/50 hover:border-blue-500 hover:shadow-blue-900/20' : 'bg-white border-slate-200 hover:border-blue-600 hover:shadow-blue-900/10'}`}
                  >
                    <div>
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-sm transition-transform duration-300 group-hover:rotate-6 ${style.color}`} aria-hidden="true">
                        <style.icon className="w-7 h-7" />
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

        {/* CTA SECTION */}
        <section className={`py-12 md:py-16 relative overflow-hidden ${isDarkMode ? 'bg-blue-950 border-y border-blue-900' : 'bg-[#1e3a8a]'}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <h2 className={`text-2xl md:text-3xl lg:text-4xl font-black text-white mb-4 ${teachersFont.className}`}>Siap Mentransformasi Ekosistem Evaluasi Sekolah Anda?</h2>
            <p className="text-blue-200 text-sm md:text-base mb-8 max-w-2xl mx-auto">
              Bergabunglah dengan institusi lainnya yang telah mengoptimalkan kinerja pendidik dan menjunjung tinggi kearifan lokal melalui asisten AI.
            </p>
            <Link href="/login">
              <button className="bg-amber-400 hover:bg-amber-300 text-blue-950 px-8 py-3.5 rounded-xl font-black text-sm transition-all shadow-lg hover:shadow-amber-500/30 flex items-center justify-center gap-3 mx-auto active:scale-95">
                <Library size={18} /> Masuk ke Portal Sekarang
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className={`border-t py-6 md:py-8 ${isDarkMode ? 'bg-[#050810] border-slate-800 text-slate-400' : 'bg-[#0a0f1c] border-slate-900 text-slate-400'}`} role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center shrink-0" aria-hidden="true">
              {/* LOGO FOOTER DARI PUBLIC FOLDER */}
              <img src="/logo.png" alt="Logo Mahatma Academy" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center">
              <span className={`text-lg font-black text-white tracking-wide block leading-none ${teachersFont.className}`}>MAHATMA ACADEMY</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">FOR SUSTAINABLE EDUCATION</span>
            </div>
          </div>
          <div className="text-xs font-medium flex flex-col items-center md:items-end">
            <p className="mb-1">© {new Date().getFullYear()} Mahatma Academy. Hak Cipta Dilindungi.</p>
            <p>Platform Asesmen <span className="text-amber-500 font-bold">HARC-AI</span> Berlisensi Resmi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}