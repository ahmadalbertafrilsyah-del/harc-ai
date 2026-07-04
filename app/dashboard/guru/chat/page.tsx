"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, Paperclip, User, AlertCircle, Coins } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef } from "react";

// IMPORT FIREBASE
import { db } from "@/lib/firebase"; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, collection, addDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface Message { role: "system" | "user" | "assistant"; content: string; }

export default function ChatbotGuru() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userName, setUserName] = useState("Pendidik");
  const [aiTokens, setAiTokens] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-1.5-flash"); // Default
  const [systemPromptContext, setSystemPromptContext] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        
        // Tarik Data Profil Guru
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().nama || "Pendidik");
          setAiTokens(userDoc.data().aiTokens || 0);
        }

        // Tarik Konfigurasi Default Model dari Admin
        const configSnap = await getDoc(doc(db, "ai_monitoring", "api_config"));
        if (configSnap.exists() && configSnap.data().modelName) {
          setSelectedModel(configSnap.data().modelName);
        }

        // Tarik Aturan & Korpus dari Admin (Context Grounding)
        const snapKorpus = await getDocs(collection(db, "korpus_budaya"));
        const korpusRules = snapKorpus.docs.map((d, i) => `${i + 1}. Jika ada frasa "${d.data().frasaLokal}", bakunya adalah "${d.data().bentukStandar}". Instruksi: ${d.data().instruksiAi}`).join("\n");

        const snapConstraints = await getDocs(collection(db, "ai_constraints"));
        const constraints = snapConstraints.docs.map(d => `- [${d.data().kategori}]: ${d.data().aturan}`).join("\n");

        setSystemPromptContext(`
          Anda adalah HARC-AI, asisten guru canggih. Anda bertugas membantu merancang modul ajar dan pedagogi.
          ATURAN MUTLAK DARI KEPALA SEKOLAH/ADMIN:
          ${constraints || "Tidak ada batasan khusus."}
          
          PANDUAN KORPUS LOKAL:
          ${korpusRules || "Gunakan bahasa baku."}
        `);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !userUid) return;
    if (aiTokens <= 0) {
      alert("Sisa Token AI Anda habis. Silakan hubungi Admin.");
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    const newChatHistory = [...messages, userMessage];
    
    setMessages(newChatHistory);
    setInput("");
    setIsTyping(true);
    const startTime = Date.now();

    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel, messages: [{ role: "system", content: systemPromptContext }, ...newChatHistory] })
      });

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const tokenUsed = data.usage?.total_tokens || 0;
        setMessages(prev => [...prev, { role: "assistant", content: data.choices[0].message.content }]);

        // Kurangi token guru & Tambah token terpakai di sistem Admin
        if (tokenUsed > 0) {
          setAiTokens(prev => prev - tokenUsed);
          await updateDoc(doc(db, "users", userUid), { aiTokens: increment(-tokenUsed) });
          await updateDoc(doc(db, "ai_monitoring", "token_stats"), { tokenTerpakai: increment(tokenUsed) });
          await addDoc(collection(db, "ai_logs"), { aksi: "Chat Guru", pengguna: userName, role: "guru", status: "Sukses", latensi: Date.now() - startTime, tokenDipakai: tokenUsed, timestamp: serverTimestamp() });
        }
      } else { throw new Error(data.error?.message || "Respons AI kosong."); }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Terjadi gangguan koneksi: ${error.message}` }]);
    } finally { setIsTyping(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] md:h-[calc(100vh-64px)] -m-4 md:-m-6 lg:-m-8 bg-[#f8fafc] relative">
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 pb-40">
        <div className="max-w-3xl mx-auto">
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center mt-10 md:mt-20 animate-in fade-in duration-700">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg mb-6"><Sparkles className="text-white w-8 h-8" /></div>
              <h2 className={`text-3xl font-bold text-slate-800 mb-3 ${teachersFont.className}`}>Halo, {userName}</h2>
              <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-sm">Mari merancang perangkat ajar. Saya telah disinkronkan dengan Korpus Kebudayaan sekolah Anda.</p>
              <div className="mt-6 flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-bold border border-blue-100"><Coins size={14} /> Sisa Token AI Anda: {aiTokens.toLocaleString('id-ID')}</div>
            </div>
          ) : (
            <div className="space-y-8">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'assistant' ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1"><Sparkles size={14} className="text-white" /></div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-sm mt-1"><User size={16} /></div>
                    )}
                    <div className={`max-w-[85%] text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-slate-200/70 px-5 py-3.5 rounded-3xl text-slate-800' : 'text-slate-800 pt-1.5'}`}>
                      {msg.content.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1 animate-pulse"><Sparkles size={14} className="text-white" /></div>
                  <div className="pt-2.5 text-slate-400 font-medium text-sm animate-pulse flex gap-1"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span></div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent pt-8 pb-1 px-4 md:px-8 z-30">
        <div className="max-w-3xl mx-auto relative">
          <form className="bg-white border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-3xl flex flex-col p-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isTyping} placeholder="Ketik permintaan modul ajar atau materi..." className="w-full bg-transparent max-h-40 px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none disabled:opacity-50 scrollbar-thin scrollbar-thumb-slate-200" rows={1} style={{ minHeight: '60px' }} />
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <button type="button" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Paperclip size={20} /></button>
              <button type="button" onClick={() => handleSendMessage()} disabled={isTyping || !input.trim() || aiTokens <= 0} className={`p-2 rounded-full transition-colors flex items-center justify-center ${input.trim() && !isTyping ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-300'}`}>
                {isTyping ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <Send size={18} className="ml-0.5" />}
              </button>
            </div>
          </form>
          <p className="text-[10px] text-slate-400 mt-2 mb-1 text-center w-full leading-relaxed">HARC-AI mematuhi Korpus Kebudayaan. Jawaban AI mungkin tidak selalu akurat.</p>
        </div>
      </div>
    </div>
  );
}