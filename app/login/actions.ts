"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken, credentialsMatch, LONG_SESSION, safeNext, SESSION_COOKIE, SHORT_SESSION,
} from "@/lib/session";

export type SignInState = { error: string; username: string } | null;

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const user = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  // The username comes back so the form can keep it; React resets a form after its action runs.
  if (!credentialsMatch(user, password)) return { error: "That username and password don't match.", username: user };

  const keep = form.get("keep") === "on";
  (await cookies()).set(SESSION_COOKIE, createSessionToken(keep ? LONG_SESSION : SHORT_SESSION), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Without maxAge the browser drops the cookie when it closes.
    ...(keep ? { maxAge: LONG_SESSION } : {}),
  });
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
