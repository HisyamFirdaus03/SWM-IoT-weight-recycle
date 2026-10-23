import { db } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { MAX_HITS, POINTS_PER_HIT, getRound, rankOf } from "@/lib/game";

// Round lifecycle from the target:
//   start  ready -> playing
//   live   { score }        live score for the big screen while playing
//   result { score, hits }  playing -> done; safe to resend (returns the same rank)
//   skip                    player didn't show, or staff aborted the round
export async function POST(req: Request, ctx: RouteContext<"/api/game/device/rounds/[id]/[action]">) {
  const deviceId = authenticateDevice(req);
  if (deviceId instanceof Response) return deviceId;

  const { id, action } = await ctx.params;
  const round = getRound(Number(id));
  if (!round || round.device_id !== deviceId) return Response.json({ error: "round not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { score?: unknown; hits?: unknown };

  switch (action) {
    case "start":
      if (round.status === "ready") {
        db.prepare("UPDATE game_rounds SET status = 'playing', started_at = datetime('now'), live_score = 0 WHERE id = ?").run(round.id);
      } else if (round.status !== "playing") {
        return Response.json({ error: `round is ${round.status}` }, { status: 409 });
      }
      return Response.json({ ok: true });

    case "live":
      if (typeof body.score === "number" && round.status === "playing") {
        db.prepare("UPDATE game_rounds SET live_score = ? WHERE id = ?").run(Math.max(0, Math.floor(body.score)), round.id);
      }
      return Response.json({ ok: true });

    case "result": {
      if (round.status === "done") {
        // A resend after a lost response: same answer, nothing recorded twice.
        return Response.json({ score: round.score, rank: rankOf(round.score ?? 0), duplicate: true });
      }
      if (round.status !== "playing" && round.status !== "ready") {
        return Response.json({ error: `round is ${round.status}` }, { status: 409 });
      }
      const hits = body.hits;
      const score = body.score;
      if (typeof hits !== "number" || !Number.isInteger(hits) || hits < 0 || hits > MAX_HITS) {
        return Response.json({ error: `hits must be 0-${MAX_HITS}` }, { status: 400 });
      }
      if (score !== hits * POINTS_PER_HIT) {
        return Response.json({ error: "score does not match hits" }, { status: 400 });
      }
      db.prepare(
        "UPDATE game_rounds SET status = 'done', score = ?, hits = ?, live_score = ?, finished_at = datetime('now') WHERE id = ?",
      ).run(score, hits, score, round.id);
      return Response.json({ score, rank: rankOf(score) });
    }

    case "skip":
      if (round.status === "ready" || round.status === "playing") {
        db.prepare("UPDATE game_rounds SET status = 'skipped', finished_at = datetime('now') WHERE id = ?").run(round.id);
      }
      return Response.json({ ok: true });

    default:
      return Response.json({ error: "unknown action" }, { status: 404 });
  }
}
