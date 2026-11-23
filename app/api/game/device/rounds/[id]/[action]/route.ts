import { authenticateDevice } from "@/lib/device-auth";
import { finishRound, getRound, rankOf, recordHits, roundView, settle, skipRound, startRound, type Round } from "@/lib/game";

// Round lifecycle from the target (all POST, all safe to resend):
//   start   GO after the countdown: the 30 s clock starts
//   hit     { hits, ask }  hit count so far; ask = the hit number that should ask a question (0 = none)
//   state   polled while a question is open: answered yet, and was it right?
//   finish  { hits }  the clock ran out: final count, score and rank
//   skip    the player never showed up (or staff aborted)
// Every action answers with the same compact state, sized for the ESP32.
export async function POST(req: Request, ctx: RouteContext<"/api/game/device/rounds/[id]/[action]">) {
  const deviceId = authenticateDevice(req);
  if (deviceId instanceof Response) return deviceId;

  const { id, action } = await ctx.params;
  let round = getRound(Number(id));
  if (!round || round.device_id !== deviceId) return Response.json({ error: "round not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { hits?: unknown; ask?: unknown };
  const hits = Math.max(0, Number(body.hits) || 0);
  const ask = Math.max(0, Number(body.ask) || 0);

  switch (action) {
    case "start":
      if (round.status !== "ready" && round.status !== "playing") {
        return Response.json({ error: `round is ${round.status}` }, { status: 409 });
      }
      round = startRound(round);
      break;
    case "hit":
      round = recordHits(round, hits, ask);
      break;
    case "state":
      round = settle(round);
      break;
    case "finish":
      round = finishRound(round, hits);
      break;
    case "skip":
      skipRound(round);
      round = getRound(round.id)!;
      break;
    default:
      return Response.json({ error: "unknown action" }, { status: 404 });
  }
  return Response.json(deviceState(round));
}

function deviceState(round: Round) {
  const v = roundView(round);
  return {
    status: round.status,
    hits: v.hits,
    asked: v.asked,
    pending: v.open !== null,
    lastSeq: v.last?.seq ?? 0,
    lastCorrect: v.last?.correct ?? false,
    lastAnswered: v.last ? !v.last.unanswered : false,
    bonus: v.bonus,
    score: v.score,
    rank: round.status === "done" ? rankOf(round.score ?? 0) : 0,
  };
}
