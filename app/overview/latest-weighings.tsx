"use client";

import { useEffect, useRef, useState } from "react";
import type { Weighing } from "@/lib/stats";
import { fmt } from "../ui";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Rows that weren't on screen at the last refresh get a short amber highlight.
export function LatestWeighings({ rows }: { rows: Weighing[] }) {
  const seen = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());

  useEffect(() => {
    const ids = rows.map((r) => r.id);
    if (seen.current) {
      const prev = seen.current;
      const added = new Set(ids.filter((id) => !prev.has(id)));
      if (added.size) setFresh(added);
    }
    seen.current = new Set(ids);
  }, [rows]);

  return (
    <section id="weighings" className="panel in flex min-w-0 flex-[3_1_520px] flex-col gap-2.5 px-2 pb-1.5 pt-[22px]" aria-label="Latest weighings" style={{ animationDelay: ".24s" }}>
      <h2 className="m-0 px-4 text-lg font-semibold">Latest weighings</h2>
      {rows.length === 0 ? (
        <p className="muted m-0 px-4 py-8 text-center">No weighings yet. Weigh something on the scale and it appears here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Time</th><th>Account</th><th>Material</th><th className="text-right">Weight</th><th className="text-right">RP</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={fresh.has(r.id) ? "fresh" : ""}>
                  <td className="num muted">{time(r.at)}</td>
                  <td>{r.name} <span className="num text-[13px]" style={{ color: "var(--faint)" }}>{r.accountNo}</span></td>
                  <td><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-sm" style={{ background: r.color }} />{r.material}</span></td>
                  <td className="num text-right">{fmt(r.kg, 1)} kg</td>
                  <td className="num text-right" style={{ color: "var(--green)" }}>+{fmt(r.rp, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
