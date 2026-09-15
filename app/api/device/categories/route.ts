import { db, type Category } from "@/lib/db";
import { authenticateDevice } from "@/lib/device-auth";

export async function GET(req: Request) {
  const auth = authenticateDevice(req);
  if (auth instanceof Response) return auth;

  const rows = db.prepare("SELECT code, name, rp_per_kg FROM categories ORDER BY code").all() as Category[];
  return Response.json({
    categories: rows.map((c) => ({ code: c.code, name: c.name, rpPerKg: c.rp_per_kg })),
  });
}
