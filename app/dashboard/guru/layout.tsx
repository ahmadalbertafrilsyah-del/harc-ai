"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Teachers, Lato } from "next/font/google";
import { LayoutDashboard, Users, CheckCircle, BarChart3, LogOut, GraduationCap, Bell, BookOpen, UserCircle, Settings, Clock, ChevronLeft, ChevronRight, Bot, Target, CalendarDays, FileSpreadsheet } from "lucide-react";
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, doc } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [jam, setJam] = useState("");
  const [tanggal, setTanggal] = useState("");
  
  const [showNotif, setShowNotif] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  
  const [profil, setProfil] = useState({
    namaLengkap: "Memuat...",
    spesialisasi: "Pendidik",
    fotoUrl: ""
  });

  // MENU GURU (Isian dibiarkan utuh sesuai yang Anda tambahkan manual)
  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/guru/beranda" },
    { name: "Profil", icon: Users, path: "/dashboard/guru/profil" },
    { name: "Kelas & Siswa", icon: Users, path: "/dashboard/guru/kelas" }, 
    { name: "Jurnal & Absensi", icon: CalendarDays, path: "/dashboard/guru/administrasi" },
    { name: "Perangkat Ajar", icon: BookOpen, path: "/dashboard/guru/generator" },
    { name: "Asesmen & Ujian", icon: Target, path: "/dashboard/guru/asesmen" },
    { name: "Rekap Nilai", icon: FileSpreadsheet, path: "/dashboard/guru/rekap-nilai" },
    { name: "Chat AI", icon: Bot, path: "/dashboard/guru/chat" },
    { name: "Validasi", icon: CheckCircle, path: "/dashboard/guru/validasi" },
    { name: "Analitik", icon: BarChart3, path: "/dashboard/guru/analitik" },
    { name: "Pengaturan", icon: Settings, path: "/dashboard/guru/pengaturan" },
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

  return (
    // PERBAIKAN 1: Mengunci root div menjadi h-screen overflow-hidden
    <div className={`h-screen bg-[#f8fafc] flex overflow-hidden ${latoFont.className}`}>
      
      {/* PERBAIKAN 2: Menambahkan h-screen pada <aside> */}
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
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-6 truncate" aria-hidden="true">Menu Sistem AI</div>
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

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-16 md:pb-0">
        
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
          <div className="flex items-center w-full md:w-auto">
            <div className="md:hidden flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Clock size={16} className="text-blue-500 shrink-0" aria-hidden="true"/>
              <span className="text-[11px] font-bold font-mono leading-none" suppressHydrationWarning>{jam || "--.--.--"}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 md:gap-4 w-full md:w-auto">
            <div className="hidden md:flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Clock size={16} className="text-blue-500 shrink-0" aria-hidden="true"/>
              <div className="flex flex-col" aria-hidden="true">
                <span className="text-[11px] md:text-sm font-bold font-mono leading-none" suppressHydrationWarning>{jam || "--.--.--"} WIB</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-medium mt-0.5" suppressHydrationWarning>{tanggal || "Memuat..."}</span>
              </div>
            </div>

            <div className="relative">
              <button onClick={() => setShowNotif(!showNotif)} aria-label="Notifikasi Validasi" className={`relative p-2 rounded-full transition-colors ${showNotif ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                <Bell size={18} aria-hidden="true"/>
                {notifCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}
              </button>
            </div>

            <div className="hidden md:block w-px h-5 bg-slate-200 mx-1"></div>
            
            <Link href="/dashboard/guru/profil" aria-label="Profil Guru">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right hidden md:block">
                  <p className="font-bold text-slate-700 text-sm group-hover:text-blue-700 transition-colors">{profil.namaLengkap}</p>
                  <p className="text-slate-400 text-[11px] font-medium">{profil.spesialisasi}</p>
                </div>
                {profil.fotoUrl ? (
                  <img src={profil.fotoUrl} alt="Profil" className="w-8 h-8 rounded-md object-cover shadow-sm border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 bg-blue-900 text-white rounded-md flex items-center justify-center text-xs font-bold shadow-sm group-hover:bg-blue-800 transition-colors" aria-hidden="true">
                    {getInitials(profil.namaLengkap)}
                  </div>
                )}
              </div>
            </Link>

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

      <nav aria-label="Navigasi Mobile" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 z-50 flex items-center h-16 px-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe overflow-x-auto gap-2" style={{scrollbarWidth: 'none'}}>
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.name} href={item.path} className="flex-none min-w-[72px] h-full flex flex-col justify-center items-center relative group" aria-current={isActive ? "page" : undefined}>
              {isActive && <span className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"></span>}
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-blue-50 text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                <item.icon size={20} className={isActive ? "fill-blue-100/50" : ""} aria-hidden="true"/>
              </div>
              <span className={`text-[9px] mt-0.5 font-bold transition-all ${isActive ? "text-blue-700" : "text-slate-400"} truncate px-1`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}