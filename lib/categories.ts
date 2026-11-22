// English labels and groups for SWM's 15 KITARecycle categories, keyed by code. The database keeps
// SWM's Malay names because the scale shows them on its LCD; the admin pages show these.

export type Group = "Metal" | "Paper" | "Plastic" | "Glass" | "Other";

export const CATEGORY_INFO: Record<number, { en: string; group: Group; color: string }> = {
  1: { en: "Tin cans", group: "Metal", color: "#5C7FA3" },
  2: { en: "Scrap iron", group: "Metal", color: "#3F6690" },
  3: { en: "Premium iron", group: "Metal", color: "#8AA5C0" },
  4: { en: "Aluminium cans", group: "Metal", color: "#2F5E8C" },
  5: { en: "Mixed paper", group: "Paper", color: "#E2BE7E" },
  6: { en: "Books and magazines", group: "Paper", color: "#B9853A" },
  7: { en: "Cardboard", group: "Paper", color: "#A8661C" },
  8: { en: "Newspaper", group: "Paper", color: "#D49A4A" },
  9: { en: "Black and white paper", group: "Paper", color: "#EBD3A6" },
  10: { en: "Tetra Pak", group: "Other", color: "#9C8B78" },
  11: { en: "Hard plastic", group: "Plastic", color: "#3F8A63" },
  12: { en: "Mixed plastic", group: "Plastic", color: "#6FA889" },
  13: { en: "Plastic bottles", group: "Plastic", color: "#1E6B45" },
  14: { en: "Car batteries", group: "Other", color: "#7C6A58" },
  15: { en: "Glass bottles", group: "Glass", color: "#9A978D" },
};

export const GROUP_COLOR: Record<Group, string> = {
  Metal: "#2F5E8C", Paper: "#C68A2E", Plastic: "#1E6B45", Glass: "#9A978D", Other: "#7C6A58",
};

export function categoryLabel(code: number, fallback: string): string {
  return CATEGORY_INFO[code]?.en ?? fallback;
}
