"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Teachers, Lato } from "next/font/google";
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  Activity, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  Search,
  Bell
} from "lucide-react";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const latoFont = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], display: "swap" });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { name: "Ikhtisar Sistem", icon: LayoutDashboard, path: "/dashboard/admin/beranda" },
    { name: "Manajemen Pengguna", icon: Users, path: "/dashboard/admin/pengguna" },
    { name: "Korpus & Standar", icon: Database, path: "/dashboard/admin/korpus" },
    { name: "Monitoring AI & Token", icon: Activity, path: "/dashboard/admin/monitoring" },
    { name: "Pengaturan Global", icon: Settings, path: "/dashboard/admin/pengaturan" },
  ];

  return (
    <div className={`min-h-screen bg-[#f8fafc] flex ${latoFont.className}`}>
      
      {/* SIDEBAR ADMIN (Tema Indigo Gelap) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#0c0a1f] text-slate-300 flex flex-col transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative border-r border-indigo-900/30`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-indigo-900/40 bg-[#070514]">
          <Link href="/dashboard/admin/beranda" className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <div>
              <span className={`text-lg font-bold text-slate-100 tracking-wide ${teachersFont.className}`}>Admin Portal</span>
            </div>
          </Link>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-6">Kontrol Utama</div>
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link key={item.name} href={item.path} onClick={() => setIsSidebarOpen(false)}>
                <div className={`flex items-center gap-3 px-6 py-3 transition-all text-sm font-medium border-l-[3px] ${
                  isActive 
                    ? "bg-indigo-900/40 text-white border-indigo-400" 
                    : "border-transparent text-slate-400 hover:bg-indigo-900/20 hover:text-slate-200"
                }`}>
                  <item.icon size={18} className={isActive ? "text-indigo-400" : "text-slate-500"} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-900/40 bg-[#070514]">
          <Link href="/login">
            <button className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 w-full rounded-lg transition-all text-sm font-medium">
              <LogOut size={18} />
              <span>Keluar Sistem</span>
            </button>
          </Link>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-md w-64 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <Search size={16} className="text-slate-400" />
              <input type="text" placeholder="Cari guru, log sistem..." className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative text-slate-500 hover:text-slate-700 transition-colors">
              <Bell size={18} />
            </button>
            <div className="w-px h-5 bg-slate-200"></div>
            
            <div className="flex items-center gap-3 group">
              <div className="text-right hidden md:block">
                <p className="font-bold text-slate-700 text-sm">Super Admin</p>
                <p className="text-slate-400 text-[11px] font-medium">Sistem Utama</p>
              </div>
              <div className="w-8 h-8 bg-indigo-900 text-white rounded-md flex items-center justify-center text-xs font-bold shadow-sm">
                SA
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}