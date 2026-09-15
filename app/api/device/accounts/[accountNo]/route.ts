import { accountTotalRp, db, type Account } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";

export async function GET(req: Request, ctx: RouteContext<"/api/device/accounts/[accountNo]">) {
  const auth = authenticateDevice(req);
  if (auth instanceof Response) return auth;

  const { accountNo } = await ctx.params;
  const acc = db.prepare("SELECT * FROM accounts WHERE account_no = ?").get(accountNo.toUpperCase()) as
    | Account
    | undefined;
  if (!acc) return Response.json({ error: "account not found" }, { status: 404 });

  return Response.json({
    accountNo: acc.account_no,
    name: acc.name,
    totalRp: accountTotalRp(acc.account_no),
  });
}
