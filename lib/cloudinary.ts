"use client";

/**
 * Integrasi unggah berkas ke Cloudinary (gambar & dokumen).
 *
 * Seluruh unggahan memakai *unsigned upload preset* sehingga berjalan langsung
 * dari browser tanpa menandatangani permintaan di server. Dua nilai wajib ada di
 * `.env.local`:
 *
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   — nama cloud di dashboard Cloudinary
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET — nama preset unsigned yang dibuat
 *
 * Catatan: menghapus berkas dari Cloudinary menuntut tanda tangan rahasia
 * (API secret) yang tidak boleh dibawa ke browser, jadi penghapusan di sisi
 * klien hanya melepas rujukan dari basis data, bukan menghapus berkas fisik.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/** Nilai placeholder bawaan agar tidak dianggap sudah terkonfigurasi. */
const PLACEHOLDER = ["", "isi_dengan_cloud_name", "isi_dengan_upload_preset"];

/** Apakah kredensial Cloudinary sudah diisi dengan nilai nyata. */
export function cloudinaryDikonfigurasi(): boolean {
  return (
    !!CLOUD_NAME &&
    !!UPLOAD_PRESET &&
    !PLACEHOLDER.includes(CLOUD_NAME) &&
    !PLACEHOLDER.includes(UPLOAD_PRESET)
  );
}

export type HasilUnggah = {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  resourceType: string;
};

export type OpsiUnggah = {
  /** Subfolder di Cloudinary, mis. "gambar-ajar/uid". */
  folder?: string;
  /** "image" untuk gambar, "raw" untuk dokumen, "auto" mendeteksi sendiri. */
  resourceType?: "image" | "raw" | "auto" | "video";
  /** Dipanggil berkala dengan persentase 0–100 selama proses unggah. */
  onProgres?: (persen: number) => void;
};

const PESAN_BELUM_DIKONFIGURASI =
  "Cloudinary belum dikonfigurasi. Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET di .env.local, lalu jalankan ulang server.";

function endpoint(resourceType: string): string {
  return `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
}

/**
 * Inti unggah: mengirim FormData lewat XMLHttpRequest agar progres byte bisa
 * dilaporkan. Mengembalikan metadata berkas yang tersimpan.
 */
function kirim(formData: FormData, resourceType: string, onProgres?: (persen: number) => void): Promise<HasilUnggah> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint(resourceType));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgres) {
        onProgres(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            format: data.format || "",
            bytes: data.bytes || 0,
            resourceType: data.resource_type || resourceType,
          });
        } else {
          reject(new Error(data?.error?.message || `Gagal mengunggah (HTTP ${xhr.status}).`));
        }
      } catch {
        reject(new Error("Respons Cloudinary tidak dapat dibaca."));
      }
    };

    xhr.onerror = () => reject(new Error("Gagal terhubung ke Cloudinary. Periksa koneksi internet."));
    xhr.send(formData);
  });
}

/** Mengunggah objek File/Blob (dari input berkas) ke Cloudinary. */
export async function unggahKeCloudinary(file: File | Blob, opsi: OpsiUnggah = {}): Promise<HasilUnggah> {
  if (!cloudinaryDikonfigurasi()) throw new Error(PESAN_BELUM_DIKONFIGURASI);

  const resourceType = opsi.resourceType || "auto";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET as string);
  if (opsi.folder) formData.append("folder", opsi.folder);

  return kirim(formData, resourceType, opsi.onProgres);
}

/** Mengunggah data URL (mis. "data:image/png;base64,....") ke Cloudinary. */
export async function unggahDataUrlKeCloudinary(dataUrl: string, opsi: OpsiUnggah = {}): Promise<HasilUnggah> {
  if (!cloudinaryDikonfigurasi()) throw new Error(PESAN_BELUM_DIKONFIGURASI);

  const resourceType = opsi.resourceType || "image";
  const formData = new FormData();
  formData.append("file", dataUrl);
  formData.append("upload_preset", UPLOAD_PRESET as string);
  if (opsi.folder) formData.append("folder", opsi.folder);

  return kirim(formData, resourceType, opsi.onProgres);
}
