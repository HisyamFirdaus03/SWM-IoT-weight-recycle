import QRCode from "qrcode";
import { headers } from "next/headers";
import { connection } from "next/server";
import { AutoRefresh } from "@/app/auto-refresh";
import { ROUND_SECONDS, boardData } from "@/lib/game";

// Big-screen leaderboard: today's top 10, who's playing (live score + time left), who's next,
// and a QR to the sign-up page.
export default async function BoardPage() {
  await connection();
  const { top, current, next, queued, played, secondsLeft } = boardData();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/game`;
  const qr = await QRCode.toString(joinUrl, { type: "svg", margin: 1, color: { dark: "#0B1020", light: "#FFFFFF" } });

  return (
    <div className="flex min-h-screen flex-col gap-[2vh] bg-[#0B1020] px-[3vw] py-[3vh] text-white">
      <AutoRefresh ms={1000} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[clamp(14px,1.2vw,24px)] font-semibold uppercase tracking-[0.25em] text-[#FF5A5A]">Laser Target</p>
          <h1 className="text-[clamp(32px,4vw,80px)] font-black leading-none">Papan Pendahulu</h1>
        </div>
        <p className="text-[clamp(14px,1.2vw,24px)] text-slate-300">{played} pusingan dimainkan hari ini</p>
      </header>

      <div className="grid flex-1 gap-[2vw] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-label="Sepuluh teratas hari ini" className="rounded-3xl bg-white/5 p-[2vw] ring-1 ring-white/10">
          {top.length === 0 ? (
            <p className="text-[clamp(18px,1.8vw,36px)] text-slate-300">Belum ada skor. Jadilah yang pertama!</p>
          ) : (
            <ol className="flex flex-col gap-[0.8vh]">
              {top.map((r, i) => (
                <li
                  key={r.id}
                  className={`flex items-center gap-[1.5vw] rounded-2xl px-[1.5vw] py-[1vh] ${i === 0 ? "bg-[#FF3B3B] text-white" : "bg-white/5"}`}
                >
                  <span className="w-[3ch] text-[clamp(20px,2vw,44px)] font-black tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[clamp(20px,2vw,44px)] font-bold">{r.name}</span>
                  <span className="text-[clamp(22px,2.4vw,52px)] font-black tabular-nums">{r.score}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="flex flex-col gap-[2vw]">
          <section aria-label="Sedang bermain" className="rounded-3xl bg-white/5 p-[2vw] ring-1 ring-white/10">
            <p className="text-[clamp(14px,1.1vw,22px)] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {current?.status === "playing" ? "Sedang bermain" : current ? "Bersedia" : "Sasaran kosong"}
            </p>
            {current ? (
              <>
                <p className="mt-2 truncate text-[clamp(28px,3vw,64px)] font-black">{current.name}</p>
                {current.status === "playing" ? (
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <p className="text-[clamp(48px,6vw,128px)] font-black leading-none tabular-nums text-[#FF5A5A]">{current.live_score}</p>
                    <p className="text-[clamp(20px,2vw,44px)] font-bold tabular-nums text-slate-300">
                      {secondsLeft ?? ROUND_SECONDS}s
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[clamp(18px,1.6vw,32px)] text-slate-300">Tembak sasaran untuk mula</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-[clamp(18px,1.6vw,32px)] text-slate-300">Imbas kod QR untuk bermain</p>
            )}
          </section>

          <section aria-label="Seterusnya" className="rounded-3xl bg-white/5 p-[2vw] ring-1 ring-white/10">
            <p className="text-[clamp(14px,1.1vw,22px)] font-semibold uppercase tracking-[0.2em] text-slate-300">
              Seterusnya {queued > 3 ? `· ${queued} menunggu` : ""}
            </p>
            {next.length === 0 ? (
              <p className="mt-2 text-[clamp(16px,1.4vw,28px)] text-slate-400">Tiada barisan</p>
            ) : (
              <ol className="mt-2 flex flex-col gap-1 text-[clamp(18px,1.6vw,34px)] font-bold">
                {next.map((r) => <li key={r.id} className="truncate">{r.name}</li>)}
              </ol>
            )}
          </section>

          <section aria-label="Daftar untuk bermain" className="flex items-center gap-[1.5vw] rounded-3xl bg-white p-[1.5vw] text-[#0B1020]">
            <div className="w-[clamp(96px,9vw,180px)] shrink-0" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="min-w-0">
              <p className="text-[clamp(20px,2vw,40px)] font-black leading-tight">Imbas untuk main</p>
              <p className="truncate text-[clamp(12px,1vw,20px)] text-slate-600">{joinUrl}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
