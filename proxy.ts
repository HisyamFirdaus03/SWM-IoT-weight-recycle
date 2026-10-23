import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The admin pages (create accounts, print QR labels, rates, category cards) sit behind HTTP Basic
// auth once the app is on the internet. The dashboard and the scales' /api/device/* stay open: the
// dashboard is the page SWM links to, and devices use their own X-Device-Key.
export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_USER ?? "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // Locally (npm run dev) there's no password; on the server, refuse rather than run open.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("ADMIN_PASSWORD is not set on the server", { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const [u, ...rest] = atob(header.slice(6)).split(":");
    if (u === user && rest.join(":") === password) return NextResponse.next();
  }
  return new NextResponse("Login required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="KITARecycle admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/accounts/:path*", "/rates/:path*", "/cards/:path*"],
};
