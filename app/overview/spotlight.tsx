"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "../ui";

type Nums = { kg: number; rp: number; weighings: number; accounts: number; co2: number };

// Eases the shown numbers from where they are to the new values (on load, month change, or a new
// weighing arriving through the 5-second refresh), so nothing jumps.
function useCountUp(target: Nums): Nums {
  const zero = { kg: 0, rp: 0, weighings: 0, accounts: 0, co2: 0 };
  const [shown, setShown] = useState<Nums>(zero);
  const last = useRef<Nums>(zero); // what is on screen right now, read when a new target arrives
  const key = JSON.stringify(target);
  useEffect(() => {
    const start = last.current, t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 800), e = 1 - Math.pow(1 - p, 3);
      const next = {} as Nums;
      (Object.keys(target) as (keyof Nums)[]).forEach((k) => { next[k] = start[k] + (target[k] - start[k]) * e; });
      last.current = next;
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return shown;
}

export function Spotlight(p: Nums & { name: string; target: number; days: number; today: number | null }) {
  const n = useCountUp({ kg: p.kg, rp: p.rp, weighings: p.weighings, accounts: p.accounts, co2: p.co2 });
  const pct = Math.min(100, Math.round((n.kg / p.target) * 100));
  const closed = p.today === null;
  const elapsed = p.today ?? p.days;
  const projected = elapsed ? (p.kg / elapsed) * p.days : 0;
  const met = closed ? p.kg >= p.target : projected >= p.target;

  const kgs = (v: number) => fmt(v, Math.abs(v) < 100 ? 1 : 0); // "0.9 kg", but "1,473 kg"
  let pace: string, tag: string;
  if (p.kg === 0) { pace = `Nothing weighed in ${p.name} yet.`; tag = ""; }
  else if (closed) { pace = `Finished the month at ${kgs(p.kg)} kg.`; tag = met ? "Target met" : `Missed by ${kgs(p.target - p.kg)} kg`; }
  else { pace = `On pace for about ${fmt(Math.round(projected / 10) * 10)} kg by month end.`; tag = met ? "On track" : `${kgs(p.target - projected)} kg short`; }

  return (
    <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-[18px]">
      <div>
        <div className="muted">Collected in {p.name}</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="fig text-[56px] font-medium leading-none">{fmt(n.kg, 1)}</span>
          <span className="muted text-[22px]">kg</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-1.5 overflow-hidden rounded-[3px]" style={{ background: "#EFEDE7" }}>
          <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: "var(--green)" }} />
        </div>
        <div className="muted flex justify-between gap-3 text-sm">
          <span><span className="fig" style={{ color: "var(--ink)" }}>{pct}%</span> of {fmt(p.target)} kg target</span>
          <span>{closed ? "Month closed" : `${p.days - (p.today ?? 0)} days left`}</span>
        </div>
      </div>
      <p className="m-0 leading-normal">
        {pace}{" "}
        {tag && <span className="rounded-[3px] px-[7px] py-0.5 text-[13px] font-medium" style={{ background: met ? "var(--green-tint)" : "var(--amber-tint)", color: met ? "var(--green-dark)" : "var(--amber-ink)" }}>{tag}</span>}
      </p>
      <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-4 border-t pt-[18px]" style={{ borderColor: "var(--line-soft)" }}>
        <div><dt className="muted text-[13px]">RP paid out</dt><dd className="fig m-0 mt-1 text-[22px]">{fmt(n.rp)}</dd></div>
        <div><dt className="muted text-[13px]">Weighings</dt><dd className="fig m-0 mt-1 text-[22px]">{fmt(n.weighings)}</dd></div>
        <div><dt className="muted text-[13px]">Accounts</dt><dd className="fig m-0 mt-1 text-[22px]">{fmt(n.accounts)}</dd></div>
        <div><dt className="muted text-[13px]">CO₂e avoided</dt><dd className="fig m-0 mt-1 text-[22px]">{n.co2 >= 1000 ? fmt(n.co2 / 1000, 1) : fmt(n.co2)} <span className="muted text-[15px]">{n.co2 >= 1000 ? "t" : "kg"}</span></dd></div>
      </dl>
    </div>
  );
}
