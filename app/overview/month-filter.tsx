"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MonthOption } from "@/lib/stats";
import { fmt, Icon } from "../ui";

// The month dropdown. Picking a month changes ?month= so the page (and the link) reflects it.
export function MonthFilter({ options, current }: { options: MonthOption[]; current: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const label = options.find((o) => o.key === current)?.label ?? current;

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" className={"ghost" + (open ? " open" : "")} style={{ minWidth: 200, justifyContent: "space-between" }}
        onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="inline-flex items-center gap-2"><Icon name="calendar" stroke={1.8} color="var(--muted)" />{label}</span>
        <Icon name="chevron" className="chev" />
      </button>
      <div className={"menu" + (open ? " open" : "")} role="listbox" aria-label="Month">
        {options.map((o) => (
          <button key={o.key} type="button" role="option" aria-selected={o.key === current} className={"opt" + (o.key === current ? " on" : "")}
            onClick={() => { setOpen(false); if (o.key !== current) router.push(o.current ? "/" : `/?month=${o.key}`, { scroll: false }); }}>
            {o.key === current ? <Icon name="check" stroke={2.2} color="var(--green)" /> : <span />}
            <span>{o.label}{o.current ? " (so far)" : ""}</span>
            <span className="num text-[13px]" style={{ color: "var(--faint)" }}>{fmt(o.kg, 0)} kg</span>
          </button>
        ))}
      </div>
    </div>
  );
}
