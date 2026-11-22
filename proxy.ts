import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfigured, SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Admin pages need a signed-in session; anything else (the event board, /game, /login and the
// scales' /api/device/*, which use their own X-Device-Key) stays open.
export function proxy(request: NextRequest) {
  if (!authConfigured()) {
    // Locally (npm run dev) there's no password; on the server, refuse rather than run open.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("ADMIN_PASSWORD is not set on the server", { status: 503 });
  }
  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/", "/accounts/:path*", "/rates/:path*", "/cards/:path*", "/game/admin/:path*"],
};
