"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// Staff controls (behind the admin password, see proxy.ts).

// Take a waiting or no-show player out of the line; a round already playing is ended without a score.
export async function skipRound(formData: FormData) {
  db.prepare(
    "UPDATE game_rounds SET status = 'skipped', finished_at = datetime('now') WHERE id = ? AND status IN ('queued','ready','playing')",
  ).run(Number(formData.get("id")));
  revalidatePath("/game/admin");
}

// Remove a round entirely, e.g. a rude name that reached the board.
export async function deleteRound(formData: FormData) {
  db.prepare("DELETE FROM game_rounds WHERE id = ?").run(Number(formData.get("id")));
  revalidatePath("/game/admin");
}
