import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db, type Account } from "@/lib/db";
import { Logo } from "../../../ui";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "QR label · KITARecycle" };

// Printable bag label: the QR encodes only the account number, which is exactly
// what the scale's camera sends to the firmware.
export default async function LabelPage({ params }: PageProps<"/accounts/[accountNo]/label">) {
  const { accountNo } = await params;
  const acc = db.prepare("SELECT * FROM accounts WHERE account_no = ?").get(accountNo) as Account | undefined;
  if (!acc) notFound();

  const svg = await QRCode.toString(acc.account_no, { type: "svg", margin: 1 });

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="flex w-[300px] flex-col items-center gap-3.5 rounded border border-dashed bg-white p-6" style={{ borderColor: "#BDB9AE" }}>
        <div className="flex items-center gap-1.5 text-sm font-semibold"><Logo size={16} />KITARecycle</div>
        <div className="qr w-[220px]" role="img" aria-label={`QR code for ${acc.account_no}`} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="text-center">
          <div className="text-base font-semibold">{acc.name}</div>
          <div className="num mt-1 tracking-wide">{acc.account_no}</div>
        </div>
      </div>
      <div className="flex gap-2 print:hidden">
        <Link href="/accounts" className="ghost">Back to accounts</Link>
        <PrintButton />
      </div>
    </div>
  );
}
