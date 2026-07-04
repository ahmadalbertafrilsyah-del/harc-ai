import { NextResponse } from "next/server";
import { db } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model } = body;
    
    // Keamanan: API Key hanya dipanggil di lingkungan Server
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key tidak dikonfigurasi di server." }, { status: 500 });
    }

    let finalModel = model;

    // Jika model tidak dikirimkan dalam request, sistem akan mengecek ke Firestore
    if (!finalModel) {
      try {
        const configSnap = await getDoc(doc(db, "ai_monitoring", "api_config"));
        if (configSnap.exists()) {
          const configData = configSnap.data();
          finalModel = configData.modelName;
        }
      } catch (firebaseError) {
        console.error("Gagal menarik fallback model dari Firestore:", firebaseError);
      }
    }

    // Fallback terakhir jika database kosong atau gagal ditarik
    if (!finalModel) {
      finalModel = "gemini-1.5-flash"; 
    }

    // Eksekusi pemanggilan API ke Google AI Studio
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: finalModel,
        messages: messages
      })
    });

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Terjadi kesalahan internal server" }, { status: 500 });
  }
}