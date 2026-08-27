"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, ChevronUp, Paperclip, CheckCircle2, User, Plus, MessageSquare, Menu, X } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// IMPORT FIREBASE
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, collection, addDoc, updateDoc, serverTimestamp, setDoc, onSnapshot, query, orderBy, deleteDoc, where } from "firebase/firestore";

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
  
  // State Sidebar (Default terbuka di Desktop, tertutup di Mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Konfigurasi Model
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Data Korpus (Context Grounding)
  const [systemPromptContext, setSystemPromptContext] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tutup sidebar otomatis di layar kecil saat pertama kali dimuat
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

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
        
        const unsubProfil = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserName(docSnap.data().nama || "Pendidik");
            setAiTokens(docSnap.data().aiTokens || 0);
          }
        });

        try {
          const configSnap = await getDoc(doc(db, "ai_monitoring", "api_config"));
          if (configSnap.exists()) {
            const data = configSnap.data();
            const modelsArray = data.availableModels ? data.availableModels.split(',').map((m:string) => m.trim()) : [data.modelName || "gemini-1.5-flash"];
            setAvailableModels(modelsArray);
            setSelectedModel(modelsArray[0]); 
          }
        } catch (error) { console.error("Gagal menarik konfigurasi model"); }

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

  // MANAJEMEN ROOM CHAT
  useEffect(() => {
    if (!userUid) return;
    
    const q = query(collection(db, "ai_chat_sessions"), where("userId", "==", userUid), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const loadedSessions: ChatSession[] = [];
      
      snapshot.docs.forEach((document) => {
        const data = document.data();
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

  const handleNewChat = () => { 
    setCurrentSessionId(null); 
    setMessages([]); 
    if (window.innerWidth < 768) setIsSidebarOpen(false); 
  };
  
  const handleSelectSession = (session: ChatSession) => { 
    setCurrentSessionId(session.id); 
    setMessages(session.messages); 
    if (window.innerWidth < 768) setIsSidebarOpen(false); 
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

    if (!activeSessionId) {
      const newSessionRef = doc(collection(db, "ai_chat_sessions"));
      activeSessionId = newSessionRef.id;
      setCurrentSessionId(activeSessionId);
      const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000); 
      
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
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ model: selectedModel, messages: apiMessages })
      });

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const aiResponseContent = data.choices[0].message.content;
        const tokenUsed = data.usage?.total_tokens || 0;
        const finalChatHistory = [...newChatHistory, { role: "assistant", content: aiResponseContent } as Message];

        setMessages(finalChatHistory);
        await updateDoc(doc(db, "ai_chat_sessions", activeSessionId), { messages: finalChatHistory, updatedAt: serverTimestamp() });

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
    <div className="absolute top-[80px] left-0 right-0 bottom-[70px] md:bottom-0 flex overflow-hidden bg-white md:bg-[#f8fafc] z-20">
      
      {/* SIDEBAR RIWAYAT CHAT */}
      <div className={`absolute md:relative z-40 bg-white/95 backdrop-blur-md md:bg-white border-r border-slate-200 h-full flex flex-col w-64 shrink-0 transition-transform duration-300 shadow-xl md:shadow-none ${isSidebarOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:translate-x-0 md:-ml-64'}`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <button onClick={handleNewChat} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} /> Chat Baru
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-2 p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2 mt-1">Riwayat (7 Hari Terakhir)</p>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center mt-5">Belum ada riwayat</p>
          ) : (
            sessions.map(session => (
              <button 
                key={session.id} 
                onClick={() => handleSelectSession(session)}
                className={`w-full text-left p-3 rounded-xl text-sm flex items-center gap-3 transition-all truncate ${currentSessionId === session.id ? 'bg-blue-600 text-white shadow-md font-medium' : 'text-slate-600 hover:bg-slate-100 font-medium'}`}
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

      {/* AREA CHAT UTAMA (FLEX COLUMN FULL) */}
      <div className="flex-1 flex flex-col min-w-0 w-full h-full relative bg-white md:bg-transparent">
        
        {/* TOMBOL TOGGLE SIDEBAR MELAYANG */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="absolute top-4 left-4 z-30 p-2 bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all focus:outline-none active:scale-95"
          aria-label="Buka Menu Chat"
        >
          <Menu size={18} />
        </button>

        {/* AREA PESAN (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto px-2 md:px-8 pt-16 pb-6 bg-white md:bg-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center mt-10 md:mt-24 animate-in fade-in duration-700 px-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg mb-6">
                  <Sparkles className="text-white w-8 h-8" />
                </div>
                <h2 className={`text-2xl md:text-4xl font-bold text-slate-800 mb-3 ${teachersFont.className}`}>Halo, {userName}</h2>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-sm">
                  Mari merancang perangkat ajar. Saya telah disinkronkan dengan Korpus Kebudayaan sekolah Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8">
                <AnimatePresence>
                  {messages.map((msg, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.role === 'assistant' ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                          <Sparkles size={14} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                          <User size={16} />
                        </div>
                      )}

                      <div className={`max-w-[92%] md:max-w-[85%] text-[14px] md:text-[15px] leading-relaxed overflow-hidden ${msg.role === 'user' ? 'bg-slate-100 md:bg-slate-200/70 px-4 md:px-5 py-2.5 md:py-3 rounded-2xl md:rounded-3xl rounded-tr-sm md:rounded-tr-sm text-slate-800' : 'text-slate-800 pt-1.5'}`}>
                        {msg.role === 'user' ? (
                          msg.content.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)
                        ) : (
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-blue-900" {...props} />,
                              h1: ({node, ...props}) => <h1 className="text-xl md:text-2xl font-bold mt-5 mb-3" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg md:text-xl font-bold mt-4 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base md:text-lg font-bold mt-4 mb-2 text-slate-800" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-3 bg-blue-50/50 italic text-slate-700" {...props} />,
                              table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-5 rounded-lg border border-slate-200 shadow-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                  <table className="w-full text-left text-sm min-w-[500px]" {...props} />
                                </div>
                              ),
                              thead: ({node, ...props}) => <thead className="bg-slate-50 border-b border-slate-200" {...props} />,
                              th: ({node, ...props}) => <th className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap" {...props} />,
                              td: ({node, ...props}) => <td className="px-4 py-3 border-b border-slate-100/80 text-slate-600 align-top" {...props} />,
                              code: ({node, className, children, ...props}) => <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-[13px] font-mono break-words" {...props}>{children}</code>
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
                  <div className="flex gap-2.5 md:gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1 animate-pulse"><Sparkles size={14} className="text-white" /></div>
                    <div className="pt-2.5 text-slate-400 font-medium text-sm flex gap-1.5">
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

        {/* AREA INPUT CHAT */}
        <div className="shrink-0 bg-white md:bg-gradient-to-t md:from-[#f8fafc] md:via-[#f8fafc] md:to-transparent border-t md:border-t-0 border-slate-100 pt-2 md:pt-6 pb-2 md:pb-6 px-2 md:px-8 z-10">
          <div className="max-w-4xl mx-auto relative">
            <form className="bg-slate-50 md:bg-white border border-slate-200/80 shadow-sm md:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] rounded-3xl flex flex-col p-1.5 md:p-2 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 focus-within:bg-white">
              <textarea 
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isTyping}
                placeholder="Tanyakan sesuatu..." 
                className="w-full bg-transparent max-h-32 px-3 md:px-4 py-2.5 md:py-3 text-[14px] md:text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none disabled:opacity-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                rows={1} style={{ minHeight: '50px' }}
              />
              <div className="flex items-center justify-between px-1 md:px-2 pb-1 pt-1 md:pt-2 border-t border-slate-100/50 mt-1">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.md,.json" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center">
                  <Paperclip size={18} />
                </button>
                <div className="flex items-center gap-1.5 md:gap-2 relative" ref={dropdownRef}>
                  <button type="button" onClick={() => setShowModelDropdown(!showModelDropdown)} disabled={availableModels.length === 0 || isTyping} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 md:px-3 py-1.5 rounded-full transition-colors text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
                    <span className="truncate max-w-[80px] md:max-w-xs">{selectedModel.split('/').pop() || 'Model'}</span> <ChevronUp size={14} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showModelDropdown && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute bottom-full right-12 mb-2 w-48 md:w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden origin-bottom-right">
                        <div className="px-4 pb-2 mb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine AI Terdaftar</div>
                        {availableModels.map(model => (
                          <button key={model} type="button" onClick={() => { setSelectedModel(model); setShowModelDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-[13px] md:text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedModel === model ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'}`}>
                            <span className="truncate">{model.split('/').pop()}</span>
                            {selectedModel === model && <CheckCircle2 size={14} className="shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button type="button" onClick={() => handleSendMessage()} disabled={isTyping || !input.trim() || aiTokens <= 0} className={`p-2 rounded-full transition-colors flex items-center justify-center ${input.trim() && !isTyping ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-white'}`}>
                    {isTyping ? <Loader2 size={16} className="animate-spin text-blue-200" /> : <Send size={16} className="ml-0.5" />}
                  </button>
                </div>
              </div>
            </form>
            <p className="hidden md:block text-[10px] text-slate-400 mt-2 text-center w-full">
              HARC-AI mematuhi Korpus Kebudayaan. Jawaban AI mungkin tidak selalu akurat.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}