"use client";

import { useEffect, useState } from "react";
import type { Device } from "@/lib/stats";

const ONLINE_FOR_MS = 2 * 60 * 1000; // a scale that called in within 2 minutes counts as online

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

export function Scales({ devices }: { devices: Device[] }) {
  const [now, setNow] = useState<number | null>(null);
  // The clock starts after mount so the server render and the first client render match.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  return (
    <section className="panel in flex min-w-0 flex-[2_1_340px] flex-col gap-1 px-6 py-[22px]" aria-label="Scales" style={{ animationDelay: ".3s" }}>
      <h2 className="m-0 mb-2 text-lg font-semibold">Scales</h2>
      {devices.map((d, i) => {
        const seen = d.lastSeen ? new Date(d.lastSeen).getTime() : null;
        const online = seen !== null && now !== null && now - seen < ONLINE_FOR_MS;
        return (
          <div key={d.id} className="grid items-center gap-3 py-3" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto", borderBottom: i < devices.length - 1 ? "1px solid var(--line-soft)" : 0 }}>
            {online ? <span className="live" /> : <span className="h-[7px] w-[7px] rounded-full" style={{ background: "#BDB9AE" }} />}
            <div className="min-w-0">
              <div className="font-medium">{d.id}</div>
              <div className="muted text-[13px]">
                {d.location ?? "No location set"} · {seen === null ? "never connected" : now === null ? "…" : `last reading ${ago(now - seen)}`}
              </div>
            </div>
            <span className="text-[13px] font-medium" style={{ color: online ? "var(--green)" : "var(--faint)" }}>{online ? "Online" : "Offline"}</span>
          </div>
        );
      })}
      <a href="/funrun-board.html" target="_blank" className="mt-auto pt-3.5 text-sm">Open the event board ↗</a>
    </section>
  );
}
