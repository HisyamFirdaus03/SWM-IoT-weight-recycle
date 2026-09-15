import { accountTotalRp, db, type Category } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";

const MIN_KG = 0.05;
const MAX_KG = 150; // load cell capacity guard

type Body = { clientTxnId?: unknown; accountNo?: unknown; categoryCode?: unknown; weightKg?: unknown };

export async function POST(req: Request) {
  const deviceId = authenticateDevice(req);
  if (deviceId instanceof Response) return deviceId;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { clientTxnId, accountNo, categoryCode, weightKg } = body;
  if (typeof clientTxnId !== "string" || !clientTxnId || clientTxnId.length > 100)
    return Response.json({ error: "clientTxnId required" }, { status: 400 });
  if (typeof accountNo !== "string") return Response.json({ error: "accountNo required" }, { status: 400 });
  if (typeof categoryCode !== "number") return Response.json({ error: "categoryCode required" }, { status: 400 });
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg < MIN_KG || weightKg > MAX_KG)
    return Response.json({ error: `weightKg must be ${MIN_KG}-${MAX_KG}` }, { status: 400 });

  // Idempotency: the scale reuses clientTxnId when retrying after a timeout,
  // so a lost response never credits points twice.
  const existing = db
    .prepare("SELECT id, account_no, rp_earned FROM transactions WHERE client_txn_id = ?")
    .get(clientTxnId) as { id: number; account_no: string; rp_earned: number } | undefined;
  if (existing) {
    return Response.json({
      id: existing.id,
      rpEarned: existing.rp_earned,
      accountTotalRp: accountTotalRp(existing.account_no),
      duplicate: true,
    });
  }

  const acc = db.prepare("SELECT account_no FROM accounts WHERE account_no = ?").get(accountNo.toUpperCase()) as
    | { account_no: string }
    | undefined;
  if (!acc) return Response.json({ error: "account not found" }, { status: 404 });

  const cat = db.prepare("SELECT * FROM categories WHERE code = ?").get(categoryCode) as Category | undefined;
  if (!cat) return Response.json({ error: "unknown category" }, { status: 404 });

  // Points are computed server-side from the current rate — never trusted from the device.
  const weight = Math.round(weightKg * 100) / 100;
  const rpEarned = Math.round(weight * cat.rp_per_kg * 100) / 100;

  const result = db
    .prepare(
      `INSERT INTO transactions (client_txn_id, device_id, account_no, category_code, weight_kg, rp_per_kg, rp_earned)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(clientTxnId, deviceId, acc.account_no, cat.code, weight, cat.rp_per_kg, rpEarned);

  return Response.json(
    {
      id: Number(result.lastInsertRowid),
      rpEarned,
      accountTotalRp: accountTotalRp(acc.account_no),
    },
    { status: 201 },
  );
}
