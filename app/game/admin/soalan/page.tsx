import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { LETTERS, type Category, type Question } from "@/lib/game";
import { createCategory, deleteCategory, deleteQuestion, renameCategory, saveQuestion, useCategory } from "./actions";

type CategoryRow = Category & { count: number };

// Question bank: categories of questions, one "in use" for new rounds, and the questions in each.
export default async function QuestionsPage({ searchParams }: PageProps<"/game/admin/soalan">) {
  await connection();
  const { k, ralat } = await searchParams;
  const categories = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM game_questions q WHERE q.category_id = c.id AND q.active = 1) AS count
       FROM game_categories c WHERE c.name NOT LIKE '% (dipadam %)' ORDER BY c.id`,
    )
    .all() as CategoryRow[];
  const selected = categories.find((c) => String(c.id) === k) ?? categories.find((c) => c.in_use) ?? categories[0];
  const questions = selected
    ? (db.prepare("SELECT * FROM game_questions WHERE category_id = ? AND active = 1 ORDER BY id").all(selected.id) as Question[])
    : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 text-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link href="/game/admin" className="text-sm text-slate-500 hover:underline">← Laser Target · Pengurusan</Link>
          <h1 className="text-2xl font-semibold">Soalan</h1>
        </div>
        <p className="text-sm text-slate-600">Pusingan baharu mengambil soalan daripada kategori yang sedang digunakan.</p>
      </div>

      {typeof ralat === "string" && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{ralat}</p>
      )}

      <section aria-label="Kategori" className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`?k=${c.id}`}
              aria-current={c.id === selected?.id ? "page" : undefined}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium ring-1 ${
                c.id === selected?.id ? "bg-slate-900 text-white ring-slate-900" : "bg-white ring-slate-300 hover:bg-slate-50"
              }`}
            >
              {c.name}
              <span className={c.id === selected?.id ? "text-slate-300" : "text-slate-500"}>{c.count}</span>
              {c.in_use ? <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white">Digunakan</span> : null}
            </Link>
          ))}
          <form action={createCategory} className="flex items-center gap-2">
            <label htmlFor="new-cat" className="sr-only">Nama kategori baharu</label>
            <input id="new-cat" name="name" required maxLength={40} placeholder="Kategori baharu" className="h-11 w-44 rounded-lg border border-slate-300 px-3 text-sm" />
            <button className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50">Tambah</button>
          </form>
        </div>

        {selected && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 ring-1 ring-slate-200">
            {selected.in_use ? (
              <p className="text-sm font-medium text-emerald-700">Kategori ini sedang digunakan untuk pusingan baharu.</p>
            ) : (
              <form action={useCategory}>
                <input type="hidden" name="id" value={selected.id} />
                <button className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
                  Gunakan kategori ini
                </button>
              </form>
            )}
            <form action={renameCategory} className="flex items-center gap-2">
              <input type="hidden" name="id" value={selected.id} />
              <label htmlFor="rename" className="text-sm text-slate-600">Nama</label>
              <input id="rename" name="name" required maxLength={40} defaultValue={selected.name} className="h-10 w-48 rounded-lg border border-slate-300 px-3 text-sm" />
              <button className="h-10 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50">Simpan nama</button>
            </form>
            {!selected.in_use && selected.count === 0 && (
              <form action={deleteCategory} className="ml-auto">
                <input type="hidden" name="id" value={selected.id} />
                <button className="h-10 rounded-lg border border-red-300 px-3 text-sm text-red-700 hover:bg-red-50">Padam kategori</button>
              </form>
            )}
          </div>
        )}
      </section>

      {selected && (
        <section aria-label={`Soalan ${selected.name}`} className="flex flex-col gap-3">
          <h2 className="font-semibold">{selected.name} · {questions.length} soalan</h2>
          {questions.length === 0 && <p className="text-sm text-slate-500">Tiada soalan lagi. Tambah soalan di bawah.</p>}
          <ol className="flex flex-col gap-3">
            {questions.map((q, n) => (
              <li key={q.id} className="rounded-lg bg-white p-4 ring-1 ring-slate-200">
                <p className="font-medium"><span className="text-slate-400">{n + 1}.</span> {q.text}</p>
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {[q.opt_a, q.opt_b, q.opt_c, q.opt_d].map((o, i) => (
                    <li key={i} className={i === q.answer ? "font-semibold text-emerald-700" : "text-slate-700"}>
                      {LETTERS[i]}. {o} {i === q.answer && <span className="sr-only">(jawapan betul)</span>}
                      {i === q.answer && <span aria-hidden="true"> ✓</span>}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-3">
                  <details className="open:w-full">
                    <summary className="inline-flex min-h-9 cursor-pointer items-center rounded border border-slate-300 px-3 text-sm hover:bg-slate-50">Edit</summary>
                    <QuestionForm categoryId={selected.id} question={q} />
                  </details>
                  <details>
                    <summary className="inline-flex min-h-9 cursor-pointer items-center rounded border border-red-300 px-3 text-sm text-red-700 hover:bg-red-50">Padam</summary>
                    <form action={deleteQuestion} className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="id" value={q.id} />
                      <input type="hidden" name="category_id" value={selected.id} />
                      <span className="text-sm text-slate-600">Padam soalan ini?</span>
                      <button className="min-h-9 rounded bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">Ya, padam</button>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-lg bg-white p-4 ring-1 ring-slate-200">
            <h3 className="font-semibold">Tambah soalan ke {selected.name}</h3>
            <QuestionForm categoryId={selected.id} />
          </div>
        </section>
      )}
    </div>
  );
}

function QuestionForm({ categoryId, question }: { categoryId: number; question?: Question }) {
  const key = question ? `q${question.id}` : "new";
  const opts = question ? [question.opt_a, question.opt_b, question.opt_c, question.opt_d] : ["", "", "", ""];
  return (
    <form action={saveQuestion} className="mt-3 flex flex-col gap-3">
      {question && <input type="hidden" name="id" value={question.id} />}
      <input type="hidden" name="category_id" value={categoryId} />
      <label htmlFor={`${key}-text`} className="text-sm font-medium">Soalan</label>
      <textarea id={`${key}-text`} name="text" required maxLength={400} rows={2} defaultValue={question?.text} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Pilihan (tandakan jawapan yang betul)</legend>
        {LETTERS.map((L, i) => (
          <div key={L} className="flex items-center gap-2">
            <input
              type="radio"
              id={`${key}-ans-${i}`}
              name="answer"
              value={i}
              required
              defaultChecked={question ? question.answer === i : false}
              className="h-5 w-5 accent-emerald-700"
              aria-label={`${L} ialah jawapan betul`}
            />
            <label htmlFor={`${key}-opt-${i}`} className="w-5 text-sm font-semibold">{L}</label>
            <input id={`${key}-opt-${i}`} name={`opt_${L.toLowerCase()}`} required maxLength={200} defaultValue={opts[i]} className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
        ))}
      </fieldset>
      <div>
        <button className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700">
          {question ? "Simpan perubahan" : "Tambah soalan"}
        </button>
      </div>
    </form>
  );
}
