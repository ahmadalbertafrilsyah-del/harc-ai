import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Membaca 'KTP' (Role) dari Cookies
  const userRole = request.cookies.get('userRole')?.value;

  // 1. Blokir akses jika belum login sama sekali
  if (pathname.startsWith('/dashboard') && !userRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Kunci Pintu Dashboard Admin
  if (pathname.startsWith('/dashboard/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL(`/dashboard/${userRole}/beranda`, request.url));
  }

  // 3. Kunci Pintu Dashboard Lembaga
  if (pathname.startsWith('/dashboard/lembaga') && userRole !== 'lembaga') {
    return NextResponse.redirect(new URL(`/dashboard/${userRole}/beranda`, request.url));
  }

  // 4. Kunci Pintu Dashboard Guru
  if (pathname.startsWith('/dashboard/guru') && userRole !== 'guru') {
    return NextResponse.redirect(new URL(`/dashboard/${userRole}/beranda`, request.url));
  }

  // 5. Kunci Pintu Dashboard Siswa
  if (pathname.startsWith('/dashboard/siswa') && userRole !== 'siswa') {
    return NextResponse.redirect(new URL(`/dashboard/${userRole}/beranda`, request.url));
  }

  // Izinkan lewat jika role sesuai dengan rute
  return NextResponse.next();
}

// Tentukan rute mana saja yang harus dijaga oleh Satpam (Middleware) ini
export const config = {
  matcher: ['/dashboard/:path*'],
};