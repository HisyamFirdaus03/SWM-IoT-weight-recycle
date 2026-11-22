"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import QRCode from "qrcode";
import { createAccount } from "./actions";
import { fmt, Icon, Logo } from "../ui";

export type AccountRow = { no: string; name: string; phone: string | null; txns: number; rp: number; last: string | null };

function lastText(iso: string | null): string {
  if (!iso) return "No weighings yet";
  const d = new Date(iso), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - 86400e3).toDateString() === d.toDateString();
  const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today, ${t}`;
  if (yesterday) return `Yesterday, ${t}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export function AccountsView({ accounts, nextNo }: { accounts: AccountRow[]; nextNo: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [labelFor, setLabelFor] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? accounts.filter((a) => `${a.name} ${a.no} ${a.phone ?? ""}`.toLowerCase().includes(q)) : accounts;
  }, [accounts, query]);
  const label = labelFor ? accounts.find((a) => a.no === labelFor) : undefined;

  // The label's QR encodes only the account number: exactly what the scale's camera sends to the firmware.
  useEffect(() => {
    if (!labelFor) return;
    let live = true;
    QRCode.toString(labelFor, { type: "svg", margin: 1 }).then((svg) => { if (live) setQr(svg); });
    return () => { live = false; };
  }, [labelFor]);

  const create = () => start(async () => {
    setError("");
    const res = await createAccount(name, phone);
    if (!res.ok) { setError(res.error); return; }
    setName(""); setPhone(""); setOpenNew(false); setQuery("");
    setFresh(res.accountNo);
    router.refresh();
    setTimeout(() => setLabelFor(res.accountNo), 450);
  });

  return (
    <>
      <div className="in flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="m-0 text-[26px] font-semibold tracking-tight">Accounts</h1>
          <span className="num muted text-sm">{accounts.length} accounts</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-[280px] max-w-full">
            <Icon name="search" color="var(--faint)" className="absolute left-3 top-3" />
            <label htmlFor="q" className="sr-only">Search accounts</label>
            <input id="q" type="search" className="field" style={{ paddingLeft: 36 }} placeholder="Name, phone or SWMM number" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button type="button" className="primary" onClick={() => setOpenNew(!openNew)} aria-expanded={openNew}>
            <Icon name="plus" stroke={2.2} />New account
          </button>
        </div>
      </div>

      <div className={"drawer" + (openNew ? " open" : "")}>
        <div>
          <form className="panel flex flex-wrap items-end gap-4 px-6 py-5" onSubmit={(e) => { e.preventDefault(); create(); }}>
            <div className="flex flex-[2_1_240px] flex-col gap-1.5">
              <label htmlFor="nn" className="text-sm font-medium">Full name</label>
              <input id="nn" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="flex flex-[1_1_180px] flex-col gap-1.5">
              <label htmlFor="np" className="text-sm font-medium">Phone <span className="font-normal" style={{ color: "var(--faint)" }}>(optional)</span></label>
              <input id="np" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-[1_1_180px] flex-col gap-1.5">
              <span className="text-sm font-medium">Account number</span>
              <span className="num muted flex h-10 items-center">{nextNo}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="ghost" onClick={() => setOpenNew(false)}>Cancel</button>
              <button type="submit" className="primary" disabled={!name.trim() || pending}>{pending ? "Creating…" : "Create and print label"}</button>
            </div>
            {error && <p role="alert" className="m-0 w-full text-sm" style={{ color: "#8E2414" }}>{error}</p>}
          </form>
        </div>
      </div>

      <section className="panel in overflow-hidden" aria-label="All accounts" style={{ animationDelay: ".06s" }}>
        <div className="overflow-x-auto">
          <table className="tbl boxed hover">
            <thead><tr><th>Account</th><th>Name</th><th>Phone</th><th className="text-right">Weighings</th><th className="text-right">Total RP</th><th>Last weighing</th><th className="text-right">QR label</th></tr></thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.no} className={a.no === fresh ? "fresh" : ""}>
                  <td className="num text-sm">{a.no}</td>
                  <td className="font-medium">{a.name}</td>
                  <td className="num muted text-sm">{a.phone ?? "—"}</td>
                  <td className="num text-right">{a.txns}</td>
                  <td className="num text-right">{fmt(a.rp, 2)}</td>
                  <td className="muted">{lastText(a.last)}</td>
                  <td className="text-right">
                    <button type="button" className="link-btn" onClick={() => setLabelFor(a.no)} aria-label={`QR label for ${a.name}`}>
                      <Icon name="qr" size={15} stroke={1.8} />Label
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="muted m-0 px-6 py-8 text-center">No account matches “{query}”.</p>}
      </section>

      <div className={"scrim" + (label ? " open" : "")} onClick={() => setLabelFor(null)} />
      <aside className={"sheet" + (label ? " open" : "")} aria-label="QR label" aria-hidden={!label}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--line-soft)" }}>
          <h2 className="m-0 text-lg font-semibold">QR label</h2>
          <button type="button" className="ghost" style={{ width: 36, padding: 0 }} onClick={() => setLabelFor(null)} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="flex flex-1 flex-col items-center gap-5 px-5 py-7" style={{ background: "var(--paper)" }}>
          <div className="flex w-[280px] flex-col items-center gap-3.5 rounded border border-dashed bg-white p-6" style={{ borderColor: "#BDB9AE" }}>
            <div className="flex items-center gap-1.5 text-sm font-semibold"><Logo size={16} />KITARecycle</div>
            <div className="qr w-[180px]" role="img" aria-label={label ? `QR code for ${label.no}` : "QR code"} dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="text-center">
              <div className="text-base font-semibold">{label?.name}</div>
              <div className="num mt-1 tracking-wide">{label?.no}</div>
            </div>
          </div>
          <p className="muted m-0 max-w-[300px] text-center text-sm leading-normal">Show this code to the scale&apos;s camera, or open the same code in the KITARecycle app.</p>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--line-soft)" }}>
          <button type="button" className="ghost" onClick={() => setLabelFor(null)}>Close</button>
          {label && <a className="primary" href={`/accounts/${label.no}/label`} target="_blank"><Icon name="print" stroke={1.8} />Print label</a>}
        </div>
      </aside>
    </>
  );
}
