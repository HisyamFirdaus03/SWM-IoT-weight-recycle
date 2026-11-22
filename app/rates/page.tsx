import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { CATEGORY_INFO, GROUP_COLOR } from "@/lib/categories";
import { RatesEditor, type RateRow } from "./rates-editor";

export const metadata: Metadata = { title: "Rates · KITARecycle" };

export default async function RatesPage() {
  await connection();
  const rows = db.prepare("SELECT code, name, rp_per_kg, updated_at FROM categories ORDER BY code").all() as {
    code: number; name: string; rp_per_kg: number; updated_at: string | null;
  }[];

  const rates: RateRow[] = rows.map((r) => {
    const info = CATEGORY_INFO[r.code];
    return {
      code: r.code, name: info?.en ?? r.name, malay: r.name, group: info?.group ?? "Other",
      color: GROUP_COLOR[info?.group ?? "Other"], rate: r.rp_per_kg,
      updatedAt: r.updated_at ? r.updated_at.replace(" ", "T") + "Z" : null,
    };
  });

  return (
    <>
      <div className="in flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-semibold tracking-tight">Rates</h1>
          <p className="muted m-0 mt-1.5">RP per kilogram for each material. A change applies to weighings made after you save.</p>
        </div>
        <span className="muted text-sm">From SWM&apos;s KITARecycle rate card</span>
      </div>
      <RatesEditor rates={rates} />
    </>
  );
}
