import QRCode from "qrcode";
import { connection } from "next/server";
import { db, type Category } from "@/lib/db";

// Printable category cards. The scanner reads "CAT:<code>", so the operator can
// pick a category by scanning a card instead of using a keypad.
export default async function CardsPage() {
  await connection();
  const rows = db.prepare("SELECT * FROM categories ORDER BY code").all() as Category[];
  const actions = await Promise.all(
    [
      { code: "CMD:OK", name: "OK — Hantar", note: "Sahkan berat & hantar" },
      { code: "CMD:BATAL", name: "BATAL", note: "Timbang semula / selesai" },
      { code: "CMD:ZERO", name: "ZERO", note: "Sifarkan (platform kosong)" },
    ].map(async (a) => ({
      ...a,
      svg: await QRCode.toString(a.code, { type: "svg", margin: 1, width: 160 }),
    })),
  );
  const cards = await Promise.all(
    rows.map(async (c) => ({
      ...c,
      svg: await QRCode.toString(`CAT:${c.code}`, { type: "svg", margin: 1, width: 160 }),
    })),
  );

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold">Kad Kategori</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cetak dan laminate. Imbas kad selepas mengimbas kod QR akaun pengguna.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {actions.map((a) => (
          <div key={a.code} className="rounded-lg border-2 border-emerald-600 bg-emerald-50 p-3 text-center">
            <div className="mx-auto w-32" dangerouslySetInnerHTML={{ __html: a.svg }} />
            <p className="mt-2 text-sm font-semibold text-emerald-800">{a.name}</p>
            <p className="text-xs text-emerald-700">{a.note}</p>
          </div>
        ))}
        {cards.map((c) => (
          <div key={c.code} className="rounded-lg border border-slate-300 bg-white p-3 text-center">
            <div className="mx-auto w-32" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <p className="mt-2 text-sm font-semibold">{c.name}</p>
            <p className="text-xs text-slate-500">
              Kod {c.code} · {c.rp_per_kg} RP/kg
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
