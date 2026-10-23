"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NAME_MAX, QUEUE_MAX, cleanName } from "@/lib/game";

export async function joinQueue(formData: FormData) {
  const name = cleanName(String(formData.get("name") ?? ""));
  if (!name) redirect("/game?ralat=nama");

  const queued = (db.prepare("SELECT COUNT(*) AS n FROM game_rounds WHERE status = 'queued'").get() as { n: number }).n;
  if (queued >= QUEUE_MAX) redirect("/game?ralat=penuh");

  const result = db.prepare("INSERT INTO game_rounds (name) VALUES (?)").run(name.slice(0, NAME_MAX));
  redirect(`/game/tiket/${Number(result.lastInsertRowid)}`);
}
