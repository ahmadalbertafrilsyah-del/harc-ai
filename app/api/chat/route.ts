import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model = "gemini-2.5-flash" } = body;

    // Menarik API Key dari file .env atau .env.local
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("API Key tidak ditemukan.");
      return NextResponse.json(
        { error: "Kunci API Google Gemini belum diatur di sistem." }, 
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelToUse = model || "gemini-2.5-pro";
    const gemini = genAI.getGenerativeModel({ model: modelToUse });

    // Memisahkan Instruksi Sistem (dari Admin/Korpus) dan Pesan Pengguna (dari Guru)
    const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
    const userMsgs = messages.filter((m: any) => m.role !== "system");
    
    // Menggabungkan pesan menjadi satu Prompt utuh yang bisa dipahami Gemini
    let promptText = "";
    if (systemMsg) {
      promptText += `[INSTRUKSI SISTEM MULTLAK]:\n${systemMsg}\n\n`;
    }
    promptText += userMsgs.map((m: any) => `[PERMINTAAN PENGGUNA]:\n${m.content}`).join("\n\n");

    // Mengirim ke Google Gemini
    const result = await gemini.generateContent(promptText);
    const responseText = result.response.text();

    if (!responseText) {
      return NextResponse.json(
        { error: "Mesin AI tidak mengembalikan teks apa pun." },
        { status: 500 }
      );
    }

    // Mengembalikan data ke frontend dengan struktur menyerupai OpenAI
    // (Hal ini agar kodingan frontend 'data.choices[0].message.content' tetap berfungsi)
    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: responseText
          }
        }
      ],
      usage: {
        // Estimasi kasar penggunaan token (1 token ~ 4 karakter) 
        // Ini digunakan untuk memotong saldo koin/token Guru
        total_tokens: Math.round((promptText.length + responseText.length) / 4)
      }
    });

  } catch (error: any) {
    console.error("Kesalahan API Route:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal saat memproses AI." }, 
      { status: 500 }
    );
  }
}