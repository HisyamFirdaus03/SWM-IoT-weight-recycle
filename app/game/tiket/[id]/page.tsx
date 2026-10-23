import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AutoRefresh } from "@/app/auto-refresh";
import { getRound, queuePosition, rankOf } from "@/lib/game";

// The player's own page after signing up: place in the queue, "your turn", then the result.
export default async function TicketPage({ params }: PageProps<"/game/tiket/[id]">) {
  await connection();
  const { id } = await params;
  const round = getRound(Number(id));
  if (!round) notFound();

  let headline: string;
  let detail: string;
  switch (round.status) {
    case "queued": {
      const pos = queuePosition(round.id);
      headline = pos === 1 ? "Anda seterusnya!" : `Giliran #${pos}`;
      detail = pos === 1 ? "Bersedia di sasaran." : `${pos - 1} orang lagi sebelum anda.`;
      break;
    }
    case "ready":
      headline = "Giliran anda!";
      detail = "Pergi ke sasaran dan tembak untuk mula.";
      break;
    case "playing":
      headline = `${round.live_score} mata`;
      detail = "Sedang bermain…";
      break;
    case "done":
      headline = `${round.score} mata`;
      detail = `Kedudukan #${rankOf(round.score ?? 0)} hari ini · ${round.hits} tembakan tepat`;
      break;
    default:
      headline = "Giliran dilangkau";
      detail = "Daftar semula jika anda masih mahu bermain.";
  }
  const finished = round.status === "done" || round.status === "skipped";

  return (
    <div className="min-h-screen bg-[#0B1020] px-5 py-10 text-white">
      {!finished && <AutoRefresh ms={2000} />}
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FF5A5A]">Laser Target</p>
        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <p className="text-lg text-slate-300">{round.name}</p>
          <p className="mt-2 text-5xl font-black" aria-live="polite">{headline}</p>
          <p className="mt-3 text-slate-300">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/game/board" className="text-slate-300 underline hover:text-white">Papan pendahulu</Link>
          {finished && <Link href="/game" className="text-slate-300 underline hover:text-white">Main lagi</Link>}
        </div>
      </div>
    </div>
  );
}
