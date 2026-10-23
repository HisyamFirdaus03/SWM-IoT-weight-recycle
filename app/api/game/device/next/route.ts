import { db } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";
import { POINTS_PER_HIT, ROUND_SECONDS, type Round } from "@/lib/game";

// The target asks "who's next?" every couple of seconds while idle.
// 200 { roundId, name, seconds, points } or 204 when nobody is queued.
export async function GET(req: Request) {
  const deviceId = authenticateDevice(req);
  if (deviceId instanceof Response) return deviceId;

  // Asking for the next player means the target is idle: a round it was still "playing"
  // was lost (reboot, power cut), so it can't hold up the queue.
  db.prepare(
    "UPDATE game_rounds SET status = 'skipped', finished_at = datetime('now') WHERE device_id = ? AND status = 'playing'",
  ).run(deviceId);

  let round = db
    .prepare("SELECT * FROM game_rounds WHERE device_id = ? AND status = 'ready' ORDER BY id LIMIT 1")
    .get(deviceId) as Round | undefined;

  if (!round) {
    const queued = db
      .prepare("SELECT * FROM game_rounds WHERE status = 'queued' ORDER BY id LIMIT 1")
      .get() as Round | undefined;
    if (!queued) return new Response(null, { status: 204 });
    db.prepare("UPDATE game_rounds SET status = 'ready', device_id = ? WHERE id = ? AND status = 'queued'").run(
      deviceId,
      queued.id,
    );
    round = { ...queued, status: "ready", device_id: deviceId };
  }

  return Response.json({ roundId: round.id, name: round.name, seconds: ROUND_SECONDS, points: POINTS_PER_HIT });
}
