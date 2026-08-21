"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, BookOpen, MessageCircle, PenTool, BarChart, 
  LogOut, Bell, UserCircle, Settings, Clock, ChevronLeft, 
  ChevronRight, GraduationCap, Sparkles, Menu, X
} from "lucide-react";
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false); // Pelindung Hydration Error
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State Menu Mobile
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [showNotif, setShowNotif] = useState(false);
  const [notifCount, setNotifCount] = useState(0); 
  
  const [profil, setProfil] = useState({
    namaLengkap: "Memuat...",
    kelas: "Siswa",
    poin: 0,
    fotoUrl: ""
  });

  // MENU LENGKAP (Tampil di Sidebar Desktop)
  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/siswa/beranda" },
    { name: "Ruang Kelas", icon: BookOpen, path: "/dashboard/siswa/ruang-kelas" },
    { name: "Asisten AI", icon: MessageCircle, path: "/dashboard/siswa/asisten" },
    { name: "Jurnal Refleksi", icon: PenTool, path: "/dashboard/siswa/jurnal-refleksi" },
    { name: "Raport", icon: BarChart, path: "/dashboard/siswa/raport" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/siswa/pengaturan" },
  ];

  // MENU BAWAH MOBILE (Bottom Navigation)
  const bottomNavItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/siswa/beranda" },
    { name: "Kelas", icon: BookOpen, path: "/dashboard/siswa/ruang-kelas" },
    { name: "Asisten", icon: MessageCircle, path: "/dashboard/siswa/asisten" },
    { name: "Raport", icon: BarChart, path: "/dashboard/siswa/raport" },
  ];

  // MENU SISA MOBILE (Tampil di dalam laci "Menu")
  const moreMenuItems = [
    { name: "Jurnal", icon: PenTool, path: "/dashboard/siswa/jurnal-refleksi" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/siswa/pengaturan" },
  ];

  useEffect(() => {
    setIsMounted(true);
    const updateTime = () => setCurrentTime(new Date());
    updateTime(); 
    const timer = setInterval(updateTime, 1000); 

    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfil({
              namaLengkap: data.nama || "Pelajar",
              kelas: data.kelas || "Kelas Belum Diatur",
              poin: data.xpPoints || 0,
              fotoUrl: data.fotoUrl || ""
            });
          }
        });

        return () => unsubProfil();
      } else {
        window.location.href = "/login";
      }
    });

    return () => { clearInterval(timer); unsubscribeAuth(); };
  }, []);

  const getInitials = (name: string) => {
    if (name === "Memuat...") return "...";
    const words = name.trim().split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    if (words.length === 1 && words[0]) return words[0][0].toUpperCase();
    return "S";
  };

  const jam = currentTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, ".");
  const tanggal = currentTime.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex ${latoFont.className}`}>
      
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col bg-[#064e3b] text-emerald-50 transition-all duration-300 z-50 border-r border-emerald-900 relative ${isSidebarCollapsed ? "w-[80px]" : "w-[240px]"}`}>
        
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-[#064e3b] border border-emerald-700 text-emerald-200 hover:text-white rounded-full p-1 z-50 shadow-md transition-colors"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="h-16 flex items-center justify-center px-4 border-b border-emerald-800 bg-[#022c22] shrink-0">
          <Link href="/dashboard/siswa/beranda" className="flex items-center gap-2.5 overflow-hidden w-full justify-center">
            <GraduationCap className="w-6 h-6 text-emerald-400 shrink-0" />
            {!isSidebarCollapsed && (
              <span className={`text-lg font-bold text-white tracking-wide truncate ${teachersFont.className}`}>Ruang Siswa</span>
            )}
          </Link>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-widest mb-2 px-6 truncate">Menu Belajar</div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""}>
                <div className={`flex items-center px-6 py-3 transition-all text-sm font-medium border-l-[3px] ${
                  isActive 
                    ? "bg-emerald-800/50 text-white border-emerald-400" 
                    : "border-transparent text-emerald-200 hover:bg-emerald-800/30 hover:text-white"
                } ${isSidebarCollapsed ? "justify-center px-0" : "gap-3"}`}>
                  <item.icon size={20} className={`shrink-0 ${isActive ? "text-emerald-400" : "text-emerald-300"}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-800 bg-[#022c22]">
          <Link href="/login" title={isSidebarCollapsed ? "Keluar Sistem" : ""}>
            <button className={`flex items-center text-emerald-200 hover:bg-rose-500/10 hover:text-rose-400 w-full rounded-lg transition-all text-sm font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5"}`}>
              <LogOut size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Keluar Akun</span>}
            </button>
          </Link>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-[70px] md:pb-0 relative">
        
        {/* HEADER ATAS */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          
          <div className="flex items-center w-full md:w-auto">
            {/* Gamifikasi Poin Desktop */}
            <div className="hidden md:flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-amber-700">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-xs font-bold">{profil.poin} XP</span>
            </div>

            {/* Tampilan Mobile: Ikon App & Lonceng Sejajar */}
            <div className="md:hidden flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <GraduationCap size={18} className="text-white" />
                </div>
                <span className="text-xl font-bold text-[#1e293b] tracking-wide ml-1 font-sans">Ruang Siswa</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Gamifikasi Poin Mobile */}
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full text-amber-700">
                  <Sparkles size={12} className="text-amber-500" />
                  <span className="text-[10px] font-bold">{profil.poin} XP</span>
                </div>

                <div className="relative">
                  <button onClick={() => setShowNotif(!showNotif)} className={`relative p-2 rounded-full transition-colors ${showNotif ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Bell size={22} strokeWidth={2} />
                    {notifCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Area Kanan Khusus Desktop */}
          <div className="hidden md:flex items-center justify-end gap-5">
            {/* Jam & Tanggal Desain Baru */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
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

            <div className="relative">
              <button onClick={() => setShowNotif(!showNotif)} className={`relative p-2.5 rounded-full transition-colors ${showNotif ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <Bell size={22} strokeWidth={2} />
                {notifCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            
            <Link href="/dashboard/siswa/pengaturan">
              <div className="flex items-center gap-3 cursor-pointer group hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors">
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors leading-tight">{profil.namaLengkap}</p>
                  <p className="text-slate-400 text-[11px] font-medium">{profil.kelas}</p>
                </div>
                {profil.fotoUrl ? (
                  <img src={profil.fotoUrl} alt="Profil" className="w-9 h-9 rounded-lg object-cover shadow-sm border border-slate-200" />
                ) : (
                  <div className="w-9 h-9 bg-emerald-700 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm group-hover:bg-emerald-600 transition-colors">
                    {getInitials(profil.namaLengkap)}
                  </div>
                )}
              </div>
            </Link>
          </div>
          
          {/* Kotak Notifikasi Overlay */}
          <AnimatePresence>
            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)}></div>
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  className="absolute right-4 top-16 mt-1 w-72 md:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 z-50 overflow-hidden transform origin-top-right"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800">Pemberitahuan</span>
                    {notifCount > 0 && <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded-full">{notifCount} Baru</span>}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    <div className="p-8 text-center text-slate-400">
                      <Bell size={28} className="mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-bold text-slate-500">Kosong</p>
                      <p className="text-[10px] mt-1">Tidak ada pemberitahuan baru.</p>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-[#f8fafc] pb-24 md:pb-6">
          {children}
        </div>
      </main>

      {/* BOTTOM NAVIGATION MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 z-40 flex justify-around items-center h-[70px] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.name} href={item.path} className="flex-1 flex flex-col justify-center items-center h-full group">
              <div className={`p-1.5 rounded-xl transition-all mb-1 ${isActive ? "bg-emerald-100 text-emerald-700" : "text-slate-400 group-hover:text-emerald-500"}`}>
                <item.icon size={22} className={isActive ? "fill-emerald-100" : ""} />
              </div>
              <span className={`text-[10px] font-bold transition-all ${isActive ? "text-emerald-700" : "text-slate-500"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        {/* Tombol Menu Lainnya */}
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex-1 flex flex-col justify-center items-center h-full text-slate-400 group">
          <div className="p-1.5 rounded-xl transition-all mb-1 group-hover:text-emerald-500">
            <Menu size={22} />
          </div>
          <span className="text-[10px] font-bold transition-all text-slate-500">Menu</span>
        </button>
      </nav>

      {/* LACI (DRAWER) MENU MOBILE UNTUK SISA FITUR */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }} 
            className="md:hidden fixed inset-0 z-50 bg-slate-50 flex flex-col"
          >
            <div className="h-16 flex items-center justify-between px-5 bg-white border-b border-slate-200 shrink-0">
              <h2 className={`text-xl font-bold text-slate-800 ${teachersFont.className}`}>Semua Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 pb-safe">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-4">Aktivitas Lanjutan</div>
              
              <div className="grid grid-cols-2 gap-4">
                {moreMenuItems.map((menu) => (
                  <Link key={menu.name} href={menu.path} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex flex-col items-center justify-center gap-3 p-4 aspect-square bg-white border border-slate-200 shadow-sm rounded-2xl active:scale-95 transition-all hover:border-emerald-300 hover:shadow-md">
                      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
                        <menu.icon size={28}/>
                      </div>
                      <span className="font-bold text-slate-700 text-sm text-center leading-tight">{menu.name}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <Link href="/login">
                  <div className="flex items-center justify-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-600 shadow-sm rounded-2xl active:scale-95 transition-transform">
                    <LogOut size={22} />
                    <span className="font-bold text-sm">Keluar Akun</span>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}