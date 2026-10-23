import { db } from "./db";

// Laser target game rules. The target (ESP32) gets ROUND_SECONDS from /api/game/device/next,
// so changing it here changes every round.
export const ROUND_SECONDS = 30;
export const POINTS_PER_HIT = 10;
export const COOLDOWN_MS = 400; // must match the firmware: the fastest a real player can score
export const MAX_HITS = Math.floor((ROUND_SECONDS * 1000) / COOLDOWN_MS) + 1;
export const NAME_MAX = 16; // one line of the target's 16x2 LCD
export const QUEUE_MAX = 60;

export type Round = {
  id: number;
  name: string;
  status: "queued" | "ready" | "playing" | "done" | "skipped";
  device_id: string | null;
  score: number | null;
  hits: number | null;
  live_score: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

// The LCD only has ASCII, and the board is public: letters, digits, space and . ' - only.
export function cleanName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name || name.length > NAME_MAX) return null;
  if (!/^[A-Za-z0-9 .'-]+$/.test(name)) return null;
  return name;
}

// Midnight today in Malaysia, as SQLite's UTC "YYYY-MM-DD HH:MM:SS", so the board shows today's event.
export function todayUtc(): string {
  const mytDate = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  return new Date(`${mytDate}T00:00:00+08:00`).toISOString().slice(0, 19).replace("T", " ");
}

export function getRound(id: number): Round | undefined {
  return db.prepare("SELECT * FROM game_rounds WHERE id = ?").get(id) as Round | undefined;
}

// 1 + rounds today that scored strictly more (ties share a rank).
export function rankOf(score: number): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'done' AND finished_at >= ? AND score > ?")
    .get(todayUtc(), score) as { n: number };
  return row.n + 1;
}

export function queuePosition(id: number): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'queued' AND id <= ?")
    .get(id) as { n: number };
  return row.n;
}

export function boardData() {
  const since = todayUtc();
  const top = db
    .prepare(
      `SELECT id, name, score, hits FROM game_rounds
       WHERE status = 'done' AND finished_at >= ? ORDER BY score DESC, finished_at ASC LIMIT 10`,
    )
    .all(since) as Pick<Round, "id" | "name" | "score" | "hits">[];
  const current = db
    .prepare("SELECT * FROM game_rounds WHERE status IN ('ready','playing') ORDER BY id LIMIT 1")
    .get() as Round | undefined;
  const next = db
    .prepare("SELECT id, name FROM game_rounds WHERE status = 'queued' ORDER BY id LIMIT 3")
    .all() as Pick<Round, "id" | "name">[];
  const queued = (db.prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'queued'").get() as { n: number }).n;
  const played = (db
    .prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'done' AND finished_at >= ?")
    .get(since) as { n: number }).n;

  let secondsLeft: number | null = null;
  if (current?.status === "playing" && current.started_at) {
    const started = new Date(current.started_at.replace(" ", "T") + "Z").getTime();
    secondsLeft = Math.max(0, Math.ceil(ROUND_SECONDS - (Date.now() - started) / 1000));
  }
  return { top, current, next, queued, played, secondsLeft };
}
