import { db } from "./db";
import { CATEGORY_INFO, categoryLabel } from "./categories";

// Overview numbers. Weighings are stored in UTC ("YYYY-MM-DD HH:MM:SS"); months and days are
// counted in Malaysia time, so every date expression shifts by +8 hours.
const MY = "'+8 hours'";

export const MONTHLY_TARGET_KG = Number(process.env.MONTHLY_TARGET_KG) || 1500;
export const CO2_PER_KG = 3.12; // US EPA WARM, mixed recyclables vs landfill (same factor as the event board)

export function malaysiaNow(): Date {
  return new Date(Date.now() + 8 * 3600e3); // read with getUTC* to get Malaysian wall-clock parts
}
export function currentMonthKey(): string {
  return malaysiaNow().toISOString().slice(0, 7);
}

export type MonthOption = { key: string; label: string; kg: number; current: boolean };

export function listMonths(): MonthOption[] {
  const cur = currentMonthKey();
  const rows = db.prepare(
    `SELECT strftime('%Y-%m', created_at, ${MY}) AS key, SUM(weight_kg) AS kg
     FROM transactions GROUP BY key ORDER BY key DESC LIMIT 12`,
  ).all() as { key: string; kg: number }[];
  if (!rows.some((r) => r.key === cur)) rows.unshift({ key: cur, kg: 0 });
  return rows.map((r) => ({ key: r.key, label: monthLabel(r.key), kg: r.kg, current: r.key === cur }));
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export type MonthStats = {
  key: string; label: string; name: string; days: number; today: number | null; firstWeekday: number;
  series: number[]; kg: number; rp: number; weighings: number; accounts: number; co2: number; target: number;
  mix: { code: number; name: string; color: string; kg: number; rp: number; rate: number; share: number }[];
  top: { accountNo: string; name: string; kg: number }[];
};

export function monthStats(key: string): MonthStats {
  const [y, m] = key.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const now = malaysiaNow();
  const today = key === currentMonthKey() ? now.getUTCDate() : null;

  const daily = db.prepare(
    `SELECT CAST(strftime('%d', created_at, ${MY}) AS INTEGER) AS d, SUM(weight_kg) AS kg
     FROM transactions WHERE strftime('%Y-%m', created_at, ${MY}) = ? GROUP BY d`,
  ).all(key) as { d: number; kg: number }[];
  const series = Array.from({ length: days }, () => 0);
  for (const r of daily) series[r.d - 1] = r.kg;

  const t = db.prepare(
    `SELECT COALESCE(SUM(weight_kg), 0) AS kg, COALESCE(SUM(rp_earned), 0) AS rp, COUNT(*) AS n,
            COUNT(DISTINCT account_no) AS accounts
     FROM transactions WHERE strftime('%Y-%m', created_at, ${MY}) = ?`,
  ).get(key) as { kg: number; rp: number; n: number; accounts: number };

  const mixRows = db.prepare(
    `SELECT c.code, c.name, c.rp_per_kg AS rate, SUM(t.weight_kg) AS kg, SUM(t.rp_earned) AS rp
     FROM transactions t JOIN categories c ON c.code = t.category_code
     WHERE strftime('%Y-%m', t.created_at, ${MY}) = ? GROUP BY c.code ORDER BY kg DESC`,
  ).all(key) as { code: number; name: string; rate: number; kg: number; rp: number }[];

  const top = db.prepare(
    `SELECT a.account_no AS accountNo, a.name, SUM(t.weight_kg) AS kg
     FROM transactions t JOIN accounts a ON a.account_no = t.account_no
     WHERE strftime('%Y-%m', t.created_at, ${MY}) = ? GROUP BY a.account_no ORDER BY kg DESC LIMIT 6`,
  ).all(key) as { accountNo: string; name: string; kg: number }[];

  return {
    key, label: monthLabel(key), name: monthLabel(key).split(" ")[0], days, today, firstWeekday,
    series, kg: t.kg, rp: t.rp, weighings: t.n, accounts: t.accounts, co2: t.kg * CO2_PER_KG, target: MONTHLY_TARGET_KG,
    mix: mixRows.map((r) => ({
      code: r.code, name: categoryLabel(r.code, r.name), color: CATEGORY_INFO[r.code]?.color ?? "#9A978D",
      kg: r.kg, rp: r.rp, rate: r.rate, share: t.kg ? r.kg / t.kg : 0,
    })),
    top,
  };
}

export type Weighing = { id: number; at: string; accountNo: string; name: string; material: string; color: string; kg: number; rp: number };

export function latestWeighings(limit = 6): Weighing[] {
  const rows = db.prepare(
    `SELECT t.id, t.created_at, t.account_no, a.name, t.category_code, c.name AS cat, t.weight_kg, t.rp_earned
     FROM transactions t JOIN accounts a ON a.account_no = t.account_no JOIN categories c ON c.code = t.category_code
     ORDER BY t.id DESC LIMIT ?`,
  ).all(limit) as { id: number; created_at: string; account_no: string; name: string; category_code: number; cat: string; weight_kg: number; rp_earned: number }[];
  return rows.map((r) => ({
    id: r.id, at: r.created_at.replace(" ", "T") + "Z", accountNo: r.account_no, name: r.name,
    material: categoryLabel(r.category_code, r.cat), color: CATEGORY_INFO[r.category_code]?.color ?? "#9A978D",
    kg: r.weight_kg, rp: r.rp_earned,
  }));
}

export type Device = { id: string; location: string | null; lastSeen: string | null };

export function devices(): Device[] {
  const rows = db.prepare("SELECT id, location, last_seen FROM devices ORDER BY id").all() as { id: string; location: string | null; last_seen: string | null }[];
  return rows.map((d) => ({ id: d.id, location: d.location, lastSeen: d.last_seen ? d.last_seen.replace(" ", "T") + "Z" : null }));
}
