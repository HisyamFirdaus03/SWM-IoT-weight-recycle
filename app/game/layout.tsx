import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laser Target",
  description: "Tembak sasaran laser, kumpul mata dan masuk papan pendahulu.",
};

export default function GameLayout({ children }: LayoutProps<"/game">) {
  return children;
}
