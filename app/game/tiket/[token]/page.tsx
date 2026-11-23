import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getRoundByToken } from "@/lib/game";
import { Ticket } from "./ticket";

// The player's own page after signing up: place in the queue, then each question as they hit the
// target, then the final score and rank.
export default async function TicketPage({ params }: PageProps<"/game/tiket/[token]">) {
  await connection();
  const { token } = await params;
  if (!getRoundByToken(token)) notFound();
  return <Ticket token={token} />;
}
