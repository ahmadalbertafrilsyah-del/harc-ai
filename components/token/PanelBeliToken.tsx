"use client";

/**
 * Panel pembelian token AI untuk Guru & Siswa.
 *
 * Alur (sesuai kebijakan komersialisasi):
 *   1. Pengguna memilih paket atau mengisi jumlah token sendiri.
 *   2. Pengguna memastikan email penerima notifikasi.
 *   3. Sistem membuat QRIS dinamis sesuai nominal lalu menampilkan barcode-nya.
 *   4. Pengguna membayar, mengunggah bukti, lalu mengirim pesanan.
 *   5. Pesanan masuk ke Dasbor Admin; tim perantara ikut diberi tahu via email.
 *   6. Admin meng-ACC → token bertambah otomatis & email konfirmasi dikirim.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  QrCode,
  UploadCloud,
  CheckCircle2,
  Clock3,
  XCircle,
  Loader2,
  ShoppingCart,
  Mail,
  Info,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { unggahKeCloudinary, cloudinaryDikonfigurasi } from "@/lib/cloudinary";
import { buatQrisDinamis, qrisValid, urlGambarQr, formatRupiah } from "@/lib/qris";

type Paket = {
  id: string;
  nama: string;
  jumlahToken: number;
  harga: number;
  bonus?: number;
};

type KonfigurasiToken = {
  aktif?: boolean;
  qrisStatis?: string;
  hargaPer1000?: number;
  minPembelian?: number;
  emailTim?: string;
  paket?: Paket[];
  catatan?: string;
};

type Pesanan = {
  id: string;
  jumlahToken?: number;
  nominal?: number;
  paketNama?: string;
  status?: string;
  buktiUrl?: string;
  createdAt?: { seconds: number } | null;
};

export default function PanelBeliToken({ role }: { role: "guru" | "siswa" }) {
  // Kelas Tailwind ditulis utuh (bukan template dinamis) agar ikut ter-generate JIT.
  const C =
    role === "guru"
      ? {
          grad: "from-blue-600 to-blue-800",
          btn: "bg-blue-600 hover:bg-blue-700",
          sel: "border-blue-500 bg-blue-50 shadow-sm",
          text: "text-blue-700",
        }
      : {
          grad: "from-indigo-600 to-indigo-800",
          btn: "bg-indigo-600 hover:bg-indigo-700",
          sel: "border-indigo-500 bg-indigo-50 shadow-sm",
          text: "text-indigo-700",
        };

  const [uid, setUid] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [saldoToken, setSaldoToken] = useState(0);
  const [emailNotif, setEmailNotif] = useState("");

  const [konfig, setKonfig] = useState<KonfigurasiToken | null>(null);
  const [memuatKonfig, setMemuatKonfig] = useState(true);

  const [paketDipilih, setPaketDipilih] = useState<Paket | null>(null);
  const [jumlahCustom, setJumlahCustom] = useState<string>("");

  const [buktiUrl, setBuktiUrl] = useState("");
  const [mengunggah, setMengunggah] = useState(false);
  const [progresUnggah, setProgresUnggah] = useState(0);
  const [mengirim, setMengirim] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; tipe: "ok" | "err" | "info" } | null>(null);

  const [pesananSaya, setPesananSaya] = useState<Pesanan[]>([]);

  // ---- Memuat profil pengguna ----
  useEffect(() => {
    const auth = getAuth();
    let unsubUser: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubUser?.();
      if (!user) return;
      setUid(user.uid);
      if (user.email) setEmailNotif((prev) => prev || user.email || "");
      unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setNama(d.nama || "");
          setSaldoToken(d.aiTokens || 0);
          if (d.email) setEmailNotif((prev) => prev || d.email);
        }
      });
    });
    return () => {
      unsubAuth();
      unsubUser?.();
    };
  }, []);

  // ---- Memuat konfigurasi token ----
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "sistem_pengaturan", "token_komersil"),
      (snap) => {
        setKonfig(snap.exists() ? (snap.data() as KonfigurasiToken) : {});
        setMemuatKonfig(false);
      },
      () => setMemuatKonfig(false),
    );
    return () => unsub();
  }, []);

  // ---- Memuat pesanan milik pengguna ----
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "pesanan_token"), where("uid", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Pesanan[];
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPesananSaya(list);
    });
    return () => unsub();
  }, [uid]);

  const hargaPer1000 = konfig?.hargaPer1000 || 0;
  const paketList = konfig?.paket || [];
  const qrisStatis = konfig?.qrisStatis || "";
  const qrisTersedia = qrisValid(qrisStatis);
  const siapJual = !!konfig?.aktif && qrisTersedia && (paketList.length > 0 || hargaPer1000 > 0);

  // ---- Hitung pesanan aktif ----
  const pesananAktif = useMemo(() => {
    if (paketDipilih) {
      return {
        jumlahToken: paketDipilih.jumlahToken + (paketDipilih.bonus || 0),
        nominal: paketDipilih.harga,
        label: paketDipilih.nama,
      };
    }
    const jml = parseInt(jumlahCustom, 10);
    if (!isNaN(jml) && jml > 0 && hargaPer1000 > 0) {
      // Harga ditetapkan per 1.000 token, lalu dikali proporsional oleh sistem.
      return {
        jumlahToken: jml,
        nominal: Math.round((jml / 1000) * hargaPer1000),
        label: "Token Mandiri",
      };
    }
    return null;
  }, [paketDipilih, jumlahCustom, hargaPer1000]);

  // ---- QRIS dinamis ----
  const qrisDinamis = useMemo(() => {
    if (!pesananAktif || !qrisTersedia) return "";
    try {
      return buatQrisDinamis(qrisStatis, pesananAktif.nominal);
    } catch {
      return "";
    }
  }, [pesananAktif, qrisTersedia, qrisStatis]);

  const minPembelian = konfig?.minPembelian || 0;

  const resetPilihan = () => {
    setPaketDipilih(null);
    setJumlahCustom("");
    setBuktiUrl("");
    setProgresUnggah(0);
  };

  const handleUnggahBukti = async (file: File) => {
    if (!cloudinaryDikonfigurasi()) {
      setPesan({ teks: "Penyimpanan berkas belum dikonfigurasi. Hubungi admin.", tipe: "err" });
      return;
    }
    setMengunggah(true);
    setProgresUnggah(0);
    setPesan(null);
    try {
      const hasil = await unggahKeCloudinary(file, {
        folder: `bukti-token/${uid}`,
        resourceType: "image",
        onProgres: (p) => setProgresUnggah(p),
      });
      setBuktiUrl(hasil.url);
    } catch (e: unknown) {
      setPesan({ teks: (e as Error)?.message || "Gagal mengunggah bukti.", tipe: "err" });
    } finally {
      setMengunggah(false);
    }
  };

  const handleKirimPesanan = async () => {
    if (!uid || !pesananAktif) return;
    const emailBersih = emailNotif.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBersih)) {
      setPesan({ teks: "Masukkan alamat email yang valid untuk menerima konfirmasi.", tipe: "err" });
      return;
    }
    if (minPembelian > 0 && pesananAktif.nominal < minPembelian) {
      setPesan({ teks: `Minimal pembelian ${formatRupiah(minPembelian)}.`, tipe: "err" });
      return;
    }
    if (!buktiUrl) {
      setPesan({ teks: "Unggah bukti pembayaran terlebih dahulu.", tipe: "err" });
      return;
    }

    setMengirim(true);
    setPesan(null);
    try {
      await addDoc(collection(db, "pesanan_token"), {
        uid,
        nama,
        email: emailBersih,
        role,
        jumlahToken: pesananAktif.jumlahToken,
        nominal: pesananAktif.nominal,
        paketNama: pesananAktif.label,
        hargaPer1000: paketDipilih ? null : hargaPer1000,
        buktiUrl,
        status: "menunggu_verifikasi",
        createdAt: serverTimestamp(),
      });

      // Beri tahu tim perantara lewat email official (tidak menggagalkan pesanan bila gagal).
      const emailTim = (konfig?.emailTim || "").trim();
      if (emailTim) {
        try {
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tipeEmail: "pesanan-token-baru",
              email: emailTim,
              role,
              namaPembeli: nama,
              emailPembeli: emailBersih,
              jumlahToken: pesananAktif.jumlahToken,
              nominal: pesananAktif.nominal,
              buktiUrl,
            }),
          });
        } catch {
          /* diabaikan: notifikasi tim bersifat tambahan */
        }
      }

      setPesan({
        teks: "Pesanan terkirim! Token akan ditambahkan setelah admin memverifikasi pembayaran Anda.",
        tipe: "ok",
      });
      resetPilihan();
    } catch (e: unknown) {
      setPesan({ teks: (e as Error)?.message || "Gagal mengirim pesanan.", tipe: "err" });
    } finally {
      setMengirim(false);
    }
  };

  const badgeStatus = (status?: string) => {
    if (status === "disetujui")
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
          <CheckCircle2 size={13} /> Disetujui
        </span>
      );
    if (status === "ditolak")
      return (
        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-bold">
          <XCircle size={13} /> Ditolak
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
        <Clock3 size={13} /> Menunggu Verifikasi
      </span>
    );
  };

  if (memuatKonfig) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Memuat layanan token…
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-6">
      {/* Ringkasan saldo */}
      <div className={`rounded-2xl p-5 md:p-6 bg-gradient-to-br ${C.grad} text-white shadow-lg`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-white/70 text-sm">Saldo Token AI Anda</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-1 flex items-center gap-2">
              <Coins className="text-amber-300" size={30} /> {saldoToken.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="text-right text-xs text-white/70 max-w-[220px]">
            <ShoppingCart className="inline mb-1" size={18} /> Beli token untuk melanjutkan penggunaan
            fitur AI tanpa batas kuota awal.
          </div>
        </div>
      </div>

      {pesan && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            pesan.tipe === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : pesan.tipe === "err"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          {pesan.teks}
        </motion.div>
      )}

      {!siapJual ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <Info className="mx-auto mb-3 text-slate-400" size={28} />
          <p className="font-semibold text-slate-700">Pembelian token belum tersedia</p>
          <p className="text-sm mt-1">
            Admin belum mengaktifkan atau menyelesaikan konfigurasi pembayaran token. Silakan coba lagi
            nanti.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Kiri: pilih paket */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-3">1. Pilih Paket Token</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {paketList.map((p) => {
                  const aktif = paketDipilih?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPaketDipilih(p);
                        setJumlahCustom("");
                        setBuktiUrl("");
                      }}
                      className={`text-left rounded-xl border-2 p-3 transition-all ${
                        aktif ? C.sel : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <p className="font-bold text-slate-800 text-sm">{p.nama}</p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Coins size={12} className="text-amber-500" />
                        {p.jumlahToken.toLocaleString("id-ID")}
                        {p.bonus ? ` +${p.bonus.toLocaleString("id-ID")}` : ""}
                      </p>
                      <p className={`${C.text} font-extrabold text-sm mt-1.5`}>
                        {formatRupiah(p.harga)}
                      </p>
                    </button>
                  );
                })}
              </div>

              {hargaPer1000 > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <label className="text-sm font-semibold text-slate-700">
                    Atau tentukan jumlah sendiri
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={jumlahCustom}
                        onChange={(e) => {
                          setJumlahCustom(e.target.value);
                          setPaketDipilih(null);
                          setBuktiUrl("");
                        }}
                        placeholder="cth. 15000"
                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">token</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Harga {formatRupiah(hargaPer1000)} / 1.000 token — total dihitung otomatis.
                    {minPembelian > 0 ? ` Minimal ${formatRupiah(minPembelian)}.` : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Email notifikasi */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-3">2. Email Konfirmasi</h3>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Pesan &quot;token telah ditambahkan&quot; dikirim ke email ini setelah admin menyetujui.
              </p>
            </div>
          </div>

          {/* Kanan: pembayaran */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:sticky lg:top-4">
              <h3 className="font-bold text-slate-800 mb-3">3. Bayar via QRIS</h3>

              {!pesananAktif ? (
                <div className="text-center py-10 text-slate-400">
                  <QrCode className="mx-auto mb-2" size={32} />
                  <p className="text-sm">Pilih paket atau isi jumlah token untuk memunculkan QRIS.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-500">{pesananAktif.label}</span>
                    <span className="font-semibold text-slate-700">
                      {pesananAktif.jumlahToken.toLocaleString("id-ID")} token
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 text-sm">Total</span>
                    <span className={`${C.text} font-extrabold text-lg`}>
                      {formatRupiah(pesananAktif.nominal)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col items-center">
                    {qrisDinamis ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={urlGambarQr(qrisDinamis, 320)}
                        alt="QRIS Pembayaran"
                        width={220}
                        height={220}
                        className="w-[220px] h-[220px] bg-white rounded-lg"
                      />
                    ) : (
                      <p className="text-xs text-rose-600 py-8 text-center">
                        QRIS gagal dibuat. Periksa konfigurasi QRIS di admin.
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-2 text-center">
                      Pindai dengan aplikasi mobile banking / e-wallet. Nominal sudah otomatis sesuai
                      pesanan.
                    </p>
                  </div>

                  {/* Unggah bukti */}
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">4. Unggah Bukti Bayar</p>
                    {buktiUrl ? (
                      <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                        <CheckCircle2 size={16} /> Bukti terunggah
                        <button
                          onClick={() => setBuktiUrl("")}
                          className="ml-auto text-xs text-slate-500 hover:text-rose-600 underline"
                        >
                          Ganti
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-3 py-4 text-sm cursor-pointer transition-colors ${
                          mengunggah
                            ? "border-slate-200 text-slate-400"
                            : "border-slate-300 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {mengunggah ? (
                          <>
                            <Loader2 className="animate-spin" size={16} /> Mengunggah {progresUnggah}%
                          </>
                        ) : (
                          <>
                            <UploadCloud size={16} /> Pilih gambar bukti
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={mengunggah}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUnggahBukti(f);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <button
                    onClick={handleKirimPesanan}
                    disabled={mengirim || mengunggah || !buktiUrl}
                    className={`mt-4 w-full flex items-center justify-center gap-2 ${C.btn} disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-colors`}
                  >
                    {mengirim ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Mengirim…
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={18} /> Kirim Pesanan
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Riwayat pesanan */}
      {pesananSaya.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-3">Riwayat Pesanan Saya</h3>
          <div className="space-y-2">
            {pesananSaya.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl px-3 py-2.5 flex-wrap"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {p.paketNama || "Token"} · {(p.jumlahToken || 0).toLocaleString("id-ID")} token
                  </p>
                  <p className="text-xs text-slate-400">{formatRupiah(p.nominal || 0)}</p>
                </div>
                {badgeStatus(p.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
