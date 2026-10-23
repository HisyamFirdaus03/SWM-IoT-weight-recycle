import { db } from "@/lib/db";

// Public feed for the event board (public/funrun-board.html). Anonymous on purpose: the board is
// shown on a big screen, so it gets totals and item/kg/RP per weighing, never names or account numbers.

// Board chip colour per SWM category code.
const GROUP: Record<number, string> = {
  1: "logam", 2: "logam", 3: "logam", 4: "logam",
  5: "kertas", 6: "kertas", 7: "kertas", 8: "kertas", 9: "kertas",
  10: "lain", 11: "plastik", 12: "plastik", 13: "plastik", 14: "lain", 15: "kaca",
};

// "From" for the totals: ?dari=2026-10-25T07:00 (Malaysia time), default midnight today in Malaysia,
// so a one-day event counts only that day. Returned as SQLite's UTC "YYYY-MM-DD HH:MM:SS".
function sinceUtc(dari: string | null): string {
  const myt = dari ? new Date(`${dari}+08:00`) : null;
  const start = myt && !isNaN(myt.getTime())
    ? myt
    : new Date(new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10) + "T00:00:00+08:00");
  return start.toISOString().slice(0, 19).replace("T", " ");
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const since = sinceUtc(params.get("dari"));
  const limit = Math.min(10, Math.max(1, Number(params.get("rows")) || 3));

  const totals = db
    .prepare(
      `SELECT COUNT(DISTINCT account_no) AS people, COALESCE(SUM(weight_kg), 0) AS kg
       FROM transactions WHERE created_at >= ?`,
    )
    .get(since) as { people: number; kg: number };

  const latest = db
    .prepare(
      `SELECT t.id, t.created_at, t.category_code, c.name, t.weight_kg, t.rp_earned
       FROM transactions t JOIN categories c ON c.code = t.category_code
       WHERE t.created_at >= ? ORDER BY t.id DESC LIMIT ?`,
    )
    .all(since, limit) as {
    id: number; created_at: string; category_code: number; name: string; weight_kg: number; rp_earned: number;
  }[];

  return Response.json(
    {
      since: since.replace(" ", "T") + "Z",
      attendance: totals.people,
      kg: Math.round(totals.kg * 10) / 10,
      latest: latest.map((r) => ({
        id: r.id,
        at: r.created_at.replace(" ", "T") + "Z",
        item: r.name,
        group: GROUP[r.category_code] ?? "lain",
        kg: r.weight_kg,
        rp: r.rp_earned,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
