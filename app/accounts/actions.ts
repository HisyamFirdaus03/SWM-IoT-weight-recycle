"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function createAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!name) return;

  // SWMM + 8-digit running number, matching the format on SWM's bag labels.
  const row = db
    .prepare("SELECT MAX(CAST(SUBSTR(account_no, 5) AS INTEGER)) AS n FROM accounts WHERE account_no LIKE 'SWMM%'")
    .get() as { n: number | null };
  const accountNo = "SWMM" + String((row.n ?? 0) + 1).padStart(8, "0");

  db.prepare("INSERT INTO accounts (account_no, name, phone) VALUES (?, ?, ?)").run(accountNo, name, phone);
  revalidatePath("/accounts");
}
