"use client";

import { useCallback, useEffect, useState } from "react";

export type Tema = "light" | "dark";

/** Kunci penyimpanan dipakai bersama oleh beranda dan halaman login. */
export const KUNCI_TEMA = "harc-theme";

/** Urutan sumber: atribut <html> (disetel skrip bootstrap) → localStorage → preferensi sistem. */
export function bacaTema(): Tema {
  if (typeof document === "undefined") return "light";

  const dariHtml = document.documentElement.dataset.theme;
  if (dariHtml === "dark" || dariHtml === "light") return dariHtml;

  try {
    const disimpan = window.localStorage.getItem(KUNCI_TEMA);
    if (disimpan === "dark" || disimpan === "light") return disimpan;
  } catch {
    /* penyimpanan tidak tersedia */
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Tema yang diingat antar halaman dan antar tab.
 *
 * Nilai awal dibaca saat render pertama di klien, bukan di dalam efek,
 * sehingga tidak ada kedipan warna. Pembungkus yang memakai nilai ini
 * perlu diberi suppressHydrationWarning karena markup server selalu terang.
 */
export function useTema() {
  const [tema, setTema] = useState<Tema>(bacaTema);

  /* Samakan <html> agar latar di luar area halaman ikut berubah. */
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    document.documentElement.style.colorScheme = tema;
  }, [tema]);

  /* Ikut berubah bila tema diganti di tab lain. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KUNCI_TEMA) return;
      if (e.newValue === "dark" || e.newValue === "light") setTema(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const gantiTema = useCallback(() => {
    setTema((kini) => {
      const berikut: Tema = kini === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(KUNCI_TEMA, berikut);
      } catch {
        /* penyimpanan tidak tersedia */
      }
      return berikut;
    });
  }, []);

  return { tema, gantiTema };
}
