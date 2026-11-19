"use client";

/**
 * Kop surat resmi satuan pendidikan.
 *
 * Sengaja ditulis dengan inline style dan tabel HTML, bukan class Tailwind,
 * karena node ini ikut disalin apa adanya ke ekspor Word, Google Docs, dan
 * jendela cetak PDF — di sana tidak ada stylesheet Tailwind.
 *
 * Tata letak mengikuti pakem kop dinas/sekolah nasional:
 *   [logo kiri]  naungan / nama lembaga / alamat / kontak  [logo kanan]
 *   garis tebal, lalu garis tipis di bawahnya.
 */

import { useState } from "react";
import { barisAlamat, barisKontak, type KopLembaga } from "@/lib/kop";

type Props = {
  kop: KopLembaga;
  /** Judul dokumen yang dicetak di bawah garis kop, mis. "MODUL AJAR". */
  judulDokumen?: string;
  subJudul?: string;
  /** Kop ringkas (tanpa logo & baris kontak) untuk lembar soal/LJK. */
  ringkas?: boolean;
};

export default function KopSurat({ kop, judulDokumen, subJudul, ringkas = false }: Props) {
  const [gagalKiriUrl, setGagalKiriUrl] = useState<string | null>(null);
  const [gagalKananUrl, setGagalKananUrl] = useState<string | null>(null);

  const alamat = barisAlamat(kop);
  const kontak = barisKontak(kop);
  const tampilKiri = Boolean(kop.logoKiri && gagalKiriUrl !== kop.logoKiri);
  const tampilKanan = Boolean(kop.logoKanan && gagalKananUrl !== kop.logoKanan);
  const adaLogo = tampilKiri || tampilKanan;

  const selTengah: React.CSSProperties = {
    border: "none",
    textAlign: "center",
    padding: "0 8px",
    verticalAlign: "middle",
  };

  const selLogo: React.CSSProperties = {
    border: "none",
    width: "80px",
    textAlign: "center",
    verticalAlign: "middle",
    padding: 0,
  };

  return (
    <div className="kop-surat" style={{ marginBottom: "16pt", pageBreakAfter: "avoid", width: "100%", maxWidth: "100%" }}>
      <style>{`
        @media screen and (max-width: 640px) {
          .kop-surat { margin-bottom: 12px !important; }
          .kop-surat .kop-logo-cell { width: 44px !important; }
          .kop-surat .kop-logo-empty { display: none !important; }
          .kop-surat .kop-logo-img { width: 38px !important; height: 38px !important; }
          .kop-surat .kop-center-cell { padding: 0 4px !important; }
          .kop-surat .kop-naungan { font-size: 10px !important; line-height: 1.25 !important; }
          .kop-surat .kop-nama { font-size: 13px !important; line-height: 1.25 !important; letter-spacing: 0.2px !important; }
          .kop-surat .kop-meta { font-size: 9.5px !important; line-height: 1.3 !important; overflow-wrap: break-word; }
          .kop-surat .kop-judul-wrap { margin-top: 10px !important; }
          .kop-surat .kop-judul { font-size: 11.5px !important; }
          .kop-surat .kop-subjudul { font-size: 10px !important; margin-top: 2px !important; }
        }
      `}</style>
      <table
        className="header-table"
        style={{ width: "100%", borderCollapse: "collapse", border: "none", marginBottom: 0, tableLayout: "auto" }}
      >
        <tbody>
          <tr>
            {adaLogo && !ringkas && (
              <td className={`kop-logo-cell ${!tampilKiri ? "kop-logo-empty" : ""}`} style={selLogo}>
                {tampilKiri && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={kop.logoKiri}
                    alt=""
                    onError={() => setGagalKiriUrl(kop.logoKiri)}
                    className="kop-logo-img"
                    style={{ width: "70px", height: "70px", objectFit: "contain" }}
                  />
                )}
              </td>
            )}

            <td className="kop-center-cell" style={selTengah}>
              {kop.naungan && (
                <div className="kop-naungan" style={{ fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: 1.3 }}>
                  {kop.naungan}
                </div>
              )}
              {kop.naunganKedua && (
                <div className="kop-naungan" style={{ fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase", lineHeight: 1.3 }}>
                  {kop.naunganKedua}
                </div>
              )}
              <div
                className="kop-nama"
                style={{
                  fontSize: ringkas ? "14pt" : "16pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  lineHeight: 1.25,
                  letterSpacing: "0.5px",
                }}
              >
                {kop.namaLembaga || "........................................"}
              </div>
              {alamat && (
                <div className="kop-meta" style={{ fontSize: "10pt", lineHeight: 1.35, marginTop: "2pt" }}>{alamat}</div>
              )}
              {kontak && !ringkas && (
                <div className="kop-meta" style={{ fontSize: "10pt", lineHeight: 1.35 }}>{kontak}</div>
              )}
              {(kop.npsn || kop.akreditasi) && !ringkas && (
                <div className="kop-meta" style={{ fontSize: "10pt", lineHeight: 1.35 }}>
                  {kop.npsn && `NPSN: ${kop.npsn}`}
                  {kop.npsn && kop.akreditasi && " | "}
                  {kop.akreditasi && `Akreditasi: ${kop.akreditasi}`}
                </div>
              )}
            </td>

            {adaLogo && !ringkas && (
              <td className={`kop-logo-cell ${!tampilKanan ? "kop-logo-empty" : ""}`} style={selLogo}>
                {tampilKanan && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={kop.logoKanan}
                    alt=""
                    onError={() => setGagalKananUrl(kop.logoKanan)}
                    className="kop-logo-img"
                    style={{ width: "70px", height: "70px", objectFit: "contain" }}
                  />
                )}
              </td>
            )}
          </tr>
        </tbody>
      </table>

      {/* Garis ganda khas kop surat resmi: tebal lalu tipis. */}
      <div style={{ borderBottom: "3px solid #000", marginTop: "6pt" }} />
      <div style={{ borderBottom: "1px solid #000", marginTop: "2px" }} />

      {judulDokumen && (
        <div className="kop-judul-wrap" style={{ textAlign: "center", marginTop: "14pt" }}>
          <div
            className="kop-judul"
            style={{
              fontSize: "13pt",
              fontWeight: "bold",
              textTransform: "uppercase",
              textDecoration: "underline",
              letterSpacing: "0.5px",
            }}
          >
            {judulDokumen}
          </div>
          {subJudul && <div className="kop-subjudul" style={{ fontSize: "11pt", marginTop: "3pt" }}>{subJudul}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Versi string HTML dari kop, untuk jendela cetak (`window.open` + `document.write`)
 * yang tidak bisa merender komponen React.
 */
export function kopSuratHtml(kop: KopLembaga, judulDokumen?: string, subJudul?: string): string {
  const alamat = barisAlamat(kop);
  const kontak = barisKontak(kop);
  const logo = (url: string) =>
    url
      ? `<td style="border:none;width:80px;text-align:center;vertical-align:middle;padding:0"><img src="${url}" style="width:70px;height:70px;object-fit:contain" alt="" /></td>`
      : "";

  const identitas = [
    kop.npsn ? `NPSN: ${kop.npsn}` : "",
    kop.akreditasi ? `Akreditasi: ${kop.akreditasi}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return `
    <div class="kop-surat" style="margin-bottom:14pt">
      <table style="width:100%;border-collapse:collapse;border:none">
        <tr>
          ${logo(kop.logoKiri)}
          <td style="border:none;text-align:center;padding:0 8px;vertical-align:middle">
            ${kop.naungan ? `<div style="font-size:12pt;font-weight:bold;text-transform:uppercase;line-height:1.3">${kop.naungan}</div>` : ""}
            ${kop.naunganKedua ? `<div style="font-size:12pt;font-weight:bold;text-transform:uppercase;line-height:1.3">${kop.naunganKedua}</div>` : ""}
            <div style="font-size:16pt;font-weight:bold;text-transform:uppercase;line-height:1.25">${kop.namaLembaga || "........................"}</div>
            ${alamat ? `<div style="font-size:10pt;line-height:1.35;margin-top:2pt">${alamat}</div>` : ""}
            ${kontak ? `<div style="font-size:10pt;line-height:1.35">${kontak}</div>` : ""}
            ${identitas ? `<div style="font-size:10pt;line-height:1.35">${identitas}</div>` : ""}
          </td>
          ${logo(kop.logoKanan)}
        </tr>
      </table>
      <div style="border-bottom:3px solid #000;margin-top:6pt"></div>
      <div style="border-bottom:1px solid #000;margin-top:2px"></div>
      ${
        judulDokumen
          ? `<div style="text-align:center;margin-top:14pt">
               <div style="font-size:13pt;font-weight:bold;text-transform:uppercase;text-decoration:underline">${judulDokumen}</div>
               ${subJudul ? `<div style="font-size:11pt;margin-top:3pt">${subJudul}</div>` : ""}
             </div>`
          : ""
      }
    </div>`;
}
