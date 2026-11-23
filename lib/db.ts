import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { QUIZ } from "./quiz";

// Mock of the KITARecycle backend for the prototype. SQLite via Node's built-in
// driver, so there are no native npm deps. The file lives in web/data/ locally, and in the
// DATA_DIR volume on the server (see Dockerfile).

// Opened on first use, not at import: `next build` imports every route in parallel workers, and
// opening (and seeding) the file there made them fight over it ("database is locked").
// One connection is reused across hot reloads in dev.
const globalForDb = globalThis as unknown as { kitaDb?: DatabaseSync };
function open(): DatabaseSync {
  if (!globalForDb.kitaDb) {
    const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
    mkdirSync(dataDir, { recursive: true });
    globalForDb.kitaDb = new DatabaseSync(path.join(dataDir, "kitarecycle.db"));
    migrate();
  }
  return globalForDb.kitaDb;
}

export const db = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const real = open();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

function migrate() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      code       INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      rp_per_kg  REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      account_no TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      phone      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id         TEXT PRIMARY KEY,
      api_key    TEXT NOT NULL,
      location   TEXT,
      last_seen  TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      client_txn_id  TEXT NOT NULL UNIQUE,
      device_id      TEXT NOT NULL REFERENCES devices(id),
      account_no     TEXT NOT NULL REFERENCES accounts(account_no),
      category_code  INTEGER NOT NULL REFERENCES categories(code),
      weight_kg      REAL NOT NULL,
      rp_per_kg      REAL NOT NULL,
      rp_earned      REAL NOT NULL,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  migrateGame();

  // Added with the editable Rates page: when each rate was last changed (NULL = SWM's original).
  const catCols = db.prepare("PRAGMA table_info(categories)").all() as { name: string }[];
  if (!catCols.some((c) => c.name === "updated_at")) db.exec("ALTER TABLE categories ADD COLUMN updated_at TEXT");

  const count = db.prepare("SELECT COUNT(*) AS n FROM categories").get() as { n: number };
  if (count.n > 0) return;

  // Rates from "Jenis Barangan dan RP KITARecycle" (SWM slide 7).
  const categories: [number, string, number][] = [
    [1, "Tin Besi", 2],
    [2, "Besi Scrap", 6],
    [3, "Besi Premium", 2],
    [4, "Tin Aluminium", 60],
    [5, "Kertas Campur", 4.4],
    [6, "Buku dan Majalah", 1.5],
    [7, "Kadbod", 8],
    [8, "Surat Khabar", 7],
    [9, "Kertas Hitam/Putih", 7],
    [10, "Tetra Pak", 1.5],
    [11, "Plastik Keras", 2.5],
    [12, "Plastik Campur", 10],
    [13, "Botol Plastik", 3],
    [14, "Bateri Kenderaan", 20],
    [15, "Botol Kaca", 1.5],
  ];
  const insCat = db.prepare("INSERT INTO categories (code, name, rp_per_kg) VALUES (?, ?, ?)");
  for (const c of categories) insCat.run(...c);

  const insAcc = db.prepare("INSERT INTO accounts (account_no, name, phone) VALUES (?, ?, ?)");
  insAcc.run("SWMM00004787", "Demo Pengguna A", "0120000001");
  insAcc.run("SWMM00001234", "Demo Pengguna B", "0120000002");

  // On the server the key must come from the environment: the dev default is in the repo and the
  // firmware example, so anyone could post weights with it.
  const deviceKey = process.env.DEVICE_KEY;
  if (!deviceKey && process.env.NODE_ENV === "production") {
    throw new Error("DEVICE_KEY must be set before the first start (it seeds device SCALE-01)");
  }
  db.prepare("INSERT INTO devices (id, api_key, location) VALUES (?, ?, ?)").run(
    "SCALE-01",
    deviceKey ?? "dev-secret-change-me",
    "UTM Prototype Station",
  );
}

