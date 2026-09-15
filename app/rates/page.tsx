import { connection } from "next/server";
import { db, type Category } from "@/lib/db";

export default async function RatesPage() {
  await connection();
  const rows = db.prepare("SELECT * FROM categories ORDER BY code").all() as Category[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Kadar RP</h1>
      <p className="text-sm text-slate-600">
        Kod ditaip pada papan kekunci penimbang. Kadar diambil dari senarai rasmi KITARecycle.
      </p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Kod</th>
              <th className="px-4 py-2 font-medium">Barangan</th>
              <th className="px-4 py-2 text-right font-medium">RP / kg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.code}>
                <td className="px-4 py-2 font-mono text-lg">{c.code}</td>
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{c.rp_per_kg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
