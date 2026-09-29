import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Petunjuk (scaffolding) untuk siswa saat ujian berlangsung.
 *
 * Berbeda dari /api/chat: TIDAK memotong saldo token pribadi siswa (siswa
 * biasanya tidak diberi kuota token). Cukup memvalidasi bahwa pemanggil sudah
 * login, lalu memakai kuota harian bersama (sistem_pengaturan/ai_public) sebagai
 * pengaman biaya. Prompt dikunci agar AI HANYA memberi petunjuk, bukan jawaban.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Akses ditolak. Silakan login ulang." }, { status: 401 });
    }
    try {
      await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login ulang." }, { status: 401 });
    }

    const body = await req.json();
    const { soal, model = "gemini-2.5-flash" } = body;

    // Kuota harian bersama (pengaman biaya, tidak memblokir keras agar ujian lancar)
    const settingsRef = adminDb.collection("sistem_pengaturan").doc("ai_public");
    try {
      const snap = await settingsRef.get();
      const today = new Date().toISOString().split("T")[0];
      if (snap.exists && (snap.data()?.lastResetDate || "") !== today) {
        settingsRef.update({ tokensUsedToday: 0, lastResetDate: today }).catch(() => {});
      }
    } catch { /* abaikan */ }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Kunci API Google Gemini belum diatur di sistem." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({ model });

    const instruksi =
      "Anda tutor pendamping siswa saat ujian sedang berlangsung. ATURAN MUTLAK: DILARANG menyebutkan jawaban akhir, " +
      "opsi yang benar, hasil numerik akhir, atau pasangan yang tepat. Berikan HANYA SATU petunjuk konseptual singkat " +
      "(maksimal 2 kalimat, Bahasa Indonesia baku) yang menuntun cara berpikir siswa agar tetap mengerjakan mandiri. " +
      "Langsung tulis petunjuknya tanpa kalimat pembuka atau sapaan.";
    const prompt =
      `${instruksi}\n\n[SOAL]\nTipe: ${soal?.tipe || "-"}\n` +
      `Pertanyaan: ${String(soal?.pertanyaan || "").replace(/<svg[\s\S]*?<\/svg>/gi, "[gambar ilustrasi]")}` +
      (soal?.opsi?.length ? `\nOpsi: ${soal.opsi.map((o: any) => `${o.id}. ${o.teks}`).join("; ")}` : "");

    const result = await gemini.generateContent(prompt);
    const teks = result.response.text();
    if (!teks) {
      return NextResponse.json({ error: "Mesin AI tidak mengembalikan teks apa pun." }, { status: 500 });
    }

    const est = Math.round((prompt.length + teks.length) / 4);
    settingsRef.update({ tokensUsedToday: FieldValue.increment(est) }).catch(() => {});

    return NextResponse.json({ petunjuk: teks });
  } catch (error: any) {
    console.error("Kesalahan Petunjuk Ujian:", error);
    return NextResponse.json({ error: error.message || "Terjadi kesalahan internal." }, { status: 500 });
  }
}
