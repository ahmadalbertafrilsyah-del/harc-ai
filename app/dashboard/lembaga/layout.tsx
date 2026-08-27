"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, BarChart3, LogOut, GraduationCap, 
  BookOpen, Settings, Clock, ChevronLeft, ChevronRight, Landmark,
  ClipboardCheck, FileSpreadsheet, Menu, X 
} from "lucide-react";

import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

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
    { name: "Supervisi KBM", icon: ClipboardCheck, path: "/dashboard/lembaga/supervisi" },
    { name: "Validasi Asesmen", icon: FileSpreadsheet, path: "/dashboard/lembaga/validasi-asesmen" },
    { name: "Bahan Ajar", icon: BookOpen, path: "/dashboard/lembaga/bahan-ajar" },
    { name: "Analitik", icon: BarChart3, path: "/dashboard/lembaga/analitik" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/lembaga/pengaturan" },
  ];

  const bottomNavItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/lembaga/beranda" },
    { name: "Guru", icon: Users, path: "/dashboard/lembaga/guru" },
    { name: "Siswa", icon: GraduationCap, path: "/dashboard/lembaga/siswa" },
    { name: "Setelan", icon: Settings, path: "/dashboard/lembaga/pengaturan" },
  ];

  const moreMenuItems = [
    { name: "Supervisi KBM", icon: ClipboardCheck, path: "/dashboard/lembaga/supervisi" },
    { name: "Validasi Asesmen", icon: FileSpreadsheet, path: "/dashboard/lembaga/validasi-asesmen" },
    { name: "Bahan Ajar", icon: BookOpen, path: "/dashboard/lembaga/bahan-ajar" },
    { name: "Analitik", icon: BarChart3, path: "/dashboard/lembaga/analitik" },
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
              namaLembaga: data.namaInstansi || data.nama || "Lembaga Baru",
              tipe: "Pengelola Lembaga",
            });
          }
        });
        return () => unsubProfil();
      }
    });

    return () => { clearInterval(timer); unsubscribeAuth(); };
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
    <div className={`min-h-screen bg-[#f8fafc] flex ${latoFont.className}`}>
      
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col bg-[#2e1065] text-purple-100 transition-all duration-300 z-50 border-r border-purple-900 relative ${isSidebarCollapsed ? "w-[80px]" : "w-[240px]"}`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-20 bg-[#2e1065] border border-purple-800 text-purple-300 hover:text-white rounded-full p-1 z-50 shadow-md transition-colors">
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="h-16 flex items-center justify-center px-4 border-b border-purple-900/60 bg-[#1e0a43] shrink-0">
          <Link href="/dashboard/lembaga/beranda" className="flex items-center gap-2.5 overflow-hidden w-full justify-center">
            <Landmark className="w-6 h-6 text-purple-400 shrink-0" />
            {!isSidebarCollapsed && (
              <span className={`text-lg font-bold text-white tracking-wide truncate ${teachersFont.className}`}>Portal Lembaga</span>
            )}
          </Link>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest mb-2 px-6 truncate">Manajemen Sekolah</div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""}>
                <div className={`flex items-center px-6 py-3 transition-all text-sm font-medium border-l-[3px] ${isActive ? "bg-purple-900/50 text-white border-purple-400" : "border-transparent text-purple-300 hover:bg-purple-900/30 hover:text-purple-100"} ${isSidebarCollapsed ? "justify-center px-0" : "gap-3"}`}>
                  <item.icon size={20} className={`shrink-0 ${isActive ? "text-purple-400" : "text-purple-400/60"}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-purple-900/60 bg-[#1e0a43]">
          {/* UBAH MENJADI BUTTON LOGOUT */}
          <button onClick={handleLogout} title={isSidebarCollapsed ? "Keluar Sistem" : ""} className={`flex items-center text-purple-300 hover:bg-rose-500/20 hover:text-rose-300 w-full rounded-lg transition-all text-sm font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5"}`}>
            <LogOut size={20} className="shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Keluar Akun</span>}
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-[70px] md:pb-0 relative">
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center w-full md:w-auto">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center">
                <Landmark size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-[#1e293b] tracking-wide ml-1 font-sans">Dasbor Instansi</span>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end gap-5">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
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

            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors">
              <div className="text-right">
                <p className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{profil.namaLembaga}</p>
                <p className="text-slate-400 text-[11px] font-medium">{profil.tipe}</p>
              </div>
              <div className="w-9 h-9 bg-purple-700 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                {getInitials(profil.namaLembaga)}
              </div>
            </div>
          </div>
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
              <div className={`p-1.5 rounded-xl transition-all mb-1 ${isActive ? "bg-purple-100 text-purple-700" : "text-slate-400 group-hover:text-purple-500"}`}>
                <item.icon size={22} className={isActive ? "fill-purple-100/50" : ""} />
              </div>
              <span className={`text-[10px] font-bold transition-all ${isActive ? "text-purple-700" : "text-slate-500"} truncate px-1`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex-1 flex flex-col justify-center items-center h-full text-slate-400 group">
          <div className="p-1.5 rounded-xl transition-all mb-1 group-hover:text-purple-500">
            <Menu size={22} />
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
                    <div className="flex flex-col items-center justify-center gap-3 p-4 aspect-square bg-white border border-slate-200 shadow-sm rounded-2xl active:scale-95 transition-all hover:border-purple-300 hover:shadow-md">
                      <div className="p-4 bg-purple-50 text-purple-600 rounded-full">
                        <menu.icon size={28}/>
                      </div>
                      <span className="font-bold text-slate-700 text-sm text-center leading-tight">{menu.name}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                {/* UBAH MENJADI BUTTON LOGOUT */}
                <button onClick={handleLogout} className="w-full">
                  <div className="flex items-center justify-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-600 shadow-sm rounded-2xl active:scale-95 transition-transform">
                    <LogOut size={22} />
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