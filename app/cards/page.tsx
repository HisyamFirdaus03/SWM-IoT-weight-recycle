import type { Metadata } from "next";
import QRCode from "qrcode";
import { connection } from "next/server";
import { db, type Category } from "@/lib/db";
import { CATEGORY_INFO, GROUP_COLOR } from "@/lib/categories";
import { CardsView, type ActionCard, type MaterialCard } from "./cards-view";

export const metadata: Metadata = { title: "Category cards · KITARecycle" };

const qr = (text: string) => QRCode.toString(text, { type: "svg", margin: 0 });

// Printable cards. The scale's camera reads "CAT:<code>" to pick a material and "CMD:…" for the
// three actions, so the operator can run a weighing without touching the keypad.
export default async function CardsPage() {
  await connection();
  const rows = db.prepare("SELECT * FROM categories ORDER BY code").all() as Category[];

  const actions: ActionCard[] = await Promise.all([
    { code: "CMD:OK", title: "Confirm", desc: "Sends the weight on the scale. Same as pressing SAVE.", bg: "#1E6B45", ink: "#FFFFFF" },
    { code: "CMD:BATAL", title: "Cancel", desc: "Weigh again, or finish with this person.", bg: "#2B2E2A", ink: "#FFFFFF" },
    { code: "CMD:ZERO", title: "Zero the scale", desc: "Platform must be empty. Works on the start screen.", bg: "#E9E6DD", ink: "#1A1C19" },
  ].map(async (a) => ({ ...a, svg: await qr(a.code) })));

  const cards: MaterialCard[] = await Promise.all(rows.map(async (c) => {
    const info = CATEGORY_INFO[c.code];
    const group = info?.group ?? "Other";
    return { code: c.code, name: info?.en ?? c.name, malay: c.name, group, color: GROUP_COLOR[group], rate: c.rp_per_kg, svg: await qr(`CAT:${c.code}`) };
  }));

  return <CardsView actions={actions} cards={cards} />;
}
