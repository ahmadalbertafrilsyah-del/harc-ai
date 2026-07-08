"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Coins, Activity, Mail } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenGuruLembaga() {
  const [daftarGuru, setDaftarGuru] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [namaInstansi, setNamaInstansi] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const npsn = data.npsn || data.instansi; // Kunci Relasi (NPSN)
            setNamaInstansi(data.namaLembaga || data.namaInstansi || `NPSN: ${npsn}`); 

            if (npsn) {
              // Tarik data guru berbasis NPSN
              const qGuru = query(
                collection(db, "users"), 
                where("role", "==", "guru"), 
                where("npsn", "==", npsn) 
              );
              
              const unsubGuru = onSnapshot(qGuru, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setDaftarGuru(data);
              });
              return () => unsubGuru();
            }
          }
        });
        return () => unsubProfil();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const filteredGuru = daftarGuru.filter(guru => 
    (guru.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (guru.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-16 px-4 md:px-6">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Data Pendidik</h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Daftar seluruh guru yang bernaung di bawah instansi <strong>{namaInstansi}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-2.5 rounded-xl w-full md:w-72 shadow-sm">
          <Search size={16} className="text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau email..." 
            className="bg-transparent border-none outline-none text-sm w-full font-medium text-slate-700" 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-4">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="px-6 py-4 whitespace-nowrap">Profil Pendidik</th>
                <th className="px-6 py-4 whitespace-nowrap">Status Akun</th>
                <th className="px-6 py-4 whitespace-nowrap">Sisa Token AI</th>
                <th className="px-6 py-4 whitespace-nowrap">Aktivitas Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredGuru.length > 0 ? (
                  filteredGuru.map((guru) => (
                    <motion.tr 
                      key={guru.id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 text-purple-700 font-bold rounded-lg flex items-center justify-center shrink-0">
                            {guru.nama ? guru.nama.charAt(0).toUpperCase() : "G"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{guru.nama}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={10}/> {guru.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                          guru.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {guru.status || 'Aktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm">
                          <Coins size={14}/> {(guru.aiTokens || 0).toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5"><Activity size={12} className="text-blue-500"/> Terhubung</p>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                      <Users size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-sm text-slate-600">Tidak ada guru ditemukan</p>
                      <p className="text-xs mt-1">Belum ada guru yang mendaftar menggunakan NPSN yang sama dengan lembaga Anda.</p>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}