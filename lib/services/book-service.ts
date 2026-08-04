import "server-only"

import { asc, desc, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { books, type Book } from "@/db/schema"
import {
  createBookInput,
  updateBookInput,
  type CreateBookInput,
  type UpdateBookInput,
} from "@/lib/validation/book"

export async function listBooks(): Promise<Book[]> {
  return db
    .select()
    .from(books)
    .orderBy(desc(books.updatedAt), desc(books.id))
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
