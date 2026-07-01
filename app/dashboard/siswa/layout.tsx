"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, MessageCircle, PenTool, BarChart, LogOut } from "lucide-react";

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Beranda", icon: LayoutDashboard, path: "/dashboard/siswa/beranda" },
    { name: "Ruang Kelas", icon: BookOpen, path: "/dashboard/siswa/ruang-kelas" },
    { name: "Asesmen Dinamis", icon: MessageCircle, path: "/dashboard/siswa/asesmen-dinamis" },
    { name: "Jurnal Refleksi", icon: PenTool, path: "/dashboard/siswa/jurnal-refleksi" },
    { name: "Raport AI", icon: BarChart, path: "/dashboard/siswa/raport" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-emerald-700">Ruang Siswa</h2>
          <p className="text-sm text-slate-500 mt-1">Pembelajaran Interaktif</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-emerald-50 text-emerald-700 font-semibold" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}>
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Link href="/login">
            <button className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full rounded-xl transition-all">
              <LogOut size={20} />
              <span className="font-semibold">Keluar</span>
            </button>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        {children}
      </main>
    </div>
  );
}