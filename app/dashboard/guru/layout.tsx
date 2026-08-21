"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, CheckCircle, BarChart3, LogOut, 
  GraduationCap, Bell, BookOpen, Settings, Clock, 
  ChevronLeft, ChevronRight, Bot, Target, FileSpreadsheet, Menu, X 
} from "lucide-react";

import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, doc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false); // Pelindung Hydration Error
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State Menu Mobile
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [showNotif, setShowNotif] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  
  const [profil, setProfil] = useState({
    namaLengkap: "Memuat...",
    spesialisasi: "Pendidik",
    fotoUrl: ""
  });

  // MENU LENGKAP (Tampil di Sidebar Desktop)
  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/guru/beranda" },
    { name: "Profil", icon: Users, path: "/dashboard/guru/profil" },
    { name: "Kelas & Siswa", icon: FileSpreadsheet, path: "/dashboard/guru/kelas" }, 
    { name: "Perangkat Ajar", icon: BookOpen, path: "/dashboard/guru/generator" },
    { name: "Asesmen & Ujian", icon: Target, path: "/dashboard/guru/asesmen" },
    { name: "Chat AI", icon: Bot, path: "/dashboard/guru/chat" },
    { name: "Validasi", icon: CheckCircle, path: "/dashboard/guru/validasi" },
    { name: "Analitik", icon: BarChart3, path: "/dashboard/guru/analitik" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/guru/pengaturan" },
  ];

  // MENU BAWAH MOBILE (Bottom Navigation)
  const bottomNavItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/guru/beranda" },
    { name: "Kelas", icon: FileSpreadsheet, path: "/dashboard/guru/kelas" },
    { name: "Modul", icon: BookOpen, path: "/dashboard/guru/generator" },
    { name: "Asisten", icon: Bot, path: "/dashboard/guru/chat" },
  ];

  // MENU SISA MOBILE (Tampil di dalam laci "Menu")
  const moreMenuItems = [
    { name: "Profil", icon: Users, path: "/dashboard/guru/profil" },
    { name: "Asesmen", icon: Target, path: "/dashboard/guru/asesmen" },
    { name: "Validasi", icon: CheckCircle, path: "/dashboard/guru/validasi" },
    { name: "Analitik", icon: BarChart3, path: "/dashboard/guru/analitik" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/guru/pengaturan" },
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
              namaLengkap: data.nama || "Pendidik Baru",
              spesialisasi: data.spesialisasi || "Guru",
              fotoUrl: data.fotoUrl || ""
            });
          }
        });
        
        const unsubNotif = onSnapshot(query(collection(db, "antrean_validasi")), (snapshot) => {
          setNotifCount(snapshot.size);
        });

        return () => { unsubProfil(); unsubNotif(); };
      }
    });

    return () => { clearInterval(timer); unsubscribeAuth(); };
  }, []);

  const getInitials = (name: string) => {
    if (name === "Memuat...") return "...";
    const words = name.trim().split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    if (words.length === 1 && words[0]) return words[0][0].toUpperCase();
    return "G";
  };

  const jam = currentTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, ".");
  const tanggal = currentTime.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={`h-screen bg-[#f8fafc] flex overflow-hidden ${latoFont.className}`}>
      
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col h-screen bg-[#0f172a] text-slate-300 transition-all duration-300 z-50 border-r border-slate-800 relative ${isSidebarCollapsed ? "w-[80px]" : "w-[240px]"}`}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-[#0f172a] border border-slate-700 text-slate-400 hover:text-white rounded-full p-1 z-50 shadow-md transition-colors"
          aria-label={isSidebarCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} aria-hidden="true"/> : <ChevronLeft size={14} aria-hidden="true"/>}
        </button>

        <div className="h-16 flex items-center justify-center px-4 border-b border-slate-800/60 bg-[#0b1221] shrink-0">
          <Link href="/dashboard/guru/beranda" className="flex items-center gap-2.5 overflow-hidden w-full justify-center">
            <GraduationCap className="w-6 h-6 text-blue-500 shrink-0" aria-hidden="true"/>
            {!isSidebarCollapsed && (
              <span className={`text-lg font-bold text-slate-100 tracking-wide truncate ${teachersFont.className}`}>Portal Guru</span>
            )}
          </Link>
        </div>
        
        <nav aria-label="Navigasi Utama Guru" className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-6 truncate" aria-hidden="true">Manajemen Kelas</div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""} aria-current={isActive ? "page" : undefined}>
                <div className={`flex items-center px-6 py-3 transition-all text-sm font-medium border-l-[3px] ${
                  isActive 
                    ? "bg-slate-800/50 text-white border-blue-500" 
                    : "border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
                } ${isSidebarCollapsed ? "justify-center px-0" : "gap-3"}`}>
                  <item.icon size={20} className={`shrink-0 ${isActive ? "text-blue-500" : "text-slate-500"}`} aria-hidden="true"/>
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/60 bg-[#0b1221] shrink-0">
          <Link href="/login" title={isSidebarCollapsed ? "Keluar Sistem" : ""}>
            <button className={`flex items-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 w-full rounded-lg transition-all text-sm font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5"}`}>
              <LogOut size={20} className="shrink-0" aria-hidden="true"/>
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
            {/* Tampilan Mobile: Ikon App & Judul Sejajar */}
            <div className="md:hidden flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                  <GraduationCap size={18} className="text-white" />
                </div>
                <span className="text-xl font-bold text-[#1e293b] tracking-wide ml-1 font-sans">Panel Guru</span>
              </div>
              
              {/* Lonceng Notifikasi Mobile */}
              <div className="relative">
                <button onClick={() => setShowNotif(!showNotif)} aria-label="Notifikasi Validasi" className={`relative p-2 rounded-full transition-colors ${showNotif ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                  <Bell size={22} strokeWidth={2} aria-hidden="true"/>
                  {notifCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
                </button>
              </div>
            </div>
          </div>

          {/* Area Kanan Khusus Desktop */}
          <div className="hidden md:flex items-center justify-end gap-5 w-auto">
            
            {/* Jam & Tanggal Desain Baru */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
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

            {/* Lonceng Notifikasi Desktop */}
            <div className="relative">
              <button onClick={() => setShowNotif(!showNotif)} aria-label="Notifikasi Validasi" className={`relative p-2.5 rounded-full transition-colors ${showNotif ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <Bell size={22} strokeWidth={2} aria-hidden="true"/>
                {notifCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            
            {/* Profil Guru Desktop */}
            <Link href="/dashboard/guru/profil" aria-label="Profil Guru">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors group">
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors leading-tight">{profil.namaLengkap}</p>
                  <p className="text-slate-400 text-[11px] font-medium">{profil.spesialisasi}</p>
                </div>
                {profil.fotoUrl ? (
                  <img src={profil.fotoUrl} alt="Profil" className="w-9 h-9 rounded-lg object-cover shadow-sm border border-slate-200" />
                ) : (
                  <div className="w-9 h-9 bg-blue-900 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm group-hover:bg-blue-800 transition-colors" aria-hidden="true">
                    {getInitials(profil.namaLengkap)}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-[#f8fafc] pb-24 md:pb-6">
          {children}
        </div>
      </main>

      {/* BOTTOM NAVIGATION MOBILE */}
      <nav aria-label="Navigasi Mobile" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 z-40 flex justify-around items-center h-[70px] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.name} href={item.path} className="flex-1 flex flex-col justify-center items-center h-full group" aria-current={isActive ? "page" : undefined}>
              <div className={`p-1.5 rounded-xl transition-all mb-1 ${isActive ? "bg-blue-100 text-blue-700" : "text-slate-400 group-hover:text-blue-500"}`}>
                <item.icon size={22} className={isActive ? "fill-blue-100" : ""} aria-hidden="true"/>
              </div>
              <span className={`text-[10px] font-bold transition-all ${isActive ? "text-blue-700" : "text-slate-500"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        {/* Tombol Menu Lainnya */}
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex-1 flex flex-col justify-center items-center h-full text-slate-400 group">
          <div className="p-1.5 rounded-xl transition-all mb-1 group-hover:text-blue-500">
            <Menu size={22} />
          </div>
          <span className="text-[10px] font-bold transition-all text-slate-500">Menu</span>
        </button>
      </nav>

      {/* LACI (DRAWER) MENU MOBILE UNTUK SISA FITUR (GRID KOTAK PERSEGI) */}
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
                    <div className="flex flex-col items-center justify-center gap-3 p-4 aspect-square bg-white border border-slate-200 shadow-sm rounded-2xl active:scale-95 transition-all hover:border-blue-300 hover:shadow-md">
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
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