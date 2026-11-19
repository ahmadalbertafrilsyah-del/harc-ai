"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, MessageSquare, Users, Activity, LogOut, Settings, Clock, 
  ChevronLeft, ChevronRight, ShieldCheck, Database,
  BrainCircuit, Menu, X, ScrollText, Coins
} from "lucide-react";

import { LogoBrand } from "@/components/Memuat";

import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [profil, setProfil] = useState({
    nama: "Memuat...",
    role: "Administrator Utama"
  });

  const menuItems = [
    { name: "Sistem Beranda", icon: LayoutDashboard, path: "/dashboard/admin/beranda" },
    { name: "Master Data", icon: Database, path: "/dashboard/admin/master-data" },
    { name: "Manajemen Pengguna", icon: Users, path: "/dashboard/admin/pengguna" },
    { name: "Korpus Standar", icon: ShieldCheck, path: "/dashboard/admin/korpus" },
    { name: "Konfigurasi AI", icon: BrainCircuit, path: "/dashboard/admin/konfigurasi-ai" },
    { name: "Komersialisasi Token", icon: Coins, path: "/dashboard/admin/token" },
    { name: "Monitoring AI", icon: Activity, path: "/dashboard/admin/monitoring" },
    { name: "Logs Aktivitas", icon: ScrollText, path: "/dashboard/admin/logs" },
    { name: "Pengaturan Chat Bot", icon: MessageSquare, path: "/dashboard/admin/pengaturan-bot" },
    { name: "Pengaturan Global", icon: Settings, path: "/dashboard/admin/pengaturan" },
  ];

  const bottomNavItems = [
    { name: "Sistem", icon: LayoutDashboard, path: "/dashboard/admin/beranda" },
    { name: "Pengguna", icon: Users, path: "/dashboard/admin/pengguna" },
    { name: "Korpus", icon: ShieldCheck, path: "/dashboard/admin/korpus" },
    { name: "Konfigurasi", icon: BrainCircuit, path: "/dashboard/admin/konfigurasi-ai" },
  ];

  const moreMenuItems = [
    { name: "Master Data", icon: Database, path: "/dashboard/admin/master-data" },
    { name: "Token", icon: Coins, path: "/dashboard/admin/token" },
    { name: "Monitoring AI", icon: Activity, path: "/dashboard/admin/monitoring" },
    { name: "Logs Aktivitas", icon: ScrollText, path: "/dashboard/admin/logs" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/admin/pengaturan" },
    { name: "Chat Bot", icon: MessageSquare, path: "/dashboard/admin/pengaturan-bot" },
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
              nama: data.nama || "Super Admin",
              role: "Administrator Utama"
            });
          }
        });
      }
    });

    return () => { clearInterval(timer); unsubscribeAuth(); unsubProfil?.(); };
  }, []);

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
    return "A";
  };

  const jam = currentTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, ".");
  const tanggal = currentTime.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={`fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#f8fafc] flex ${latoFont.className}`}>
      
      <aside className={`hidden md:flex flex-col bg-[#0f172a] text-slate-100 transition-all duration-300 z-40 border-r border-slate-800 relative shrink-0 ${isSidebarCollapsed ? "w-[74px]" : "md:w-[224px] lg:w-[248px]"}`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-[52px] bg-[#0f172a] border border-slate-700 text-slate-300 hover:text-white rounded-full w-6 h-6 flex items-center justify-center z-50 shadow-md transition-colors" aria-label="Toggle Sidebar">
          {isSidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        <div className={`h-16 flex items-center border-b border-slate-800 bg-[#020617] shrink-0 ${isSidebarCollapsed ? "justify-center px-2" : "justify-start px-5"}`}>
          <Link href="/dashboard/admin/beranda" className={`flex items-center gap-3 overflow-hidden w-full ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}>
            <LogoBrand size={38} className="border-white/25 shadow-md" />
            {!isSidebarCollapsed && (
              <div className="flex flex-col leading-none min-w-0">
                <span className={`text-base font-bold text-white tracking-wide truncate ${teachersFont.className}`}>HARC-AI</span>
                <span className="text-[11px] font-semibold text-indigo-300/90 truncate mt-0.5">Server Inti</span>
              </div>
            )}
          </Link>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-slate-400/80 uppercase tracking-widest mb-1.5 px-5 truncate">Kendali Sistem</div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""}>
                <div className={`flex items-center py-2.5 transition-all text-[13.5px] font-medium border-l-[3px] ${isActive ? "bg-indigo-900/60 text-white border-indigo-400 font-semibold" : "border-transparent text-slate-300/85 hover:bg-slate-800 hover:text-white"} ${isSidebarCollapsed ? "justify-center px-2" : "justify-start gap-3 px-5"}`}>
                  <item.icon size={19} className={`shrink-0 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 bg-[#020617] shrink-0">
          <button onClick={handleLogout} title={isSidebarCollapsed ? "Keluar Sistem" : ""} className={`flex items-center text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 w-full rounded-xl transition-all text-[13.5px] font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "justify-start gap-3 px-4 py-2.5"}`}>
            <LogOut size={19} className="shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Tutup Sesi</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="min-h-16 pt-safe bg-white/95 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 shadow-[0_1px_12px_-6px_rgba(15,23,42,0.18)]">
          <div className="flex items-center w-full md:w-auto py-2 md:py-0">
            <Link href="/dashboard/admin/monitoring" className="hidden md:flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-full text-indigo-700 transition-colors">
              <Activity size={14} className="text-indigo-600" />
              <span className="text-xs font-bold">Sistem Aktif</span>
            </Link>

            <div className="md:hidden flex items-center justify-between w-full gap-2">
              <Link href="/dashboard/admin/beranda" className="flex items-center gap-2.5 min-w-0">
                <LogoBrand size={38} />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[17px] font-extrabold text-slate-800 tracking-tight font-sans truncate">HARC-AI</span>
                  <span className="text-[10px] font-semibold text-slate-500 tracking-wide mt-0.5 truncate">Admin Inti</span>
                </div>
              </Link>
              <Link href="/dashboard/admin/pengaturan" className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 pl-2.5 pr-1 py-1 rounded-full shrink-0 active:scale-95 transition-transform">
                <span className="text-[11px] font-bold text-slate-700 max-w-[90px] truncate">{profil.nama}</span>
                <div className="w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  {getInitials(profil.nama)}
                </div>
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end gap-4 lg:gap-5">
            <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
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
            
            <Link href="/dashboard/admin/pengaturan" className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors">
              <div className="text-right">
                <p className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{profil.nama}</p>
                <p className="text-slate-400 text-[11px] font-medium">{profil.role}</p>
              </div>
              <div className="w-9 h-9 bg-slate-800 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                {getInitials(profil.nama)}
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
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link key={item.name} href={item.path} className="flex-1 min-w-0 flex flex-col justify-center items-center py-1.5 px-1 group">
              <div className={`p-1.5 rounded-xl transition-all mb-0.5 ${isActive ? "bg-indigo-100 text-indigo-700" : "text-slate-400 group-hover:text-indigo-500"}`}>
                <item.icon size={21} className={isActive ? "fill-indigo-100/50" : ""} />
              </div>
              <span className={`text-[10px] font-bold transition-all w-full text-center ${isActive ? "text-indigo-700" : "text-slate-500"} truncate`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex-1 min-w-0 flex flex-col justify-center items-center py-1.5 px-1 text-slate-400 group" aria-label="Buka Menu Lanjutan">
          <div className="p-1.5 rounded-xl transition-all mb-0.5 group-hover:text-indigo-500">
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
                  <span className="text-[10px] font-semibold text-slate-400">Admin Inti</span>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors" aria-label="Tutup Menu">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-safe">
              <div className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl mb-4 shadow-sm">
                <div className="w-11 h-11 bg-slate-800 text-white rounded-xl flex items-center justify-center text-sm font-bold shrink-0">
                  {getInitials(profil.nama)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm truncate">{profil.nama}</p>
                  <p className="text-xs text-slate-400 truncate">{profil.role}</p>
                </div>
              </div>

              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2.5">Kendali Lanjutan</div>
              <div className="grid grid-cols-2 gap-3">
                {moreMenuItems.map((menu, idx) => {
                  const isActive = pathname === menu.path || pathname.startsWith(menu.path + "/");
                  const isOddLast = moreMenuItems.length % 2 === 1 && idx === moreMenuItems.length - 1;
                  return (
                    <Link key={menu.name} href={menu.path} onClick={() => setIsMobileMenuOpen(false)} className={isOddLast ? "col-span-2" : ""}>
                      <div className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all ${isOddLast ? "flex-row" : "flex-col min-h-[96px]"} ${isActive ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200" : "bg-white border-slate-200 hover:border-indigo-300"}`}>
                        <div className={`p-2.5 rounded-full ${isActive ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"}`}>
                          <menu.icon size={22}/>
                        </div>
                        <span className={`font-bold text-xs sm:text-sm text-center leading-tight ${isActive ? "text-indigo-700" : "text-slate-700"}`}>{menu.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200 pb-4">
                <button onClick={handleLogout} className="w-full">
                  <div className="flex items-center justify-center gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-600 shadow-sm rounded-2xl active:scale-95 transition-transform">
                    <LogOut size={20} />
                    <span className="font-bold text-sm">Tutup Sesi (Logout)</span>
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