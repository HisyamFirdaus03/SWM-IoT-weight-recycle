import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db, type Account } from "@/lib/db";

// Printable bag label: the QR encodes only the account number, which is exactly
// what the scale's barcode scanner sends to the firmware.
export default async function LabelPage({ params }: PageProps<"/accounts/[accountNo]/label">) {
  const { accountNo } = await params;
  const acc = db.prepare("SELECT * FROM accounts WHERE account_no = ?").get(accountNo) as Account | undefined;
  if (!acc) notFound();

  const svg = await QRCode.toString(acc.account_no, { type: "svg", margin: 1, width: 240 });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-72 rounded-lg border-2 border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm font-semibold tracking-wide text-emerald-700">KITARecycle</p>
        <div className="mx-auto mt-2 w-60" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-2 font-mono text-lg">{acc.account_no}</p>
        <p className="text-sm text-slate-500">{acc.name}</p>
      </div>
      <p className="text-sm text-slate-500 print:hidden">Guna Cetak (Ctrl/Cmd + P) untuk mencetak label.</p>
    </div>
  );
}
