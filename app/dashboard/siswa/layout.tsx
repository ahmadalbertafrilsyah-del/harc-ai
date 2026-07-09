"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { 
  LayoutDashboard, BookOpen, MessageCircle, PenTool, BarChart, 
  LogOut, Bell, UserCircle, Settings, Clock, ChevronLeft, ChevronRight, GraduationCap,
  Sparkles
} from "lucide-react";
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // State UI
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [jam, setJam] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [notifCount, setNotifCount] = useState(0); // Bisa dihubungkan ke koleksi tugas nanti
  
  // State Profil Real-time
  const [profil, setProfil] = useState({
    namaLengkap: "Memuat...",
    kelas: "Siswa",
    poin: 0,
    fotoUrl: ""
  });

  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/siswa/beranda" },
    { name: "Ruang Kelas", icon: BookOpen, path: "/dashboard/siswa/ruang-kelas" },
    { name: "Asesmen", icon: MessageCircle, path: "/dashboard/siswa/asesmen-dinamis" },
    { name: "Jurnal Refleksi", icon: PenTool, path: "/dashboard/siswa/jurnal-refleksi" },
    { name: "Raport", icon: BarChart, path: "/dashboard/siswa/raport" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/siswa/pengaturan" },
  ];

  useEffect(() => {
    // 1. Waktu Real-time
    const updateTime = () => {
      const now = new Date();
      setJam(now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTanggal(now.toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    
    updateTime(); 
    const timer = setInterval(updateTime, 1000); 

    // 2. Data Firebase Siswa
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

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex ${latoFont.className}`}>
      
      {/* SIDEBAR DESKTOP */}
      <aside className={`hidden md:flex flex-col bg-[#064e3b] text-emerald-50 transition-all duration-300 z-50 border-r border-emerald-900 relative ${isSidebarCollapsed ? "w-[80px]" : "w-[240px]"}`}>
        
        {/* Tombol Lipat */}
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
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-16 md:pb-0">
        
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center w-full md:w-auto">
            {/* Gamifikasi Poin (Tampil di Desktop & Mobile) */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-amber-700">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-xs font-bold">{profil.poin} XP</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 md:gap-4 w-full md:w-auto">
            <div className="hidden md:flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Clock size={16} className="text-emerald-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] md:text-sm font-bold font-mono leading-none">{jam || "--.--.--"} WIB</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-medium mt-0.5">{tanggal || "Memuat..."}</span>
              </div>
            </div>

            <div className="relative">
              <button className="relative p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                <Bell size={18} />
                {notifCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
              </button>
            </div>

            <div className="hidden md:block w-px h-5 bg-slate-200 mx-1"></div>
            
            <Link href="/dashboard/siswa/pengaturan">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right hidden md:block">
                  <p className="font-bold text-slate-700 text-sm group-hover:text-emerald-700 transition-colors">{profil.namaLengkap}</p>
                  <p className="text-slate-400 text-[11px] font-medium">{profil.kelas}</p>
                </div>
                {profil.fotoUrl ? (
                  <img src={profil.fotoUrl} alt="Profil" className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 bg-emerald-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm group-hover:bg-emerald-600 transition-colors">
                    {getInitials(profil.namaLengkap)}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* BOTTOM NAVIGATION MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 z-50 flex justify-around items-center h-16 px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        {menuItems.slice(0, 5).map((item) => { // Hanya tampilkan 5 menu utama di mobile
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.name} href={item.path} className="flex-1 h-full flex flex-col justify-center items-center relative group">
              {isActive && <span className="absolute top-0 w-8 h-1 bg-emerald-600 rounded-b-full"></span>}
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-emerald-50 text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                <item.icon size={18} className={isActive ? "fill-emerald-100/50" : ""} />
              </div>
              <span className={`text-[8px] mt-0.5 font-bold transition-all ${isActive ? "text-emerald-700" : "text-slate-400"} truncate px-1`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}