import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteShell } from "./site-shell";

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
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
