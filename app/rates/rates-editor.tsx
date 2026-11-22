"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveRates } from "./actions";
import { fmt, Icon } from "../ui";

export type RateRow = { code: number; name: string; malay: string; group: string; color: string; rate: number; updatedAt: string | null };

const changedText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Original rate";

// Edits are held here until Save, so Discard is trivial and nobody half-changes the rate card.
export function RatesEditor({ rates }: { rates: RateRow[] }) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const changed = rates.filter((r) => {
    const raw = edits[r.code];
    if (raw === undefined) return false;
    const v = parseFloat(raw);
    return !Number.isNaN(v) && v !== r.rate;
  });
  const invalid = Object.values(edits).some((raw) => raw.trim() === "" || Number.isNaN(parseFloat(raw)) || parseFloat(raw) < 0);
  const n = changed.length;

  const save = () => start(async () => {
    setError("");
    const res = await saveRates(changed.map((r) => ({ code: r.code, rate: parseFloat(edits[r.code]) })));
    if (!res.ok) { setError(res.error); return; }
    setEdits({});
    router.refresh();
    setToast(`${res.saved} ${res.saved === 1 ? "rate" : "rates"} saved. New weighings use them from now.`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3200);
  });

  return (
    <>
      <div className={"drawer" + (n || invalid ? " open" : "")}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border px-4 py-3" style={{ borderColor: "#E8CF9F", background: "var(--amber-tint)" }}>
            <span style={{ color: "#6A3E00" }}>
              {invalid ? "A rate needs a number of 0 or more." : <><b className="num font-medium">{n}</b> {n === 1 ? "change" : "changes"} not saved</>}
              {error && ` ${error}`}
            </span>
            <div className="flex gap-2">
              <button type="button" className="ghost" onClick={() => { setEdits({}); setError(""); }}>Discard</button>
              <button type="button" className="primary" onClick={save} disabled={!n || invalid || pending}>{pending ? "Saving…" : "Save rates"}</button>
            </div>
          </div>
        </div>
      </div>

      <section className="panel in overflow-hidden" aria-label="Rates" style={{ animationDelay: ".06s" }}>
        <div className="overflow-x-auto">
          <table className="tbl boxed">
            <thead><tr><th style={{ width: 72 }}>Code</th><th>Material</th><th>Group</th><th className="text-right">RP per kg</th><th className="text-right">2 kg earns</th><th>Last changed</th></tr></thead>
            <tbody>
              {rates.map((r) => {
                const raw = edits[r.code] ?? String(r.rate);
                const v = parseFloat(raw);
                const isChanged = changed.includes(r);
                return (
                  <tr key={r.code} className={isChanged ? "changed" : ""}>
                    <td className="num" style={{ color: "var(--faint)", paddingBlock: 9 }}>{String(r.code).padStart(2, "0")}</td>
                    <td><span className="font-medium">{r.name}</span> <span className="text-[13px]" style={{ color: "var(--faint)" }}>{r.malay}</span></td>
                    <td><span className="muted inline-flex items-center gap-2 text-sm"><i className="h-2 w-2 rounded-sm" style={{ background: r.color }} />{r.group}</span></td>
                    <td className="text-right">
                      <label htmlFor={`rate-${r.code}`} className="sr-only">{r.name} RP per kg</label>
                      <input id={`rate-${r.code}`} className={"rate" + (isChanged ? " changed" : "")} type="number" min="0" step="0.1" inputMode="decimal"
                        value={raw} onChange={(e) => setEdits({ ...edits, [r.code]: e.target.value })} />
                    </td>
                    <td className="num muted text-right">{Number.isNaN(v) ? "—" : `${fmt(v * 2, 2)} RP`}</td>
                    <td className="muted text-sm">{isChanged ? "Not saved" : changedText(r.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className={"toast" + (toast ? " show" : "")} role="status">
        <Icon name="check" stroke={2.4} color="#7FD3A5" />{toast}
      </div>
    </>
  );
}
