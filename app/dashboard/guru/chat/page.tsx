"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, ChevronUp, Paperclip, CheckCircle2, User, Plus, MessageSquare, Menu, X, Coins } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// IMPORT FIREBASE
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, collection, addDoc, updateDoc, increment, serverTimestamp, setDoc, onSnapshot, query, orderBy, deleteDoc, where } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  updatedAt: any;
  expiresAt: number; 
}

export default function ChatbotGuruGeminiStyle() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // State User & Token
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pendidik");
  const [aiTokens, setAiTokens] = useState(0);

  // State Chat Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Konfigurasi Model
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Data Korpus (Context Grounding)
  const [systemPromptContext, setSystemPromptContext] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll ke bawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Klik di luar dropdown model
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowModelDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Inisialisasi Auth, Token, Konfigurasi, dan Prompt
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        
        // Tarik Profil Guru (Token & Nama)
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserName(docSnap.data().nama || "Pendidik");
            setAiTokens(docSnap.data().aiTokens || 0);
          }
        });

        // Tarik Konfigurasi Model
        try {
          const configSnap = await getDoc(doc(db, "ai_monitoring", "api_config"));
          if (configSnap.exists()) {
            const data = configSnap.data();
            const modelsArray = data.availableModels ? data.availableModels.split(',').map((m:string) => m.trim()) : [data.modelName || "gemini-1.5-flash"];
            setAvailableModels(modelsArray);
            setSelectedModel(modelsArray[0]); 
          }
        } catch (error) { console.error("Gagal menarik konfigurasi model"); }

        // Tarik Korpus & Aturan
        try {
          const snapKorpus = await getDocs(collection(db, "korpus_budaya"));
          const korpusRules = snapKorpus.docs.map((d, index) => `${index + 1}. Jika menemukan kata/frasa lokal "${d.data().frasaLokal}", bentuk bakunya adalah "${d.data().bentukStandar}". Instruksi: ${d.data().instruksiAi}`).join("\n");
          const snapConstraints = await getDocs(collection(db, "ai_constraints"));
          const constraints = snapConstraints.docs.map(d => `- [${d.data().kategori}]: ${d.data().aturan}`).join("\n");

          setSystemPromptContext(`
            Anda adalah HARC-AI, asisten guru canggih. Anda bertugas membantu merancang modul ajar dan pedagogi.
            ATURAN FORMAT SOAL & TEKS: 
            1. Gunakan format Markdown untuk setiap list, tebal (bold), dan tabel.
            2. Jika Anda membuat soal pilihan ganda, WAJIB pisahkan opsi (A, B, C, D, E) dengan baris baru (ENTER) agar tersusun menurun.
            ATURAN DARI SEKOLAH:
            ${constraints || "Tidak ada batasan khusus."}
            PANDUAN KORPUS:
            ${korpusRules || "Gunakan bahasa baku."}
          `);
        } catch (error) { console.error("Gagal menarik korpus"); }

        return () => unsubProfil();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // PERBAIKAN 2: MANAJEMEN ROOM CHAT (Privasi Ketat & Hapus Kedaluwarsa)
  useEffect(() => {
    if (!userUid) return;
    
    // Hanya tarik riwayat chat yang userId-nya sama dengan userUid (Keamanan Database)
    const q = query(
      collection(db, "ai_chat_sessions"), 
      where("userId", "==", userUid), 
      orderBy("updatedAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const loadedSessions: ChatSession[] = [];
      
      snapshot.docs.forEach((document) => {
        const data = document.data();
        // Hapus chat yang sudah kadaluarsa otomatis tanpa nge-block UI
        if (data.expiresAt && data.expiresAt < now) {
          deleteDoc(doc(db, "ai_chat_sessions", document.id));
          if (currentSessionId === document.id) handleNewChat(); 
        } else {
          loadedSessions.push({ id: document.id, ...data } as ChatSession);
        }
      });
      setSessions(loadedSessions);
    });
    
    return () => unsubscribe();
  }, [userUid, currentSessionId]);

  const handleNewChat = () => { setCurrentSessionId(null); setMessages([]); setIsSidebarOpen(false); };
  
  const handleSelectSession = (session: ChatSession) => { 
    setCurrentSessionId(session.id); 
    setMessages(session.messages); 
    setIsSidebarOpen(false); // Otomatis tutup sidebar di HP saat chat dipilih
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setInput((prev) => prev + `\n\n[Dokumen Referensi: ${file.name}]\n${text}\n\nTolong analisis dokumen di atas: `);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !userUid) return;
    
    if (aiTokens <= 0) {
      alert("Sisa Token AI Anda habis. Silakan hubungi Admin untuk pengisian ulang.");
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    const newChatHistory = [...messages, userMessage];
    
    setMessages(newChatHistory);
    setInput("");
    setIsTyping(true);
    setShowModelDropdown(false);

    const startTime = Date.now();
    let activeSessionId = currentSessionId;

    // Buat Room Chat Baru jika belum ada
    if (!activeSessionId) {
      const newSessionRef = doc(collection(db, "ai_chat_sessions"));
      activeSessionId = newSessionRef.id;
      setCurrentSessionId(activeSessionId);
      const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 Hari
      
      await setDoc(newSessionRef, {
        userId: userUid,
        title: userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? "..." : ""),
        messages: newChatHistory,
        updatedAt: serverTimestamp(),
        expiresAt: expiryTime
      });
    } else {
      await updateDoc(doc(db, "ai_chat_sessions", activeSessionId), { messages: newChatHistory, updatedAt: serverTimestamp() });
    }

    try {
      const apiMessages = [{ role: "system", content: systemPromptContext }, ...newChatHistory];

      // PERBAIKAN 1: MENDAPATKAN DAN MENGIRIM TOKEN FIREBASE KE API
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}` // Kunci keamanan berlapis
        },
        body: JSON.stringify({ model: selectedModel, messages: apiMessages })
      });

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const aiResponseContent = data.choices[0].message.content;
        const tokenUsed = data.usage?.total_tokens || 0;
        const finalChatHistory = [...newChatHistory, { role: "assistant", content: aiResponseContent } as Message];

        setMessages(finalChatHistory);
        await updateDoc(doc(db, "ai_chat_sessions", activeSessionId), { messages: finalChatHistory, updatedAt: serverTimestamp() });

        // Log Aktivitas Sisi Klien (opsional karena token sudah dipotong di server)
        if (tokenUsed > 0) {
          await addDoc(collection(db, "ai_logs"), {
            aksi: `Chat (${selectedModel})`, pengguna: userName, role: "guru", status: "Sukses",
            latensi: Date.now() - startTime, tokenDipakai: tokenUsed, timestamp: serverTimestamp()
          });
        }
      } else {
        throw new Error(data.error?.message || data.error || "Respons AI kosong.");
      }
    } catch (error: any) {
      const errorMsg: Message = { role: "assistant", content: `Maaf, terjadi gangguan sistem. (${error.message})` };
      setMessages(prev => [...prev, errorMsg]);
      if (activeSessionId) {
        await updateDoc(doc(db, "ai_chat_sessions", activeSessionId), { messages: [...newChatHistory, errorMsg], updatedAt: serverTimestamp() });
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  return (
    <div className="flex h-[calc(100vh-128px)] md:h-[calc(100vh-64px)] -m-4 md:-m-6 lg:-m-8 bg-[#f8fafc] relative overflow-hidden">
      
      {/* PERBAIKAN 3: SIDEBAR RIWAYAT CHAT (Mobile Friendly) */}
      <div className={`absolute md:relative z-40 bg-white/90 backdrop-blur-md md:bg-white border-r border-slate-200 h-full transition-transform duration-300 flex flex-col w-64 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <button onClick={handleNewChat} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} /> Chat Baru
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-2 p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2 mt-1">Riwayat (7 Hari Terakhir)</p>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center mt-5">Belum ada riwayat</p>
          ) : (
            sessions.map(session => (
              <button 
                key={session.id} 
                onClick={() => handleSelectSession(session)}
                className={`w-full text-left p-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-all truncate ${currentSessionId === session.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <MessageSquare size={16} className={`shrink-0 ${currentSessionId === session.id ? 'text-blue-200' : 'text-slate-400'}`} />
                <span className="truncate flex-1">{session.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* OVERLAY GELAP UNTUK MOBILE SAAT SIDEBAR DIBUKA */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden absolute inset-0 bg-slate-900/40 z-30 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* AREA CHAT UTAMA */}
      <div className="flex-1 flex flex-col relative w-full min-w-0">
        
        {/* Tombol Buka Sidebar di HP */}
        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute top-4 left-4 z-20 p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600">
          <Menu size={20} />
        </button>

        <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm">
          <Coins size={14} className="text-amber-500" /> Sisa Token: {aiTokens.toLocaleString('id-ID')}
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-16 md:pt-8 pb-40">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center mt-10 md:mt-20 animate-in fade-in duration-700">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg mb-6">
                  <Sparkles className="text-white w-8 h-8" />
                </div>
                <h2 className={`text-3xl md:text-4xl font-bold text-slate-800 mb-3 ${teachersFont.className}`}>Halo, {userName}</h2>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-sm">
                  Mari merancang perangkat ajar. Saya telah disinkronkan dengan Korpus Kebudayaan sekolah Anda.
                </p>
                <div className="mt-6 md:hidden flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm">
                  <Coins size={14} className="text-amber-500" /> Sisa Token AI Anda: {aiTokens.toLocaleString('id-ID')}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <AnimatePresence>
                  {messages.map((msg, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.role === 'assistant' ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                          <Sparkles size={14} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                          <User size={16} />
                        </div>
                      )}

                      <div className={`max-w-[85%] text-[15px] leading-relaxed overflow-hidden ${msg.role === 'user' ? 'bg-slate-200/70 px-5 py-3.5 rounded-3xl text-slate-800' : 'text-slate-800 pt-1.5'}`}>
                        {msg.role === 'user' ? (
                          msg.content.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)
                        ) : (
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-blue-900" {...props} />,
                              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-5 mb-3" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-4 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-slate-800" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-3 bg-blue-50/50 italic text-slate-700" {...props} />,
                              table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-5 rounded-lg border border-slate-200 shadow-sm">
                                  <table className="w-full text-left text-sm" {...props} />
                                </div>
                              ),
                              thead: ({node, ...props}) => <thead className="bg-slate-50 border-b border-slate-200" {...props} />,
                              th: ({node, ...props}) => <th className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap" {...props} />,
                              td: ({node, ...props}) => <td className="px-4 py-3 border-b border-slate-100/80 text-slate-600 align-top" {...props} />,
                              code: ({node, className, children, ...props}) => <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>{children}</code>
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1 animate-pulse"><Sparkles size={14} className="text-white" /></div>
                    <div className="pt-2.5 text-slate-400 font-medium text-sm animate-pulse flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </div>

        {/* INPUT AREA */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent pt-8 pb-1 px-4 md:px-8 z-30">
          <div className="max-w-4xl mx-auto relative">
            <form className="bg-white border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-3xl flex flex-col p-2 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
              <textarea 
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isTyping}
                placeholder="Menapa wonten ingkang saged kula biyantu?" 
                className="w-full bg-transparent max-h-40 px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none disabled:opacity-50 scrollbar-thin scrollbar-thumb-slate-200"
                rows={1} style={{ minHeight: '60px' }}
              />
              <div className="flex items-center justify-between px-2 pb-1 pt-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.md,.json" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center">
                  <Paperclip size={20} />
                </button>
                <div className="flex items-center gap-2 relative" ref={dropdownRef}>
                  <button type="button" onClick={() => setShowModelDropdown(!showModelDropdown)} disabled={availableModels.length === 0 || isTyping} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-full transition-colors text-[11px] font-bold uppercase tracking-wider">
                    <span className="truncate max-w-[100px] md:max-w-xs">{selectedModel.split('/').pop() || 'Model'}</span> <ChevronUp size={14} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showModelDropdown && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute bottom-full right-12 mb-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden origin-bottom-right">
                        <div className="px-4 pb-2 mb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine AI Terdaftar</div>
                        {availableModels.map(model => (
                          <button key={model} type="button" onClick={() => { setSelectedModel(model); setShowModelDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedModel === model ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'}`}>
                            <span className="truncate">{model.split('/').pop()}</span>
                            {selectedModel === model && <CheckCircle2 size={14} className="shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button type="button" onClick={() => handleSendMessage()} disabled={isTyping || !input.trim() || aiTokens <= 0} className={`p-2 rounded-full transition-colors flex items-center justify-center ${input.trim() && !isTyping ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-300'}`}>
                    {isTyping ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <Send size={18} className="ml-0.5" />}
                  </button>
                </div>
              </div>
            </form>
            <p className="text-[10px] text-slate-400 mt-2 mb-1 text-center w-full leading-relaxed">
              HARC-AI mematuhi Korpus Kebudayaan. Jawaban AI mungkin tidak selalu akurat.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}