"use client";

import { useState } from "react";
import { fmt } from "../ui";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TICK_DAYS = [1, 8, 15, 22, 29];

// One month of weighings: kilograms per day against the daily pace, or the running total against
// the monthly target ("are we going to make it?").
export function MonthChart({ series, days, today, firstWeekday, monthShort, target, total }: {
  series: number[]; days: number; today: number | null; firstWeekday: number; monthShort: string; target: number; total: number;
}) {
  const [mode, setMode] = useState<"daily" | "total">("daily");
  const [hover, setHover] = useState(-1);
  const pace = target / days;

  // daily bars: round the scale up to a tidy multiple of 50
  const top = Math.max(100, Math.ceil((Math.max(pace, ...series) * 1.15) / 50) * 50);

  // running total
  const elapsed = today ?? days;
  const cum: number[] = [];
  series.slice(0, elapsed).reduce((a, v) => { cum.push(a + v); return a + v; }, 0);
  const cTop = Math.max(target, cum[cum.length - 1] ?? 0) * 1.12;
  const X = (i: number) => ((i / (days - 1)) * 100).toFixed(2);
  const Y = (v: number) => (100 - (v / cTop) * 100).toFixed(2);
  const actual = cum.map((v, i) => (i ? "L" : "M") + X(i) + " " + Y(v)).join(" ");
  const area = actual ? `${actual} L${X(cum.length - 1)} 100 L0 100 Z` : "";
  const endY = cum.length ? (cum[cum.length - 1] / cTop) * 100 : 0;

  return (
    <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-medium">{mode === "daily" ? "Kilograms per day" : "Running total against target"}</div>
        <div className="seg" role="group" aria-label="Chart">
          <button type="button" className={mode === "daily" ? "on" : ""} aria-pressed={mode === "daily"} onClick={() => setMode("daily")}>Daily</button>
          <button type="button" className={mode === "total" ? "on" : ""} aria-pressed={mode === "total"} onClick={() => setMode("total")}>Running total</button>
        </div>
      </div>

      {mode === "daily" ? (
        <div className="relative h-[280px] pl-9">
          <div aria-hidden="true" className="absolute flex flex-col justify-between" style={{ inset: "0 0 24px 36px" }}>
            {[4, 3, 2, 1, 0].map((k) => (
              <div key={k} className="relative border-t" style={{ borderColor: "#F0EEE8" }}>
                <span className="num absolute -left-9 -top-2 w-[30px] text-right text-xs" style={{ color: "var(--faint)" }}>{(top / 4) * k}</span>
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="absolute right-0 z-[1] border-t border-dashed" style={{ left: 36, bottom: `calc(24px + ${(pace / top) * 100}%)`, borderColor: "#A8A59B" }}>
            <span className="muted absolute -top-5 right-0 bg-white px-1 text-xs">{fmt(pace, 0)} kg/day pace</span>
          </div>
          <div role="img" aria-label={`Kilograms collected per day, ${fmt(total, 1)} kg in total`} className="absolute flex gap-0.5" style={{ inset: "0 0 0 36px" }}>
            {series.map((v, i) => {
              const d = i + 1, future = today !== null && d > today;
              const h = future ? 0 : (v / top) * 100;
              const cls = "col" + (future ? " future" : "") + (today === d ? " today" : "") + (hover === i && !future ? " hot" : "");
              return (
                <div key={d} className={cls} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}>
                  <div className="relative flex w-full items-end justify-center" style={{ height: "calc(100% - 24px)" }}>
                    <div className="bar" style={{ height: `${h}%`, animationDelay: `${(i * 0.018).toFixed(3)}s` }} />
                    <span className="tip" style={{ bottom: `calc(${h}% + 8px)` }}>{WD[(firstWeekday + i) % 7]} {d} {monthShort} · {fmt(v, 1)} kg</span>
                  </div>
                  <div className="num h-6 pt-[7px] text-xs" style={{ color: "var(--faint)" }}>{TICK_DAYS.includes(d) ? d : ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative h-[280px]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Running total ${fmt(total)} kg against a ${fmt(target)} kg target`}
            className="absolute w-full overflow-visible" style={{ inset: "0 0 24px 0", height: "calc(100% - 24px)" }}>
            <path d="M0 25H100M0 50H100M0 75H100" stroke="#F0EEE8" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
            {area && <path className="area" d={area} fill="#E5EFE8" />}
            <path d={`M0 100 L100 ${Y(target)}`} stroke="#A8A59B" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" fill="none" />
            {actual && <path className="line" d={actual} pathLength={1} stroke="#1E6B45" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
          </svg>
          {cum.length > 0 && (
            <div className="num absolute whitespace-nowrap rounded-[3px] border bg-white px-1.5 py-0.5 text-[13px] font-medium"
              style={{ left: `${X(cum.length - 1)}%`, bottom: `calc(24px + ${endY}%)`, transform: "translate(-50%, -10px)", color: "var(--green)", borderColor: "#CFE2D6", animation: "adm-fade .4s ease 1s both" }}>
              {fmt(total, 1)} kg
            </div>
          )}
          <div className="muted absolute right-0 whitespace-nowrap text-xs" style={{ bottom: `calc(24px + ${(target / cTop) * 100}%)`, transform: "translateY(-24px)" }}>Target {fmt(target)} kg</div>
          <div className="absolute inset-x-0 bottom-0 flex h-6 justify-between pt-[7px]">
            {TICK_DAYS.filter((d) => d <= days).map((d) => <span key={d} className="num text-xs" style={{ color: "var(--faint)" }}>{d} {monthShort}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
