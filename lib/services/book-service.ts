import "server-only"

import { asc, desc, eq, sql } from "drizzle-orm"

import { db } from "@/db/client"
import { books, type Book } from "@/db/schema"
import {
  createBookInput,
  updateBookInput,
  type CreateBookInput,
  type UpdateBookInput,
} from "@/lib/validation/book"

/**
 * Reading list ordering:
 *  1. Unfinished books (finishDate NULL) first, sorted by progress asc (少→多).
 *     Books without progress (NULL) sort after those with a progress value.
 *  2. Finished books last, sorted by finishDate desc (最近完成的在前).
 */
export async function listBooks(): Promise<Book[]> {
  const unfinishedFirst = sql<number>`CASE WHEN ${books.finishDate} IS NULL THEN 0 ELSE 1 END`
  // progress NULL → treat as 101 so it sorts after any explicit 0-100
  const progressOrMax = sql<number>`COALESCE(${books.progress}, 101)`

  return db
    .select()
    .from(books)
    .orderBy(
      asc(unfinishedFirst),
      asc(progressOrMax),
      desc(books.finishDate),
      desc(books.updatedAt)
    )
}

export async function getBook(id: number): Promise<Book | null> {
  const [row] = await db.select().from(books).where(eq(books.id, id)).limit(1)
  return row ?? null
}

export async function createBook(raw: unknown): Promise<Book> {
  const input = createBookInput.parse(raw)
  const now = new Date()
  const [row] = await db
    .insert(books)
    .values({
      name: input.name.trim(),
      startDate: input.startDate ?? null,
      progress: input.progress ?? null,
      finishDate: input.finishDate ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  if (!row) throw new Error("insert failed")
  return row
}

export async function updateBook(id: number, raw: unknown): Promise<Book> {
  const input = updateBookInput.parse(raw)
  const updates: Partial<typeof books.$inferInsert> = { updatedAt: new Date() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.startDate !== undefined) updates.startDate = input.startDate
  if (input.progress !== undefined) updates.progress = input.progress
  if (input.finishDate !== undefined) updates.finishDate = input.finishDate

  const [row] = await db
    .update(books)
    .set(updates)
    .where(eq(books.id, id))
    .returning()
  if (!row) throw new Error("书不存在")
  return row
}

export async function deleteBook(id: number): Promise<void> {
  await db.delete(books).where(eq(books.id, id))
}

// re-export for actions typing
export type { CreateBookInput, UpdateBookInput }
