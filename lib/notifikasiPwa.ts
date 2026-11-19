"use client";

export type TipeToast = "sukses" | "error" | "info";

export type MuatanToast = {
  tipe?: TipeToast;
  judul?: string;
  pesan: string;
  durasiMs?: number;
  kirimPwa?: boolean;
  url?: string;
};

/** Memicu kotak notifikasi/ACC animasi di layar dan opsional notifikasi sistem PWA. */
export function tampilkanNotifikasi(muatan: MuatanToast) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<MuatanToast>("harc:toast", { detail: muatan }));
  if (muatan.kirimPwa) {
    void kirimNotifikasiPwa({
      judul: muatan.judul || "HARC-AI",
      isi: muatan.pesan,
      url: muatan.url,
    });
  }
}

/** Mengirim notifikasi native OS melalui Service Worker saat aplikasi terinstal / izin aktif. */
export async function kirimNotifikasiPwa({
  judul,
  isi,
  url = "/dashboard",
}: {
  judul: string;
  isi: string;
  url?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const opsi: NotificationOptions = {
    body: isi,
    icon: "/logo.png",
    badge: "/icon.png",
    tag: `harc-${judul}`,
    data: { url },
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg?.showNotification) {
        await reg.showNotification(judul, opsi);
        return true;
      }
    }
    new Notification(judul, opsi);
    return true;
  } catch {
    return false;
  }
}

/** Meminta izin notifikasi native browser/PWA melalui aksi sentuhan pengguna. */
export async function mintaIzinNotifikasi(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
