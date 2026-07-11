import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
// Impor Firebase Admin SDK (Sesuaikan path file dengan struktur proyek Anda)
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    // 1. TANGKAP DAN VALIDASI TOKEN DARI FRONTEND
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Akses Ditolak. Token Autentikasi tidak ditemukan." }, 
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    
    try {
      // Verifikasi token menggunakan Firebase Admin
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah kedaluwarsa. Silakan login ulang." }, 
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // 2. CEK SALDO TOKEN PENGGUNA DI DATABASE BACKEND
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "Data pengguna tidak ditemukan." }, { status: 404 });
    }

    const userData = userDoc.data();
    const currentTokens = userData?.aiTokens || 0;

    if (currentTokens <= 0) {
      return NextResponse.json(
        { error: "Saldo token AI habis. Silakan hubungi Administrator." }, 
        { status: 403 }
      );
    }

    // 3. PROSES BODY REQUEST & INISIALISASI GEMINI
    const body = await req.json();
    const { messages, model = "gemini-2.5-flash" } = body;

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

    // Memisahkan Instruksi Sistem dan Pesan Pengguna
    const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
    const userMsgs = messages.filter((m: any) => m.role !== "system");
    
    let promptText = "";
    if (systemMsg) {
      promptText += `[INSTRUKSI SISTEM MUTLAK]:\n${systemMsg}\n\n`;
    }
    promptText += userMsgs.map((m: any) => `[PERMINTAAN PENGGUNA]:\n${m.content}`).join("\n\n");

    // 4. MENGIRIM KE GOOGLE GEMINI
    const result = await gemini.generateContent(promptText);
    const responseText = result.response.text();

    if (!responseText) {
      return NextResponse.json(
        { error: "Mesin AI tidak mengembalikan teks apa pun." },
        { status: 500 }
      );
    }

    // 5. HITUNG DAN POTONG TOKEN LANGSUNG DI BACKEND
    // Estimasi kasar: 1 token ~ 4 karakter
    const estimatedTokensUsed = Math.round((promptText.length + responseText.length) / 4);

    // Amankan database dengan memotong kuota langsung dari server
    await userRef.update({
      aiTokens: FieldValue.increment(-estimatedTokensUsed)
    });

    // 6. KEMBALIKAN RESPONS KE FRONTEND
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
        total_tokens: estimatedTokensUsed,
        sisa_token: currentTokens - estimatedTokensUsed // Informasi tambahan untuk UI
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