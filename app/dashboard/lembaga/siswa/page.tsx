"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, GraduationCap, Mail, UserCheck, UserX } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ManajemenSiswaLembaga() {
  const [daftarSiswa, setDaftarSiswa] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [namaInstansi, setNamaInstansi] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const instansi = data.namaInstansi || data.instansi; // Prioritaskan namaInstansi
            setNamaInstansi(instansi);

            if (instansi) {
              const qSiswa = query(
                collection(db, "users"), 
                where("role", "==", "siswa"), 
                where("instansi", "==", instansi)
              );
              
              const unsubSiswa = onSnapshot(qSiswa, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setDaftarSiswa(data);
              });
              return () => unsubSiswa();
            }
          }
        });
        return () => unsubProfil();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const filteredSiswa = daftarSiswa.filter(siswa => 
    (siswa.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (siswa.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-16 px-4 md:px-6">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Data Siswa Terdaftar</h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Daftar seluruh peserta didik yang terasosiasi dengan <strong>{namaInstansi || "Lembaga Anda"}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-2.5 rounded-xl w-full md:w-72 shadow-sm">
          <Search size={16} className="text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau email siswa..." 
            className="bg-transparent border-none outline-none text-sm w-full font-medium text-slate-700" 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-4">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="px-6 py-4 whitespace-nowrap">Profil Siswa</th>
                <th className="px-6 py-4 whitespace-nowrap">Status Akun</th>
                <th className="px-6 py-4 whitespace-nowrap">Asal Instansi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredSiswa.length > 0 ? (
                  filteredSiswa.map((siswa) => (
                    <motion.tr 
                      key={siswa.id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 text-blue-700 font-bold rounded-lg flex items-center justify-center shrink-0">
                            {siswa.nama ? siswa.nama.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{siswa.nama}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={10}/> {siswa.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {siswa.status === 'Aktif' || !siswa.status ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-max">
                            <UserCheck size={12}/> Aktif
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 w-max">
                            <UserX size={12}/> Diblokir
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <p className="text-xs font-medium text-slate-600">{siswa.instansi}</p>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center text-slate-400">
                      <GraduationCap size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-sm text-slate-600">Tidak ada siswa ditemukan</p>
                      <p className="text-xs mt-1">Pastikan nama instansi di profil Anda dan profil siswa persis sama.</p>
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