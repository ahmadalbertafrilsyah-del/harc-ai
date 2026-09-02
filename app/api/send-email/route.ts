import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, nama, role, passwordAwal, tipeEmail, otpCode } = await req.json();

    // --- PERBAIKAN KONFIGURASI UNTUK RAILWAY ---
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, 
      secure: true, 
      auth: {
        user: process.env.EMAIL_USER as string,
        pass: process.env.EMAIL_PASS as string,
      },
      family: 4, // WAJIB ditambahkan untuk Railway agar terhindar dari error IPv6 (ENETUNREACH)
    } as any);

    let mailSubject = '';
    let mailHtml = '';

    // LOGIKA 1: EMAIL UNTUK OTP (6 ANGKA)
    if (tipeEmail === 'otp') {
      mailSubject = 'Kode Verifikasi Pendaftaran HARC-AI';
      mailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #1e3a8a; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Verifikasi Email</h2>
          </div>
          <div style="padding: 30px 20px;">
            <p>Halo, <strong>${nama}</strong>!</p>
            <p>Gunakan kode rahasia 6 angka di bawah ini untuk memverifikasi pendaftaran akun <strong>${role}</strong> Anda di Portal Akademik HARC-AI:</p>
            
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otpCode}</span>
            </div>
            
            <p style="font-size: 12px; color: #64748b;">*Kode ini berlaku selama 10 menit. Jangan berikan kode ini kepada siapa pun.</p>
          </div>
        </div>
      `;
    } 
    // LOGIKA 2: EMAIL UNTUK ACC MANUAL ADMIN
    else {
      mailSubject = 'Akses Portal Akademik HARC-AI Disetujui';
      mailHtml = `
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
      `;
    }

    // Susun pesan final
    const mailOptions = {
      from: `"Sistem HARC-AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: mailSubject,
      html: mailHtml,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Email notifikasi berhasil dikirim' }, { status: 200 });

  } catch (error) {
    console.error("Error mengirim email:", error);
    return NextResponse.json({ error: 'Gagal mengirim email' }, { status: 500 });
  }
}