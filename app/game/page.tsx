import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { CORRECT_BONUS, NAME_MAX, POINTS_PER_HIT, ROUND_SECONDS, WRONG_PENALTY } from "@/lib/game";
import { joinQueue } from "./actions";

const ERRORS: Record<string, string> = {
  nama: `Nama 1–${NAME_MAX} aksara: huruf, nombor, ruang dan . ' - sahaja.`,
  penuh: "Barisan penuh sekarang. Cuba sebentar lagi.",
};

// Phone sign-up page, reached by scanning the QR on the board or the booth poster.
export default async function JoinPage({ searchParams }: PageProps<"/game">) {
  await connection();
  const { ralat } = await searchParams;
  const error = typeof ralat === "string" ? ERRORS[ralat] : undefined;
  const queued = (db.prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'queued'").get() as { n: number }).n;

  return (
    <div className="min-h-screen bg-[#0B1020] px-5 py-10 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FF5A5A]">Laser Target</p>
          <h1 className="text-4xl font-black leading-tight">Tembak, kumpul mata, jawab soalan!</h1>
          <p className="text-slate-300">
            {ROUND_SECONDS} saat. Setiap tembakan tepat <b className="text-white">+{POINTS_PER_HIT}</b>. Sesetengah tembakan membuka soalan di
            telefon anda: betul <b className="text-white">+{CORRECT_BONUS}</b>, salah <b className="text-white">−{WRONG_PENALTY}</b>. Masa tetap berjalan!
          </p>
        </header>

        <form action={joinQueue} className="flex flex-col gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <label htmlFor="name" className="text-sm font-semibold text-slate-200">
            Nama pemain
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={NAME_MAX}
            autoComplete="nickname"
            placeholder="cth. Ahmad"
            className="rounded-xl bg-white px-4 py-3 text-lg text-slate-900 outline-none ring-[#FF5A5A] focus:ring-4"
          />
          {error && <p className="text-sm font-medium text-[#FF8A8A]">{error}</p>}
          <button className="mt-1 min-h-12 rounded-xl bg-[#FF3B3B] px-4 py-3 text-lg font-bold text-white hover:bg-[#E52E2E] focus-visible:outline focus-visible:outline-4 focus-visible:outline-white">
            Masuk barisan
          </button>
          <p className="text-sm text-slate-400">{queued === 0 ? "Tiada orang menunggu." : `${queued} orang sedang menunggu.`}</p>
        </form>

        <ol className="flex flex-col gap-2 text-sm text-slate-300">
          <li><b className="text-white">1.</b> Masuk barisan dengan nama anda, dan biarkan halaman tiket terbuka.</li>
          <li><b className="text-white">2.</b> Bila nama anda keluar di skrin sasaran, tembak sasaran untuk mula (3-2-1).</li>
          <li><b className="text-white">3.</b> Tembak sebanyak mungkin dalam {ROUND_SECONDS} saat.</li>
          <li><b className="text-white">4.</b> Bila soalan keluar di telefon, sasaran berhenti mengira sehingga anda menjawab. Jawab cepat!</li>
        </ol>

        <Link href="/game/board" className="text-sm text-slate-400 underline hover:text-white">
          Lihat papan pendahulu
        </Link>
      </div>
    </div>
  );
}
