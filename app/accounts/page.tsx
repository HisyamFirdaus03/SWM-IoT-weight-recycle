import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { createAccount } from "./actions";

export default async function AccountsPage() {
  await connection();
  const accounts = db
    .prepare(
      `SELECT a.account_no, a.name, a.phone,
              COALESCE(SUM(t.weight_kg),0) AS kg, COALESCE(SUM(t.rp_earned),0) AS rp, COUNT(t.id) AS txns
       FROM accounts a LEFT JOIN transactions t ON t.account_no = a.account_no
       GROUP BY a.account_no ORDER BY a.account_no`,
    )
    .all() as { account_no: string; name: string; phone: string | null; kg: number; rp: number; txns: number }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Akaun</h1>

      <form
        action={createAccount}
        className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200"
      >
        <label className="flex flex-col text-sm">
          Nama penuh
          <input name="name" required className="mt-1 rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          No. telefon
          <input name="phone" className="mt-1 rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
          Daftar akaun
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">No. akaun</th>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 text-right font-medium">Berat</th>
              <th className="px-4 py-2 text-right font-medium">RP</th>
              <th className="px-4 py-2 text-right font-medium">Transaksi</th>
              <th className="px-4 py-2 font-medium">Label</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <tr key={a.account_no}>
                <td className="px-4 py-2 font-mono">{a.account_no}</td>
                <td className="px-4 py-2">{a.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{a.kg.toFixed(2)} kg</td>
                <td className="px-4 py-2 text-right tabular-nums">{a.rp.toFixed(2)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{a.txns}</td>
                <td className="px-4 py-2">
                  <Link href={`/accounts/${a.account_no}/label`} className="text-emerald-700 hover:underline">
                    Cetak QR
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
