"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, Activity, LogOut, Settings, Clock, 
  ChevronLeft, ChevronRight, Server, ShieldCheck, Database,
  BrainCircuit, Menu, X, ScrollText
} from "lucide-react";

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
    { name: "Monitoring AI", icon: Activity, path: "/dashboard/admin/monitoring" },
    { name: "Logs Aktivitas", icon: ScrollText, path: "/dashboard/admin/logs" },
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
    { name: "Monitoring AI", icon: Activity, path: "/dashboard/admin/monitoring" },
    { name: "Logs Aktivitas", icon: ScrollText, path: "/dashboard/admin/logs" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/admin/pengaturan" },
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
              nama: data.nama || "Super Admin",
              role: "Administrator Utama"
            });
          }
        });
        return () => unsubProfil();
      }
    });

    return () => { clearInterval(timer); unsubscribeAuth(); };
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
    <div className={`min-h-screen bg-[#f8fafc] flex ${latoFont.className}`}>
      
      <aside className={`hidden md:flex flex-col bg-[#0f172a] text-slate-100 transition-all duration-300 z-50 border-r border-slate-800 relative ${isSidebarCollapsed ? "w-[80px]" : "w-[240px]"}`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-20 bg-[#0f172a] border border-slate-700 text-slate-300 hover:text-white rounded-full p-1 z-50 shadow-md transition-colors">
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="h-16 flex items-center justify-center px-4 border-b border-slate-800 bg-[#020617] shrink-0">
          <Link href="/dashboard/admin/beranda" className="flex items-center gap-2.5 overflow-hidden w-full justify-center">
            <Server className="w-6 h-6 text-indigo-400 shrink-0" />
            {!isSidebarCollapsed && (
              <span className={`text-lg font-bold text-white tracking-wide truncate ${teachersFont.className}`}>Server Inti</span>
            )}
          </Link>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-6 truncate">Kendali Sistem</div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""}>
                <div className={`flex items-center px-6 py-3 transition-all text-sm font-medium border-l-[3px] ${isActive ? "bg-indigo-900/50 text-white border-indigo-400" : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"} ${isSidebarCollapsed ? "justify-center px-0" : "gap-3"}`}>
                  <item.icon size={20} className={`shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-[#020617]">
          <button onClick={handleLogout} title={isSidebarCollapsed ? "Keluar Sistem" : ""} className={`flex items-center text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 w-full rounded-lg transition-all text-sm font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5"}`}>
            <LogOut size={20} className="shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Tutup Sesi</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-[70px] md:pb-0 relative">
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center w-full md:w-auto">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Server size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold text-[#1e293b] tracking-wide ml-1 font-sans">Admin Inti</span>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end gap-5">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
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

            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors">
              <div className="text-right">
                <p className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{profil.nama}</p>
                <p className="text-slate-400 text-[11px] font-medium">{profil.role}</p>
              </div>
              <div className="w-9 h-9 bg-slate-800 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                {getInitials(profil.nama)}
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
              <div className={`p-1.5 rounded-xl transition-all mb-1 ${isActive ? "bg-indigo-100 text-indigo-700" : "text-slate-400 group-hover:text-indigo-500"}`}>
                <item.icon size={22} className={isActive ? "fill-indigo-100/50" : ""} />
              </div>
              <span className={`text-[10px] font-bold transition-all ${isActive ? "text-indigo-700" : "text-slate-500"} truncate px-1`}>
                {item.name}
              </span>
            </Link>
          );
        })}
        <button onClick={() => setIsMobileMenuOpen(true)} className="flex-1 flex flex-col justify-center items-center h-full text-slate-400 group">
          <div className="p-1.5 rounded-xl transition-all mb-1 group-hover:text-indigo-500">
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-4">Kendali Lanjutan</div>
              <div className="grid grid-cols-2 gap-4">
                {moreMenuItems.map((menu) => (
                  <Link key={menu.name} href={menu.path} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex flex-col items-center justify-center gap-3 p-4 aspect-square bg-white border border-slate-200 shadow-sm rounded-2xl active:scale-95 transition-all hover:border-indigo-300 hover:shadow-md">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
                        <menu.icon size={28}/>
                      </div>
                      <span className="font-bold text-slate-700 text-sm text-center leading-tight">{menu.name}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <button onClick={handleLogout} className="w-full">
                  <div className="flex items-center justify-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-600 shadow-sm rounded-2xl active:scale-95 transition-transform">
                    <LogOut size={22} />
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