"use client";

import { useEffect, useState } from "react";

const WEIGHTS = [2.4, 1.15, 3.85, 0.9, 4.3, 1.7];
type Phase = "idle" | "on" | "stable" | "off";

// The sign-in drawing: a bag lands on the platform, the readout climbs and settles, the stable light
// comes on, the bag lifts off, and it repeats with the next weight. Static for reduced-motion viewers.
export function ScaleArt() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0, tick: ReturnType<typeof setInterval> | undefined, wait: ReturnType<typeof setTimeout> | undefined;
    const weigh = () => {
      const target = WEIGHTS[n++ % WEIGHTS.length];
      const t0 = Date.now();
      setPhase("on");
      tick = setInterval(() => {
        const p = Math.min(1, (Date.now() - t0) / 900);
        const wobble = p < 1 ? Math.sin(p * 9) * 0.06 * (1 - p) : 0;
        setShown(Math.max(0, target * (1 - Math.pow(1 - p, 3)) + wobble));
        if (p >= 1) {
          clearInterval(tick);
          setShown(target);
          setPhase("stable");
          wait = setTimeout(() => {
            setPhase("off");
            setShown(0);
            wait = setTimeout(() => { setPhase("idle"); wait = setTimeout(weigh, 1400); }, 400);
          }, 2600);
        }
      }, 40);
    };
    wait = setTimeout(weigh, 1200);
    return () => { clearInterval(tick); clearTimeout(wait); };
  }, []);

  const loaded = phase === "on" || phase === "stable";
  return (
    <div role="img" aria-label="A platform scale weighing a trash bag of recyclables"
      style={{ position: "relative", width: "100%", maxWidth: 500, aspectRatio: "400 / 300", containerType: "inline-size" }}>
      <svg viewBox="0 0 400 300" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <g fill="none" stroke="#7FA894" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M20 282H380" stroke="#3E5E50" />
          <rect x="70" y="256" width="220" height="20" rx="3" />
          <path d="M88 276v6M272 276v6" />
          <rect x="290" y="96" width="14" height="160" rx="2" />
          <rect x="229" y="24" width="136" height="72" rx="6" />
          <rect x="241" y="36" width="112" height="34" rx="2" fill="#112A20" />
          <circle cx="249" cy="84" r="3" /><circle cx="263" cy="84" r="3" /><circle cx="277" cy="84" r="3" />
        </g>
        <circle cx="351" cy="84" r="3" fill={phase === "stable" ? "#6FE3A1" : "#2C4A3D"} style={{ transition: "fill .25s ease" }} />
        <g className={"plate" + (loaded ? " down" : "")}>
          <rect x="56" y="242" width="248" height="14" rx="2" fill="#17352A" stroke="#9BC7AE" strokeWidth="1.6" />
        </g>
        <g className={"load" + (loaded ? " on" : phase === "off" ? " off" : "")} strokeLinecap="round" strokeLinejoin="round">
          <path d="M124 242C112 214 114 184 140 166C152 158 162 156 170 156H190C198 156 208 158 220 166C246 184 248 214 236 242Z" fill="#1F4335" stroke="#C9DDD1" strokeWidth="1.6" />
          <path d="M170 156C172 148 173 142 175 138M190 156C188 148 187 142 185 138" fill="none" stroke="#C9DDD1" strokeWidth="1.6" />
          <ellipse cx="180" cy="135" rx="8" ry="4.5" fill="#1F4335" stroke="#C9DDD1" strokeWidth="1.6" />
          <path d="M174 132C165 118 152 113 147 120C152 128 163 132 174 134Z" fill="#1F4335" stroke="#C9DDD1" strokeWidth="1.6" />
          <path d="M186 132C195 118 208 113 213 120C208 128 197 132 186 134Z" fill="#1F4335" stroke="#C9DDD1" strokeWidth="1.6" />
          <path d="M148 202C158 208 170 210 182 208M198 222C208 218 218 212 224 204M178 168L175 188" fill="none" stroke="#6D9883" strokeWidth="1.4" />
        </g>
      </svg>
      <div className="lcd" aria-hidden="true">
        <span style={{ fontSize: "5cqw", fontWeight: 500, lineHeight: 1 }}>{shown.toFixed(2)}</span>
        <span style={{ fontSize: "2.5cqw", color: "#7FA894", lineHeight: 1 }}>kg</span>
      </div>
    </div>
  );
}
