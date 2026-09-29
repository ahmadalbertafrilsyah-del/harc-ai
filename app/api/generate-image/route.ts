import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const maxDuration = 120;

/** Model gambar Gemini. Dipanggil lewat REST agar tidak terikat versi SDK. */
const MODEL_GAMBAR = "gemini-2.5-flash-image";

/**
 * Perkiraan biaya token untuk satu gambar. Model gambar tidak melaporkan
 * pemakaian dalam satuan yang sama dengan teks, jadi dipatok tetap agar kuota
 * guru tetap terpotong secara adil dan dapat diprediksi.
 */
const BIAYA_TOKEN_PER_GAMBAR = 1290;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Akses ditolak. Token autentikasi tidak ditemukan." }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch {
      return NextResponse.json({ error: "Sesi tidak valid atau telah kedaluwarsa." }, { status: 401 });
    }

    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Data pengguna tidak ditemukan." }, { status: 404 });
    }

    const sisaToken = userDoc.data()?.aiTokens || 0;
    if (sisaToken < BIAYA_TOKEN_PER_GAMBAR) {
      return NextResponse.json(
        { error: `Token AI tidak mencukupi. Pembuatan satu gambar memerlukan ${BIAYA_TOKEN_PER_GAMBAR} token.` },
        { status: 403 }
      );
    }

    const { deskripsi, mapel, jenjang } = await req.json();
    if (!deskripsi || typeof deskripsi !== "string") {
      return NextResponse.json({ error: "Deskripsi gambar wajib diisi." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Kunci API Google Gemini belum diatur di sistem." }, { status: 500 });
    }

    // Instruksi tetap: gambar untuk bahan ajar, bukan ilustrasi bebas.
    const prompt = [
      `Buat satu gambar ilustrasi untuk bahan ajar sekolah di Indonesia.`,
      mapel ? `Mata pelajaran: ${mapel}.` : "",
      jenjang ? `Jenjang peserta didik: ${jenjang}.` : "",
      `Deskripsi: ${deskripsi}`,
      `Ketentuan wajib:`,
      `- Gaya ilustrasi edukatif yang bersih, garis tegas, latar putih polos.`,
      `- Aman dan pantas untuk anak sekolah, tanpa unsur kekerasan atau SARA.`,
      `- Jangan menuliskan teks, angka, label, rumus, atau huruf apa pun di dalam gambar.`,
      `- Kontras tinggi agar tetap terbaca saat dicetak hitam-putih.`,
      `- Satu objek/adegan utama saja, komposisi terpusat.`,
    ]
      .filter(Boolean)
      .join("\n");

    const respons = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_GAMBAR}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!respons.ok) {
      const detail = await respons.text();
      console.error("Gagal memanggil model gambar:", respons.status, detail);
      return NextResponse.json(
        {
          error:
            respons.status === 404
              ? "Model pembuat gambar belum aktif pada kunci API ini. Gunakan mode diagram SVG."
              : "Layanan pembuat gambar sedang tidak dapat diakses.",
        },
        { status: 502 }
      );
    }

    const data = await respons.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const bagianGambar = parts.find((p: any) => p.inlineData?.data);

    if (!bagianGambar) {
      return NextResponse.json(
        { error: "Model tidak mengembalikan gambar. Coba perjelas deskripsi gambar." },
        { status: 502 }
      );
    }

    await userRef.update({ aiTokens: FieldValue.increment(-BIAYA_TOKEN_PER_GAMBAR) });

    const mimeType = bagianGambar.inlineData.mimeType || "image/png";
    return NextResponse.json({
      dataUrl: `data:${mimeType};base64,${bagianGambar.inlineData.data}`,
      mimeType,
      tokenDipakai: BIAYA_TOKEN_PER_GAMBAR,
      sisaToken: sisaToken - BIAYA_TOKEN_PER_GAMBAR,
    });
  } catch (error: any) {
    console.error("Kesalahan API gambar:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan internal saat membuat gambar." },
      { status: 500 }
    );
  }
}
