"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Bot, Save, Loader2, Info, Battery, UploadCloud, FileText, Trash2 } from "lucide-react";

export default function PengaturanBotAdmin() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [dailyTokenLimit, setDailyTokenLimit] = useState(15000);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{name: string, url: string, path: string}>>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState({ show: false, msg: "", type: "" });

  // Inisialisasi Storage (Bisa disesuaikan dengan path @/lib/firebase Anda)
  const storage = getStorage();

  useEffect(() => {
    const fetchPengaturan = async () => {
      try {
        const docRef = doc(db, "sistem_pengaturan", "ai_public");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSystemPrompt(data.systemPrompt || "");
          setDailyTokenLimit(data.dailyTokenLimit || 15000);
          setUploadedDocs(data.documents || []);
        } else {
          setSystemPrompt("Anda adalah Customer Service resmi dari HARC-AI...");
        }
      } catch (error) {
        console.error("Gagal mengambil data:", error);
        showNotification("Gagal mengambil pengaturan dari database", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPengaturan();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    
    try {
      const docRef = doc(db, "sistem_pengaturan", "ai_public");
      await setDoc(docRef, { 
        systemPrompt,
        dailyTokenLimit: Number(dailyTokenLimit),
        documents: uploadedDocs
      }, { merge: true });
      showNotification("Pengaturan Bot AI berhasil disimpan!", "success");
    } catch (error) {
      console.error("Gagal menyimpan data:", error);
      showNotification("Gagal menyimpan pengaturan. Pastikan Anda memiliki akses Admin.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Batasi ukuran file (misal maksimal 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showNotification("Ukuran file terlalu besar. Maksimal 2MB.", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const filePath = `ai_knowledge_base/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload error:", error);
          showNotification("Gagal mengunggah dokumen.", "error");
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newDoc = { name: file.name, url: downloadURL, path: filePath };
          
          setUploadedDocs((prev) => [...prev, newDoc]);
          setIsUploading(false);
          setUploadProgress(0);
          showNotification("Dokumen berhasil diunggah. Jangan lupa klik Simpan Pengaturan.", "success");
        }
      );
    } catch (error) {
      setIsUploading(false);
      showNotification("Terjadi kesalahan saat memproses file.", "error");
    }
  };

  const handleDeleteDoc = async (docPath: string) => {
    try {
      const storageRef = ref(storage, docPath);
      await deleteObject(storageRef);
      setUploadedDocs((prev) => prev.filter((d) => d.path !== docPath));
      showNotification("Dokumen dihapus. Klik Simpan untuk memperbarui database.", "success");
    } catch (error) {
      console.error("Gagal menghapus file:", error);
      showNotification("Gagal menghapus dokumen dari penyimpanan.", "error");
    }
  };

  const showNotification = (msg: string, type: string) => {
    setNotification({ show: true, msg, type });
    setTimeout(() => setNotification({ show: false, msg: "", type: "" }), 3000);
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#1e3a8a]" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-amber-100 text-amber-600 rounded-2xl shadow-sm border border-amber-200">
            <Bot size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Chatbot Publik</h1>
            <p className="text-sm text-slate-500 font-medium">Atur batasan, kuota harian, dan basis pengetahuan asisten AI.</p>
          </div>
        </div>
        <button
          onClick={() => handleSave()}
          disabled={isSaving || isUploading}
          className="bg-[#1e3a8a] hover:bg-blue-800 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      {notification.show && (
        <div className={`p-4 mb-6 rounded-xl text-sm font-bold flex items-center gap-2 border ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <Info size={18} /> {notification.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: Pengaturan Teks & Limit */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <label htmlFor="systemPrompt" className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
              <Bot size={18} className="text-blue-600" />
              Instruksi Sistem (System Prompt)
            </label>
            <div className="flex gap-2 items-start p-3 bg-blue-50/50 text-blue-800 rounded-xl text-xs mb-4 border border-blue-100">
              <Info size={16} className="shrink-0 mt-0.5 text-blue-600" />
              <p>Teks panduan rahasia untuk membatasi ruang lingkup bot agar tidak keluar dari topik HARC-AI.</p>
            </div>
            
            <textarea
              id="systemPrompt"
              rows={8}
              className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm font-mono leading-relaxed text-slate-700 bg-slate-50"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Masukkan instruksi khusus untuk AI..."
              required
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <label htmlFor="tokenLimit" className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
              <Battery size={18} className="text-emerald-500" />
              Batas Maksimal Token Harian
            </label>
            <div className="flex gap-2 items-start p-3 bg-amber-50 text-amber-800 rounded-xl text-xs mb-4 border border-amber-100">
              <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <p>Mencegah biaya tagihan API membengkak akibat <i>spam</i> pertanyaan dari pengunjung publik.</p>
            </div>
            <div className="relative max-w-xs">
              <input
                id="tokenLimit"
                type="number"
                min="0"
                className="w-full pl-4 pr-16 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] text-sm font-bold text-slate-700 bg-slate-50"
                value={dailyTokenLimit}
                onChange={(e) => setDailyTokenLimit(Number(e.target.value))}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Tokens</span>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Upload Referensi Dokumen */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
            <FileText size={18} className="text-indigo-500" />
            Basis Pengetahuan (Referensi AI)
          </label>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Unggah dokumen (TXT/PDF ringkasan) agar AI bisa membaca data valid mengenai HARC-AI tanpa perlu mengetik semuanya di System Prompt.
          </p>

          {/* Area Drop Zone / Upload Button */}
          <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center p-6 text-center mb-6">
            <input 
              type="file" 
              accept=".txt,.pdf,.docx" 
              onChange={handleFileUpload} 
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <span className="text-xs font-bold text-blue-600">Mengunggah... {uploadProgress}%</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <UploadCloud size={28} className="text-slate-400" />
                <span className="text-xs font-bold">Klik atau Seret file ke sini</span>
                <span className="text-[10px]">Maks 2MB (TXT, PDF)</span>
              </div>
            )}
          </div>

          {/* List File yang Diunggah */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Dokumen Tersimpan</h4>
            {uploadedDocs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-slate-100">Belum ada dokumen referensi.</p>
            ) : (
              uploadedDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={16} className="text-blue-500 shrink-0" />
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-700 truncate hover:text-blue-600">
                      {doc.name}
                    </a>
                  </div>
                  <button 
                    onClick={() => handleDeleteDoc(doc.path)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Hapus Dokumen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}