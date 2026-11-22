"use client";

import { useState } from "react";
import { fmt, Icon } from "../ui";

export type ActionCard = { code: string; title: string; desc: string; bg: string; ink: string; svg: string };
export type MaterialCard = { code: number; name: string; malay: string; group: string; color: string; rate: number; svg: string };

const FILTERS = [
  { key: "All", label: "All" }, { key: "Metal", label: "Metal" }, { key: "Paper", label: "Paper" },
  { key: "Plastic", label: "Plastic" }, { key: "Other", label: "Glass & other" },
];

export function CardsView({ actions, cards }: { actions: ActionCard[]; cards: MaterialCard[] }) {
  const [group, setGroup] = useState("All");
  const shown = cards.filter((c) => group === "All" || c.group === group || (group === "Other" && c.group === "Glass"));

  return (
    <>
      <div className="in flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="m-0 text-[26px] font-semibold tracking-tight">Category cards</h1>
          <p className="muted m-0 mt-1.5">Print, laminate and keep them beside the scale. The camera reads the code.</p>
        </div>
        <button type="button" className="primary" onClick={() => window.print()}><Icon name="print" stroke={1.8} />Print cards</button>
      </div>

      <section aria-label="Action cards" className="flex flex-col gap-3">
        <h2 className="m-0 text-lg font-semibold print:hidden">Actions</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {actions.map((a, i) => (
            <div key={a.code} className="in flex items-center gap-[18px] rounded p-5" style={{ background: a.bg, color: a.ink, animationDelay: `${0.05 + i * 0.05}s`, breakInside: "avoid", printColorAdjust: "exact" }}>
              <div className="qr w-24 shrink-0 rounded-[3px] bg-white p-2" role="img" aria-label={`QR code ${a.code}`} dangerouslySetInnerHTML={{ __html: a.svg }} />
              <div className="min-w-0">
                <div className="text-[22px] font-semibold leading-tight">{a.title}</div>
                <div className="mt-1.5 text-sm leading-snug opacity-85">{a.desc}</div>
                <div className="num mt-2.5 text-xs opacity-70">{a.code}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Material cards" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <h2 className="m-0 text-lg font-semibold">Materials <span className="num muted text-sm font-normal">{shown.length} of {cards.length}</span></h2>
          <div className="seg" role="group" aria-label="Group">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className={f.key === group ? "on" : ""} aria-pressed={f.key === group} onClick={() => setGroup(f.key)}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(196px, 1fr))" }}>
          {shown.map((c, i) => (
            <div key={`${group}-${c.code}`} className="qcard" style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}>
              <span className="absolute inset-x-0 top-0 h-1 rounded-t" style={{ background: c.color, printColorAdjust: "exact" }} />
              <div className="flex items-baseline justify-between self-stretch">
                <span className="num text-[26px] font-medium leading-none">{String(c.code).padStart(2, "0")}</span>
                <span className="muted text-xs">{c.group}</span>
              </div>
              <div className="qr w-[132px]" role="img" aria-label={`QR code CAT:${c.code}`} dangerouslySetInnerHTML={{ __html: c.svg }} />
              <div className="self-stretch text-center">
                <div className="text-base font-semibold leading-tight">{c.name}</div>
                <div className="text-xs" style={{ color: "var(--faint)" }}>{c.malay}</div>
                <div className="num muted mt-1 text-[13px]">{fmt(c.rate, c.rate % 1 ? 1 : 0)} RP / kg</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
