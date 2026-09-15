import { timingSafeEqual } from "node:crypto";
import { db } from "./db";

// Scales authenticate with X-Device-Id + X-Device-Key headers.
// Returns the device id, or a 401 Response to send back.
export function authenticateDevice(req: Request): string | Response {
  const id = req.headers.get("x-device-id") ?? "";
  const key = req.headers.get("x-device-key") ?? "";
  const device = db.prepare("SELECT api_key FROM devices WHERE id = ?").get(id) as
    | { api_key: string }
    | undefined;

  const ok =
    device !== undefined &&
    device.api_key.length === key.length &&
    timingSafeEqual(Buffer.from(device.api_key), Buffer.from(key));
  if (!ok) return Response.json({ error: "unauthorized device" }, { status: 401 });

  db.prepare("UPDATE devices SET last_seen = datetime('now') WHERE id = ?").run(id);
  return id;
}
