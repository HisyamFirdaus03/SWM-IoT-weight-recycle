import { connection } from "next/server";
import { db, type Transaction } from "@/lib/db";
import { AutoRefresh } from "./auto-refresh";

const fmt = (n: number, d = 2) => n.toLocaleString("en-MY", { minimumFractionDigits: d, maximumFractionDigits: d });

export default async function Dashboard() {
  await connection(); // always read fresh data

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS txns, COALESCE(SUM(weight_kg),0) AS kg, COALESCE(SUM(rp_earned),0) AS rp,
              COUNT(DISTINCT account_no) AS accounts
       FROM transactions`,
    )
    .get() as { txns: number; kg: number; rp: number; accounts: number };

  const byCategory = db
    .prepare(
      `SELECT c.name, SUM(t.weight_kg) AS kg, SUM(t.rp_earned) AS rp
       FROM transactions t JOIN categories c ON c.code = t.category_code
       GROUP BY c.code ORDER BY kg DESC`,
    )
    .all() as { name: string; kg: number; rp: number }[];

  const recent = db
    .prepare(
      `SELECT t.*, a.name AS account_name, c.name AS category_name
       FROM transactions t
       JOIN accounts a ON a.account_no = t.account_no
       JOIN categories c ON c.code = t.category_code
       ORDER BY t.id DESC LIMIT 25`,
    )
    .all() as Transaction[];

  const devices = db.prepare("SELECT id, location, last_seen FROM devices").all() as {
    id: string;
    location: string | null;
    last_seen: string | null;
  }[];

  const maxKg = Math.max(1, ...byCategory.map((c) => c.kg));

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">Papan Pemuka</h1>
        <p className="text-sm text-slate-500">Dikemas kini setiap 3 saat</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Jumlah berat", `${fmt(totals.kg)} kg`],
          ["Mata ganjaran", `${fmt(totals.rp)} RP`],
          ["Transaksi", String(totals.txns)],
          ["Akaun aktif", String(totals.accounts)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Transaksi terkini</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Masa (UTC)</th>
                  <th className="py-2 pr-3 font-medium">Akaun</th>
                  <th className="py-2 pr-3 font-medium">Kategori</th>
                  <th className="py-2 pr-3 text-right font-medium">Berat</th>
                  <th className="py-2 pr-3 text-right font-medium">RP</th>
                  <th className="py-2 font-medium">Peranti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Belum ada transaksi. Timbang sesuatu pada penimbang.
                    </td>
                  </tr>
                )}
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{t.created_at}</td>
                    <td className="py-2 pr-3">
                      <div className="font-mono text-xs">{t.account_no}</div>
                      <div className="text-slate-500">{t.account_name}</div>
                    </td>
                    <td className="py-2 pr-3">{t.category_name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(t.weight_kg)} kg</td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums text-emerald-700">
                      +{fmt(t.rp_earned)}
                    </td>
                    <td className="py-2 font-mono text-xs text-slate-500">{t.device_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 font-semibold">Mengikut kategori</h2>
            {byCategory.length === 0 && <p className="text-sm text-slate-400">Tiada data.</p>}
            <ul className="space-y-2">
              {byCategory.map((c) => (
                <li key={c.name} className="text-sm">
                  <div className="flex justify-between">
                    <span>{c.name}</span>
                    <span className="tabular-nums text-slate-600">{fmt(c.kg)} kg</span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-emerald-600" style={{ width: `${(c.kg / maxKg) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 font-semibold">Peranti</h2>
            <ul className="space-y-2 text-sm">
              {devices.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span>
                    <span className="font-mono">{d.id}</span>
                    <span className="block text-slate-500">{d.location}</span>
                  </span>
                  <span className="text-right text-slate-500">
                    {d.last_seen ? `Kali terakhir: ${d.last_seen}` : "Belum pernah sambung"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
