import { cookies } from "next/headers";
import { authConfigured, SESSION_COOKIE, verifySessionToken } from "./session";

// Second check inside server actions. The proxy already guards the pages, but an action is a
// plain POST that could be replayed against any path, so each one verifies the session itself.
export async function requireAdmin(): Promise<void> {
  if (!authConfigured() && process.env.NODE_ENV !== "production") return;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) throw new Error("Not signed in");
}
