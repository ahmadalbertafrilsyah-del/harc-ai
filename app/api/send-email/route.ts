import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const {
      email,
      nama,
      role,
      passwordAwal,
      tipeEmail,
      otpCode,
      // Field tambahan untuk alur komersialisasi token.
      jumlahToken,
      sisaToken,
      nominal,
      namaPembeli,
      emailPembeli,
      buktiUrl,
      catatan,
    } = await req.json();

    const rupiah = (n: unknown) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
    const angka = (n: unknown) => (Number(n) || 0).toLocaleString("id-ID");

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, 
      secure: true,
      requireTLS: true, 
      auth: {
        user: process.env.EMAIL_USER as string,
        pass: process.env.EMAIL_PASS as string,
      },
      family: 4,
    } as any);

    // Tambahkan baris ini untuk mengecek koneksi SMTP sebelum email dikirim
    await transporter.verify();

    let mailSubject = '';
    let mailHtml = '';

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

    else if (tipeEmail === 'token-ditambahkan') {
      mailSubject = 'Token AI Berhasil Ditambahkan — HARC-AI';
      mailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 520px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #047857; padding: 22px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Token Telah Ditambahkan</h2>
          </div>
          <div style="padding: 28px 22px;">
            <p>Halo, <strong>${nama || 'Pengguna'}</strong>!</p>
            <p>Pembayaran Anda telah diverifikasi oleh admin dan token AI berhasil ditambahkan ke akun Anda.</p>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 18px; border-radius: 10px; margin: 20px 0; text-align: center;">
              <div style="font-size: 13px; color: #065f46;">Token Ditambahkan</div>
              <div style="font-size: 30px; font-weight: bold; color: #047857; margin: 4px 0;">+${angka(jumlahToken)}</div>
              ${sisaToken !== undefined && sisaToken !== null ? `<div style="font-size: 12px; color: #065f46;">Total saldo token sekarang: <strong>${angka(sisaToken)}</strong></div>` : ''}
            </div>
            <p style="font-size: 13px; color: #475569;">Terima kasih telah menggunakan layanan HARC-AI. Token siap dipakai untuk fitur-fitur AI pada portal Anda.</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #047857; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Buka Portal</a>
          </div>
        </div>
      `;
    }

    else if (tipeEmail === 'pesanan-token-baru') {
      mailSubject = `Pesanan Token Baru dari ${namaPembeli || 'Pengguna'} — HARC-AI`;
      mailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 540px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #1e3a8a; padding: 22px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Pesanan Token Baru</h2>
          </div>
          <div style="padding: 28px 22px;">
            <p>Ada pesanan pembelian token AI yang menunggu verifikasi di Dasbor Admin.</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 10px; margin: 16px 0;">
              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <tr><td style="padding:4px 0; color:#64748b;">Nama Pembeli</td><td style="padding:4px 0; font-weight:bold;">${namaPembeli || '-'}</td></tr>
                <tr><td style="padding:4px 0; color:#64748b;">Email</td><td style="padding:4px 0; font-weight:bold;">${emailPembeli || '-'}</td></tr>
                <tr><td style="padding:4px 0; color:#64748b;">Peran</td><td style="padding:4px 0; font-weight:bold;">${(role || '-').toString().toUpperCase()}</td></tr>
                <tr><td style="padding:4px 0; color:#64748b;">Jumlah Token</td><td style="padding:4px 0; font-weight:bold;">${angka(jumlahToken)}</td></tr>
                <tr><td style="padding:4px 0; color:#64748b;">Nominal</td><td style="padding:4px 0; font-weight:bold;">${rupiah(nominal)}</td></tr>
                ${catatan ? `<tr><td style="padding:4px 0; color:#64748b;">Catatan</td><td style="padding:4px 0;">${catatan}</td></tr>` : ''}
              </table>
            </div>
            ${buktiUrl ? `<p style="font-size:13px;color:#475569;">Bukti pembayaran:</p><a href="${buktiUrl}" style="color:#1e40af;">${buktiUrl}</a>` : '<p style="font-size:13px;color:#b45309;">Pembeli belum mengunggah bukti pembayaran.</p>'}
            <p style="margin-top:18px;">Silakan tinjau dan setujui (ACC) pesanan ini melalui menu <strong>Komersialisasi Token</strong> di Dasbor Admin.</p>
          </div>
        </div>
      `;
    }

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