// Laser target game (/game). Runs on every start, so databases created before the game existed get it too.
// status: queued (signed up) -> ready (handed to the target) -> playing -> done | skipped
function migrateGame() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_rounds (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'queued',
      device_id    TEXT,
      score        INTEGER,
      hits         INTEGER,
      live_score   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      started_at   TEXT,
      finished_at  TEXT
    );
    CREATE INDEX IF NOT EXISTS game_rounds_status ON game_rounds(status, id);

    -- Quiz questions (from "soalan Power Shoot.docx"). answer = index 0-3 of the correct option.
    CREATE TABLE IF NOT EXISTS game_questions (
      id      INTEGER PRIMARY KEY,
      text    TEXT NOT NULL,
      opt_a   TEXT NOT NULL,
      opt_b   TEXT NOT NULL,
      opt_c   TEXT NOT NULL,
      opt_d   TEXT NOT NULL,
      answer  INTEGER NOT NULL CHECK (answer BETWEEN 0 AND 3),
      active  INTEGER NOT NULL DEFAULT 1
    );

    -- One row per question asked in a round. perm = the order the options were shown in (e.g. "2,0,3,1"),
    -- choice = the shown position the player tapped (NULL = ran out of time).
    CREATE TABLE IF NOT EXISTS game_answers (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id     INTEGER NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
      seq          INTEGER NOT NULL,
      question_id  INTEGER NOT NULL REFERENCES game_questions(id),
      perm         TEXT NOT NULL,
      choice       INTEGER,
      correct      INTEGER,
      asked_at     TEXT NOT NULL DEFAULT (datetime('now')),
      answered_at  TEXT,
      UNIQUE (round_id, seq)
    );
  `);

  // Added with the quiz: each round's ticket page is reached by a random token, not its guessable id.
  const roundCols = db.prepare("PRAGMA table_info(game_rounds)").all() as { name: string }[];
  if (!roundCols.some((c) => c.name === "token")) {
    db.exec("ALTER TABLE game_rounds ADD COLUMN token TEXT");
    const rows = db.prepare("SELECT id FROM game_rounds").all() as { id: number }[];
    const set = db.prepare("UPDATE game_rounds SET token = ? WHERE id = ?");
    for (const r of rows) set.run(randomBytes(12).toString("hex"), r.id);
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS game_rounds_token ON game_rounds(token)");
  }

  // Sync the question bank to lib/quiz.ts. Removed questions are switched off, not deleted: past
  // answers still point at them.
  const upsert = db.prepare(
    `INSERT INTO game_questions (id, text, opt_a, opt_b, opt_c, opt_d, answer, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET text = excluded.text, opt_a = excluded.opt_a, opt_b = excluded.opt_b,
       opt_c = excluded.opt_c, opt_d = excluded.opt_d, answer = excluded.answer, active = 1`,
  );
  for (const q of QUIZ) upsert.run(...q);
  const keep = QUIZ.map((q) => q[0]);
  db.prepare(`UPDATE game_questions SET active = 0 WHERE id NOT IN (${keep.map(() => "?").join(",")})`).run(...keep);

  // The target's key comes from the environment on the server. Unlike the scale, a missing key
  // must not stop the app: the game's device API just stays closed until LASER_DEVICE_KEY is set.
  const key = process.env.LASER_DEVICE_KEY ?? (process.env.NODE_ENV === "production" ? null : "laser-dev-key");
  if (key) {
    db.prepare(
      `INSERT INTO devices (id, api_key, location) VALUES ('LASER-01', ?, 'Laser target game')
       ON CONFLICT(id) DO UPDATE SET api_key = excluded.api_key`,
    ).run(key);
  }
}

export type Category = { code: number; name: string; rp_per_kg: number };
export type Account = { account_no: string; name: string; phone: string | null; created_at: string };
export type Transaction = {
  id: number;
  client_txn_id: string;
  device_id: string;
  account_no: string;
  account_name: string;
  category_code: number;
  category_name: string;
  weight_kg: number;
  rp_earned: number;
  created_at: string;
};

export function accountTotalRp(accountNo: string): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(rp_earned), 0) AS total FROM transactions WHERE account_no = ?")
    .get(accountNo) as { total: number };
  return Math.round(row.total * 100) / 100;
}
