"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type View = {
  name: string;
  status: "queued" | "ready" | "playing" | "done" | "skipped";
  queuePosition: number | null;
  rank: number | null;
  hits: number;
  asked: number;
  correctCount: number;
  wrongCount: number;
  bonus: number;
  score: number;
  secondsLeft: number;
  open: { seq: number; text: string; options: string[] } | null;
  last: { seq: number; correct: boolean; unanswered: boolean; answerLetter: string; answerText: string } | null;
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

  // Poll until the round is over: that's how a laser hit turns into a question here.
  const over = view?.status === "done" || view?.status === "skipped";
  const fast = view?.status === "playing";
  useEffect(() => {
    if (over) return;
    const first = setTimeout(load, 0);
    const t = setInterval(load, fast ? 700 : 1500);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load, over, fast]);

  async function answer(seq: number, choice: number) {
    setPicked({ seq, choice });
    setError(null);
    const res = await fetch(`/api/game/ticket/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seq, choice }),
    }).catch(() => null);
    if (!res || !res.ok) {
      // Unlock the buttons so the player can tap again: a failed send must never leave them stuck.
      setPicked(null);
      setError(!res ? "Tiada sambungan. Tekan jawapan sekali lagi." : (((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Ralat. Cuba lagi."));
    }
    load();
  }

  return (
    <div className="min-h-screen bg-[#0B1020] px-5 py-8 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FF5A5A]">Laser Target</p>
          {view?.status === "playing" && (
            <p className="text-sm font-semibold tabular-nums text-slate-300">
              {view.score} mata · <span className={view.secondsLeft <= 5 ? "text-[#FF8A8A]" : ""}>{view.secondsLeft}s</span>
            </p>
          )}
        </div>

        {!view && <p className="text-slate-300">Memuatkan…</p>}

        {view?.status === "queued" && (
          <Card name={view.name} headline={view.queuePosition === 1 ? "Anda seterusnya!" : `Giliran #${view.queuePosition}`}>
            {view.queuePosition === 1 ? "Bersedia di sasaran." : `${(view.queuePosition ?? 1) - 1} orang lagi sebelum anda.`}
            <Hint />
          </Card>
        )}

        {view?.status === "ready" && (
          <Card name={view.name} headline="Giliran anda!">
            Pergi ke sasaran dan <b className="text-white">tembak untuk mula</b>. Selepas 3-2-1, tembak sebanyak mungkin.
            <Hint />
          </Card>
        )}

        {view?.status === "playing" && view.open && (
          <section aria-live="assertive" className="flex flex-col gap-4 rounded-2xl bg-white/5 p-5 ring-2 ring-[#FF5A5A]">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold uppercase tracking-wider text-[#FF8A8A]">Soalan! Sasaran berhenti</span>
              <span className="text-slate-300">betul +50 · salah −10</span>
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
                    style={{ touchAction: "manipulation" }}
                    className={`flex min-h-14 select-none items-start gap-3 rounded-xl px-4 py-3 text-left text-base font-medium ring-1 transition ${
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

        {view?.status === "playing" && !view.open && (
          <section aria-live="polite" className="flex flex-col gap-4 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
            <p className="text-5xl font-black">Tembak!</p>
            <p className="text-slate-300">
              {view.hits} tembakan tepat. Soalan boleh keluar pada bila-bila tembakan: siapkan telefon.
            </p>
            {view.last && (
              <p className={`rounded-xl p-3 font-semibold ${view.last.correct ? "bg-emerald-500/15 text-emerald-300" : "bg-[#FF3B3B]/15 text-[#FF9A9A]"}`}>
                {view.last.correct ? "Soalan tadi: Betul! +50" : view.last.unanswered ? "Soalan tadi tidak dijawab" : "Soalan tadi: Salah −10"}
                {!view.last.correct && (
                  <span className="block font-normal text-slate-200">
                    Jawapan: {view.last.answerLetter}. {view.last.answerText}
                  </span>
                )}
              </p>
            )}
          </section>
        )}

        {view?.status === "done" && (
          <Card name={view.name} headline={`${view.score} mata`}>
            Kedudukan <b className="text-white">#{view.rank}</b> hari ini
            <span className="mt-2 block text-sm text-slate-400">
              {view.hits} tembakan × 10 · {view.correctCount} betul (+{view.correctCount * 50}) · {view.wrongCount} salah (−{view.wrongCount * 10})
            </span>
          </Card>
        )}

        {view?.status === "skipped" && (
          <Card name={view.name} headline="Giliran dilangkau">Daftar semula jika anda masih mahu bermain.</Card>
        )}

        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/game/board" className="text-slate-300 underline hover:text-white">Papan pendahulu</Link>
          {over && <Link href="/game" className="text-slate-300 underline hover:text-white">Main lagi</Link>}
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
