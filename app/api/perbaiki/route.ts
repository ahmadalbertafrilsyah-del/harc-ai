import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const maxDuration = 120;

/**
 * Perbaikan AI untuk sebagian dokumen (bukan seluruhnya).
 *
 * Hanya potongan teks yang diseleksi guru yang dikirim ke model, sehingga jauh
 * lebih hemat token daripada regenerasi utuh. Model diminta mengembalikan HANYA
 * teks hasil revisi dengan format yang sama (Markdown/HTML dipertahankan).
 */

const INSTRUKSI: Record<string, string> = {
  perjelas: "Perjelas dan perkaya penjelasan berikut agar lebih mudah dipahami peserta didik, tanpa mengubah maknanya.",
  ringkas: "Ringkas teks berikut agar lebih padat dan langsung ke inti, tanpa menghilangkan poin penting.",
  tata_bahasa: "Perbaiki ejaan, tanda baca, dan tata bahasa Indonesia baku pada teks berikut.",
  formal: "Tulis ulang teks berikut dengan gaya bahasa akademik yang formal dan baku.",
  contoh: "Tambahkan satu atau dua contoh konkret yang relevan ke dalam teks berikut.",
  hots: "Tingkatkan taraf berpikir teks/soal berikut menjadi HOTS (analisis, evaluasi, atau mencipta), tetap sesuai materi.",
  mudah: "Sederhanakan bahasa teks berikut agar sesuai untuk peserta didik pada jenjang yang lebih rendah.",
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Akses ditolak. Token autentikasi tidak ditemukan." }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch {
      return NextResponse.json({ error: "Sesi tidak valid atau telah kedaluwarsa." }, { status: 401 });
    }

    const userRef = adminDb.collection("users").doc(decoded.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return NextResponse.json({ error: "Data pengguna tidak ditemukan." }, { status: 404 });

    const sisaToken = userDoc.data()?.aiTokens || 0;
    if (sisaToken <= 0) {
      return NextResponse.json({ error: "Saldo token AI habis. Hubungi Administrator." }, { status: 403 });
    }

    const { teks, mode, instruksiKustom, konteks, format } = await req.json();
    if (!teks || typeof teks !== "string" || teks.trim().length < 2) {
      return NextResponse.json({ error: "Tidak ada teks yang dipilih untuk diperbaiki." }, { status: 400 });
    }

    const arahan = mode === "kustom" ? (instruksiKustom || "").trim() : INSTRUKSI[mode];
    if (!arahan) return NextResponse.json({ error: "Instruksi perbaikan tidak dikenali." }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Kunci API Google Gemini belum diatur." }, { status: 500 });

    const jagaFormat =
      format === "html"
        ? "Teks memakai tag HTML. Pertahankan seluruh tag HTML yang ada dan strukturnya."
        : "Teks memakai Markdown. Pertahankan format Markdown (tabel, bold, list) yang ada.";

    const prompt = [
      "Anda adalah editor perangkat ajar dan naskah asesmen berbahasa Indonesia.",
      `Tugas: ${arahan}`,
      jagaFormat,
      "Balas HANYA dengan teks hasil revisi. Jangan menambahkan kalimat pembuka, penutup, tanda kutip, atau blok kode.",
      konteks ? `\nKonteks dokumen (untuk pemahaman, jangan diikutkan pada jawaban):\n"""${String(konteks).slice(0, 1200)}"""` : "",
      `\nTeks yang harus direvisi:\n"""${teks}"""`,
    ]
      .filter(Boolean)
      .join("\n");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    let hasil = (result.response.text() || "").trim();

    // Bersihkan bila model tetap membungkus dengan blok kode atau tanda kutip.
    hasil = hasil.replace(/^```[a-z]*\s*|\s*```$/gi, "").trim();

    if (!hasil) {
      return NextResponse.json({ error: "Model tidak mengembalikan hasil. Coba lagi." }, { status: 502 });
    }

    const tokenDipakai = Math.round((prompt.length + hasil.length) / 4);
    await userRef.update({ aiTokens: FieldValue.increment(-tokenDipakai) });

    return NextResponse.json({ hasil, tokenDipakai, sisaToken: sisaToken - tokenDipakai });
  } catch (error: any) {
    console.error("Kesalahan API perbaiki:", error);
    return NextResponse.json({ error: error?.message || "Terjadi kesalahan internal." }, { status: 500 });
  }
}
