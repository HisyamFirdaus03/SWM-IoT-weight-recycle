"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The scale app's header and page frame. /game pages (the laser target game) render bare:
// they are a phone sign-up page and a big-screen board with their own look.
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/game")) return <>{children}</>;

  return (
    <>
      <header className="bg-emerald-700 text-white print:hidden">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            KITARecycle <span className="font-normal opacity-80">IoT Scale Prototype</span>
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/" className="hover:underline">Papan Pemuka</Link>
            <Link href="/accounts" className="hover:underline">Akaun</Link>
            <Link href="/rates" className="hover:underline">Kadar RP</Link>
            <Link href="/cards" className="hover:underline">Kad Kategori</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
