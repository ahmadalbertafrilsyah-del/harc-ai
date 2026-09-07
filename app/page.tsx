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
  Award,
  Bot,
  Send,
  Loader2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

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
  { icon: Target, title: "1. Desain Asesmen Responsif", desc: "Guru memasukkan Kompetensi Dasar (KD) dan AI merancang instrumen evaluasi yang mengintegrasikan aspek linguistik dan budaya lokal." },
  { icon: BrainCircuit, title: "2. Mediasi Ujian Bertahap", desc: "Siswa mengerjakan tes terkomputerisasi. Asisten AI memberikan petunjuk terstruktur tanpa memberikan jawaban langsung untuk melatih kemandirian." },
  { icon: PenTool, title: "3. Jurnal Refleksi Siswa", desc: "Sebelum mengumpulkan ujian, siswa menuliskan kendala belajarnya guna membangun kesadaran diri (metakognisi) dan adab digital." },
  { icon: Activity, title: "4. Analitik & Otoritas Guru", desc: "Sistem menyajikan analitik kemandirian. Guru memegang otoritas penuh untuk mengoreksi nilai AI jika jawaban merupakan dialek lokal yang sah." }
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
  
  // STATE UNTUK CHATBOT PUBLIK
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Halo! Saya asisten informasi HARC-AI. Ada yang bisa saya bantu terkait fitur, pendaftaran, atau manfaat platform kami?" }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  // Auto-scroll chat ke bawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isLoadingChat]);
  
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoadingChat) return;

    const userMessage = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");
    setIsLoadingChat(true);

    try {
      const payload = {
        messages: [...chatMessages, { role: "user", content: userMessage }]
      };

      const res = await fetch("/api/chat-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi AI");

      setChatMessages((prev) => [...prev, { role: "assistant", content: data.choices[0].message.content }]);
    } catch (error: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Maaf, terjadi kesalahan: ${error.message}` }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

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
        <div className={`absolute top-[-100px] left-[5%] md:left-[10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full blur-[100px] md:blur-[120px] opacity-40 transition-all ${isDarkMode ? 'bg-blue-900' : 'bg-blue-200'}`} />
        <div className={`absolute top-[100px] right-[5%] md:right-[10%] w-[200px] md:w-[400px] h-[200px] md:h-[400px] rounded-full blur-[80px] md:blur-[100px] opacity-30 transition-all ${isDarkMode ? 'bg-amber-900' : 'bg-amber-100'}`} />
      </div>

      {/* HEADER INSTITUSI */}
      <header className={`fixed w-full top-0 z-50 transition-all duration-300 border-b ${isDarkMode ? 'bg-[#0a0f1c]/95 border-slate-800 shadow-md' : 'bg-white/95 border-slate-200 shadow-sm'} backdrop-blur-md`} role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] md:h-[80px] flex justify-between items-center relative">
          
          <Link href="#beranda" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 rounded-lg relative z-10">
            <div className="w-[38px] h-[38px] md:w-[44px] md:h-[44px] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0" aria-hidden="true">
              <img src="/logo.png" alt="Logo HARC-AI" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center">
              <span className={`text-[17px] sm:text-xl font-[800] tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-[#0f172a]'} ${teachersFont.className}`}>HARC-AI</span>
              <span className={`text-[9px] md:text-[10px] font-bold tracking-wide mt-1 uppercase ${isDarkMode ? 'text-[#60a5fa]' : 'text-[#2563eb]'}`}>BY MAHATMA ACADEMY</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-3 relative z-10">
            {/* TOMBOL CHATBOT */}
            <button 
              onClick={() => setIsChatOpen(true)}
              className="px-3 py-2 md:px-4 md:py-2.5 rounded-xl border bg-amber-400 hover:bg-amber-500 border-amber-500 text-blue-950 font-bold transition-all flex items-center gap-2 text-xs md:text-sm shadow-md"
            >
              <Bot size={18} />
              <span className="hidden md:inline">Tanya AI</span>
            </button>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 md:p-2.5 rounded-xl border transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button 
              className={`md:hidden p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* MODAL MENU MOBILE */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm md:hidden"
              />
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`fixed z-50 top-4 left-4 right-4 rounded-3xl shadow-2xl overflow-hidden border md:hidden ${isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}
              >
                <div className={`flex justify-between items-center p-5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                     <div className="w-[36px] h-[36px] flex items-center justify-center shrink-0">
                        <img src="/logo.png" alt="Logo HARC-AI" className="w-full h-full object-contain" />
                     </div>
                     <span className={`text-lg font-[800] leading-none block ${isDarkMode ? 'text-white' : 'text-[#0f172a]'} ${teachersFont.className}`}>HARC-AI</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                     <X size={20}/>
                  </button>
                </div>
                <div className={`flex flex-col p-3 gap-1 text-[13px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-[#334155]'}`}>
                   <a href="#beranda" onClick={() => setIsMobileMenuOpen(false)} className={`p-4 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-50 hover:text-[#0f172a]'}`}>Beranda</a>
                   <a href="#dimensi" onClick={() => setIsMobileMenuOpen(false)} className={`p-4 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-50 hover:text-[#0f172a]'}`}>Dimensi Evaluasi</a>
                   <a href="#panduan" onClick={() => setIsMobileMenuOpen(false)} className={`p-4 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-50 hover:text-[#0f172a]'}`}>Panduan Sistem</a>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* POP-UP CHATBOT PUBLIK */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-[60] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className={`fixed z-[70] bottom-4 right-4 left-4 md:left-auto md:w-[400px] h-[550px] md:h-[600px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${isDarkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}
            >
              {/* Header Chat */}
              <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#1e3a8a] border-[#172554] text-white'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-blue-950">
                    <Bot size={22} />
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${teachersFont.className}`}>Bot HARC-AI</h3>
                    <p className="text-[10px] text-blue-200">Siap menjawab pertanyaan Anda</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Area Pesan Chat */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-amber-400 text-blue-950 rounded-br-sm' 
                        : isDarkMode 
                          ? 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700' 
                          : 'bg-slate-100 text-slate-700 rounded-bl-sm border border-slate-200'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoadingChat && (
                  <div className="flex justify-start">
                    <div className={`p-3 rounded-2xl rounded-bl-sm flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs">Berpikir...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Form Input Chat */}
              <form onSubmit={handleSendMessage} className={`p-3 border-t flex gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tanyakan tentang pendaftaran atau fitur..." 
                  className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
                  disabled={isLoadingChat}
                />
                <button 
                  type="submit" 
                  disabled={isLoadingChat || !chatInput.trim()}
                  className="p-3 bg-[#1e3a8a] hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
                >
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main role="main">
        {/* BAGIAN UTAMA (HERO) - UTUH KEMBALI */}
        <section id="beranda" className="relative z-10 pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-28" aria-labelledby="hero-title">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-8">
            
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
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[11px] sm:text-xs mb-5 sm:mb-6 border shadow-sm backdrop-blur-sm ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-amber-400' : 'bg-white/80 border-blue-200 text-blue-900'}`} role="status"
              >
                <GraduationCap size={16} className="text-amber-500 shrink-0" aria-hidden="true" />
                <span className="uppercase tracking-wider">Pusat Asesmen Pendidikan AI</span>
              </motion.div>
              
              <h1 id="hero-title" className={`text-[28px] sm:text-4xl lg:text-[44px] font-black mb-4 sm:mb-6 leading-tight ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-[#0f172a]'}`}>
                Integrasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-amber-500">Kecerdasan Buatan</span> dalam Evaluasi Akademik
              </h1>
              
              <p className={`text-sm lg:text-base mb-8 lg:mb-10 leading-relaxed max-w-2xl text-center lg:text-left ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Platform <strong>Humanistic, Adaptive, and Responsive-Cultural Assessment (HARC-AI)</strong> berfungsi untuk memediasi pembelajaran bahasa daerah, mereduksi beban administratif tenaga pendidik, dan meningkatkan prestasi akademik peserta didik secara sistematis.
              </p>
              
              <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-center gap-3 sm:gap-4">
                <Link href="/login" className="w-full sm:w-auto" tabIndex={-1}>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-blue-800 text-white px-6 sm:px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-3"
                  >
                    <span>Mulai Evaluasi</span>
                    <ChevronRight size={18} />
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Kolom Visual Institusi - UTUH KEMBALI */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: -5 }} 
              animate={{ opacity: 1, scale: 1, rotate: 0 }} 
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }} 
              className="w-full sm:w-3/4 lg:w-5/12 flex justify-center relative mt-6 lg:mt-0"
              aria-hidden="true"
            >
              <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute -top-4 -left-4 w-10 h-10 sm:w-12 sm:h-12 bg-amber-400 rounded-full blur-xl opacity-60 z-0"></motion.div>
              <motion.div animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="absolute -bottom-6 -right-6 w-14 h-14 sm:w-16 sm:h-16 bg-blue-500 rounded-full blur-xl opacity-50 z-0"></motion.div>

              <div className={`w-full max-w-[320px] sm:max-w-sm aspect-square rounded-[2rem] p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden border shadow-2xl backdrop-blur-sm z-10 ${isDarkMode ? 'bg-[#0f172a]/80 border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white/90 border-slate-200/50 shadow-[0_20px_50px_rgba(30,58,138,0.1)]'}`}>
                <div className={`absolute w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] rounded-full border-[1.5px] border-dashed animate-[spin_30s_linear_infinite] pointer-events-none ${isDarkMode ? 'border-slate-600/50' : 'border-blue-200'}`} />
                <div className={`absolute w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] rounded-full border-[1.5px] border-dashed animate-[spin_20s_linear_infinite_reverse] pointer-events-none ${isDarkMode ? 'border-slate-500/50' : 'border-indigo-200'}`} />
                
                <motion.div 
                  animate={{ y: [0, -8, 0] }} 
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-tr from-blue-900 to-indigo-800 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(30,58,138,0.4)] border-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}
                >
                  <BrainCircuit className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 animate-pulse" />
                </motion.div>
                
                <div className={`relative z-10 mt-6 sm:mt-8 text-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl border shadow-lg backdrop-blur-md ${isDarkMode ? 'bg-slate-800/90 border-slate-600' : 'bg-white/90 border-slate-100'}`}>
                  <p className={`text-[10px] sm:text-xs font-black text-transparent bg-clip-text bg-gradient-to-r uppercase tracking-widest ${isDarkMode ? 'from-blue-400 to-indigo-400' : 'from-blue-600 to-indigo-600'}`}>Status Sistem</p>
                  <div className="flex items-center justify-center gap-2 mt-1 sm:mt-1.5">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <p className={`text-[11px] sm:text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Modul AI Aktif & Sinkron</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* PITA STATISTIK (SOCIAL PROOF) - UTUH KEMBALI */}
        <section className={`relative z-20 py-8 border-y ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-blue-900 border-blue-950'} backdrop-blur-md`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
              {statsData.map((stat, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center text-center">
                  <stat.icon className={`w-6 h-6 mb-2 sm:mb-3 ${isDarkMode ? 'text-blue-400' : 'text-amber-400'}`} />
                  <h3 className={`text-2xl md:text-3xl font-black text-white mb-1 ${teachersFont.className}`}>{stat.value}</h3>
                  <p className={`text-[10px] md:text-xs font-bold tracking-widest uppercase ${isDarkMode ? 'text-slate-400' : 'text-blue-200'}`}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ALUR KERJA SISTEM - UTUH KEMBALI */}
        <section id="panduan" className={`py-16 sm:py-24 border-t relative overflow-hidden ${isDarkMode ? 'bg-[#0a0f1c] border-slate-800' : 'bg-white border-slate-200'}`} aria-labelledby="panduan-title">
          <div className={`absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l to-transparent pointer-events-none ${isDarkMode ? 'from-slate-800/30' : 'from-blue-50/50'}`} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-[11px] sm:text-sm font-bold uppercase tracking-widest text-amber-500 mb-2 sm:mb-3 block">Prosedur Operasional</span>
              <h2 id="panduan-title" className={`text-2xl sm:text-4xl font-black mb-4 sm:mb-5 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-[#0f172a]'}`}>
                Alur Kerja Evaluasi Akademik
              </h2>
              <p className={`text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Struktur operasional sistem memastikan kolaborasi yang transparan antara tenaga pendidik, peserta didik, dan asisten kecerdasan buatan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
              <div className={`hidden lg:block absolute top-10 left-[12%] right-[12%] h-0.5 border-t-2 border-dashed z-0 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'}`}></div>
              
              {panduanData.map((step, idx) => (
                <article key={idx} className={`relative z-10 p-6 lg:p-8 rounded-2xl border-2 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-800' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-5 sm:mb-6 shadow-lg border-4 ${isDarkMode ? 'bg-slate-800 border-[#0a0f1c] text-amber-400' : 'bg-[#1e3a8a] border-white text-amber-400'}`}>
                    <step.icon className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
                  </div>
                  <h3 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 ${teachersFont.className} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {step.title}
                  </h3>
                  <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {step.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 6 DIMENSI HARC-AI - UTUH KEMBALI */}
        <section id="dimensi" className={`py-16 sm:py-24 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`} aria-labelledby="dimensi-title">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-[11px] sm:text-sm font-bold uppercase tracking-widest text-amber-500 mb-2 sm:mb-3 block">Kerangka Teoritis</span>
              <h2 id="dimensi-title" className={`text-2xl sm:text-4xl font-black mb-4 sm:mb-5 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-[#0f172a]'}`}>
                6 Dimensi Evaluasi Institusional
              </h2>
              <p className={`text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Indikator penilaian dirancang secara empiris untuk menjaga integritas akademik dan memvalidasi kecerdasan kultural peserta didik.
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
                  <motion.article 
                    key={idx} 
                    variants={itemVariants} 
                    tabIndex={0}
                    className={`p-6 lg:p-8 rounded-2xl shadow-sm transition-all duration-300 flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 border-b-4 hover:-translate-y-1 ${isDarkMode ? 'bg-[#0a0f1c] border-slate-700/50 hover:border-blue-500 hover:shadow-blue-900/20' : 'bg-white border-slate-200 hover:border-blue-600 hover:shadow-blue-900/10'}`}
                  >
                    <div>
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-5 sm:mb-6 shadow-sm transition-transform duration-300 group-hover:rotate-6 ${style.color}`} aria-hidden="true">
                        <style.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <h3 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-3 ${teachersFont.className} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {feature.title}
                      </h3>
                      <p className={`leading-relaxed text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {feature.desc}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* CTA SECTION - UTUH KEMBALI */}
        <section className={`py-12 md:py-16 relative overflow-hidden ${isDarkMode ? 'bg-blue-950 border-y border-blue-900' : 'bg-[#1e3a8a]'}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <h2 className={`text-2xl md:text-3xl lg:text-4xl font-black text-white mb-3 sm:mb-4 ${teachersFont.className}`}>Siap Mentransformasi Ekosistem Evaluasi Sekolah Anda?</h2>
            <p className="text-blue-200 text-sm md:text-base mb-6 sm:mb-8 max-w-2xl mx-auto">
              Bergabunglah dengan institusi lainnya yang telah mengoptimalkan kinerja pendidik dan menjunjung tinggi kearifan lokal melalui asisten AI.
            </p>
            <Link href="/login">
              <button className="bg-amber-400 hover:bg-amber-300 text-blue-950 px-6 sm:px-8 py-3.5 rounded-xl font-black text-sm transition-all shadow-lg hover:shadow-amber-500/30 flex items-center justify-center gap-3 mx-auto active:scale-95 w-full sm:w-auto">
                <Library size={18} /> Masuk ke Portal Sekarang
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER - UTUH KEMBALI */}
      <footer className={`border-t py-6 md:py-8 ${isDarkMode ? 'bg-[#050810] border-slate-800 text-slate-400' : 'bg-[#0a0f1c] border-slate-900 text-slate-400'}`} role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0" aria-hidden="true">
              <img src="/logo.png" alt="Logo Mahatma Academy" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center">
              <span className={`text-base sm:text-lg font-black text-white tracking-wide block leading-none ${teachersFont.className}`}>MAHATMA ACADEMY</span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">FOR SUSTAINABLE EDUCATION</span>
            </div>
          </div>
          <div className="text-[11px] sm:text-xs font-medium flex flex-col items-center md:items-end">
            <p className="mb-1">© {new Date().getFullYear()} Mahatma Academy. Hak Cipta Dilindungi.</p>
            <p>Platform Asesmen <span className="text-amber-500 font-bold">HARC-AI</span> Berlisensi Resmi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}