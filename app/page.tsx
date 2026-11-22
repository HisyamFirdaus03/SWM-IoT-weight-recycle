import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { currentMonthKey, devices, latestWeighings, listMonths, monthStats } from "@/lib/stats";
import { AutoRefresh } from "./auto-refresh";
import { fmt } from "./ui";
import { MonthFilter } from "./overview/month-filter";
import { Spotlight } from "./overview/spotlight";
import { MonthChart } from "./overview/month-chart";
import { LatestWeighings } from "./overview/latest-weighings";
import { Scales } from "./overview/scales";

export const metadata: Metadata = { title: "Overview · KITARecycle" };

export default async function Overview({ searchParams }: PageProps<"/">) {
  await connection(); // always read fresh data
  const param = (await searchParams).month;
  const key = typeof param === "string" && /^\d{4}-\d{2}$/.test(param) ? param : currentMonthKey();
  const M = monthStats(key);
  const months = listMonths();
  const isCurrent = key === currentMonthKey();
  const topMax = Math.max(1, ...M.top.map((a) => a.kg));

  return (
    <>
      <AutoRefresh ms={5000} />
      <div className="in relative z-[5] flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[26px] font-semibold tracking-tight">Overview</h1>
        <div className="flex flex-wrap items-center gap-3">
          {isCurrent && <span className="muted inline-flex items-center gap-1.5 text-[13px]"><span className="live" />Live</span>}
          <MonthFilter options={months} current={key} />
        </div>
      </div>

      <section className="panel in flex flex-wrap gap-8 p-6" aria-label="This month" style={{ animationDelay: ".06s" }}>
        <Spotlight name={M.name} kg={M.kg} rp={M.rp} weighings={M.weighings} accounts={M.accounts} co2={M.co2}
          target={M.target} days={M.days} today={M.today} />
        <MonthChart series={M.series} days={M.days} today={M.today} firstWeekday={M.firstWeekday}
          monthShort={M.name.slice(0, 3)} target={M.target} total={M.kg} />
      </section>

      <div className="flex flex-wrap gap-5">
        <section className="panel in flex min-w-0 flex-[3_1_520px] flex-col gap-4 px-6 py-[22px]" aria-label="Materials" style={{ animationDelay: ".12s" }}>
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-lg font-semibold">Materials</h2>
            <Link href="/rates" className="text-sm">Edit rates</Link>
          </div>
          {M.mix.length === 0 ? (
            <p className="muted m-0 py-6 text-center">Nothing weighed in {M.name} yet.</p>
          ) : (
            <>
              <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-sm">
                {M.mix.map((m) => (
                  <div key={m.code} style={{ width: `${m.share * 100}%`, background: m.color, transition: "width .5s cubic-bezier(.6,0,.3,1)" }} />
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="tbl text-sm">
                  <thead><tr><th style={{ paddingLeft: 0 }}>Material</th><th className="text-right">Weight</th><th className="text-right">Share</th><th className="text-right">Rate</th><th className="text-right" style={{ paddingRight: 0 }}>RP</th></tr></thead>
                  <tbody>
                    {M.mix.map((m) => (
                      <tr key={m.code}>
                        <td style={{ paddingLeft: 0 }}><span className="inline-flex items-center gap-2.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />{m.name}</span></td>
                        <td className="num text-right">{fmt(m.kg, 1)} kg</td>
                        <td className="num muted text-right">{fmt(m.share * 100, 1)}%</td>
                        <td className="num muted text-right">{fmt(m.rate, m.rate % 1 ? 1 : 0)}</td>
                        <td className="num text-right" style={{ paddingRight: 0 }}>{fmt(m.rp, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="panel in flex min-w-0 flex-[2_1_340px] flex-col gap-3.5 px-6 py-[22px]" aria-label="Top accounts" style={{ animationDelay: ".18s" }}>
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-lg font-semibold">Top accounts</h2>
            <Link href="/accounts" className="text-sm">All accounts</Link>
          </div>
          {M.top.length === 0 ? (
            <p className="muted m-0 py-6 text-center">No one has recycled in {M.name} yet.</p>
          ) : (
            <ol className="m-0 flex list-none flex-col p-0">
              {M.top.map((a, i) => (
                <li key={a.accountNo} className="grid items-center gap-3 border-b py-2.5" style={{ gridTemplateColumns: "24px minmax(0,1fr) auto", borderColor: "var(--line-soft)" }}>
                  <span className="num text-[13px]" style={{ color: "var(--faint)" }}>{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="mt-1 h-[3px] rounded-sm" style={{ background: "var(--line-soft)" }}>
                      <div className="h-full rounded-sm" style={{ width: `${(a.kg / topMax) * 100}%`, background: "#6FA889", transition: "width .5s cubic-bezier(.6,0,.3,1)" }} />
                    </div>
                  </div>
                  <span className="num text-sm">{fmt(a.kg, 1)} kg</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-5">
        <LatestWeighings rows={latestWeighings(6)} />
        <Scales devices={devices()} />
      </div>
    </>
  );
}
