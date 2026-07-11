"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
// TAMBAHAN IKON: ClipboardCheck, FileSpreadsheet
import { 
  LayoutDashboard, Users, BarChart3, LogOut, GraduationCap, 
  BookOpen, Settings, Clock, ChevronLeft, ChevronRight, Landmark,
  ClipboardCheck, FileSpreadsheet 
} from "lucide-react";
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function LembagaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [jam, setJam] = useState("");
  const [tanggal, setTanggal] = useState("");
  
  const [profil, setProfil] = useState({
    namaLembaga: "Memuat...",
    tipe: "Lembaga Pendidikan",
  });

  // UPDATE MENU LEMBAGA
  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/lembaga/beranda" },
    { name: "Data Guru", icon: Users, path: "/dashboard/lembaga/guru" },
    { name: "Data Siswa", icon: GraduationCap, path: "/dashboard/lembaga/siswa" },
    { name: "Supervisi KBM", icon: ClipboardCheck, path: "/dashboard/lembaga/supervisi" }, // Baru: Memantau Jurnal & Absen
    { name: "Validasi Asesmen", icon: FileSpreadsheet, path: "/dashboard/lembaga/validasi-asesmen" }, // Baru: Validasi Kisi-kisi/Soal
    { name: "Bahan Ajar", icon: BookOpen, path: "/dashboard/lembaga/bahan-ajar" },
    { name: "Analitik", icon: BarChart3, path: "/dashboard/lembaga/analitik" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/lembaga/pengaturan" },
  ];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setJam(now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTanggal(now.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    
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

  const getInitials = (name: string) => {
    if (name === "Memuat...") return "...";
    const words = name.trim().split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    if (words.length === 1 && words[0]) return words[0][0].toUpperCase();
    return "L";
  };

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex ${latoFont.className}`}>
      
      {/* SIDEBAR LEMBAGA */}
      <aside className={`hidden md:flex flex-col bg-[#2e1065] text-purple-100 transition-all duration-300 z-50 border-r border-purple-900 relative ${isSidebarCollapsed ? "w-[80px]" : "w-[240px]"}`}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-[#2e1065] border border-purple-800 text-purple-300 hover:text-white rounded-full p-1 z-50 shadow-md transition-colors"
          aria-label={isSidebarCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} aria-hidden="true"/> : <ChevronLeft size={14} aria-hidden="true"/>}
        </button>

        <div className="h-16 flex items-center justify-center px-4 border-b border-purple-900/60 bg-[#1e0a43] shrink-0">
          <Link href="/dashboard/lembaga/beranda" className="flex items-center gap-2.5 overflow-hidden w-full justify-center">
            <Landmark className="w-6 h-6 text-purple-400 shrink-0" aria-hidden="true"/>
            {!isSidebarCollapsed && (
              <span className={`text-lg font-bold text-white tracking-wide truncate ${teachersFont.className}`}>Portal Lembaga</span>
            )}
          </Link>
        </div>
        
        {/* SEMANTIK A11Y */}
        <nav aria-label="Navigasi Utama Lembaga" className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!isSidebarCollapsed && (
            <div className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest mb-2 px-6 truncate" aria-hidden="true">Manajemen Sekolah</div>
          )}
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} title={isSidebarCollapsed ? item.name : ""} aria-current={isActive ? "page" : undefined}>
                <div className={`flex items-center px-6 py-3 transition-all text-sm font-medium border-l-[3px] ${
                  isActive 
                    ? "bg-purple-900/50 text-white border-purple-400" 
                    : "border-transparent text-purple-300 hover:bg-purple-900/30 hover:text-purple-100"
                } ${isSidebarCollapsed ? "justify-center px-0" : "gap-3"}`}>
                  <item.icon size={20} className={`shrink-0 ${isActive ? "text-purple-400" : "text-purple-400/60"}`} aria-hidden="true"/>
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-purple-900/60 bg-[#1e0a43]">
          <Link href="/login" title={isSidebarCollapsed ? "Keluar Sistem" : ""}>
            <button className={`flex items-center text-purple-300 hover:bg-rose-500/20 hover:text-rose-300 w-full rounded-lg transition-all text-sm font-medium ${isSidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-4 py-2.5"}`}>
              <LogOut size={20} className="shrink-0" aria-hidden="true"/>
              {!isSidebarCollapsed && <span className="truncate">Keluar Akun</span>}
            </button>
          </Link>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-16 md:pb-0">
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center w-full md:w-auto">
            <div className="md:hidden flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Clock size={16} className="text-purple-500 shrink-0" aria-hidden="true"/>
              <span className="text-[11px] font-bold font-mono leading-none" suppressHydrationWarning>{jam || "--.--.--"}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 md:gap-4 w-full md:w-auto">
            <div className="hidden md:flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Clock size={16} className="text-purple-500 shrink-0" aria-hidden="true"/>
              <div className="flex flex-col" aria-hidden="true">
                <span className="text-[11px] md:text-sm font-bold font-mono leading-none" suppressHydrationWarning>{jam || "--.--.--"} WIB</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-medium mt-0.5" suppressHydrationWarning>{tanggal || "Memuat..."}</span>
              </div>
            </div>

            <div className="hidden md:block w-px h-5 bg-slate-200 mx-1"></div>
            
            <div className="flex items-center gap-3 group" aria-label="Profil Lembaga">
              <div className="text-right hidden md:block">
                <p className="font-bold text-slate-700 text-sm">{profil.namaLembaga}</p>
                <p className="text-slate-400 text-[11px] font-medium">{profil.tipe}</p>
              </div>
              <div className="w-8 h-8 bg-purple-700 text-white rounded-md flex items-center justify-center text-xs font-bold shadow-sm" aria-hidden="true">
                {getInitials(profil.namaLembaga)}
              </div>
            </div>

            <Link href="/login" className="md:hidden flex items-center" aria-label="Keluar Sistem">
              <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                <LogOut size={18} aria-hidden="true"/>
              </button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV (Diperbarui agar bisa digeser horizontal karena item bertambah) */}
      <nav aria-label="Navigasi Mobile" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 z-50 flex items-center h-16 px-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe overflow-x-auto gap-2" style={{scrollbarWidth: 'none'}}>
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.name} href={item.path} className="flex-none min-w-[72px] h-full flex flex-col justify-center items-center relative group" aria-current={isActive ? "page" : undefined}>
              {isActive && <span className="absolute top-0 w-8 h-1 bg-purple-600 rounded-b-full"></span>}
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-purple-50 text-purple-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                <item.icon size={20} className={isActive ? "fill-purple-100/50" : ""} aria-hidden="true"/>
              </div>
              <span className={`text-[9px] mt-0.5 font-bold transition-all ${isActive ? "text-purple-700" : "text-slate-400"} truncate px-1`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}