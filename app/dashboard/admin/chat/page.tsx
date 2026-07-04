"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, ChevronUp, Paperclip, CheckCircle2, User } from "lucide-react";
import { Teachers } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  
  // Konfigurasi Model
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Data Korpus (Context Grounding)
  const [systemPromptContext, setSystemPromptContext] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

  useEffect(() => {
    const fetchMasterContext = async () => {
      try {
        const snapKorpus = await getDocs(collection(db, "korpus_budaya"));
        const korpusRules = snapKorpus.docs.map((d, index) => {
          const data = d.data();
          return `${index + 1}. Jika menemukan kata/frasa lokal "${data.frasaLokal}", bentuk bakunya adalah "${data.bentukStandar}". Instruksi: ${data.instruksiAi}`;
        }).join("\n");

        const snapConstraints = await getDocs(collection(db, "ai_constraints"));
        const constraints = snapConstraints.docs.map(d => {
          const data = d.data();
          return `- [${data.kategori}]: ${data.aturan}`;
        }).join("\n");

        const masterPrompt = `
        Anda adalah HARC-AI, asisten pendidikan canggih.
        ATURAN MUTLAK: Anda HANYA boleh menjawab pertanyaan seputar pendidikan, kurikulum, pedagogi, dan kebudayaan.
        Gunakan format Markdown untuk setiap list, penekanan (bold), dan gunakan tabel jika memberikan data ringkasan.
        
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

  // FITUR BACA DOKUMEN (Ekstraksi teks dari file)
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
    
    // Reset file input agar bisa unggah file yang sama lagi jika perlu
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

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

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
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
        throw new Error(data.error?.message || data.error || "Respons AI kosong atau Model tidak didukung.");
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Maaf, terjadi gangguan koneksi ke sistem AI. (${error.message})` }]);
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
        <div className="max-w-4xl mx-auto">

          {messages.length === 0 ? (
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
                      {msg.role === 'user' ? (
                        // Jika pesan dari user, tampilkan teks biasa
                        msg.content.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)
                      ) : (
                        // Jika pesan dari AI, render menggunakan ReactMarkdown & remarkGfm
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-indigo-900" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-5 mb-3" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-4 mb-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-slate-800" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 my-3 bg-indigo-50/50 italic text-slate-700" {...props} />,
                            table: ({node, ...props}) => (
                              <div className="overflow-x-auto my-5 rounded-lg border border-slate-200 shadow-sm">
                                <table className="w-full text-left text-sm" {...props} />
                              </div>
                            ),
                            thead: ({node, ...props}) => <thead className="bg-slate-50 border-b border-slate-200" {...props} />,
                            th: ({node, ...props}) => <th className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap" {...props} />,
                            td: ({node, ...props}) => <td className="px-4 py-3 border-b border-slate-100/80 text-slate-600 align-top" {...props} />,
                            code: ({node, className, children, ...props}) => {
                              return <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>{children}</code>
                            }
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
              disabled={isTyping}
              placeholder="Tanyakan seputar kurikulum, evaluasi, atau unggah dokumen..." 
              className="w-full bg-transparent max-h-40 px-4 py-3 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none disabled:opacity-50 scrollbar-thin scrollbar-thumb-slate-200"
              rows={1}
              style={{ minHeight: '60px' }}
            />
            
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              
              {/* Input File Tersembunyi */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".txt,.csv,.md,.json" 
              />
              
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center justify-center"
                title="Unggah File Referensi (Teks, CSV, MD)"
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
                  disabled={isTyping || !input.trim()}
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