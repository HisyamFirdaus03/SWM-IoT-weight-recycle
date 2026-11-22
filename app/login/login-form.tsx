"use client";

import { useActionState, useState } from "react";
import { signIn, type SignInState } from "./actions";

export function LoginForm({ next, devHint }: { next: string; devHint: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, null);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="flex w-full max-w-[360px] flex-col gap-[18px]">
      <h1 className="in mb-1.5 text-[26px] font-semibold leading-tight tracking-tight">Sign in</h1>
      <input type="hidden" name="next" value={next} />

      {state?.error && (
        <p role="alert" className="m-0 rounded px-3 py-2.5 text-[15px]" style={{ background: "#FBEAE6", color: "#8E2414" }}>
          {state.error}
        </p>
      )}

      <div className="in flex flex-col gap-1.5" style={{ animationDelay: ".05s" }}>
        <label htmlFor="username" className="font-medium leading-5">Username</label>
        <input id="username" name="username" key={state?.username ?? ""} defaultValue={state?.username ?? ""} className="field" style={{ height: 46 }} autoComplete="username" required autoFocus={!state} />
      </div>

      <div className="in flex flex-col gap-1.5" style={{ animationDelay: ".1s" }}>
        <label htmlFor="password" className="font-medium leading-5">Password</label>
        <div className="relative">
          <input id="password" name="password" type={show ? "text" : "password"} className="field" style={{ height: 46, paddingRight: 64 }} autoComplete="current-password" required />
          <button type="button" onClick={() => setShow(!show)} aria-pressed={show}
            className="absolute right-1.5 top-[7px] h-8 rounded px-2.5 text-[13px] font-medium hover:bg-[#EFEDE7]" style={{ color: "var(--muted)" }}>
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <label className="in muted flex cursor-pointer items-center gap-2 leading-5" style={{ animationDelay: ".15s" }}>
        <input type="checkbox" name="keep" defaultChecked /> Keep me signed in
      </label>

      <button type="submit" className="primary in mt-1" style={{ height: 46, fontSize: 15, animationDelay: ".2s" }} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {devHint && <p className="muted m-0 text-[13px]">Local dev: no ADMIN_PASSWORD set, so any username and password work.</p>}
    </form>
  );
}
