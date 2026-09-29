import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const maxDuration = 180;

const MODEL_VISI = "gemini-2.5-flash";

/**
 * Membaca lembar jawaban hasil pindai kamera/unggahan menjadi daftar jawaban
 * per nomor. Penilaian akhir tetap dilakukan di sisi klien terhadap kunci,
 * dan guru wajib meninjau sebelum menyimpan — model hanya membantu membaca,
 * bukan memutuskan nilai.
 */
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

    const { gambarBase64, mimeType, nomorSoal, tipePerNomor } = await req.json();
    if (!gambarBase64) {
      return NextResponse.json({ error: "Berkas lembar jawaban tidak terkirim." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Kunci API Google Gemini belum diatur." }, { status: 500 });

    const daftarNomor: number[] = Array.isArray(nomorSoal) && nomorSoal.length
      ? nomorSoal
      : Array.from({ length: 50 }, (_, i) => i + 1);

    const keteranganTipe =
      tipePerNomor && typeof tipePerNomor === "object"
        ? `Jenis soal per nomor: ${JSON.stringify(tipePerNomor)}.`
        : "";

    const prompt = [
      `Anda adalah pemindai Lembar Jawaban Komputer (LJK) sekolah di Indonesia.`,
      `Bacalah gambar lembar jawaban ini dengan teliti.`,
      `Nomor soal yang harus dibaca: ${daftarNomor.join(", ")}.`,
      keteranganTipe,
      ``,
      `Aturan membaca:`,
      `- Untuk soal pilihan ganda, jawaban adalah huruf bulatan/kotak yang dihitamkan atau disilang (A, B, C, D, atau E).`,
      `- Untuk soal Benar/Salah, jawaban adalah "Benar" atau "Salah".`,
      `- Untuk isian singkat dan uraian, salin tulisan tangan peserta apa adanya.`,
      `- Jika satu nomor tidak diisi, tidak terbaca, atau terisi ganda, kembalikan string kosong dan catat nomornya pada "ragu".`,
      `- Jangan menebak. Lebih baik dikosongkan daripada salah baca.`,
      ``,
      `Bacalah juga Nama Peserta dan Nomor Induk pada kolom identitas bila terbaca.`,
      ``,
      `Balas HANYA dengan JSON valid tanpa penjelasan dan tanpa pembungkus blok kode, dengan bentuk persis:`,
      `{"nama":"","nomorInduk":"","jawaban":{"1":"A","2":"B"},"ragu":[3,7],"catatan":""}`,
    ]
      .filter(Boolean)
      .join("\n");

    const respons = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_VISI}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || "image/jpeg", data: gambarBase64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      }
    );

    if (!respons.ok) {
      const detail = await respons.text();
      console.error("Gagal memanggil model visi:", respons.status, detail);
      return NextResponse.json({ error: "Layanan pemindai LJK sedang tidak dapat diakses." }, { status: 502 });
    }

    const data = await respons.json();
    const teks: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";

    let hasil: any;
    try {
      // Sebagian model masih membungkus JSON dengan blok kode meski diminta tidak.
      hasil = JSON.parse(teks.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
    } catch {
      return NextResponse.json(
        { error: "Lembar jawaban tidak terbaca jelas. Foto ulang dengan pencahayaan lebih baik." },
        { status: 422 }
      );
    }

    const perkiraanToken = Math.round(prompt.length / 4) + 1500;
    await userRef.update({ aiTokens: FieldValue.increment(-perkiraanToken) });

    return NextResponse.json({
      nama: hasil.nama || "",
      nomorInduk: hasil.nomorInduk || "",
      jawaban: hasil.jawaban || {},
      ragu: Array.isArray(hasil.ragu) ? hasil.ragu : [],
      catatan: hasil.catatan || "",
      tokenDipakai: perkiraanToken,
    });
  } catch (error: any) {
    console.error("Kesalahan API koreksi LJK:", error);
    return NextResponse.json({ error: error?.message || "Terjadi kesalahan internal." }, { status: 500 });
  }
}
