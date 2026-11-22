"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export type SaveResult = { ok: true; saved: number } | { ok: false; error: string };

// Weighings keep the rate they were made with (transactions.rp_per_kg), so a change here only
// affects weighings from now on.
export async function saveRates(changes: { code: number; rate: number }[]): Promise<SaveResult> {
  await requireAdmin();
  for (const c of changes) {
    if (!Number.isInteger(c.code) || !Number.isFinite(c.rate) || c.rate < 0 || c.rate > 1000) {
      return { ok: false, error: "Rates must be numbers between 0 and 1,000." };
    }
  }
  const update = db.prepare("UPDATE categories SET rp_per_kg = ?, updated_at = datetime('now') WHERE code = ?");
  db.exec("BEGIN");
  try {
    for (const c of changes) update.run(Math.round(c.rate * 100) / 100, c.code);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  revalidatePath("/rates");
  revalidatePath("/");
  return { ok: true, saved: changes.length };
}
