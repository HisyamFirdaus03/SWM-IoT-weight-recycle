"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type View = {
  name: string;
  status: "queued" | "ready" | "playing" | "done" | "skipped";
  queuePosition: number | null;
  rank: number | null;
  asked: number;
  answered: number;
  total: number;
  score: number;
  open: { seq: number; text: string; options: string[]; secondsLeft: number } | null;
  last: { seq: number; correct: boolean; timedOut: boolean; answerLetter: string; answerText: string } | null;
};

const LETTERS = ["A", "B", "C", "D"];

export function Ticket({ token }: { token: string }) {
  const [view, setView] = useState<View | null>(null);
  const [picked, setPicked] = useState<{ seq: number; choice: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/ticket/${token}`, { cache: "no-store" });
      if (res.ok) setView(await res.json());
    } catch {
      // offline for a moment: keep showing the last state, the next poll retries
    }
  }, [token]);

  // Poll once a second until the round is over: that's how a laser hit turns into a question here.
  const over = view?.status === "done" || view?.status === "skipped";
  useEffect(() => {
    if (over) return;
    const first = setTimeout(load, 0);
    const t = setInterval(load, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load, over]);

  async function answer(seq: number, choice: number) {
    setPicked({ seq, choice });
    setError(null);
    const res = await fetch(`/api/game/ticket/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seq, choice }),
    }).catch(() => null);
    if (!res) setError("Tiada sambungan. Cuba lagi.");
    else if (!res.ok) setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Ralat");
    load();
  }

  const finished = view?.status === "done" || view?.status === "skipped";
  const showingLast = view?.status === "playing" && !view.open && view.last !== null;

  return (
    <div className="min-h-screen bg-[#0B1020] px-5 py-8 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FF5A5A]">Laser Target</p>
          {view && view.status === "playing" && (
            <p className="text-sm font-semibold tabular-nums text-slate-300">
              {view.score} mata · Soalan {Math.max(view.asked, 1)}/{view.total}
            </p>
          )}
        </div>

        {!view && <p className="text-slate-300">Memuatkan…</p>}

        {view && view.status === "queued" && (
          <Card name={view.name} headline={view.queuePosition === 1 ? "Anda seterusnya!" : `Giliran #${view.queuePosition}`}>
            {view.queuePosition === 1 ? "Bersedia di sasaran." : `${(view.queuePosition ?? 1) - 1} orang lagi sebelum anda.`}
            <Hint />
          </Card>
        )}

        {view && view.status === "ready" && (
          <Card name={view.name} headline="Giliran anda!">
            Pergi ke sasaran dan <b className="text-white">tembak</b> untuk soalan pertama. Soalan akan keluar di skrin ini.
            <Hint />
          </Card>
        )}

        {view && view.status === "playing" && view.open && (
          <section aria-live="polite" className="flex flex-col gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Soalan {view.open.seq}/{view.total}</span>
              <span className={`tabular-nums font-semibold ${view.open.secondsLeft <= 5 ? "text-[#FF8A8A]" : ""}`}>
                {view.open.secondsLeft}s
              </span>
            </div>
            <h1 className="text-xl font-bold leading-snug">{view.open.text}</h1>
            <div className="flex flex-col gap-2.5">
              {view.open.options.map((opt, i) => {
                const chosen = picked?.seq === view.open!.seq && picked.choice === i;
                const locked = picked?.seq === view.open!.seq;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={locked}
                    onClick={() => answer(view.open!.seq, i)}
                    className={`flex min-h-14 items-start gap-3 rounded-xl px-4 py-3 text-left text-base font-medium ring-1 transition ${
                      chosen ? "bg-white text-[#0B1020] ring-white" : "bg-white/10 ring-white/15 hover:bg-white/15"
                    } disabled:cursor-default`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-black ${chosen ? "bg-[#FF3B3B] text-white" : "bg-white/15"}`}>
                      {LETTERS[i]}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {error && <p className="text-sm text-[#FF8A8A]">{error}</p>}
          </section>
        )}

        {view && showingLast && view.last && (
          <section aria-live="polite" className={`rounded-2xl p-6 ring-1 ${view.last.correct ? "bg-emerald-500/15 ring-emerald-400/40" : "bg-[#FF3B3B]/15 ring-[#FF5A5A]/40"}`}>
            <p className="text-4xl font-black">{view.last.correct ? "Betul! +10" : view.last.timedOut ? "Masa tamat" : "Salah"}</p>
            {!view.last.correct && (
              <p className="mt-3 text-slate-200">
                Jawapan: <b className="text-white">{view.last.answerLetter}. {view.last.answerText}</b>
              </p>
            )}
            <p className="mt-4 text-slate-300">
              {view.answered < view.total ? "Tembak sasaran untuk soalan seterusnya." : "Mengira skor…"}
            </p>
          </section>
        )}

        {view && view.status === "playing" && !view.open && !view.last && (
          <Card name={view.name} headline="Tembak sasaran!">Soalan pertama keluar sebaik sahaja anda kena sasaran.</Card>
        )}

        {view && view.status === "done" && (
          <Card name={view.name} headline={`${view.score} mata`}>
            Kedudukan <b className="text-white">#{view.rank}</b> hari ini · {view.score / 10}/{view.total} jawapan betul
          </Card>
        )}

        {view && view.status === "skipped" && (
          <Card name={view.name} headline="Giliran dilangkau">Daftar semula jika anda masih mahu bermain.</Card>
        )}

        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/game/board" className="text-slate-300 underline hover:text-white">Papan pendahulu</Link>
          {finished && <Link href="/game" className="text-slate-300 underline hover:text-white">Main lagi</Link>}
        </div>
      </div>
    </div>
  );
}

function Card({ name, headline, children }: { name: string; headline: string; children: React.ReactNode }) {
  return (
    <section aria-live="polite" className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
      <p className="text-lg text-slate-300">{name}</p>
      <p className="mt-2 text-5xl font-black">{headline}</p>
      <div className="mt-3 text-slate-300">{children}</div>
    </section>
  );
}

function Hint() {
  return <p className="mt-3 text-sm text-slate-400">Biarkan halaman ini terbuka: soalan akan keluar di sini.</p>;
}
