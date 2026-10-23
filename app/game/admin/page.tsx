import { connection } from "next/server";
import { AutoRefresh } from "@/app/auto-refresh";
import { db } from "@/lib/db";
import { todayUtc, type Round } from "@/lib/game";
import { deleteRound, skipRound } from "./actions";

const LABEL: Record<Round["status"], string> = {
  queued: "Menunggu",
  ready: "Bersedia",
  playing: "Bermain",
  done: "Selesai",
  skipped: "Dilangkau",
};

// Staff page: the live queue, plus today's finished rounds (to remove an unwanted name from the board).
export default async function GameAdminPage() {
  await connection();
  const active = db
    .prepare("SELECT * FROM game_rounds WHERE status IN ('ready','playing','queued') ORDER BY CASE status WHEN 'queued' THEN 1 ELSE 0 END, id")
    .all() as Round[];
  const done = db
    .prepare("SELECT * FROM game_rounds WHERE status IN ('done','skipped') AND finished_at >= ? ORDER BY id DESC LIMIT 50")
    .all(todayUtc()) as Round[];
  const device = db.prepare("SELECT last_seen FROM devices WHERE id = 'LASER-01'").get() as { last_seen: string | null } | undefined;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 text-slate-900">
      <AutoRefresh ms={3000} />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">Laser Target · Pengurusan</h1>
        <p className="text-sm text-slate-600">
          Sasaran LASER-01:{" "}
          {!device ? "kunci peranti belum ditetapkan (LASER_DEVICE_KEY)" : device.last_seen ? `kali terakhir ${device.last_seen} UTC` : "belum pernah sambung"}
        </p>
      </div>

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-semibold">Barisan ({active.length})</h2>
        <RoundTable rounds={active} empty="Tiada pemain dalam barisan." showSkip />
      </section>

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-semibold">Selesai hari ini</h2>
        <RoundTable rounds={done} empty="Belum ada pusingan selesai." />
      </section>
    </div>
  );
}

function RoundTable({ rounds, empty, showSkip }: { rounds: Round[]; empty: string; showSkip?: boolean }) {
  if (rounds.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Nama</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 text-right font-medium">Skor</th>
            <th className="py-2 font-medium"><span className="sr-only">Tindakan</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rounds.map((r) => (
            <tr key={r.id}>
              <td className="py-2 pr-3 tabular-nums text-slate-500">{r.id}</td>
              <td className="py-2 pr-3 font-medium">{r.name}</td>
              <td className="py-2 pr-3">{LABEL[r.status]}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.status === "playing" ? r.live_score : r.score ?? "–"}</td>
              <td className="py-2">
                <div className="flex justify-end gap-2">
                  {showSkip && (
                    <form action={skipRound}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="min-h-9 rounded border border-slate-300 px-3 hover:bg-slate-50">Langkau</button>
                    </form>
                  )}
                  <form action={deleteRound}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="min-h-9 rounded border border-red-300 px-3 text-red-700 hover:bg-red-50">Padam</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
