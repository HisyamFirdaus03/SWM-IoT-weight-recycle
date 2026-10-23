import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KITARecycle IoT Scale — Prototype",
  description: "Mock KITARecycle backend receiving weights from the IoT scale",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ms" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
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
      </body>
    </html>
  );
}
