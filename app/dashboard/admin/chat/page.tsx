"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, ChevronUp, Paperclip, CheckCircle2, User, AlertCircle } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef } from "react";

// IMPORT FIREBASE
import { db } from "@/lib/firebase"; 
import { doc, getDoc, getDocs, collection, addDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";

const teachersFont = Teachers({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export default function ChatbotAdminGeminiStyle() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  // Konfigurasi Model
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Data Korpus (Context Grounding)
  const [systemPromptContext, setSystemPromptContext] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cek Keberadaan API Key di Environment Variables
  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!API_KEY) {
      setSetupError("API Key tidak ditemukan! Pastikan Anda telah menambahkan NEXT_PUBLIC_GEMINI_API_KEY di file .env.local");
      return;
    }

    const fetchConfig = async () => {
      try {
        const configSnap = await getDoc(doc(db, "ai_monitoring", "api_config"));
        if (configSnap.exists()) {
          const data = configSnap.data();
          const modelsArray = data.availableModels ? data.availableModels.split(',').map((m:string) => m.trim()) : [data.modelName || "gemini-1.5-flash"];
          setAvailableModels(modelsArray);
          setSelectedModel(modelsArray[0]); 
        }
      } catch (error) {
        console.error("Gagal menarik konfigurasi model");
      }
    };
    fetchConfig();
  }, [API_KEY]);

  // Gabungkan semua pengambilan data (Korpus + Batasan) ke satu useEffect
  useEffect(() => {
    const fetchMasterContext = async () => {
      try {
        // 1. Ambil Korpus
        const snapKorpus = await getDocs(collection(db, "korpus_budaya"));
        const korpusRules = snapKorpus.docs.map((d, index) => {
          const data = d.data();
          return `${index + 1}. Jika menemukan kata/frasa lokal "${data.frasaLokal}", bentuk bakunya adalah "${data.bentukStandar}". Instruksi: ${data.instruksiAi}`;
        }).join("\n");

        // 2. Ambil Batasan (Constraints)
        const snapConstraints = await getDocs(collection(db, "ai_constraints"));
        const constraints = snapConstraints.docs.map(d => {
          const data = d.data();
          return `- [${data.kategori}]: ${data.aturan}`;
        }).join("\n");

        // 3. Gabungkan ke Master Prompt
        const masterPrompt = `
        Anda adalah HARC-AI, asisten pendidikan canggih.
        ATURAN MUTLAK: Anda HANYA boleh menjawab pertanyaan seputar pendidikan, kurikulum, pedagogi, dan kebudayaan.
        
        ATURAN PEMBATASAN:
        ${constraints || "Tidak ada batasan khusus."}
        
        REFERENSI KORPUS (Bahasa Lokal):
        ${korpusRules || "Belum ada data korpus khusus."}
        `;
        
        setSystemPromptContext(masterPrompt);
      } catch (error) {
        console.error("Gagal menarik data konteks:", error);
      }
    };
    
    fetchMasterContext();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !API_KEY) return;

    const userMessage: Message = { role: "user", content: input };
    const newChatHistory = [...messages, userMessage];
    
    setMessages(newChatHistory);
    setInput("");
    setIsTyping(true);
    setShowModelDropdown(false);

    const startTime = Date.now();

    try {
      const apiMessages = [
        { role: "system", content: systemPromptContext },
        ...newChatHistory
      ];

      // ENDPOINT GOOGLE AI STUDIO (Format OpenAI Compatible)
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        const aiResponseContent = data.choices[0].message.content;
        const tokenUsed = data.usage?.total_tokens || 0;

        setMessages(prev => [...prev, { role: "assistant", content: aiResponseContent }]);

        if (tokenUsed > 0) {
          await updateDoc(doc(db, "ai_monitoring", "token_stats"), { tokenTerpakai: increment(tokenUsed) });
          await addDoc(collection(db, "ai_logs"), {
            aksi: `Chat (${selectedModel})`,
            pengguna: "Super Admin", role: "admin", status: "Sukses",
            latensi: Date.now() - startTime, tokenDipakai: tokenUsed, timestamp: serverTimestamp()
          });
        }
      } else {
        throw new Error(data.error?.message || "Respons AI kosong atau Model tidak didukung.");
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Maaf, terjadi gangguan koneksi ke Google AI Studio. (${error.message})` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] md:h-[calc(100vh-64px)] -m-4 md:-m-6 lg:-m-8 bg-[#f8fafc] relative">
      
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 pb-40">
        <div className="max-w-3xl mx-auto">
          
          {setupError && (
            <div className="mb-8 p-4 bg-rose-50 text-rose-700 rounded-2xl text-sm font-medium flex items-center gap-3 border border-rose-100">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle size={16} />
              </div>
              <p>{setupError}</p>
            </div>
          )}

          {messages.length === 0 && !setupError ? (
            <div className="flex flex-col items-center justify-center text-center mt-10 md:mt-20 animate-in fade-in duration-700">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-lg mb-6">
                <Sparkles className="text-white w-8 h-8" />
              </div>
              <h2 className={`text-3xl md:text-4xl font-bold text-slate-800 mb-3 ${teachersFont.className}`}>Halo, Super Admin</h2>
              <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-sm">
                Saya adalah HARC-AI. Saya siap membantu Anda menganalisis kurikulum, mengevaluasi data, dan menerapkan nilai korpus budaya secara presisi.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {msg.role === 'assistant' ? (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
                        <Sparkles size={14} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                        <User size={16} />
                      </div>
                    )}

                    <div className={`max-w-[85%] text-[15px] leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-slate-200/70 px-5 py-3.5 rounded-3xl text-slate-800' 
                        : 'text-slate-800 pt-1.5'
                    }`}>
                      {msg.content.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-sm mt-1 animate-pulse">
                    <Sparkles size={14} className="text-white" />
                  </div>
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

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent pt-8 pb-1 px-4 md:px-8 z-30">
        <div className="max-w-3xl mx-auto relative">
          
          <form className="bg-white border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-3xl flex flex-col p-2 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300">
            
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping || !!setupError}
              placeholder="Tanyakan seputar kurikulum, evaluasi, atau korpus budaya..." 
              className="w-full bg-transparent max-h-40 px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none disabled:opacity-50 scrollbar-thin scrollbar-thumb-slate-200"
              rows={1}
              style={{ minHeight: '60px' }}
            />
            
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              
              <button 
                type="button"
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center justify-center"
                title="Unggah File (Dalam Pengembangan)"
              >
                <Paperclip size={20} />
              </button>

              <div className="flex items-center gap-2 relative" ref={dropdownRef}>
                
                <button 
                  type="button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  disabled={availableModels.length === 0 || isTyping}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-full transition-colors text-[11px] font-bold uppercase tracking-wider"
                >
                  <span className="truncate max-w-[100px] md:max-w-xs">{selectedModel.split('/').pop() || 'Model'}</span> 
                  <ChevronUp size={14} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showModelDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full right-12 mb-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 overflow-hidden origin-bottom-right"
                    >
                      <div className="px-4 pb-2 mb-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine AI Terdaftar</div>
                      {availableModels.map(model => (
                        <button 
                          key={model} 
                          type="button"
                          onClick={() => { setSelectedModel(model); setShowModelDropdown(false); }} 
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedModel === model ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700'}`}
                        >
                          <span className="truncate">{model.split('/').pop()}</span>
                          {selectedModel === model && <CheckCircle2 size={14} className="shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="button" 
                  onClick={() => handleSendMessage()}
                  disabled={isTyping || !input.trim() || !!setupError}
                  className={`p-2 rounded-full transition-colors flex items-center justify-center ${input.trim() && !isTyping ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-300'}`}
                >
                  {isTyping ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <Send size={18} className="ml-0.5" />}
                </button>

              </div>
            </div>
          </form>

          <p className="text-[10px] text-slate-400 mt-2 mb-1 text-center w-full leading-relaxed">
            HARC-AI dapat menghasilkan informasi yang tidak akurat. Harap verifikasi hasil berdasarkan standar kompetensi nasional.
          </p>

        </div>
      </div>

    </div>
  );
}