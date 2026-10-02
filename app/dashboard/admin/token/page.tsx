"use client";

/**
 * Komersialisasi Token — Dasbor Admin.
 *
 * Dua tab:
 *   • Pesanan      : meninjau pembelian token, melihat bukti bayar, lalu ACC/Tolak.
 *                    ACC menambah token pembeli otomatis + mengirim email konfirmasi.
 *   • Konfigurasi  : ID QRIS statis, harga per token, daftar paket, dan email tim
 *                    perantara yang menerima notifikasi tiap ada pesanan baru.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Coins,
  CheckCircle2,
  XCircle,
  Clock3,
  Settings2,
  ReceiptText,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  Loader2,
  QrCode,
  Power,
} from "lucide-react";

import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { qrisValid, urlGambarQr, formatRupiah, buatQrisDinamis } from "@/lib/qris";

type Paket = { id: string; nama: string; jumlahToken: number; harga: number; bonus?: number };

type Konfig = {
  aktif: boolean;
  qrisStatis: string;
  hargaPer1000: number;
  minPembelian: number;
  emailTim: string;
  catatan: string;
  paket: Paket[];
};

type Pesanan = {
  id: string;
  uid?: string;
  nama?: string;
  email?: string;
  role?: string;
  jumlahToken?: number;
  nominal?: number;
  paketNama?: string;
  buktiUrl?: string;
  status?: string;
  createdAt?: { seconds: number } | null;
};

const KONFIG_AWAL: Konfig = {
  aktif: false,
  qrisStatis: "",
  hargaPer1000: 0,
  minPembelian: 0,
  emailTim: "",
  catatan: "",
  paket: [],
};

export default function AdminTokenPage() {
  const [tab, setTab] = useState<"pesanan" | "konfigurasi">("pesanan");

  const [konfig, setKonfig] = useState<Konfig>(KONFIG_AWAL);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; tipe: "ok" | "err" } | null>(null);

  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [filter, setFilter] = useState<"menunggu_verifikasi" | "disetujui" | "ditolak" | "semua">(
    "menunggu_verifikasi",
  );
  const [memproses, setMemproses] = useState<string | null>(null);

  // ---- Memuat konfigurasi ----
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sistem_pengaturan", "token_komersil"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setKonfig({ ...KONFIG_AWAL, ...d, paket: Array.isArray(d.paket) ? d.paket : [] });
      }
    });
    return () => unsub();
  }, []);

  // ---- Memuat pesanan ----
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pesanan_token"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Pesanan[];
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPesanan(list);
    });
    return () => unsub();
  }, []);

  const pesananTampil = useMemo(() => {
    if (filter === "semua") return pesanan;
    return pesanan.filter((p) => (p.status || "menunggu_verifikasi") === filter);
  }, [pesanan, filter]);

  const jumlahMenunggu = useMemo(
    () => pesanan.filter((p) => (p.status || "menunggu_verifikasi") === "menunggu_verifikasi").length,
    [pesanan],
  );

  // ---- ACC pesanan ----
  const handleAcc = async (p: Pesanan) => {
    if (!p.uid || !p.jumlahToken) {
      setPesan({ teks: "Data pesanan tidak lengkap (uid/jumlah token).", tipe: "err" });
      return;
    }
    if (!confirm(`Setujui penambahan ${p.jumlahToken.toLocaleString("id-ID")} token untuk ${p.nama}?`))
      return;

    setMemproses(p.id);
    setPesan(null);
    try {
      const userRef = doc(db, "users", p.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setPesan({ teks: "Akun pembeli tidak ditemukan. Token tidak dapat ditambahkan.", tipe: "err" });
        setMemproses(null);
        return;
      }
      const saldoLama = userSnap.data()?.aiTokens || 0;
      const saldoBaru = saldoLama + p.jumlahToken;

      await updateDoc(userRef, { aiTokens: saldoBaru });
      await updateDoc(doc(db, "pesanan_token", p.id), {
        status: "disetujui",
        processedAt: serverTimestamp(),
        saldoSetelah: saldoBaru,
      });

      // Email "token telah ditambahkan" ke pembeli.
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipeEmail: "token-ditambahkan",
            email: p.email,
            nama: p.nama,
            jumlahToken: p.jumlahToken,
            sisaToken: saldoBaru,
            nominal: p.nominal,
          }),
        });
      } catch {
        /* diabaikan: token sudah masuk, email bersifat tambahan */
      }

      setPesan({ teks: `Token ditambahkan & email dikirim ke ${p.email}.`, tipe: "ok" });
    } catch (e: unknown) {
      setPesan({ teks: (e as Error)?.message || "Gagal memproses ACC.", tipe: "err" });
    } finally {
      setMemproses(null);
    }
  };

  // ---- Tolak pesanan ----
  const handleTolak = async (p: Pesanan) => {
    if (!confirm(`Tolak pesanan dari ${p.nama}?`)) return;
    setMemproses(p.id);
    try {
      await updateDoc(doc(db, "pesanan_token", p.id), {
        status: "ditolak",
        processedAt: serverTimestamp(),
      });
      setPesan({ teks: "Pesanan ditolak.", tipe: "ok" });
    } catch (e: unknown) {
      setPesan({ teks: (e as Error)?.message || "Gagal menolak pesanan.", tipe: "err" });
    } finally {
      setMemproses(null);
    }
  };

  // ---- Simpan konfigurasi ----
  const handleSimpan = async () => {
    if (konfig.qrisStatis && !qrisValid(konfig.qrisStatis)) {
      setPesan({ teks: "Kode QRIS statis tidak valid. Periksa kembali.", tipe: "err" });
      return;
    }
    setMenyimpan(true);
    setPesan(null);
    try {
      await setDoc(
        doc(db, "sistem_pengaturan", "token_komersil"),
        {
          aktif: !!konfig.aktif,
          qrisStatis: konfig.qrisStatis.trim(),
          hargaPer1000: Number(konfig.hargaPer1000) || 0,
          minPembelian: Number(konfig.minPembelian) || 0,
          emailTim: konfig.emailTim.trim(),
          catatan: konfig.catatan,
          paket: konfig.paket.map((p) => ({
            id: p.id,
            nama: p.nama,
            jumlahToken: Number(p.jumlahToken) || 0,
            harga: Number(p.harga) || 0,
            bonus: Number(p.bonus) || 0,
          })),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setPesan({ teks: "Konfigurasi token tersimpan.", tipe: "ok" });
    } catch (e: unknown) {
      setPesan({ teks: (e as Error)?.message || "Gagal menyimpan.", tipe: "err" });
    } finally {
      setMenyimpan(false);
    }
  };

  const tambahPaket = () => {
    setKonfig((k) => ({
      ...k,
      paket: [
        ...k.paket,
        {
          id: (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`),
          nama: "",
          jumlahToken: 0,
          harga: 0,
          bonus: 0,
        },
      ],
    }));
  };

  const ubahPaket = (id: string, field: keyof Paket, nilai: string) => {
    setKonfig((k) => ({
      ...k,
      paket: k.paket.map((p) =>
        p.id === id ? { ...p, [field]: field === "nama" ? nilai : Number(nilai) || 0 } : p,
      ),
    }));
  };

  const hapusPaket = (id: string) =>
    setKonfig((k) => ({ ...k, paket: k.paket.filter((p) => p.id !== id) }));

  const qrisPreview = useMemo(() => {
    if (!qrisValid(konfig.qrisStatis)) return "";
    try {
      return buatQrisDinamis(konfig.qrisStatis, 10000);
    } catch {
      return "";
    }
  }, [konfig.qrisStatis]);

  const badge = (status?: string) => {
    const s = status || "menunggu_verifikasi";
    if (s === "disetujui")
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
          <CheckCircle2 size={13} /> Disetujui
        </span>
      );
    if (s === "ditolak")
      return (
        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-bold">
          <XCircle size={13} /> Ditolak
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
        <Clock3 size={13} /> Menunggu
      </span>
    );
  };

  const inputCls =
    "w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Coins className="text-amber-500" /> Komersialisasi Token
        </h1>
        <p className="text-sm text-slate-500">Kelola pesanan pembelian token dan konfigurasi pembayaran.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("pesanan")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "pesanan" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ReceiptText size={16} /> Pesanan
          {jumlahMenunggu > 0 && (
            <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {jumlahMenunggu}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("konfigurasi")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "konfigurasi" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Settings2 size={16} /> Konfigurasi
        </button>
      </div>

      {pesan && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            pesan.tipe === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {pesan.teks}
        </div>
      )}

      {/* ====================== TAB PESANAN ====================== */}
      {tab === "pesanan" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(
              [
                ["menunggu_verifikasi", "Menunggu"],
                ["disetujui", "Disetujui"],
                ["ditolak", "Ditolak"],
                ["semua", "Semua"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  filter === val
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {pesananTampil.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
              Tidak ada pesanan pada kategori ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pesananTampil.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{p.nama || "Tanpa nama"}</p>
                      <p className="text-xs text-slate-500 truncate">{p.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {p.role}
                      </span>
                    </div>
                    {badge(p.status)}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[11px] text-slate-400">Jumlah Token</p>
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <Coins size={13} className="text-amber-500" />
                        {(p.jumlahToken || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[11px] text-slate-400">Nominal</p>
                      <p className="font-bold text-slate-700">{formatRupiah(p.nominal || 0)}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">Paket: {p.paketNama || "-"}</p>

                  {p.buktiUrl && (
                    <a
                      href={p.buktiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-2 text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      <ExternalLink size={14} /> Lihat bukti pembayaran
                    </a>
                  )}

                  {(p.status || "menunggu_verifikasi") === "menunggu_verifikasi" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleAcc(p)}
                        disabled={memproses === p.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                      >
                        {memproses === p.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        ACC
                      </button>
                      <button
                        onClick={() => handleTolak(p)}
                        disabled={memproses === p.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 text-sm font-bold py-2 rounded-lg transition-colors"
                      >
                        <XCircle size={15} /> Tolak
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================== TAB KONFIGURASI ====================== */}
      {tab === "konfigurasi" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {/* Status layanan */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  <Power size={16} className={konfig.aktif ? "text-emerald-500" : "text-slate-400"} />
                  Layanan Pembelian Token
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {konfig.aktif ? "Aktif — guru & siswa dapat membeli token." : "Nonaktif."}
                </p>
              </div>
              <button
                onClick={() => setKonfig((k) => ({ ...k, aktif: !k.aktif }))}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  konfig.aktif ? "bg-emerald-500" : "bg-slate-300"
                }`}
                aria-label="Aktifkan layanan token"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    konfig.aktif ? "translate-x-7" : ""
                  }`}
                />
              </button>
            </div>

            {/* QRIS & harga */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-slate-800">Pembayaran & Harga</h3>
              <div>
                <label className="text-sm font-semibold text-slate-700">Kode QRIS Statis (ID QRIS)</label>
                <textarea
                  value={konfig.qrisStatis}
                  onChange={(e) => setKonfig((k) => ({ ...k, qrisStatis: e.target.value }))}
                  rows={3}
                  placeholder="Tempel seluruh teks QRIS statis, mis. 00020101021126..."
                  className={`${inputCls} font-mono text-xs mt-1`}
                />
                <p className="text-[11px] mt-1 text-slate-400">
                  Barcode akan otomatis menyesuaikan nominal tiap pesanan.{" "}
                  {konfig.qrisStatis
                    ? qrisValid(konfig.qrisStatis)
                      ? "✅ Format valid."
                      : "⚠️ Format belum valid."
                    : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Harga per 1.000 Token (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={konfig.hargaPer1000 || ""}
                    onChange={(e) =>
                      setKonfig((k) => ({ ...k, hargaPer1000: Number(e.target.value) || 0 }))
                    }
                    className={`${inputCls} mt-1`}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Min. Pembelian (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={konfig.minPembelian || ""}
                    onChange={(e) =>
                      setKonfig((k) => ({ ...k, minPembelian: Number(e.target.value) || 0 }))
                    }
                    className={`${inputCls} mt-1`}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Harga per 1.000 token dipakai untuk pembelian <strong>custom</strong>: guru/siswa
                mengisi jumlah token sendiri dan sistem mengalikannya otomatis. Isi &gt; 0 agar opsi
                custom muncul.
              </p>
            </div>

            {/* Paket */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800">Paket Token</h3>
                <button
                  onClick={tambahPaket}
                  className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={15} /> Tambah
                </button>
              </div>
              {konfig.paket.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Belum ada paket. Tambahkan minimal satu, atau andalkan harga/token.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Header kolom (desktop) */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-400 px-1">
                    <span className="col-span-4">Nama Paket</span>
                    <span className="col-span-3">Token</span>
                    <span className="col-span-2">Bonus</span>
                    <span className="col-span-2">Harga (Rp)</span>
                    <span className="col-span-1" />
                  </div>
                  {konfig.paket.map((p) => (
                    <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        value={p.nama}
                        onChange={(e) => ubahPaket(p.id, "nama", e.target.value)}
                        placeholder="Nama"
                        className="col-span-12 md:col-span-4 border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <input
                        type="number"
                        min={0}
                        value={p.jumlahToken || ""}
                        onChange={(e) => ubahPaket(p.id, "jumlahToken", e.target.value)}
                        placeholder="Token"
                        className="col-span-4 md:col-span-3 border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <input
                        type="number"
                        min={0}
                        value={p.bonus || ""}
                        onChange={(e) => ubahPaket(p.id, "bonus", e.target.value)}
                        placeholder="Bonus"
                        className="col-span-3 md:col-span-2 border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <input
                        type="number"
                        min={0}
                        value={p.harga || ""}
                        onChange={(e) => ubahPaket(p.id, "harga", e.target.value)}
                        placeholder="Harga"
                        className="col-span-4 md:col-span-2 border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <button
                        onClick={() => hapusPaket(p.id)}
                        className="col-span-1 flex justify-center text-slate-400 hover:text-rose-600"
                        aria-label="Hapus paket"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email tim */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-bold text-slate-800">Email Tim Perantara</h3>
              <p className="text-xs text-slate-500 mb-2">
                Tiap ada pesanan baru, notifikasi dikirim ke email ini dari email official sistem.
              </p>
              <input
                type="email"
                value={konfig.emailTim}
                onChange={(e) => setKonfig((k) => ({ ...k, emailTim: e.target.value }))}
                placeholder="tim-token@lembaga.sch.id"
                className={inputCls}
              />
            </div>

            <button
              onClick={handleSimpan}
              disabled={menyimpan}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {menyimpan ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Simpan Konfigurasi
            </button>
          </div>

          {/* Preview QRIS */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:sticky lg:top-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                <QrCode size={16} /> Pratinjau QRIS
              </h3>
              {qrisPreview ? (
                <div className="flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlGambarQr(qrisPreview, 300)}
                    alt="Pratinjau QRIS"
                    width={220}
                    height={220}
                    className="w-[220px] h-[220px] bg-white rounded-lg border border-slate-100"
                  />
                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    Contoh untuk nominal {formatRupiah(10000)}. Nominal asli mengikuti pesanan.
                  </p>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Isi kode QRIS statis yang valid untuk melihat pratinjau.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
