"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Key, Plus, Loader2, Users, CheckCircle2 } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, doc, getDocs, updateDoc, arrayUnion, increment } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function RuangKelasSiswa() {
  const [isLoading, setIsLoading] = useState(true);
  const [kelasSaya, setKelasSaya] = useState<any[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);

  // State Gabung Kelas
  const [kodeKelas, setKodeKelas] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        // Tarik real-time kelas dimana array 'peserta' berisi UID siswa ini
        const qKelas = query(collection(db, "manajemen_kelas"), where("peserta", "array-contains", user.uid));
        const unsubKelas = onSnapshot(qKelas, (snapshot) => {
          setKelasSaya(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        });
        return () => unsubKelas();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleGabungKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeKelas || !userUid) return;
    setIsJoining(true);

    try {
      // 1. Cari kelas dengan kode tersebut
      const qCari = query(collection(db, "manajemen_kelas"), where("kode", "==", kodeKelas));
      const querySnapshot = await getDocs(qCari);

      if (querySnapshot.empty) {
        alert("Kode kelas tidak ditemukan. Silakan periksa kembali.");
        setIsJoining(false);
        return;
      }

      const kelasDoc = querySnapshot.docs[0];
      const kelasData = kelasDoc.data();

      // 2. Cek apakah sudah bergabung
      if (kelasData.peserta && kelasData.peserta.includes(userUid)) {
        alert("Anda sudah bergabung di kelas ini!");
        setKodeKelas("");
        setIsJoining(false);
        return;
      }

      // 3. Masukkan siswa ke dalam kelas
      await updateDoc(doc(db, "manajemen_kelas", kelasDoc.id), {
        peserta: arrayUnion(userUid),
        siswa: increment(1) // Tambah jumlah siswa
      });

      alert(`Berhasil bergabung ke kelas ${kelasData.nama}!`);
      setKodeKelas("");
    } catch (error) {
      console.error("Gagal gabung:", error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-emerald-600" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-10">
      
      <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 ${teachersFont.className}`}>Ruang Kelas Saya</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-lg">
            Daftar kelas yang Anda ikuti. Masukkan kode dari guru untuk bergabung ke kelas baru.
          </p>
        </div>
        
        {/* Form Gabung Kelas */}
        <form onSubmit={handleGabungKelas} className="flex items-center w-full md:w-auto bg-white p-1.5 rounded-xl border border-slate-300 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
          <div className="pl-3 pr-2 text-slate-400"><Key size={18} /></div>
          <input 
            type="text" 
            placeholder="Masukkan Kode Kelas..." 
            value={kodeKelas}
            onChange={(e) => setKodeKelas(e.target.value.toUpperCase())}
            required
            maxLength={6}
            className="w-full md:w-48 bg-transparent border-none outline-none text-sm font-bold font-mono tracking-widest text-slate-700 placeholder:tracking-normal placeholder:font-sans"
          />
          <button type="submit" disabled={isJoining} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-70">
            {isJoining ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Gabung
          </button>
        </form>
      </div>

      <AnimatePresence>
        {kelasSaya.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kelasSaya.map((kelas) => (
              <motion.div key={kelas.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <div className="h-24 bg-gradient-to-r from-emerald-600 to-teal-800 p-5 flex flex-col justify-end relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <h3 className={`text-xl font-bold text-white relative z-10 ${teachersFont.className}`}>{kelas.nama}</h3>
                </div>
                <div className="p-5 relative">
                  <div className="absolute -top-6 right-5 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 text-emerald-600">
                    <BookOpen size={20}/>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{kelas.mapel}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Users size={14}/> {kelas.siswa} Teman Sekelas</p>
                  
                  <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1"><CheckCircle2 size={12}/> Terdaftar</span>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">Buka Materi &rarr;</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="font-bold text-slate-700">Belum Ada Kelas</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Anda belum bergabung ke kelas manapun. Mintalah kode akses (6 digit) kepada guru Anda untuk mulai belajar.</p>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}