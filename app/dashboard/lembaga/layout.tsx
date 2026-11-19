"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, BarChart3, LogOut, GraduationCap, 
  BookOpen, Settings, Clock, ChevronLeft, ChevronRight,
  ClipboardCheck, FileSpreadsheet, Menu, X, Stamp
} from "lucide-react";

import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { LogoBrand } from "@/components/Memuat";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function LembagaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [profil, setProfil] = useState({
    namaLembaga: "Memuat...",
    tipe: "Lembaga Pendidikan",
  });

  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/lembaga/beranda" },
    { name: "Data Guru", icon: Users, path: "/dashboard/lembaga/guru" },
    { name: "Data Siswa", icon: GraduationCap, path: "/dashboard/lembaga/siswa" },
    { name: "Supervisi E-Learning", icon: ClipboardCheck, path: "/dashboard/lembaga/supervisi" },
    { name: "Validasi Asesmen", icon: FileSpreadsheet, path: "/dashboard/lembaga/validasi-asesmen" },
    { name: "Bahan Ajar", icon: BookOpen, path: "/dashboard/lembaga/bahan-ajar" },
    { name: "Analitik", icon: BarChart3, path: "/dashboard/lembaga/analitik" },
    { name: "Kop Surat", icon: Stamp, path: "/dashboard/lembaga/kop" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/lembaga/pengaturan" },
  ];

  const bottomNavItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/lembaga/beranda" },
    { name: "Guru", icon: Users, path: "/dashboard/lembaga/guru" },
    { name: "Siswa", icon: GraduationCap, path: "/dashboard/lembaga/siswa" },
    { name: "Setelan", icon: Settings, path: "/dashboard/lembaga/pengaturan" },
  ];

  const moreMenuItems = [
    { name: "Supervisi E-Learning", icon: ClipboardCheck, path: "/dashboard/lembaga/supervisi" },
    { name: "Validasi Asesmen", icon: FileSpreadsheet, path: "/dashboard/lembaga/validasi-asesmen" },
    { name: "Bahan Ajar", icon: BookOpen, path: "/dashboard/lembaga/bahan-ajar" },
    { name: "Analitik", icon: BarChart3, path: "/dashboard/lembaga/analitik" },
    { name: "Kop Surat", icon: Stamp, path: "/dashboard/lembaga/kop" },
  ];

  useEffect(() => {
    setIsMounted(true);
    const updateTime = () => setCurrentTime(new Date());
    updateTime(); 
    const timer = setInterval(updateTime, 1000);

    const auth = getAuth();
    let unsubProfil: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubProfil?.();
      unsubProfil = undefined;
      if (user) {
        unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfil({
              namaLembaga: data.namaInstansi || data.nama || "Lembaga Baru",
              tipe: "Pengelola Lembaga",
            });
          }
        });
      }
    });

    return () => { clearInterval(timer); unsubscribeAuth(); unsubProfil?.(); };
  }, []);

  // FUNGSI LOGOUT (MENGUNCI SESI)
  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      document.cookie = "userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/login";
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  const getInitials = (name: string) => {
    if (name === "Memuat...") return "...";
    const words = name.trim().split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    if (words.length === 1 && words[0]) return words[0][0].toUpperCase();
    return "L";
  };

  const jam = currentTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, ".");
  const tanggal = currentTime.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={`fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#f8fafc] flex ${latoFont.className}`}>
      
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col bg-[#2e1065] text-purple-100 transition-all duration-300 z-40 border-r border-purple-900 relative shrink-0 ${isSidebarCollapsed ? "w-[74px]" : "md:w-[224px] lg:w-[248px]"}`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-[52px] bg-[#2e1065] border border-purple-700 text-purple-200 hover:text-white rounded-full w-6 h-6 flex items-center justify-center z-50 shadow-md transition-colors" aria-label="Toggle Sidebar">
          {isSidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        <div className={`h-16 flex items-center border-b border-purple-900/60 bg-[#1e0a43] shrink-0 ${isSidebarCollapsed ? "justify-center px-2" : "justify-start px-5"}`}>
          <Link href="/dashboard/lembaga/beranda" className={`flex items-center gap-3 overflow-hidden w-full ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}>
            <LogoBrand size={38} className="border-white/25 shadow-md" />
            {!isSidebarCollapsed && (
              <div className="flex flex-col leading-none min-w-0">
                <span className={`text-base font-bold text-white tracking-wide truncate ${teachersFont.className}`}>HARC-AI</span>
                <span className="text-[11px] font-semibold text-purple-300/90 truncate mt-0.5">Portal Lembaga</span>
              </div>
            )}
          </Link>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-purple-300/75 uppercase tracking-widest mb-1.5 px-5 truncate">Manajemen Sekolah</div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""}>
                <div className={`flex items-center py-2.5 transition-all text-[13.5px] font-medium border-l-[3px] ${isActive ? "bg-purple-900/60 text-white border-purple-400 font-semibold" : "border-transparent text-purple-200/85 hover:bg-purple-900/35 hover:text-white"} ${isSidebarCollapsed ? "justify-center px-2" : "justify-start gap-3 px-5"}`}>
                  <item.icon size={19} className={`shrink-0 ${isActive ? "text-purple-300" : "text-purple-400/70"}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-purple-900/60 bg-[#1e0a43] shrink-0">
          <button onClick={handleLogout} title={isSidebarCollapsed ? "Keluar Sistem" : ""} className={`flex items-center text-purple-200 hover:bg-rose-500/20 hover:text-rose-200 w-full rounded-xl transition-all text-[13.5px] font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "justify-start gap-3 px-4 py-2.5"}`}>
            <LogOut size={19} className="shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Keluar Akun</span>}
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="min-h-16 pt-safe bg-white/95 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 shadow-[0_1px_12px_-6px_rgba(15,23,42,0.18)]">
          <div className="flex items-center w-full md:w-auto py-2 md:py-0">
            <Link href="/dashboard/lembaga/kop" className="hidden md:flex items-center gap-1.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 px-3 py-1.5 rounded-full text-purple-700 transition-colors">
              <Stamp size={14} className="text-purple-600" />
              <span className="text-xs font-bold">Kop Lembaga</span>
            </Link>

            <div className="md:hidden flex items-center justify-between w-full gap-2">
              <Link href="/dashboard/lembaga/beranda" className="flex items-center gap-2.5 min-w-0">
                <LogoBrand size={38} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[17px] font-extrabold text-slate-800 tracking-tight font-sans truncate">HARC-AI</span>
                  <span className="text-[10px] font-semibold text-slate-500 tracking-wide mt-0.5 truncate">Portal Lembaga</span>
                </div>
              </Link>
              <Link href="/dashboard/lembaga/pengaturan" className="flex items-center gap-2 bg-purple-50/80 border border-purple-200 pl-2.5 pr-1 py-1 rounded-full shrink-0 active:scale-95 transition-transform">
                <span className="text-[11px] font-bold text-purple-800 max-w-[96px] truncate">{profil.namaLembaga}</span>
                <div className="w-6 h-6 bg-purple-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  {getInitials(profil.namaLembaga)}
                </div>
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end gap-4 lg:gap-5">
            <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Clock size={18} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-slate-700 tracking-wider font-mono">
                  {isMounted ? jam : "--.--.--"} <span className="text-slate-500 text-xs">WIB</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium -mt-0.5">
                  {isMounted ? tanggal : "Memuat..."}
                </span>
              </div>
            </div>

            <div className="hidden lg:block w-px h-6 bg-slate-200 mx-1"></div>
            
            <Link href="/dashboard/lembaga/pengaturan" className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors">
              <div className="text-right">
                <p className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{profil.namaLembaga}</p>
                <p className="text-slate-400 text-[11px] font-medium">{profil.tipe}</p>
              </div>
              <div className="w-9 h-9 bg-purple-700 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                {getInitials(profil.namaLembaga)}
              </div>
            </Link>
          </div>
        </header>

        <div className="dashboard-scroll flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 md:p-6 lg:p-8 bg-[#f8fafc] pb-[calc(76px+env(safe-area-inset-bottom)+1rem)] md:pb-8">
          {children}
        </div>
      </main>

      {/* BOTTOM NAVIGATION MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 flex items-stretch min-h-[68px] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.name} href={item.path} className="flex-1 min-w-0 flex flex-col justify-center items-center py-1.5 px-1 group">
              <div className={`p-1.5 rounded-xl transition-all mb-0.5 ${isActive ? "bg-purple-100 text-purple-700" : "text-slate-400 group-hover:text-purple-500"}`}>
                <item.icon size={21} className={isActive ? "fill-purple-100/50" : ""} />
              </div>
              <span className={`text-[10px] font-bold transition-all w-full text-center ${isActive ? "text-purple-700" : "text-slate-500"} truncate`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex-1 min-w-0 flex flex-col justify-center items-center py-1.5 px-1 text-slate-400 group" aria-label="Buka Menu Lanjutan">
          <div className="p-1.5 rounded-xl transition-all mb-0.5 group-hover:text-purple-500">
            <Menu size={21} />
          </div>
          <span className="text-[10px] font-bold transition-all text-slate-500">Menu</span>
        </button>
      </nav>

      {/* LACI MENU MOBILE */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }} 
            className="md:hidden fixed inset-0 z-50 bg-slate-50 flex flex-col"
          >
            <div className="min-h-16 pt-safe flex items-center justify-between px-5 py-2 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <LogoBrand size={32} />
                <div className="flex flex-col leading-none">
                  <h2 className={`text-lg font-bold text-slate-800 ${teachersFont.className}`}>Semua Menu</h2>
                  <span className="text-[10px] font-semibold text-slate-400">Portal Lembaga</span>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors" aria-label="Tutup Menu">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-safe">
              <Link href="/dashboard/lembaga/pengaturan" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl mb-4 shadow-sm active:scale-[0.99] transition-transform">
                <div className="w-11 h-11 bg-purple-700 text-white rounded-xl flex items-center justify-center text-sm font-bold shrink-0">
                  {getInitials(profil.namaLembaga)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm truncate">{profil.namaLembaga}</p>
                  <p className="text-xs text-slate-400 truncate">{profil.tipe}</p>
                </div>
              </Link>

              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2.5">Aktivitas Lanjutan</div>
              <div className="grid grid-cols-2 gap-3">
                {moreMenuItems.map((menu, idx) => {
                  const isActive = pathname.startsWith(menu.path);
                  const isOddLast = moreMenuItems.length % 2 === 1 && idx === moreMenuItems.length - 1;
                  return (
                    <Link key={menu.name} href={menu.path} onClick={() => setIsMobileMenuOpen(false)} className={isOddLast ? "col-span-2" : ""}>
                      <div className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all ${isOddLast ? "flex-row" : "flex-col min-h-[96px]"} ${isActive ? "bg-purple-50/70 border-purple-300 ring-1 ring-purple-200" : "bg-white border-slate-200 hover:border-purple-300"}`}>
                        <div className={`p-2.5 rounded-full ${isActive ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-600"}`}>
                          <menu.icon size={22}/>
                        </div>
                        <span className={`font-bold text-xs sm:text-sm text-center leading-tight ${isActive ? "text-purple-700" : "text-slate-700"}`}>{menu.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200 pb-4">
                <button onClick={handleLogout} className="w-full">
                  <div className="flex items-center justify-center gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-600 shadow-sm rounded-2xl active:scale-95 transition-transform">
                    <LogOut size={20} />
                    <span className="font-bold text-sm">Keluar Akun</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}