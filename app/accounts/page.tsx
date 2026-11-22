import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { AccountsView, type AccountRow } from "./accounts-view";

export const metadata: Metadata = { title: "Accounts · KITARecycle" };

export default async function AccountsPage() {
  await connection();
  const rows = db
    .prepare(
      `SELECT a.account_no AS no, a.name, a.phone, COUNT(t.id) AS txns, COALESCE(SUM(t.rp_earned), 0) AS rp,
              MAX(t.created_at) AS last
       FROM accounts a LEFT JOIN transactions t ON t.account_no = a.account_no
       GROUP BY a.account_no ORDER BY a.created_at DESC, a.account_no DESC`,
    )
    .all() as { no: string; name: string; phone: string | null; txns: number; rp: number; last: string | null }[];

  const max = db
    .prepare("SELECT MAX(CAST(SUBSTR(account_no, 5) AS INTEGER)) AS n FROM accounts WHERE account_no LIKE 'SWMM%'")
    .get() as { n: number | null };
  const nextNo = "SWMM" + String((max.n ?? 0) + 1).padStart(8, "0");

  const accounts: AccountRow[] = rows.map((r) => ({ ...r, last: r.last ? r.last.replace(" ", "T") + "Z" : null }));
  return <AccountsView accounts={accounts} nextNo={nextNo} />;
}
