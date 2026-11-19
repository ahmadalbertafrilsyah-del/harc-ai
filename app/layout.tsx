import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaBootstrap from "@/components/PwaBootstrap";
import NotifikasiToast from "@/components/NotifikasiToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal Akademik HARC-AI | Mahatma Academy",
  description:
    "Platform perangkat pembelajaran Kemendikdasmen & Kemenag serta e-learning interaktif untuk meningkatkan prestasi siswa.",
  applicationName: "HARC-AI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HARC-AI",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.png",
    apple: "/logo.png",
  },
};

/* Warna bilah status ponsel ikut tema, agar terasa seperti aplikasi. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5F1" },
    { media: "(prefers-color-scheme: dark)", color: "#12151C" },
  ],
};

/* Dijalankan sebelum halaman digambar, sehingga tema tersimpan langsung
   terpasang dan tidak ada kedipan putih di mode gelap. */
const BOOTSTRAP_TEMA = `
(function(){try{
  var k=localStorage.getItem('harc-theme');
  var t=(k==='dark'||k==='light')?k:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=t;
  document.documentElement.style.colorScheme=t;
}catch(e){
  document.documentElement.dataset.theme='light';
}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">
        <PwaBootstrap />
        <NotifikasiToast />
        {children}
      </body>
    </html>
  );
}
