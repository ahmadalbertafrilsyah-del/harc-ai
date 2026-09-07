import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
// Impor Firebase Admin SDK
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model = "gemini-2.5-flash" } = body;

    // Nilai Default jika database kosong
    let systemMsgContent = `Anda adalah Customer Service resmi dari HARC-AI. TUGAS: Hanya jawab pertanyaan seputar HARC-AI.`;
    let dailyTokenLimit = 15000;
    let tokensUsedToday = 0;
    let documents: any[] = [];
    
    const settingsRef = adminDb.collection("sistem_pengaturan").doc("ai_public");
    
    try {
      const settingsDoc = await settingsRef.get();
      
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.systemPrompt) systemMsgContent = data.systemPrompt;
        if (data?.dailyTokenLimit) dailyTokenLimit = data.dailyTokenLimit;
        if (data?.documents) documents = data.documents;

        tokensUsedToday = data?.tokensUsedToday || 0;
        const lastResetDate = data?.lastResetDate || "";
        
        // LOGIKA 1: Reset Pemakaian Harian (Berdasarkan Tanggal Hari Ini)
        const todayDateString = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
        
        if (lastResetDate !== todayDateString) {
          tokensUsedToday = 0; // Reset ke 0 jika berganti hari
          // Update tanggal reset di database tanpa menunggu (fire and forget)
          settingsRef.update({
            tokensUsedToday: 0,
            lastResetDate: todayDateString
          }).catch(console.error);
        }
      }
    } catch (dbError) {
      console.error("Gagal mengambil pengaturan AI dari Firestore:", dbError);
    }

    // LOGIKA 2: Cek Apakah Kuota Token Hari Ini Sudah Habis
    if (tokensUsedToday >= dailyTokenLimit) {
      return NextResponse.json(
        { error: "Maaf, batas penggunaan asisten AI untuk hari ini telah tercapai. Silakan coba lagi besok." }, 
        { status: 429 } // 429 Too Many Requests
      );
    }

    // Inisialisasi Gemini
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Kunci API Google Gemini belum diatur di sistem." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({ model });

    // LOGIKA 3: Ekstrak Konten dari Dokumen yang Diunggah Admin
    let knowledgeBaseText = "";
    if (documents.length > 0) {
      knowledgeBaseText = "\n\n[REFERENSI BASIS PENGETAHUAN DARI ADMIN (GUNAKAN JIKA RELEVAN)]:\n";
      for (const doc of documents) {
        // Untuk kemudahan dan performa server, kita hanya membaca file berformat .txt
        if (doc.name.toLowerCase().endsWith('.txt') && doc.url) {
          try {
            const fileRes = await fetch(doc.url);
            if (fileRes.ok) {
              const textContent = await fileRes.text();
              knowledgeBaseText += `\n--- Dokumen: ${doc.name} ---\n${textContent}\n`;
            }
          } catch (e) {
            console.error(`Gagal membaca isi dokumen ${doc.name}`, e);
          }
        }
      }
    }

    // Susun Prompt Gabungan
    const userMsgs = messages.filter((m: any) => m.role !== "system");
    let promptText = `[INSTRUKSI SISTEM MUTLAK DARI ADMIN]:\n${systemMsgContent}${knowledgeBaseText}\n\n`;
    promptText += userMsgs.map((m: any) => `[${m.role.toUpperCase()}]:\n${m.content}`).join("\n\n");

    // Generate Respon
    const result = await gemini.generateContent(promptText);
    const responseText = result.response.text();

    if (!responseText) {
      return NextResponse.json({ error: "Mesin AI tidak mengembalikan teks apa pun." }, { status: 500 });
    }

    // LOGIKA 4: Hitung Token & Potong Kuota
    // Estimasi kasar: 1 token ~ 4 karakter
    const estimatedTokensUsed = Math.round((promptText.length + responseText.length) / 4);

    // Update pemakaian token hari ini ke Firebase secara asinkron
    settingsRef.update({
      tokensUsedToday: FieldValue.increment(estimatedTokensUsed)
    }).catch(err => console.error("Gagal mengupdate pemakaian token:", err));

    return NextResponse.json({
      choices: [
        {
          message: { role: "assistant", content: responseText }
        }
      ],
      usage: {
        tokens_used_request: estimatedTokensUsed,
        total_used_today: tokensUsedToday + estimatedTokensUsed
      }
    });

  } catch (error: any) {
    console.error("Kesalahan Public AI Route:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal saat memproses AI." }, 
      { status: 500 }
    );
  }
}