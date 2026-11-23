import { getRoundByToken, queuePosition, rankOf, roundView, settle, submitAnswer } from "@/lib/game";

// The player's phone. The token in the URL is the only key: it's random, so a player can't answer
// for someone else by changing a number.

export async function GET(_req: Request, ctx: RouteContext<"/api/game/ticket/[token]">) {
  const { token } = await ctx.params;
  let round = getRoundByToken(token);
  if (!round) return Response.json({ error: "not found" }, { status: 404 });
  round = settle(round);
  const view = roundView(round);
  return Response.json(
    {
      name: round.name,
      status: round.status,
      queuePosition: round.status === "queued" ? queuePosition(round.id) : null,
      rank: round.status === "done" ? rankOf(round.score ?? 0) : null,
      ...view,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request, ctx: RouteContext<"/api/game/ticket/[token]">) {
  const { token } = await ctx.params;
  const round = getRoundByToken(token);
  if (!round) return Response.json({ error: "not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { seq?: unknown; choice?: unknown };
  const result = submitAnswer(round, Number(body.seq), Number(body.choice));
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
