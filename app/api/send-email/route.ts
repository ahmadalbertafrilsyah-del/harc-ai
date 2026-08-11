// app/api/send-email/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, nama, role, passwordAwal } = await req.json();

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // wajib 'true' untuk port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Susun pesan email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Akses Portal Akademik HARC-AI Disetujui',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Halo, ${nama}!</h2>
          <p>Pengajuan akun <strong>${role}</strong> Anda di Portal Akademik HARC-AI telah disetujui.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Detail Akses:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Email / Username:</strong> ${email}</li>
              ${
                passwordAwal 
                  ? `<li><strong>Kata Sandi Sementara:</strong> ${passwordAwal} <br/><small>(Segera ganti setelah masuk)</small></li>` 
                  : `<li><strong>Kata Sandi:</strong> (Gunakan kata sandi yang Anda buat saat pendaftaran)</li>`
              }
            </ul>
          </div>

          <p>Silakan masuk ke sistem melalui tautan di bawah ini:</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #1e3a8a; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Masuk ke Portal Akademik</a>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Email notifikasi berhasil dikirim' }, { status: 200 });

  } catch (error) {
    console.error("Error mengirim email:", error);
    return NextResponse.json({ error: 'Gagal mengirim email' }, { status: 500 });
  }
}