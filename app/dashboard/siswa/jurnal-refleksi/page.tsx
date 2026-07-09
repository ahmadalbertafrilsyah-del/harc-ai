"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PenTool, Save, Loader2, Calendar } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function JurnalRefleksi() {
  const [jurnal, setJurnal] = useState("");
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      const q = query(collection(db, "jurnal_siswa"), where("userId", "==", auth.currentUser.uid), orderBy("timestamp", "desc"));
      return onSnapshot(q, (snap) => setRiwayat(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
  }, []);

  const handleSimpan = async () => {
    if (!jurnal) return;
    setIsSaving(true);
    const auth = getAuth();
    await addDoc(collection(db, "jurnal_siswa"), {
      userId: auth.currentUser?.uid,
      isi: jurnal,
      timestamp: serverTimestamp()
    });
    setJurnal("");
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2"><PenTool className="text-emerald-600"/> Jurnal Harian</h2>
        <textarea 
          value={jurnal} onChange={(e) => setJurnal(e.target.value)}
          placeholder="Apa yang kamu pelajari hari ini? Apa kesulitanmu?"
          className="w-full h-40 p-4 bg-slate-50 border rounded-xl mb-4 outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <button onClick={handleSimpan} disabled={isSaving} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
          {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Simpan Refleksi
        </button>
      </div>

      <div className="space-y-4">
        {riwayat.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-700">{item.isi}</p>
            <p className="text-[10px] text-slate-400 mt-2">{item.timestamp?.toDate().toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}