"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, FileQuestion, BarChart4, MessageSquareHeart, 
  BrainCircuit, Loader2, Sparkles, CheckCircle2, Save, Globe, ListOrdered
} from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, FormEvent } from "react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function ModulAsesmenGuru() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"generator" | "analisis" | "feedback">("generator");
  const [userUid, setUserUid] = useState<string | null>(null);
  
  // === STATE GENERATOR AI CBT ===
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    mapel: "",
    fase: "",
    kelas: "",
    kompetensiDasar: "",
    jenisUjian: "Ulangan Harian",
    tingkatKesulitan: "Campuran (Proporsional)",
    dimensiXAI: ["Linguistik", "Sosiolinguistik", "Budaya"] 
  });

  // Komposisi Soal
  const [opsiPG, setOpsiPG] = useState("A - D (4 Opsi)");
  const [jmlPG, setJmlPG] = useState("10"); 
  const [jmlBenarSalah, setJmlBenarSalah] = useState("0"); 
  const [jmlMenjodohkan, setJmlMenjodohkan] = useState("0"); 
  const [jmlIsianSingkat, setJmlIsianSingkat] = useState("0"); 
  const [jmlUraian, setJmlUraian] = useState("5"); 

  const [hasilAI, setHasilAI] = useState<any | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) { setUserUid(user.uid); setIsLoading(false); } 
      else { window.location.href = "/login"; }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleToggleDimensi = (dimensi: string) => {
    setFormData(prev => {
      const isSelected = prev.dimensiXAI.includes(dimensi);
      if (isSelected) return { ...prev, dimensiXAI: prev.dimensiXAI.filter(d => d !== dimensi) };
      return { ...prev, dimensiXAI: [...prev.dimensiXAI, dimensi] };
    });
  };

  const handleGenerateAI = async (e: FormEvent) => {
    e.preventDefault();
    if (!userUid) return;
    if (formData.dimensiXAI.length === 0) return alert("Pilih minimal satu dimensi [x-AI] untuk diujikan.");
    setIsGenerating(true);
    
    // MENYUSUN PROMPT KOMPLEKS UNTUK CBT & KISI-KISI
    let instruksiDimensi = formData.dimensiXAI.map(d => {
      if (d === "Linguistik") return "- Linguistik: Ketepatan makna, kosakata, dan struktur kalimat.";
      if (d === "Sosiolinguistik") return "- Sosiolinguistik: Kesesuaian tingkat tutur (Ngoko/Krama), sapaan, dan konteks sosial.";
      if (d === "Budaya") return "- Budaya: Interpretasi budaya lokal, sejarah, atau makna filosofis peribahasa setempat.";
      return "";
    }).join("\n");

    let systemPrompt = `Anda adalah Evaluator Akademik Ahli di Indonesia. 
    Buatlah INSTRUMEN ASESMEN & KISI-KISI resmi menggunakan format Markdown akademis baku dan tabel bergaris yang sangat formal.\n\n`;
    
    systemPrompt += `IDENTITAS UJIAN:\n- Jenis Ujian: ${formData.jenisUjian}\n- Mata Pelajaran: ${formData.mapel}\n- Fase/Kelas: ${formData.fase}/${formData.kelas}\n- Materi/Topik: ${formData.kompetensiDasar}\n- Tingkat Kesukaran: ${formData.tingkatKesulitan}\n\n`;
    
    systemPrompt += `KOMPOSISI SOAL:\n`;
    if (Number(jmlPG) > 0) systemPrompt += `- Pilihan Ganda (Opsi ${opsiPG}): ${jmlPG} butir.\n`;
    if (Number(jmlBenarSalah) > 0) systemPrompt += `- Benar/Salah: ${jmlBenarSalah} butir.\n`;
    if (Number(jmlMenjodohkan) > 0) systemPrompt += `- Menjodohkan: ${jmlMenjodohkan} butir.\n`;
    if (Number(jmlIsianSingkat) > 0) systemPrompt += `- Isian Singkat: ${jmlIsianSingkat} butir.\n`;
    if (Number(jmlUraian) > 0) systemPrompt += `- Uraian/Essay: ${jmlUraian} butir.\n\n`;

    systemPrompt += `ATURAN DIMENSI [x-AI] (Soal wajib menyebar merata pada aspek berikut):\n${instruksiDimensi}\n\n`;

    systemPrompt += `ATURAN FORMAT OUTPUT WAJIB (Ikuti Judul Hierarki Ini Secara Eksak):\n`;
    systemPrompt += `--- \n`;
    systemPrompt += `A. KISI-KISI PENULISAN SOAL\n`;
    systemPrompt += `(Sajikan dalam Tabel formal dengan kolom: No | Capaian Pembelajaran | Materi | Indikator Soal | Level Kognitif | Bentuk Soal)\n\n`;
    systemPrompt += `B. BUTIR SOAL\n`;
    systemPrompt += `(Tuliskan seluruh butir soal. PENTING: Untuk Pilihan Ganda, pisahkan opsi A, B, C, D dengan baris baru agar berderet ke bawah).\n\n`;
    systemPrompt += `C. KUNCI JAWABAN DAN PEDOMAN PENSKORAN\n`;
    systemPrompt += `(Sajikan tabel Kunci Jawaban, dan tabel Rubrik Penskoran untuk soal Uraian)\n`;
    systemPrompt += `---`;

    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Buatkan dokumen Asesmen (Kisi-kisi, Soal, & Kunci Jawaban) secara lengkap sekarang." }
          ]
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const rawContent = data.choices[0].message.content;
        
        // Memisahkan untuk UI (Tabel Kisi-kisi vs Soal Inti)
        const parts = rawContent.split("B. BUTIR SOAL");
        setHasilAI({
          kisiKisi: parts[0] ? parts[0].trim() : "Gagal memproses kisi-kisi.",
          soalTeks: parts[1] ? "B. BUTIR SOAL\n" + parts[1].trim() : rawContent
        });
      } else {
        throw new Error(data.error?.message || "Gagal mendapatkan respons AI.");
      }
    } catch (error: any) {
      alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimpanKeBankSoal = async () => {
    if (!userUid || !hasilAI) return;
    try {
      await addDoc(collection(db, "modul_ajar"), {
        userId: userUid,
        mapel: formData.mapel,
        kelas: formData.kelas,
        topik: formData.kompetensiDasar,
        tipe: `Bank Soal: ${formData.jenisUjian}`,
        konten: `${hasilAI.kisiKisi}\n\n${hasilAI.soalTeks}`,
        statusValidasi: "menunggu", // Masuk Antrean Validasi Lembaga
        timestamp: serverTimestamp()
      });
      alert("Berhasil disimpan! Dokumen kini berada dalam antrean Validasi Lembaga dan siap diimpor di menu Kelas.");
      setHasilAI(null); 
    } catch (error) {
      alert("Gagal menyimpan dokumen.");
    }
  };

  if (isLoading) return <div className="w-full h-[60vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-600" /></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-10">
      <header className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 ${teachersFont.className}`}>
            <Target className="text-blue-600" /> Pusat Asesmen & Evaluasi
          </h1>
          <p className="text-slate-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
            Pusat pembuatan Kisi-kisi, Bank Soal CBT, dan Kunci Jawaban. Rancang instrumen terintegrasi dengan dimensi sosiokultural daerah.
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap border-b border-slate-200">
        <button onClick={() => setActiveTab("generator")} className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "generator" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><Sparkles size={18} /> 1. Generator Asesmen & Kisi-kisi</button>
        <button onClick={() => setActiveTab("analisis")} className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "analisis" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><BarChart4 size={18} /> 2. Analisis Butir Soal</button>
        <button onClick={() => setActiveTab("feedback")} className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeTab === "feedback" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}><MessageSquareHeart size={18} /> 3. Feedback Otomatis</button>
      </nav>

      {activeTab === "generator" && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileQuestion size={18} className="text-blue-600"/> Parameter Asesmen
            </h2>
            <form onSubmit={handleGenerateAI} className="space-y-5">
              
              {/* INPUT IDENTITAS & DIMENSI */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Fase / Kelas</label>
                    <input type="text" required placeholder="Cth: Fase D / VII" value={formData.fase} onChange={e => setFormData({...formData, fase: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Mata Pelajaran</label>
                    <input type="text" required placeholder="Cth: Bahasa Jawa" value={formData.mapel} onChange={e => setFormData({...formData, mapel: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Kompetensi Dasar (KD) / Topik</label>
                  <textarea required rows={2} placeholder="Tuliskan materi atau KD..." value={formData.kompetensiDasar} onChange={e => setFormData({...formData, kompetensiDasar: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none resize-none"></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Integrasi Dimensi [x-AI]</label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-2.5 border rounded-xl cursor-pointer ${formData.dimensiXAI.includes("Linguistik") ? 'bg-blue-50 border-blue-400' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={formData.dimensiXAI.includes("Linguistik")} onChange={() => handleToggleDimensi("Linguistik")} className="mt-0.5 text-blue-600 rounded" />
                      <div><p className="text-xs font-bold text-slate-700">Linguistik (Kosakata/Struktur)</p></div>
                    </label>
                    <label className={`flex items-start gap-3 p-2.5 border rounded-xl cursor-pointer ${formData.dimensiXAI.includes("Sosiolinguistik") ? 'bg-emerald-50 border-emerald-400' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={formData.dimensiXAI.includes("Sosiolinguistik")} onChange={() => handleToggleDimensi("Sosiolinguistik")} className="mt-0.5 text-emerald-600 rounded" />
                      <div><p className="text-xs font-bold text-slate-700">Sosiolinguistik (Tingkat Tutur)</p></div>
                    </label>
                    <label className={`flex items-start gap-3 p-2.5 border rounded-xl cursor-pointer ${formData.dimensiXAI.includes("Budaya") ? 'bg-amber-50 border-amber-400' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={formData.dimensiXAI.includes("Budaya")} onChange={() => handleToggleDimensi("Budaya")} className="mt-0.5 text-amber-600 rounded" />
                      <div><p className="text-xs font-bold text-slate-700">Interpretasi Budaya Lokal</p></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* INPUT KOMPOSISI SOAL (Pindahan dari Manajemen Kelas) */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2"><ListOrdered size={14}/> Komposisi Instrumen</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Jenis Ujian</label>
                    <select value={formData.jenisUjian} onChange={e => setFormData({...formData, jenisUjian: e.target.value})} className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-bold outline-none">
                      <option>Ulangan Harian</option><option>Asesmen Formatif</option><option>Sumatif Tengah Semester</option><option>Sumatif Akhir Semester</option><option>Try Out</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Tingkat Kesulitan</label>
                    <select value={formData.tingkatKesulitan} onChange={e => setFormData({...formData, tingkatKesulitan: e.target.value})} className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-bold outline-none">
                      <option>Campuran (Proporsional)</option><option>HOTS (Tingkat Tinggi)</option><option>MOTS (Tingkat Sedang)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Pilihan Ganda (Opsi)</label>
                    <select value={opsiPG} onChange={e => setOpsiPG(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-bold outline-none"><option>A - D (4 Opsi)</option><option>A - E (5 Opsi)</option></select>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 mt-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-center"><label className="block text-[9px] font-bold text-slate-500 mb-1">PG</label><input type="number" min="0" value={jmlPG} onChange={(e) => setJmlPG(e.target.value)} className="w-full text-center py-1.5 border border-slate-300 rounded text-sm font-bold outline-none" /></div>
                  <div className="text-center"><label className="block text-[9px] font-bold text-slate-500 mb-1">B/S</label><input type="number" min="0" value={jmlBenarSalah} onChange={(e) => setJmlBenarSalah(e.target.value)} className="w-full text-center py-1.5 border border-slate-300 rounded text-sm font-bold outline-none" /></div>
                  <div className="text-center"><label className="block text-[9px] font-bold text-slate-500 mb-1">Jodoh</label><input type="number" min="0" value={jmlMenjodohkan} onChange={(e) => setJmlMenjodohkan(e.target.value)} className="w-full text-center py-1.5 border border-slate-300 rounded text-sm font-bold outline-none" /></div>
                  <div className="text-center"><label className="block text-[9px] font-bold text-slate-500 mb-1">Isian</label><input type="number" min="0" value={jmlIsianSingkat} onChange={(e) => setJmlIsianSingkat(e.target.value)} className="w-full text-center py-1.5 border border-slate-300 rounded text-sm font-bold outline-none" /></div>
                  <div className="text-center"><label className="block text-[9px] font-bold text-slate-500 mb-1">Esai</label><input type="number" min="0" value={jmlUraian} onChange={(e) => setJmlUraian(e.target.value)} className="w-full text-center py-1.5 border border-slate-300 rounded text-sm font-bold outline-none" /></div>
                </div>
              </div>

              <button type="submit" disabled={isGenerating} className="w-full mt-4 bg-slate-900 hover:bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 active:scale-95">
                {isGenerating ? <Loader2 size={18} className="animate-spin"/> : <BrainCircuit size={18}/>}
                {isGenerating ? "Menganalisis & Menyusun Soal..." : "Generate Kisi-kisi & Soal AI"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-50 rounded-2xl shadow-inner border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
            {hasilAI ? (
              <div className="p-6 bg-white h-full overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Draf Kisi-kisi & Instrumen Soal</h3>
                    <div className="flex gap-2 mt-1">
                      {formData.dimensiXAI.map(d => <span key={d} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">{d}</span>)}
                    </div>
                  </div>
                  <button onClick={handleSimpanKeBankSoal} className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"><Save size={14}/> Ajukan Validasi Lembaga </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {hasilAI.kisiKisi}
                    </pre>
                  </div>
                  <div className="pt-6 border-t border-slate-200 mt-6">
                    <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {hasilAI.soalTeks}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center opacity-70">
                <Globe size={48} className="mb-4 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Area Penyusunan Instrumen Evaluasi</p>
                <p className="text-xs mt-2 max-w-sm">Tentukan komposisi jumlah soal yang spesifik. Sistem AI akan merangkumnya menjadi dokumen Kisi-kisi Tabel, Lembar Soal, dan Kunci Jawaban.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "analisis" && (<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 text-center text-slate-400"><p className="font-bold">Modul Analisis Butir Soal</p></div>)}
      {activeTab === "feedback" && (<div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 text-center text-slate-400"><p className="font-bold">Generator Feedback Otomatis</p></div>)}
    </motion.main>
  );
}