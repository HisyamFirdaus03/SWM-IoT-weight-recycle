"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "./login/actions";
import { Logo } from "./ui";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/accounts", label: "Accounts" },
  { href: "/rates", label: "Rates" },
  { href: "/cards", label: "Category cards" },
];

// Admin header and page frame. /game (the laser target game) renders bare with its own look, and
// /login draws its own full-screen layout.
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/game")) return <>{children}</>;
  if (pathname.startsWith("/login")) return <div className="adm">{children}</div>;

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <div className="adm flex flex-col">
      <header className="topbar print:hidden">
        {/* Phone: logo and user on one row, tabs in their own scrolling row below. Desktop: one row. */}
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-9 px-6">
          <Link href="/" className="order-1 flex h-14 items-center gap-2.5 text-lg font-semibold tracking-tight" style={{ color: "var(--ink)", textDecoration: "none" }}>
            <Logo size={21} />
            KITARecycle
          </Link>
          <nav aria-label="Main" className="order-3 -mx-6 flex w-[calc(100%+3rem)] flex-nowrap gap-x-6 overflow-x-auto px-6 md:order-2 md:mx-0 md:w-auto md:flex-1 md:px-0">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} className={"tab" + (active(t.href) ? " on" : "")} aria-current={active(t.href) ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="order-2 ml-auto flex h-14 items-center gap-3.5 text-sm md:order-3 md:ml-0">
            <span className="muted inline-flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold" style={{ background: "var(--green-tint)", color: "var(--green)" }}>A</span>
              admin
            </span>
            <form action={signOut}>
              <button type="submit" className="link-btn" style={{ paddingInline: 6 }}>Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-5 px-6 pb-12 pt-7">{children}</main>
    </div>
  );
}
