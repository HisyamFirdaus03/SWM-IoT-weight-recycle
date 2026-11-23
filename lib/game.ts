import { randomBytes, randomInt } from "node:crypto";
import { db } from "./db";

// Laser target rules. A round is ROUND_SECONDS of shooting, and the clock never stops: every hit scores
// POINTS_PER_HIT, and some hits (chosen at random on the target) also ask a question on the player's
// phone. While a question is open the target ignores shots, so a slow answer costs shooting time.
export const ROUND_SECONDS = 30;
export const POINTS_PER_HIT = 10;
export const CORRECT_BONUS = 50;
export const WRONG_PENALTY = 10;
export const COOLDOWN_MS = 400; // must match the firmware: the fastest a real player can score
export const NAME_MAX = 16; // one line of the target's 16x2 LCD
export const QUEUE_MAX = 60;
export const LETTERS = ["A", "B", "C", "D"];
const GRACE_MS = 4000; // late hits/finish from the target (network lag) are still accepted for this long

export type Round = {
  id: number;
  token: string;
  name: string;
  status: "queued" | "ready" | "playing" | "done" | "skipped";
  device_id: string | null;
  category_id: number | null;
  score: number | null;
  hits: number | null;
  live_score: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type Category = { id: number; name: string; in_use: number; created_at: string };
export type Question = {
  id: number; category_id: number; text: string; opt_a: string; opt_b: string; opt_c: string; opt_d: string;
  answer: number; active: number;
};
type Answer = {
  id: number; round_id: number; seq: number; question_id: number; perm: string; trigger_hit: number | null;
  choice: number | null; correct: number | null; asked_at: string; answered_at: string | null;
};

export function newToken(): string {
  return randomBytes(12).toString("hex");
}

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

const sqlTime = (s: string) => new Date(s.replace(" ", "T") + "Z").getTime();

export function getRound(id: number): Round | undefined {
  return db.prepare("SELECT * FROM game_rounds WHERE id = ?").get(id) as Round | undefined;
}

export function getRoundByToken(token: string): Round | undefined {
  if (!/^[0-9a-f]{24}$/.test(token)) return undefined;
  return db.prepare("SELECT * FROM game_rounds WHERE token = ?").get(token) as Round | undefined;
}

export function inUseCategory(): Category | undefined {
  return db.prepare("SELECT * FROM game_categories WHERE in_use = 1 ORDER BY id LIMIT 1").get() as Category | undefined;
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

// ---------------------------------------------------------------------------------------------
// Round flow
// ---------------------------------------------------------------------------------------------

function answers(roundId: number): Answer[] {
  return db.prepare("SELECT * FROM game_answers WHERE round_id = ? ORDER BY seq").all(roundId) as Answer[];
}

function bonusOf(list: Answer[]): number {
  return list.reduce((sum, a) => sum + (a.correct === 1 ? CORRECT_BONUS : a.correct === 0 && a.choice !== null ? -WRONG_PENALTY : 0), 0);
}

function scoreOf(hits: number, list: Answer[]): number {
  return Math.max(0, hits * POINTS_PER_HIT + bonusOf(list));
}

function msLeft(round: Round): number {
  if (!round.started_at) return ROUND_SECONDS * 1000;
  return ROUND_SECONDS * 1000 - (Date.now() - sqlTime(round.started_at));
}

function refreshLive(roundId: number) {
  const r = getRound(roundId)!;
  db.prepare("UPDATE game_rounds SET live_score = ? WHERE id = ?").run(scoreOf(r.hits ?? 0, answers(roundId)), roundId);
}

// A round past its clock (plus grace) is closed: an open question gets no points either way.
function closeRound(round: Round) {
  db.prepare("UPDATE game_answers SET answered_at = datetime('now') WHERE round_id = ? AND answered_at IS NULL").run(round.id);
  const score = scoreOf(round.hits ?? 0, answers(round.id));
  db.prepare(
    "UPDATE game_rounds SET status = 'done', score = ?, live_score = ?, finished_at = datetime('now') WHERE id = ? AND status = 'playing'",
  ).run(score, score, round.id);
}

// Called on every read: rounds whose clock ran out (and the target never said so) still finish.
export function settle(round: Round): Round {
  if (round.status === "playing" && msLeft(round) < -GRACE_MS - 6000) {
    closeRound(round);
    return getRound(round.id)!;
  }
  return round;
}

// GO on the target: the clock starts, with the question category in use right now.
export function startRound(round: Round): Round {
  if (round.status === "ready") {
    db.prepare(
      "UPDATE game_rounds SET status = 'playing', started_at = datetime('now'), hits = 0, live_score = 0, category_id = ? WHERE id = ?",
    ).run(inUseCategory()?.id ?? null, round.id);
  }
  return getRound(round.id)!;
}

// The target reports its hit count so far, and (sometimes) that hit number `ask` should ask a question.
// Both are safe to resend: the count only ever goes up, and each hit number asks at most one question.
export function recordHits(round: Round, hits: number, ask: number): Round {
  round = settle(round);
  if (round.status !== "playing" || !round.started_at) return round;
  const elapsed = Date.now() - sqlTime(round.started_at);
  if (elapsed > ROUND_SECONDS * 1000 + GRACE_MS) return round;

  // A real laser can't hit faster than the target's cooldown allows.
  const maxHits = Math.floor(Math.min(elapsed, ROUND_SECONDS * 1000) / COOLDOWN_MS) + 2;
  const accepted = Math.max(round.hits ?? 0, Math.min(Math.floor(hits), maxHits));
  if (accepted !== round.hits) db.prepare("UPDATE game_rounds SET hits = ? WHERE id = ?").run(accepted, round.id);

  const list = answers(round.id);
  const open = list.some((a) => a.answered_at === null);
  if (ask > 0 && ask <= accepted && !open && !list.some((a) => a.trigger_hit === ask)) askQuestion(round, list, ask);
  refreshLive(round.id);
  return getRound(round.id)!;
}

function askQuestion(round: Round, list: Answer[], triggerHit: number) {
  const pool = (db
    .prepare("SELECT id FROM game_questions WHERE active = 1 AND category_id = ?")
    .all(round.category_id ?? inUseCategory()?.id ?? -1) as { id: number }[]).map((q) => q.id);
  if (pool.length === 0) return; // empty category: the round just has no questions
  const used = new Set(list.map((a) => a.question_id));
  const fresh = pool.filter((id) => !used.has(id));
  const from = fresh.length > 0 ? fresh : pool; // a long round may run out: repeats then
  const questionId = from[randomInt(from.length)];

  // Shuffle the options: in the source documents most answers are B.
  const perm = [0, 1, 2, 3];
  for (let i = perm.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  db.prepare(
    "INSERT OR IGNORE INTO game_answers (round_id, seq, question_id, perm, trigger_hit) VALUES (?, ?, ?, ?, ?)",
  ).run(round.id, list.length + 1, questionId, perm.join(","), triggerHit);
}

// The clock ran out on the target: final hit count, close any open question.
export function finishRound(round: Round, hits: number): Round {
  round = recordHits(round, hits, 0);
  if (round.status === "playing") closeRound(round);
  return getRound(round.id)!;
}

export function skipRound(round: Round) {
  if (round.status === "ready" || round.status === "playing") {
    db.prepare("UPDATE game_rounds SET status = 'skipped', finished_at = datetime('now') WHERE id = ?").run(round.id);
  }
}

export type AnswerResult = { ok: true; correct: boolean } | { ok: false; error: string };

// The player's tap on their phone. `choice` is the position on screen (0 = A).
export function submitAnswer(round: Round, seq: number, choice: number): AnswerResult {
  round = settle(round);
  if (round.status !== "playing") return { ok: false, error: "Pusingan sudah tamat" };
  const a = db.prepare("SELECT * FROM game_answers WHERE round_id = ? AND seq = ?").get(round.id, seq) as Answer | undefined;
  if (!a) return { ok: false, error: "Soalan tidak dijumpai" };
  if (a.answered_at !== null) return { ok: false, error: "Soalan ini sudah ditutup" };
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return { ok: false, error: "Pilihan tidak sah" };

  const q = db.prepare("SELECT answer FROM game_questions WHERE id = ?").get(a.question_id) as { answer: number };
  const correct = a.perm.split(",").map(Number)[choice] === q.answer;
  const res = db
    .prepare("UPDATE game_answers SET choice = ?, correct = ?, answered_at = datetime('now') WHERE id = ? AND answered_at IS NULL")
    .run(choice, correct ? 1 : 0, a.id);
  if (Number(res.changes) === 0) return { ok: false, error: "Soalan ini sudah ditutup" };
  refreshLive(round.id);
  return { ok: true, correct };
}

// Everything a screen needs about a round: score, clock, the open question (options in shown order)
// and the result of the last closed one.
export function roundView(round: Round) {
  const list = answers(round.id);
  const pending = list.find((a) => a.answered_at === null);
  const lastDone = [...list].reverse().find((a) => a.answered_at !== null);
  const question = (a: Answer) => db.prepare("SELECT * FROM game_questions WHERE id = ?").get(a.question_id) as Question;
  const opts = (q: Question) => [q.opt_a, q.opt_b, q.opt_c, q.opt_d];
  const hits = round.hits ?? 0;

  let open = null;
  if (pending) {
    const q = question(pending);
    const all = opts(q);
    open = { seq: pending.seq, text: q.text, options: pending.perm.split(",").map((i) => all[Number(i)]) };
  }
  let last = null;
  if (lastDone) {
    const q = question(lastDone);
    const perm = lastDone.perm.split(",").map(Number);
    last = {
      seq: lastDone.seq,
      correct: lastDone.correct === 1,
      unanswered: lastDone.choice === null,
      answerLetter: LETTERS[perm.indexOf(q.answer)],
      answerText: opts(q)[q.answer],
    };
  }
  const closed = list.filter((a) => a.answered_at !== null);
  return {
    hits,
    asked: list.length,
    correctCount: closed.filter((a) => a.correct === 1).length,
    wrongCount: closed.filter((a) => a.correct === 0 && a.choice !== null).length,
    bonus: bonusOf(list),
    score: round.status === "done" ? round.score ?? 0 : scoreOf(hits, list),
    secondsLeft: round.status === "playing" ? Math.max(0, Math.ceil(msLeft(round) / 1000)) : round.status === "ready" ? ROUND_SECONDS : 0,
    open,
    last,
  };
}

export function boardData() {
  const since = todayUtc();
  const top = db
    .prepare(
      `SELECT id, name, score, hits FROM game_rounds
       WHERE status = 'done' AND finished_at >= ? ORDER BY score DESC, finished_at ASC LIMIT 10`,
    )
    .all(since) as Pick<Round, "id" | "name" | "score" | "hits">[];
  let current = db
    .prepare("SELECT * FROM game_rounds WHERE status IN ('ready','playing') ORDER BY id LIMIT 1")
    .get() as Round | undefined;
  if (current) current = settle(current);
  const view = current && current.status === "playing" ? roundView(current) : null;
  const next = db
    .prepare("SELECT id, name FROM game_rounds WHERE status = 'queued' ORDER BY id LIMIT 3")
    .all() as Pick<Round, "id" | "name">[];
  const queued = (db.prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'queued'").get() as { n: number }).n;
  const played = (db
    .prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'done' AND finished_at >= ?")
    .get(since) as { n: number }).n;
  const category = inUseCategory();
  return { top, current: current && current.status !== "done" ? current : undefined, view, next, queued, played, category };
}
