import "server-only"

import { and, asc, count, desc, eq, sql } from "drizzle-orm"

import { db } from "@/db/client"
import {
  journalCategories,
  journalEntries,
  type JournalCategory,
} from "@/db/schema"
import {
  createCategoryInput,
  setCategoryForEntryInput,
  updateCategoryInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/validation/journal-category"

export async function listCategories(
  filter?: { includeArchived?: boolean }
): Promise<JournalCategory[]> {
  const where = filter?.includeArchived
    ? undefined
    : eq(journalCategories.archived, false)
  return db
    .select()
    .from(journalCategories)
    .where(where as never)
    .orderBy(asc(journalCategories.sortOrder), asc(journalCategories.id))
}

export async function getCategory(id: number): Promise<JournalCategory | null> {
  const [row] = await db
    .select()
    .from(journalCategories)
    .where(eq(journalCategories.id, id))
    .limit(1)
  return row ?? null
}

export async function createCategory(raw: unknown): Promise<JournalCategory> {
  const input = createCategoryInput.parse(raw)
  const now = new Date()
  // determine sortOrder: append at the end among non-archived
  const [maxRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(${journalCategories.sortOrder}), -1)` })
    .from(journalCategories)
  const nextOrder = (maxRow?.max ?? -1) + 1
  const [row] = await db
    .insert(journalCategories)
    .values({
      name: input.name.trim(),
      color: input.color ?? null,
      sortOrder: input.sortOrder ?? nextOrder,
      archived: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  if (!row) throw new Error("insert failed")
  return row
}

export async function updateCategory(
  id: number,
  raw: unknown
): Promise<JournalCategory> {
  const input = updateCategoryInput.parse(raw)
  const updates: Partial<typeof journalCategories.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.color !== undefined) updates.color = input.color
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder
  if (input.archived !== undefined) updates.archived = input.archived
  const [row] = await db
    .update(journalCategories)
    .set(updates)
    .where(eq(journalCategories.id, id))
    .returning()
  if (!row) throw new Error("分类不存在")
  return row
}

export async function archiveCategory(id: number): Promise<JournalCategory> {
  return updateCategory(id, { archived: true })
}

export async function unarchiveCategory(id: number): Promise<JournalCategory> {
  return updateCategory(id, { archived: false })
}

/**
 * Hard delete. Sets referencing journal_entries.category_id to NULL via FK ON DELETE SET NULL.
 * Use archiveCategory for soft-delete to preserve history.
 */
export async function deleteCategory(id: number): Promise<void> {
  await db.delete(journalCategories).where(eq(journalCategories.id, id))
}

export async function setCategoryForEntry(
  raw: unknown
): Promise<{ entryId: number; categoryId: number | null }> {
  const input = setCategoryForEntryInput.parse(raw)
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, input.entryId))
    .limit(1)
  if (!entry) throw new Error("日记不存在")
  if (input.categoryId != null) {
    const [cat] = await db
      .select()
      .from(journalCategories)
      .where(
        and(
          eq(journalCategories.id, input.categoryId),
          eq(journalCategories.archived, false)
        )
      )
      .limit(1)
    if (!cat) throw new Error("分类不存在或已归档")
  }
  await db
    .update(journalEntries)
    .set({ categoryId: input.categoryId, updatedAt: new Date() })
    .where(eq(journalEntries.id, input.entryId))
  return { entryId: input.entryId, categoryId: input.categoryId }
}

export async function getCategoriesWithCount(): Promise<
  Array<JournalCategory & { entryCount: number }>
> {
  const rows = await db
    .select({
      id: journalCategories.id,
      name: journalCategories.name,
      color: journalCategories.color,
      sortOrder: journalCategories.sortOrder,
      archived: journalCategories.archived,
      createdAt: journalCategories.createdAt,
      updatedAt: journalCategories.updatedAt,
      entryCount: count(journalEntries.id),
    })
    .from(journalCategories)
    .leftJoin(journalEntries, eq(journalEntries.categoryId, journalCategories.id))
    .groupBy(journalCategories.id)
    .orderBy(asc(journalCategories.sortOrder), asc(journalCategories.id))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    sortOrder: r.sortOrder,
    archived: r.archived,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    entryCount: Number(r.entryCount),
  }))
}

// Re-export for callers that want to assert CreateCategoryInput / UpdateCategoryInput shapes
export type { CreateCategoryInput, UpdateCategoryInput }