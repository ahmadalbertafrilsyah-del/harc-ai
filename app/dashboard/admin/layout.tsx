"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
// TAMBAHAN IKON: Calendar, BrainCircuit
import { LayoutDashboard, Users, Database, Activity, Settings, LogOut, ShieldCheck, Bell, ChevronLeft, ChevronRight, Clock, UserCog, Bot, Calendar, BrainCircuit } from "lucide-react";

import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingCount, setPendingCount] = useState(0);

  // UPDATE MENU ADMINISTRATOR
  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/admin/beranda" },
    { name: "Pengguna", icon: Users, path: "/dashboard/admin/pengguna" },
    { name: "Master Data", icon: Calendar, path: "/dashboard/admin/master-data" }, // Baru: Tahun Ajaran & Semester
    { name: "Korpus", icon: Database, path: "/dashboard/admin/korpus" },
    { name: "Prompt AI", icon: BrainCircuit, path: "/dashboard/admin/konfigurasi-ai" }, // Baru: Pengaturan Instruksi AI
    { name: "Asisten AI", icon: Bot, path: "/dashboard/admin/chat" },
    { name: "Monitoring", icon: Activity, path: "/dashboard/admin/monitoring" },
    { name: "Sistem Logs", icon: Activity, path: "/dashboard/admin/logs" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/admin/pengaturan" }
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const q = query(collection(db, "pengajuan_akun"), where("status", "==", "pending"));
    const unsub = onSnapshot(q, (snapshot) => setPendingCount(snapshot.size));
    return () => { clearInterval(timer); unsub(); };
  }, []);

  const jam = currentTime.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tanggal = currentTime.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex ${latoFont.className}`}>
      
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col bg-[#0c0a1f] text-slate-300 transition-all duration-300 z-50 border-r border-indigo-900/30 relative ${isSidebarCollapsed ? "w-[80px]" : "w-[260px]"}`}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-[#0c0a1f] border border-indigo-900/50 text-slate-400 hover:text-white rounded-full p-1 z-50 shadow-md transition-colors"
          aria-label={isSidebarCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} aria-hidden="true"/> : <ChevronLeft size={14} aria-hidden="true"/>}
        </button>

        <div className="h-16 flex items-center justify-center px-4 border-b border-indigo-900/40 bg-[#070514] shrink-0">
          <Link href="/dashboard/admin/beranda" className="flex items-center gap-2.5 overflow-hidden w-full justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" aria-hidden="true"/>
            {!isSidebarCollapsed && (
              <span className={`text-lg font-bold text-slate-100 tracking-wide truncate ${teachersFont.className}`}>HARC-AI</span>
            )}
          </Link>
        </div>
        
        {/* SEMANTIK A11Y: Menggunakan <nav> dengan aria-label */}
        <nav aria-label="Navigasi Utama Admin" className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-6 truncate" aria-hidden="true">Kontrol Utama</div>
          )}
          
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""} aria-current={isActive ? "page" : undefined}>
                <div className={`flex items-center px-6 py-3 transition-all text-sm font-medium border-l-[3px] ${
                  isActive 
                    ? "bg-indigo-900/40 text-white border-indigo-400" 
                    : "border-transparent text-slate-400 hover:bg-indigo-900/20 hover:text-slate-200"
                } ${isSidebarCollapsed ? "justify-center px-0" : "gap-3"}`}>
                  <item.icon size={20} className={`shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} aria-hidden="true"/>
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-900/40 bg-[#070514]">
          <Link href="/login" title={isSidebarCollapsed ? "Keluar Sistem" : ""}>
            <button className={`flex items-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 w-full rounded-lg transition-all text-sm font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5"}`}>
              <LogOut size={20} className="shrink-0" aria-hidden="true"/>
              {!isSidebarCollapsed && <span className="truncate">Keluar Sistem</span>}
            </button>
          </Link>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-16 md:pb-0">
        
        {/* HEADER ATAS */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center w-full md:w-auto">
            <div className="md:hidden flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Clock size={16} className="text-indigo-500 shrink-0" aria-hidden="true"/>
              <span className="text-[11px] font-bold font-mono leading-none">{jam}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 md:gap-4 w-full md:w-auto">
            <div className="hidden md:flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Clock size={16} className="text-indigo-500 shrink-0" aria-hidden="true"/>
              <div className="flex flex-col" aria-hidden="true">
                <span className="text-[11px] md:text-sm font-bold font-mono leading-none">{jam} WIB</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-medium mt-0.5">{tanggal}</span>
              </div>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowNotif(!showNotif)}
                aria-label={`Notifikasi. Ada ${pendingCount} pemberitahuan baru.`}
                className={`relative p-2 rounded-full transition-colors ${showNotif ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <Bell size={18} aria-hidden="true"/>
                {pendingCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
                )}
              </button>

              {showNotif && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)}></div>
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200/80 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800">Pemberitahuan</span>
                      {pendingCount > 0 && <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded-full">{pendingCount} Baru</span>}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {pendingCount > 0 ? (
                        <Link href="/dashboard/admin/pengguna" onClick={() => setShowNotif(false)}>
                          <div className="p-4 hover:bg-indigo-50/50 transition-colors cursor-pointer border-b border-slate-50">
                            <p className="text-sm font-bold text-slate-800 mb-1">Pengajuan Pendidik Baru</p>
                            <p className="text-xs text-slate-500">Terdapat {pendingCount} akun pendidik yang menunggu persetujuan Anda.</p>
                          </div>
                        </Link>
                      ) : (
                        <div className="p-6 text-center text-slate-400">
                          <Bell size={24} className="mx-auto mb-2 opacity-20" aria-hidden="true"/>
                          <p className="text-xs font-medium">Tidak ada pemberitahuan baru.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden md:block w-px h-5 bg-slate-200 mx-1"></div>
            
            <div className="flex items-center gap-3 group cursor-pointer" aria-label="Profil Super Admin">
              <div className="text-right hidden md:block">
                <p className="font-bold text-slate-700 text-sm">Super Admin</p>
                <p className="text-slate-400 text-[11px] font-medium">Sistem Utama</p>
              </div>
              <div className="w-8 h-8 bg-indigo-900 text-white rounded-md flex items-center justify-center shadow-sm">
                <UserCog size={16} aria-hidden="true"/>
              </div>
            </div>

            <Link href="/login" className="md:hidden flex items-center" aria-label="Keluar Sistem">
              <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                <LogOut size={18} aria-hidden="true"/>
              </button>
            </Link>

          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-[#f8fafc]">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV (Diperbarui agar bisa digeser horizontal karena item bertambah) */}
      <nav aria-label="Navigasi Mobile" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 z-50 flex items-center h-16 px-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe overflow-x-auto gap-2" style={{scrollbarWidth: 'none'}}>
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.name} href={item.path} className="flex-none min-w-[72px] h-full flex flex-col justify-center items-center relative group" aria-current={isActive ? "page" : undefined}>
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full"></span>
              )}
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                <item.icon size={20} className={isActive ? "fill-indigo-100/50" : ""} aria-hidden="true"/>
              </div>
              <span className={`text-[9px] mt-0.5 font-bold transition-all ${isActive ? "text-indigo-700" : "text-slate-400"} truncate px-1`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
      
    </div>
  );
}