"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export type CreateResult = { ok: true; accountNo: string } | { ok: false; error: string };

export async function createAccount(name: string, phone: string): Promise<CreateResult> {
  await requireAdmin();
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Enter a name." };
  if (clean.length > 80) return { ok: false, error: "That name is too long." };

  // SWMM + 8-digit running number, matching the format on SWM's bag labels.
  const row = db
    .prepare("SELECT MAX(CAST(SUBSTR(account_no, 5) AS INTEGER)) AS n FROM accounts WHERE account_no LIKE 'SWMM%'")
    .get() as { n: number | null };
  const accountNo = "SWMM" + String((row.n ?? 0) + 1).padStart(8, "0");

  db.prepare("INSERT INTO accounts (account_no, name, phone) VALUES (?, ?, ?)").run(accountNo, clean, phone.trim() || null);
  revalidatePath("/accounts");
  return { ok: true, accountNo };
}
