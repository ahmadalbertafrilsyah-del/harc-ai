import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HARC-AI | Perangkat Ajar & E-Learning",
    short_name: "HARC-AI",
    description:
      "Platform penyusunan perangkat pembelajaran Kemendikdasmen & Kemenag serta e-learning soal interaktif untuk meningkatkan prestasi siswa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: "#1e3a8a",
    lang: "id",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
