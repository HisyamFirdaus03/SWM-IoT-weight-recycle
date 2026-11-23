"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// Question bank editing (behind the admin login, see proxy.ts). Questions are switched off rather than
// deleted, so past rounds that asked them keep a complete record.

const PAGE = "/game/admin/soalan";
const back = (categoryId: number | string, msg?: string) =>
  redirect(`${PAGE}?k=${categoryId}${msg ? `&ralat=${encodeURIComponent(msg)}` : ""}`);

function text(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function createCategory(formData: FormData) {
  const name = text(formData, "name", 40);
  if (!name) back("", "Nama kategori diperlukan");
  const exists = db.prepare("SELECT id FROM game_categories WHERE name = ?").get(name) as { id: number } | undefined;
  if (exists) back(exists.id, "Kategori itu sudah ada");
  const id = Number(db.prepare("INSERT INTO game_categories (name) VALUES (?)").run(name).lastInsertRowid);
  revalidatePath(PAGE);
  back(id);
}

export async function renameCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = text(formData, "name", 40);
  if (!name) back(id, "Nama kategori diperlukan");
  const clash = db.prepare("SELECT id FROM game_categories WHERE name = ? AND id != ?").get(name, id);
  if (clash) back(id, "Nama itu sudah digunakan kategori lain");
  db.prepare("UPDATE game_categories SET name = ? WHERE id = ?").run(name, id);
  revalidatePath(PAGE);
  back(id);
}

// The category new rounds draw their questions from. Rounds already playing keep theirs.
export async function useCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  const count = (db.prepare("SELECT COUNT(*) AS n FROM game_questions WHERE category_id = ? AND active = 1").get(id) as { n: number }).n;
  if (count === 0) back(id, "Tambah sekurang-kurangnya satu soalan sebelum menggunakan kategori ini");
  db.exec("BEGIN");
  db.prepare("UPDATE game_categories SET in_use = 0").run();
  db.prepare("UPDATE game_categories SET in_use = 1 WHERE id = ?").run(id);
  db.exec("COMMIT");
  revalidatePath(PAGE);
  back(id);
}

export async function deleteCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  const cat = db.prepare("SELECT in_use FROM game_categories WHERE id = ?").get(id) as { in_use: number } | undefined;
  if (!cat) back("");
  if (cat!.in_use) back(id, "Kategori yang sedang digunakan tidak boleh dipadam. Gunakan kategori lain dahulu");
  const count = (db.prepare("SELECT COUNT(*) AS n FROM game_questions WHERE category_id = ? AND active = 1").get(id) as { n: number }).n;
  if (count > 0) back(id, "Padam semua soalan dalam kategori ini dahulu");
  const asked = db.prepare("SELECT 1 FROM game_questions WHERE category_id = ? LIMIT 1").get(id);
  if (asked) {
    // Keep the (switched-off) questions for past rounds' records; just hide the category by renaming.
    db.prepare("UPDATE game_categories SET name = name || ' (dipadam ' || id || ')' WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM game_categories WHERE id = ?").run(id);
  }
  revalidatePath(PAGE);
  back("");
}

// Add (no id) or edit (with id) a question.
export async function saveQuestion(formData: FormData) {
  const id = Number(formData.get("id")) || 0;
  const categoryId = Number(formData.get("category_id"));
  const q = text(formData, "text", 400);
  const opts = ["a", "b", "c", "d"].map((k) => text(formData, `opt_${k}`, 200));
  const answer = Number(formData.get("answer"));
  if (!q) back(categoryId, "Soalan tidak boleh kosong");
  if (opts.some((o) => !o)) back(categoryId, "Keempat-empat pilihan A–D perlu diisi");
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) back(categoryId, "Pilih jawapan yang betul");
  if (!db.prepare("SELECT 1 FROM game_categories WHERE id = ?").get(categoryId)) back("", "Kategori tidak dijumpai");

  if (id) {
    db.prepare(
      "UPDATE game_questions SET text = ?, opt_a = ?, opt_b = ?, opt_c = ?, opt_d = ?, answer = ? WHERE id = ? AND category_id = ?",
    ).run(q, ...opts, answer, id, categoryId);
  } else {
    db.prepare(
      "INSERT INTO game_questions (category_id, text, opt_a, opt_b, opt_c, opt_d, answer) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(categoryId, q, ...opts, answer);
  }
  revalidatePath(PAGE);
  back(categoryId);
}

export async function deleteQuestion(formData: FormData) {
  const id = Number(formData.get("id"));
  const categoryId = Number(formData.get("category_id"));
  db.prepare("UPDATE game_questions SET active = 0 WHERE id = ?").run(id);
  revalidatePath(PAGE);
  back(categoryId);
}
