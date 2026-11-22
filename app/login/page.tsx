import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, safeNext, SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { Logo } from "../ui";
import { LoginForm } from "./login-form";
import { ScaleArt } from "./scale-art";

export const metadata: Metadata = { title: "Sign in · KITARecycle" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next as string | undefined);
  const signedIn = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (signedIn) redirect(next);

  return (
    <div className="flex min-h-screen flex-wrap">
      <div className="flex min-h-[340px] min-w-0 flex-[5_1_460px] flex-col gap-8 px-12 py-10" style={{ background: "#17352A", color: "#E9EFEA" }}>
        <div className="flex items-center gap-2.5 text-lg font-semibold leading-none tracking-tight">
          <Logo color="#9BC7AE" />
          KITARecycle
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <ScaleArt />
        </div>
        <div className="text-[13px]" style={{ color: "#9BB5A7" }}>UTM · SWM Environment</div>
      </div>

      <div className="flex min-w-0 flex-[7_1_520px] items-center justify-center px-6 py-12">
        <LoginForm next={next} devHint={!authConfigured()} />
      </div>
    </div>
  );
}
