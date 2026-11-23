import { randomBytes, randomInt } from "node:crypto";
import { db } from "./db";

// Laser target quiz rules. A round is QUESTIONS_PER_ROUND questions: each laser hit asks the next one on
// the player's phone, and each correct answer scores POINTS_PER_CORRECT.
export const QUESTIONS_PER_ROUND = 5;
export const POINTS_PER_CORRECT = 10;
export const ANSWER_SECONDS = 20; // unanswered after this = wrong
export const NAME_MAX = 16; // one line of the target's 16x2 LCD
export const QUEUE_MAX = 60;
export const LETTERS = ["A", "B", "C", "D"];

export type Round = {
  id: number;
  token: string;
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

type Question = { id: number; text: string; opt_a: string; opt_b: string; opt_c: string; opt_d: string; answer: number };
type Answer = {
  id: number; round_id: number; seq: number; question_id: number; perm: string;
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
// Quiz flow
// ---------------------------------------------------------------------------------------------

function answers(roundId: number): Answer[] {
  return db.prepare("SELECT * FROM game_answers WHERE round_id = ? ORDER BY seq").all(roundId) as Answer[];
}

function scoreOf(list: Answer[]): number {
  return list.filter((a) => a.correct === 1).length * POINTS_PER_CORRECT;
}

function finishRound(round: Round, list = answers(round.id)) {
  const score = scoreOf(list);
  db.prepare(
    "UPDATE game_rounds SET status = 'done', score = ?, live_score = ?, hits = ?, finished_at = datetime('now') WHERE id = ? AND status = 'playing'",
  ).run(score, score, list.length, round.id);
}

// A question left unanswered past ANSWER_SECONDS counts as wrong; the last one closes the round.
// Called on every read, so time-outs don't need a background job.
export function settle(round: Round): Round {
  if (round.status !== "playing") return round;
  const list = answers(round.id);
  const pending = list.find((a) => a.answered_at === null);
  if (pending && Date.now() - sqlTime(pending.asked_at) > ANSWER_SECONDS * 1000) {
    db.prepare("UPDATE game_answers SET correct = 0, answered_at = datetime('now') WHERE id = ? AND answered_at IS NULL").run(pending.id);
    pending.correct = 0;
    pending.answered_at = "timeout";
  }
  const done = list.filter((a) => a.answered_at !== null);
  if (done.length >= QUESTIONS_PER_ROUND) finishRound(round, list);
  return getRound(round.id) ?? round;
}

// A laser hit: start the round if needed and ask the next question. Asking again while a question is
// still open returns that same question, so a double hit or a resent request never skips one.
export function askNext(round: Round): Round {
  if (round.status === "ready") {
    db.prepare("UPDATE game_rounds SET status = 'playing', started_at = datetime('now'), live_score = 0 WHERE id = ?").run(round.id);
    round = getRound(round.id)!;
  }
  round = settle(round);
  if (round.status !== "playing") return round;

  const list = answers(round.id);
  if (list.some((a) => a.answered_at === null)) return round;
  if (list.length >= QUESTIONS_PER_ROUND) return round;

  const used = new Set(list.map((a) => a.question_id));
  const pool = (db.prepare("SELECT id FROM game_questions WHERE active = 1").all() as { id: number }[])
    .map((q) => q.id)
    .filter((id) => !used.has(id));
  if (pool.length === 0) {
    finishRound(round, list);
    return getRound(round.id)!;
  }
  const questionId = pool[randomInt(pool.length)];

  // Shuffle the options: in the source document almost every answer is B.
  const perm = [0, 1, 2, 3];
  for (let i = perm.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  db.prepare("INSERT OR IGNORE INTO game_answers (round_id, seq, question_id, perm) VALUES (?, ?, ?, ?)").run(
    round.id, list.length + 1, questionId, perm.join(","),
  );
  return round;
}

export type AnswerResult = { ok: true; correct: boolean } | { ok: false; error: string };

// The player's tap on their phone. `choice` is the position on screen (0 = A).
export function submitAnswer(round: Round, seq: number, choice: number): AnswerResult {
  round = settle(round);
  if (round.status !== "playing") return { ok: false, error: "Pusingan sudah tamat" };
  const a = db.prepare("SELECT * FROM game_answers WHERE round_id = ? AND seq = ?").get(round.id, seq) as Answer | undefined;
  if (!a) return { ok: false, error: "Soalan tidak dijumpai" };
  if (a.answered_at !== null) return { ok: false, error: "Soalan ini sudah dijawab" };
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return { ok: false, error: "Pilihan tidak sah" };

  const q = db.prepare("SELECT answer FROM game_questions WHERE id = ?").get(a.question_id) as { answer: number };
  const correct = a.perm.split(",").map(Number)[choice] === q.answer;
  const res = db
    .prepare("UPDATE game_answers SET choice = ?, correct = ?, answered_at = datetime('now') WHERE id = ? AND answered_at IS NULL")
    .run(choice, correct ? 1 : 0, a.id);
  if (Number(res.changes) === 0) return { ok: false, error: "Soalan ini sudah dijawab" };

  const list = answers(round.id);
  db.prepare("UPDATE game_rounds SET live_score = ? WHERE id = ?").run(scoreOf(list), round.id);
  settle(getRound(round.id)!);
  return { ok: true, correct };
}

// Player walked away mid-round: close any open question as wrong and keep the score so far.
export function endRound(round: Round) {
  if (round.status === "ready") {
    db.prepare("UPDATE game_rounds SET status = 'skipped', finished_at = datetime('now') WHERE id = ?").run(round.id);
    return;
  }
  if (round.status !== "playing") return;
  db.prepare("UPDATE game_answers SET correct = 0, answered_at = datetime('now') WHERE round_id = ? AND answered_at IS NULL").run(round.id);
  finishRound(round);
}

// Everything a screen needs about a round: progress, the open question (options in shown order),
// and the result of the last answered one.
export function quizView(round: Round) {
  const list = answers(round.id);
  const pending = list.find((a) => a.answered_at === null);
  const lastDone = [...list].reverse().find((a) => a.answered_at !== null);
  const question = (a: Answer) => db.prepare("SELECT * FROM game_questions WHERE id = ?").get(a.question_id) as Question;
  const opts = (q: Question) => [q.opt_a, q.opt_b, q.opt_c, q.opt_d];

  let open = null;
  if (pending) {
    const q = question(pending);
    const all = opts(q);
    open = {
      seq: pending.seq,
      text: q.text,
      options: pending.perm.split(",").map((i) => all[Number(i)]),
      secondsLeft: Math.max(0, Math.ceil(ANSWER_SECONDS - (Date.now() - sqlTime(pending.asked_at)) / 1000)),
    };
  }
  let last = null;
  if (lastDone) {
    const q = question(lastDone);
    const perm = lastDone.perm.split(",").map(Number);
    last = {
      seq: lastDone.seq,
      correct: lastDone.correct === 1,
      timedOut: lastDone.choice === null,
      answerLetter: LETTERS[perm.indexOf(q.answer)],
      answerText: opts(q)[q.answer],
    };
  }
  return {
    asked: list.length,
    answered: list.filter((a) => a.answered_at !== null).length,
    total: QUESTIONS_PER_ROUND,
    score: round.status === "done" ? round.score ?? 0 : scoreOf(list),
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
  const quiz = current && current.status === "playing" ? quizView(current) : null;
  const next = db
    .prepare("SELECT id, name FROM game_rounds WHERE status = 'queued' ORDER BY id LIMIT 3")
    .all() as Pick<Round, "id" | "name">[];
  const queued = (db.prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'queued'").get() as { n: number }).n;
  const played = (db
    .prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'done' AND finished_at >= ?")
    .get(since) as { n: number }).n;
  return { top, current: current && current.status !== "done" ? current : undefined, quiz, next, queued, played };
}
