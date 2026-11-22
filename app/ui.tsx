// Small shared pieces for the admin pages: the logo mark, a few stroke icons, number formatting.

// Recycle mark: ONE arrow (from 62% along a side, round the corner, head at the next side's middle)
// drawn three times, turned 120° about the triangle's centre, so the three arrows are identical.
export function Logo({ size = 22, color = "#1E6B45" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {[0, 120, 240].map((turn) => (
        <g key={turn} transform={`rotate(${turn} 12 12.8)`}>
          <path d="M16.96 12.16L19.2 16.02Q20 17.4 18.4 17.4H12" />
          <path d="M14.4 15 12 17.4l2.4 2.4" />
        </g>
      ))}
    </svg>
  );
}

const ICONS = {
  calendar: "M3.5 5h17v15h-17zM3.5 10h17M8 3v4M16 3v4",
  chevron: "M6 9l6 6 6-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  print: "M7 9V4h10v5M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-2M7 14h10v6H7z",
  plus: "M12 5v14M5 12h14",
  search: "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13M16 16l4.5 4.5",
  close: "M6 6l12 12M18 6L6 18",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
} as const;

export function Icon({ name, size = 16, stroke = 2, className, color = "currentColor" }: {
  name: keyof typeof ICONS; size?: number; stroke?: number; className?: string; color?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={ICONS[name]} />
    </svg>
  );
}

export const fmt = (n: number, d = 0) => n.toLocaleString("en-MY", { minimumFractionDigits: d, maximumFractionDigits: d });
