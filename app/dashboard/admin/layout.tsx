"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, Database, Activity, Settings, 
  LogOut, ShieldCheck, Bell, ChevronLeft, ChevronRight, 
  Clock, UserCog, Bot, Calendar, BrainCircuit, Menu, X 
} from "lucide-react";

import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false); // State pelindung Hydration Error
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingCount, setPendingCount] = useState(0);

  // MENU LENGKAP (Tampil di Sidebar Desktop)
  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/admin/beranda" },
    { name: "Pengguna", icon: Users, path: "/dashboard/admin/pengguna" },
    { name: "Master Data", icon: Calendar, path: "/dashboard/admin/master-data" },
    { name: "Korpus", icon: Database, path: "/dashboard/admin/korpus" },
    { name: "Prompt AI", icon: BrainCircuit, path: "/dashboard/admin/konfigurasi-ai" },
    { name: "Asisten AI", icon: Bot, path: "/dashboard/admin/chat" },
    { name: "Monitoring", icon: Activity, path: "/dashboard/admin/monitoring" },
    { name: "Sistem Logs", icon: Activity, path: "/dashboard/admin/logs" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/admin/pengaturan" }
  ];

  // MENU BAWAH MOBILE (Bottom Navigation)
  const bottomNavItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/admin/beranda" },
    { name: "Asisten", icon: Bot, path: "/dashboard/admin/chat" },
    { name: "Monitor", icon: Activity, path: "/dashboard/admin/monitoring" },
    { name: "Setelan", icon: Settings, path: "/dashboard/admin/pengaturan" }
  ];

  // MENU SISA MOBILE (Tampil di dalam laci "Menu")
  const moreMenuItems = [
    { name: "Pengguna", icon: Users, path: "/dashboard/admin/pengguna" },
    { name: "Master Data", icon: Calendar, path: "/dashboard/admin/master-data" },
    { name: "Korpus Data", icon: Database, path: "/dashboard/admin/korpus" },
    { name: "Prompt AI", icon: BrainCircuit, path: "/dashboard/admin/konfigurasi-ai" },
    { name: "Sistem Logs", icon: Activity, path: "/dashboard/admin/logs" },
  ];

  useEffect(() => {
    setIsMounted(true); // Tandai bahwa komponen sudah aman di sisi Client
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const q = query(collection(db, "pengajuan_akun"), where("status", "==", "pending"));
    const unsub = onSnapshot(q, (snapshot) => setPendingCount(snapshot.size));
    return () => { clearInterval(timer); unsub(); };
  }, []);

  const jam = currentTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, ".");
  const tanggal = currentTime.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex ${latoFont.className}`}>
      
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col bg-[#0c0a1f] text-slate-300 transition-all duration-300 z-50 border-r border-indigo-900/30 relative ${isSidebarCollapsed ? "w-[80px]" : "w-[260px]"}`}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-[#0c0a1f] border border-indigo-900/50 text-slate-400 hover:text-white rounded-full p-1 z-50 shadow-md transition-colors"
        >
          {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={14} />}
        </button>

        <div className="h-16 flex items-center justify-center px-4 border-b border-indigo-900/40 bg-[#070514] shrink-0">
          <Link href="/dashboard/admin/beranda" className="flex items-center gap-2.5 overflow-hidden w-full justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" />
            {!isSidebarCollapsed && (
              <span className={`text-lg font-bold text-slate-100 tracking-wide truncate ${teachersFont.className}`}>HARC-AI</span>
            )}
          </Link>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-6 truncate">Kontrol Utama</div>
          )}
          
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""}>
                <div className={`flex items-center px-6 py-3 transition-all text-sm font-medium border-l-[3px] ${
                  isActive 
                    ? "bg-indigo-900/40 text-white border-indigo-400" 
                    : "border-transparent text-slate-400 hover:bg-indigo-900/20 hover:text-slate-200"
                } ${isSidebarCollapsed ? "justify-center px-0" : "gap-3"}`}>
                  <item.icon size={20} className={`shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-900/40 bg-[#070514]">
          <Link href="/login" title={isSidebarCollapsed ? "Keluar Sistem" : ""}>
            <button className={`flex items-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 w-full rounded-lg transition-all text-sm font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5"}`}>
              <LogOut size={20} className="shrink-0" />
              {!isSidebarCollapsed && <span className="truncate">Keluar Sistem</span>}
            </button>
          </Link>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* HEADER ATAS */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          
          <div className="flex items-center w-full md:w-auto">
            {/* Tampilan Mobile: Ikon App & Lonceng Sejajar */}
            <div className="md:hidden flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#4f46e5] rounded-xl flex items-center justify-center">
                  <ShieldCheck size={18} className="text-white" />
                </div>
                <span className="text-xl font-bold text-[#1e293b] tracking-wide ml-1 font-sans">Panel Admin</span>
              </div>
              
              {/* Lonceng Notifikasi Mobile */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotif(!showNotif)}
                  className={`relative p-2 rounded-full transition-colors ${showNotif ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Bell size={22} strokeWidth={2} />
                  {pendingCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Area Kanan Khusus Desktop */}
          <div className="hidden md:flex items-center justify-end gap-5">
            
            {/* Jam & Tanggal Desain Baru */}
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

            {/* Lonceng Notifikasi (Tampil di Desktop) */}
            <div className="relative">
              <button 
                onClick={() => setShowNotif(!showNotif)}
                className={`relative p-2.5 rounded-full transition-colors ${showNotif ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                <Bell size={22} strokeWidth={2} />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
                )}
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            
            {/* Profil Super Admin */}
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors">
              <div className="w-9 h-9 bg-indigo-900 text-white rounded-lg flex items-center justify-center shadow-sm">
                <UserCog size={18} />
              </div>
              <div className="text-left hidden lg:block">
                <p className="font-bold text-slate-800 text-sm leading-tight">Super Admin</p>
                <p className="text-slate-400 text-[11px] font-medium">Sistem Utama</p>
              </div>
            </div>
          </div>

          {/* Kotak Notifikasi Overlay (Berlaku Desktop & Mobile) */}
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
                    {pendingCount > 0 && <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded-full">{pendingCount} Baru</span>}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {pendingCount > 0 ? (
                      <Link href="/dashboard/admin/pengguna" onClick={() => setShowNotif(false)}>
                        <div className="p-4 hover:bg-indigo-50/50 transition-colors cursor-pointer border-b border-slate-50 flex gap-3 items-start">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0"></div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 mb-1">Pengajuan Pendidik Baru</p>
                            <p className="text-xs text-slate-500 leading-relaxed">Terdapat {pendingCount} akun pendidik yang menunggu persetujuan Anda.</p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="p-8 text-center text-slate-400">
                        <Bell size={28} className="mx-auto mb-3 opacity-20" />
                        <p className="text-xs font-bold text-slate-500">Kosong</p>
                        <p className="text-[10px] mt-1">Tidak ada pemberitahuan baru.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </header>

        {/* Kontainer Scroll utama, diberi padding bottom khusus mobile agar konten tidak tertutup Bottom Nav */}
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
                <item.icon size={22} className={isActive ? "fill-indigo-100" : ""} />
              </div>
              <span className={`text-[10px] font-bold transition-all ${isActive ? "text-indigo-700" : "text-slate-500"}`}>
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-4">Manajemen Lanjutan</div>
              
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
                <Link href="/login">
                  <div className="flex items-center justify-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-600 shadow-sm rounded-2xl active:scale-95 transition-transform">
                    <LogOut size={22} />
                    <span className="font-bold text-sm">Keluar Sistem</span>
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