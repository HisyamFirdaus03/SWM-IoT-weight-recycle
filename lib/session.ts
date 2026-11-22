import { createHmac, timingSafeEqual } from "node:crypto";

// Admin sign-in. One shared admin login (ADMIN_USER / ADMIN_PASSWORD, set in Coolify) and a signed
// session cookie: "<expiry>.<HMAC of expiry>". No session table needed, and changing ADMIN_PASSWORD
// (or SESSION_SECRET) signs everyone out because the old signatures stop matching.

export const SESSION_COOKIE = "kita_session";
export const LONG_SESSION = 60 * 60 * 24 * 30; // "Keep me signed in": 30 days
export const SHORT_SESSION = 60 * 60 * 12; // otherwise the token itself expires after 12 hours

export function authConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-only-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function createSessionToken(maxAgeSeconds: number): string {
  const exp = String(Math.floor(Date.now() / 1000) + maxAgeSeconds);
  return `${exp}.${sign(exp)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  return same(sig, sign(exp));
}

export function credentialsMatch(user: string, password: string): boolean {
  if (!authConfigured()) return process.env.NODE_ENV !== "production"; // local dev: any login works
  const okUser = same(user, process.env.ADMIN_USER ?? "admin");
  const okPass = same(password, process.env.ADMIN_PASSWORD ?? "");
  return okUser && okPass;
}

// Only same-site paths are allowed as the post-login destination, never "//evil.example".
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
