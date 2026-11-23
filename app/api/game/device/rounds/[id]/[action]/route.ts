import { authenticateDevice } from "@/lib/device-auth";
import { askNext, endRound, getRound, quizView, rankOf, settle, type Round } from "@/lib/game";

// Round lifecycle from the target (all POST, all safe to resend):
//   hit     a laser hit: starts the round if needed and asks the next question on the player's phone
//   state   polled while a question is open: has the player answered, and was it right?
//   finish  the player stopped shooting: end with the score so far
//   skip    the player never showed up (or staff aborted)
// Every action answers with the same compact state, sized for the ESP32.
export async function POST(req: Request, ctx: RouteContext<"/api/game/device/rounds/[id]/[action]">) {
  const deviceId = authenticateDevice(req);
  if (deviceId instanceof Response) return deviceId;

  const { id, action } = await ctx.params;
  let round = getRound(Number(id));
  if (!round || round.device_id !== deviceId) return Response.json({ error: "round not found" }, { status: 404 });

  switch (action) {
    case "hit":
      if (round.status !== "ready" && round.status !== "playing" && round.status !== "done") {
        return Response.json({ error: `round is ${round.status}` }, { status: 409 });
      }
      round = askNext(round);
      break;
    case "state":
      round = settle(round);
      break;
    case "finish":
      endRound(round);
      round = getRound(round.id)!;
      break;
    case "skip":
      if (round.status === "ready" || round.status === "playing") {
        endRound({ ...round, status: "ready" } as Round); // skip = no score kept
      }
      round = getRound(round.id)!;
      break;
    default:
      return Response.json({ error: "unknown action" }, { status: 404 });
  }
  return Response.json(deviceState(round));
}

function deviceState(round: Round) {
  const q = quizView(round);
  return {
    status: round.status,
    asked: q.asked,
    answered: q.answered,
    total: q.total,
    pending: q.open !== null,
    secondsLeft: q.open?.secondsLeft ?? 0,
    lastSeq: q.last?.seq ?? 0,
    lastCorrect: q.last?.correct ?? false,
    score: q.score,
    rank: round.status === "done" ? rankOf(round.score ?? 0) : 0,
  };
}
