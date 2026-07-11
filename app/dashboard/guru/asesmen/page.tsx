"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, FileSpreadsheet, FileQuestion, BarChart4, MessageSquareHeart, 
  BrainCircuit, Loader2, Plus, Sparkles, CheckCircle2, AlertCircle, Save, Download
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, FormEvent } from "react";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ModulAsesmenGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"generator" | "analisis" | "feedback">("generator");
  const [userUid, setUserUid] = useState<string | null>(null);
  
  // State Generator AI
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    mapel: "",
    kelas: "",
    kompetensiDasar: "",
    jenisSoal: "PG",
    jumlahSoal: 10
  });

  // Simulasi Hasil Generasi AI
  const [hasilAI, setHasilAI] = useState<any | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        // Di sini nantinya Anda bisa menarik daftar asesmen yang sudah pernah dibuat
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleGenerateAI = async (e: FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    // SIMULASI PROSES AI (Dalam skripsi nyata, di sinilah Anda memanggil API OpenAI/Gemini)
    setTimeout(() => {
      setHasilAI({
        kisiKisi: "1. Mengidentifikasi struktur teks (C2)\n2. Menganalisis makna tersirat (C4)\n3. Menyimpulkan isi paragraf (C5)",
        soalTeks: "Ini adalah simulasi hasil kartu soal dan rubrik jawaban yang disusun rapi oleh AI berdasarkan SKL, KI, KD, dan IPK yang dianalisis dari input Anda."
      });
      setIsGenerating(false);
    }, 3000);
  };

  const handleSimpanKeBankSoal = async () => {
    if (!userUid || !hasilAI) return;
    try {
      await addDoc(collection(db, "modul_ajar"), {
        userId: userUid, // ID Guru pembuat
        pembuat: "Guru", // Bisa diganti profil.namaLengkap jika ada state-nya
        mapel: formData.mapel,
        topik: formData.kompetensiDasar,
        tipe: formData.jenisSoal,
        kisiKisi: hasilAI.kisiKisi,
        soalTeks: hasilAI.soalTeks,
        statusValidasi: "menunggu", // Penting agar masuk ke antrean validasi Lembaga
        timestamp: serverTimestamp()
      });
      alert("Berhasil disimpan ke Bank Soal & masuk antrean validasi Kepala Sekolah!");
      setHasilAI(null); // Kosongkan layar setelah berhasil
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan dokumen ke database.");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500" role="status" aria-live="polite">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" aria-hidden="true" />
        <p className="font-bold text-lg">Memuat Modul AI Asesmen...</p>
      </div>
    );
  }

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-10">
      
      {/* Header Halaman */}
      <header className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`} tabIndex={0}>
            <Target className="text-blue-600" aria-hidden="true"/> Pusat Asesmen & Evaluasi
          </h1>
          <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Gunakan kecerdasan buatan untuk menganalisis IPK, menyusun kisi-kisi, membuat soal berstandar (HOTS), hingga memberikan *feedback* personal untuk siswa.
          </p>
        </div>
        <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 flex items-center gap-2 text-amber-700 text-xs font-bold w-fit shadow-sm" role="status">
          <BrainCircuit size={16} aria-hidden="true"/> AI Engine: Siap Digunakan
        </div>
      </header>

      {/* Tab Navigasi Aksesibel */}
      <nav aria-label="Menu Modul Asesmen" className="flex flex-wrap border-b border-slate-200" role="tablist">
        <button 
          role="tab" aria-selected={activeTab === "generator"} aria-controls="panel-generator"
          onClick={() => setActiveTab("generator")}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all focus:outline-none focus:bg-slate-50 ${activeTab === "generator" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
        >
          <Sparkles size={18} aria-hidden="true"/> 1. Generator Asesmen AI
        </button>
        <button 
          role="tab" aria-selected={activeTab === "analisis"} aria-controls="panel-analisis"
          onClick={() => setActiveTab("analisis")}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all focus:outline-none focus:bg-slate-50 ${activeTab === "analisis" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
        >
          <BarChart4 size={18} aria-hidden="true"/> 2. Analisis Butir Soal
        </button>
        <button 
          role="tab" aria-selected={activeTab === "feedback"} aria-controls="panel-feedback"
          onClick={() => setActiveTab("feedback")}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all focus:outline-none focus:bg-slate-50 ${activeTab === "feedback" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
        >
          <MessageSquareHeart size={18} aria-hidden="true"/> 3. Feedback Otomatis
        </button>
      </nav>

      {/* =========================================
          TAB 1: GENERATOR KISI-KISI & SOAL AI
      ========================================= */}
      {activeTab === "generator" && (
        <section id="panel-generator" role="tabpanel" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Kolom Kiri: Form Input AI */}
          <div className="lg:col-span-1 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileQuestion size={18} className="text-blue-600"/> Parameter AI
            </h2>
            <form onSubmit={handleGenerateAI} className="space-y-4">
              <div>
                <label htmlFor="mapel" className="block text-xs font-bold text-slate-600 mb-1.5">Mata Pelajaran</label>
                <input 
                  type="text" id="mapel" required placeholder="Cth: Bahasa Indonesia"
                  value={formData.mapel} onChange={e => setFormData({...formData, mapel: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="kd" className="block text-xs font-bold text-slate-600 mb-1.5">Kompetensi Dasar (KD) / Topik</label>
                <textarea 
                  id="kd" required rows={3} placeholder="Tuliskan KD yang ingin dianalisis IPK dan soalnya..."
                  value={formData.kompetensiDasar} onChange={e => setFormData({...formData, kompetensiDasar: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="jenis" className="block text-xs font-bold text-slate-600 mb-1.5">Jenis Ujian</label>
                  <select id="jenis" value={formData.jenisSoal} onChange={e => setFormData({...formData, jenisSoal: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none">
                    <option value="PG">Pilihan Ganda</option>
                    <option value="Uraian">Esai / Uraian</option>
                    <option value="Praktik">Keterampilan</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="jumlah" className="block text-xs font-bold text-slate-600 mb-1.5">Jumlah Soal</label>
                  <input type="number" id="jumlah" min="1" max="50" value={formData.jumlahSoal} onChange={e => setFormData({...formData, jumlahSoal: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none" />
                </div>
              </div>
              <button 
                type="submit" disabled={isGenerating}
                className="w-full mt-4 bg-slate-900 hover:bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                aria-label="Perintahkan AI untuk menyusun dokumen asesmen"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <BrainCircuit size={18} aria-hidden="true"/>}
                {isGenerating ? "AI Sedang Menganalisis..." : "Generate Dokumen AI"}
              </button>
            </form>
          </div>

          {/* Kolom Kanan: Hasil Generate AI */}
          <div className="lg:col-span-2 bg-slate-50 rounded-2xl shadow-inner border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
            {hasilAI ? (
              <div className="p-6 bg-white h-full overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Draf Dokumen Asesmen</h3>
                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-1"><CheckCircle2 size={14}/> Berhasil digenerate oleh AI</p>
                  </div>
                  <button onClick={handleSimpanKeBankSoal} className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 transition-colors"><Save size={14}/> Simpan ke Bank Soal </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 bg-slate-100 p-2 rounded-md mb-2">A. Analisis IPK & Kisi-kisi Soal</h4>
                    <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans border border-slate-100 p-3 rounded-xl bg-slate-50 leading-relaxed">
                      {hasilAI.kisiKisi}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 bg-slate-100 p-2 rounded-md mb-2">B. Kartu Soal & Rubrik Penilaian</h4>
                    <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans border border-slate-100 p-3 rounded-xl bg-slate-50 leading-relaxed">
                      {hasilAI.soalTeks}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center" aria-live="polite">
                <Sparkles size={48} className="mb-4 text-slate-300 animate-pulse"/>
                <p className="text-sm font-bold text-slate-600">Ruang Generasi Kosong</p>
                <p className="text-xs mt-2 max-w-sm">Isi parameter di sebelah kiri, lalu biarkan AI menganalisis Standar Kompetensi dan merakit soal HOTS beserta rubriknya secara otomatis untuk Anda.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =========================================
          TAB 2: ANALISIS BUTIR SOAL
      ========================================= */}
      {activeTab === "analisis" && (
        <section id="panel-analisis" role="tabpanel" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 mb-6">
            <BarChart4 className="text-blue-600 mt-0.5 shrink-0" size={20}/>
            <div>
              <h3 className="text-sm font-bold text-blue-900">Otomasi Analisis Item Ujian</h3>
              <p className="text-xs text-blue-700 mt-1">Setelah ujian CBT selesai, sistem otomatis menghitung Daya Pembeda, Tingkat Kesukaran, dan Validitas Butir Soal. Tidak perlu lagi menghitung manual di Excel.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Tabel Analisis Kesukaran dan Daya Pembeda Soal</caption>
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-bold border-y border-slate-200">
                  <th scope="col" className="p-4 text-center">No Soal</th>
                  <th scope="col" className="p-4">Tingkat Kesukaran</th>
                  <th scope="col" className="p-4">Daya Pembeda</th>
                  <th scope="col" className="p-4">Status / Rekomendasi AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Data statis sementara untuk UI R&D */}
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center font-bold text-slate-600">1</td>
                  <td className="p-4"><span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">0.75 (Mudah)</span></td>
                  <td className="p-4"><span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">0.25 (Cukup)</span></td>
                  <td className="p-4 text-xs font-medium text-slate-600">Revisi pengecoh (distraktor).</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center font-bold text-slate-600">2</td>
                  <td className="p-4"><span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">0.45 (Sedang)</span></td>
                  <td className="p-4"><span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">0.50 (Baik)</span></td>
                  <td className="p-4 text-xs font-medium text-slate-600">Soal valid dan reliabel. Simpan di bank soal.</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center font-bold text-slate-600">3</td>
                  <td className="p-4"><span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">0.15 (Sukar)</span></td>
                  <td className="p-4"><span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">0.10 (Buruk)</span></td>
                  <td className="p-4 text-xs font-medium text-rose-600 font-bold">Soal terlalu sulit dan menyesatkan. Harus diganti.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================
          TAB 3: FEEDBACK OTOMATIS (AI NARATIF)
      ========================================= */}
      {activeTab === "feedback" && (
        <section id="panel-feedback" role="tabpanel" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-4 border-r border-slate-100 pr-0 md:pr-6">
            <h3 className="text-sm font-bold text-slate-800">Daftar Siswa</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-3 rounded-xl bg-blue-50 border border-blue-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400">
                <p className="text-sm font-bold text-blue-900">Ahmad Maulana</p>
                <p className="text-xs text-blue-700">Nilai: 85 (Di atas KKM)</p>
              </button>
              <button className="w-full text-left p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400">
                <p className="text-sm font-bold text-slate-700">Siti Nurhaliza</p>
                <p className="text-xs text-rose-600">Nilai: 60 (Remedial)</p>
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-2/3">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MessageSquareHeart size={18} className="text-rose-500"/> Narasi Deskripsi Raport (AI)
              </h3>
              <button className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5" aria-label="Unduh PDF">
                <Download size={14}/> Unduh PDF
              </button>
            </div>
            
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-sm text-slate-700 leading-relaxed italic mb-4">
                "Ananda Ahmad Maulana telah menunjukkan pemahaman yang sangat baik dalam mengidentifikasi struktur teks observasi. Kemampuan analisisnya menonjol pada soal nomor 4 dan 5. Namun, Ananda perlu sedikit meningkatkan ketelitian dalam menyimpulkan makna tersirat (soal nomor 2). Secara keseluruhan, capaian belajarnya sangat memuaskan."
              </p>
              <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center"><BrainCircuit size={12}/></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dibuat otomatis oleh AI HARC</p>
              </div>
            </div>
          </div>
        </section>
      )}

    </motion.main>
  );
}