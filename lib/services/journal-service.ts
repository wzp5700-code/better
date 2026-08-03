import "server-only"

import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm"

import { db } from "@/db/client"
import {
  journalCategories,
  journalEntries,
  journalLinks,
  journalTags,
  type JournalCategory,
  type JournalEntry,
  type JournalLink,
} from "@/db/schema"
import { todayDateKey } from "@/lib/dates"
import {
  createJournalInput,
  updateJournalInput,
  type CreateJournalInput,
  type UpdateJournalInput,
} from "@/lib/validation/journal"
import {
  extractTags,
  extractWikiLinks,
  isValidTipTapDoc,
  normalizeTag,
  renderJournalHtml,
} from "./journal-parser"

export type EntryWithRelations = JournalEntry & {
  tags: string[]
  outgoingLinks: ParsedLinkRow[]
  incomingLinks: ParsedIncomingRow[]
  category: JournalCategory | null
}

export interface ParsedLinkRow extends JournalLink {
  toEntryDate: number | null
  toEntryTitle: string | null
}

export interface ParsedIncomingRow {
  id: number
  fromEntryId: number
  fromEntryDate: number
  fromEntryTitle: string | null
  toTarget: string
  position: number
}

function dateFromKey(key: number): Date {
  const y = Math.floor(key / 10000)
  const m = Math.floor((key % 10000) / 100) - 1
  const d = key % 100
  return new Date(y, m, d)
}

function keyToIso(key: number): string {
  const y = Math.floor(key / 10000)
  const m = Math.floor((key % 10000) / 100)
  const d = key % 100
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export async function createJournalEntry(raw: unknown): Promise<EntryWithRelations> {
  const input = createJournalInput.parse(raw)
  if (!isValidTipTapDoc(input.content)) {
    throw new Error("内容必须是有效的文档")
  }
  const tags = extractTags(input.content)
  const links = extractWikiLinks(input.content)
  const html = renderJournalHtml(input.content)

  const now = new Date()
  let categoryId: number | null = input.categoryId ?? null
  if (categoryId != null) {
    const [cat] = await db
      .select()
      .from(journalCategories)
      .where(eq(journalCategories.id, categoryId))
      .limit(1)
    if (!cat || cat.archived) {
      throw new Error("分类不存在或已归档")
    }
  }

  const [row] = await db
    .insert(journalEntries)
    .values({
      entryDate: input.entryDate,
      content: JSON.stringify(input.content),
      contentHtml: html,
      moodScore: input.moodScore ?? null,
      moodLabel: input.moodLabel ?? null,
      categoryId,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  if (!row) throw new Error("insert failed")

  await materializeTags(row.id, tags)
  await materializeLinks(row.id, links)
  return getJournalEntry(row.id) as Promise<EntryWithRelations>
}

export async function updateJournalEntry(
  id: number,
  raw: unknown
): Promise<EntryWithRelations> {
  const input = updateJournalInput.parse(raw)
  const [existing] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1)
  if (!existing) throw new Error("entry not found")

  const now = new Date()
  const updates: Partial<typeof journalEntries.$inferInsert> = { updatedAt: now }

  if (input.entryDate !== undefined) updates.entryDate = input.entryDate
  if (input.moodScore !== undefined) updates.moodScore = input.moodScore
  if (input.moodLabel !== undefined) updates.moodLabel = input.moodLabel
  if (input.categoryId !== undefined) {
    if (input.categoryId != null) {
      const [cat] = await db
        .select()
        .from(journalCategories)
        .where(eq(journalCategories.id, input.categoryId))
        .limit(1)
      if (!cat || cat.archived) {
        throw new Error("分类不存在或已归档")
      }
    }
    updates.categoryId = input.categoryId
  }

  if (input.content !== undefined) {
    if (!isValidTipTapDoc(input.content)) throw new Error("内容必须是有效的文档")
    updates.content = JSON.stringify(input.content)
    updates.contentHtml = renderJournalHtml(input.content)
  }

  await db.update(journalEntries).set(updates).where(eq(journalEntries.id, id))

  if (input.content !== undefined) {
    const tags = extractTags(input.content)
    const links = extractWikiLinks(input.content)
    await db.delete(journalTags).where(eq(journalTags.entryId, id))
    await db.delete(journalLinks).where(eq(journalLinks.fromEntryId, id))
    await materializeTags(id, tags)
    await materializeLinks(id, links)
  } else if (input.moodScore !== undefined || input.moodLabel !== undefined) {
    // mood-only update: ensure pair consistency
    if (input.moodScore === null || input.moodScore === undefined) {
      await db
        .update(journalEntries)
        .set({ moodLabel: null })
        .where(eq(journalEntries.id, id))
    }
  }

  return getJournalEntry(id) as Promise<EntryWithRelations>
}

export async function deleteJournalEntry(id: number): Promise<void> {
  await db.delete(journalEntries).where(eq(journalEntries.id, id))
}

export async function getJournalEntry(id: number): Promise<EntryWithRelations | null> {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .limit(1)
  if (!row) return null

  const tagRows = await db
    .select()
    .from(journalTags)
    .where(eq(journalTags.entryId, id))
  const tags = tagRows.map((t) => t.tag)

  const outgoing = await db
    .select({
      id: journalLinks.id,
      fromEntryId: journalLinks.fromEntryId,
      toEntryId: journalLinks.toEntryId,
      toTarget: journalLinks.toTarget,
      position: journalLinks.position,
    })
    .from(journalLinks)
    .where(eq(journalLinks.fromEntryId, id))

  // Resolve to-entry metadata for outgoing links
  const outgoingIds = outgoing
    .map((l) => l.toEntryId)
    .filter((id): id is number => id != null)
  const outgoingTargets = outgoing.map((l) => l.toTarget)

  const outgoingEntries =
    outgoingIds.length === 0
      ? []
      : await db
          .select({
            id: journalEntries.id,
            entryDate: journalEntries.entryDate,
            content: journalEntries.content,
          })
          .from(journalEntries)
          .where(
            or(...outgoingIds.map((id) => eq(journalEntries.id, id))) as never
          )

  const outgoingMap = new Map(
    outgoingEntries.map((e) => [e.id, { entryDate: e.entryDate, snippet: snippet(e.content) }])
  )
  const outgoingByTarget = new Map<string, number>()
  for (const l of outgoing) {
    if (l.toEntryId != null && !outgoingByTarget.has(l.toTarget)) {
      outgoingByTarget.set(l.toTarget, l.toEntryId)
    }
  }
  const targetToEntryLookup =
    outgoingTargets.length === 0
      ? new Map<number, { entryDate: number; snippet: string }>()
      : (
          await db
            .select({
              id: journalEntries.id,
              entryDate: journalEntries.entryDate,
              content: journalEntries.content,
            })
            .from(journalEntries)
            .where(
              sql`${journalEntries.id} IN (${sql.join(
                Array.from(outgoingByTarget.values()).map((v) => sql`${v}`),
                sql`, `
              )})`
            )
        ).reduce(
          (acc, e) => acc.set(e.id, { entryDate: e.entryDate, snippet: snippet(e.content) }),
          new Map<number, { entryDate: number; snippet: string }>()
        )

  const outgoingRows: ParsedLinkRow[] = outgoing.map((l) => {
    const targetKey =
      typeof l.toEntryId === "number" && targetToEntryLookup.has(l.toEntryId)
        ? targetToEntryLookup.get(l.toEntryId)!
        : null
    return {
      ...l,
      toEntryDate: targetKey?.entryDate ?? null,
      toEntryTitle: targetKey?.snippet ?? null,
    }
  })

  const incoming = await db
    .select({
      id: journalLinks.id,
      fromEntryId: journalLinks.fromEntryId,
      toTarget: journalLinks.toTarget,
      position: journalLinks.position,
    })
    .from(journalLinks)
    .where(eq(journalLinks.toEntryId, id))

  const incomingEntryIds = incoming.map((i) => i.fromEntryId)
  const incomingEntries =
    incomingEntryIds.length === 0
      ? []
      : await db
          .select({
            id: journalEntries.id,
            entryDate: journalEntries.entryDate,
            content: journalEntries.content,
          })
          .from(journalEntries)
          .where(
            or(...incomingEntryIds.map((eid) => eq(journalEntries.id, eid))) as never
          )

  const incomingMap = new Map(
    incomingEntries.map((e) => [e.id, { entryDate: e.entryDate, snippet: snippet(e.content) }])
  )

  const incomingRows: ParsedIncomingRow[] = incoming.map((i) => {
    const meta = incomingMap.get(i.fromEntryId)
    return {
      id: i.id,
      fromEntryId: i.fromEntryId,
      fromEntryDate: meta?.entryDate ?? 0,
      fromEntryTitle: meta?.snippet ?? null,
      toTarget: i.toTarget,
      position: i.position,
    }
  })

  let category: JournalCategory | null = null
  if (row.categoryId != null) {
    const [cat] = await db
      .select()
      .from(journalCategories)
      .where(eq(journalCategories.id, row.categoryId))
      .limit(1)
    category = cat ?? null
  }

  return {
    ...row,
    tags,
    outgoingLinks: outgoingRows,
    incomingLinks: incomingRows,
    category,
  }
}

function snippet(content: string): string {
  try {
    const parsed = JSON.parse(content) as TipTapLikeNode
    const buf: string[] = []
    collectText(parsed, buf)
    return buf.join(" ").trim().slice(0, 80)
  } catch {
    return ""
  }
}

interface TipTapLikeNode {
  type?: string
  text?: string
  content?: TipTapLikeNode[]
}

function collectText(node: TipTapLikeNode | undefined, buf: string[]): void {
  if (!node) return
  if (typeof node.text === "string") buf.push(node.text)
  if (Array.isArray(node.content)) {
    for (const c of node.content) collectText(c, buf)
  }
}

async function materializeTags(entryId: number, tags: string[]): Promise<void> {
  if (tags.length === 0) return
  await db
    .insert(journalTags)
    .values(tags.map((tag) => ({ entryId, tag })))
    .onConflictDoNothing()
}

async function materializeLinks(
  entryId: number,
  parsedLinks: Array<{ target: string; entryId: number | null; position: number }>
): Promise<void> {
  if (parsedLinks.length === 0) return
  // best-effort resolve by stable target format: try "entry:<id>" first, else
  // try to find an entry whose JSON contains the target as a wikiLink attribute.
  const rows: Array<{
    fromEntryId: number
    toEntryId: number | null
    toTarget: string
    position: number
  }> = []

  for (const l of parsedLinks) {
    let resolved: number | null = l.entryId
    if (resolved == null) {
      // try format entry:<id>
      const m = l.target.match(/^entry:(\d+)$/)
      if (m && m[1]) {
        const id = Number(m[1])
        const [hit] = await db
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(eq(journalEntries.id, id))
          .limit(1)
        resolved = hit ? id : null
      }
    }
    rows.push({
      fromEntryId: entryId,
      toEntryId: resolved,
      toTarget: l.target,
      position: l.position,
    })
  }

  await db
    .insert(journalLinks)
    .values(rows)
    .onConflictDoNothing()
}

export interface ListEntriesArgs {
  from?: number
  to?: number
  tag?: string
  query?: string
  limit?: number
  cursor?: number
  categoryId?: number | null
}

export interface ListEntriesItem {
  id: number
  entryDate: number
  snippet: string
  moodScore: number | null
  moodLabel: string | null
  tags: string[]
  category: JournalCategory | null
}

export interface ListEntriesResult {
  items: ListEntriesItem[]
  nextCursor: number | null
}

export async function listJournalEntries(
  args: ListEntriesArgs = {}
): Promise<ListEntriesResult> {
  const limit = Math.min(50, args.limit ?? 20)
  const where: ReturnType<typeof and>[] = []
  if (args.from != null && args.to != null) {
    where.push(and(
      sql`${journalEntries.entryDate} >= ${args.from}`,
      sql`${journalEntries.entryDate} <= ${args.to}`
    ) as never)
  } else if (args.from != null) {
    where.push(sql`${journalEntries.entryDate} >= ${args.from}` as never)
  } else if (args.to != null) {
    where.push(sql`${journalEntries.entryDate} <= ${args.to}` as never)
  }
  if (args.query) {
    const q = `%${args.query}%`
    where.push(like(journalEntries.content, q) as never)
  }
  if (args.cursor != null) {
    where.push(sql`${journalEntries.id} < ${args.cursor}` as never)
  }

  const rows = await db
    .select()
    .from(journalEntries)
    .where(where.length ? (and(...where) as never) : undefined)
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt), desc(journalEntries.id))
    .limit(limit + 1)

  let nextCursor: number | null = null
  const slice = rows.slice(0, limit)
  if (rows.length > limit) {
    nextCursor = slice[slice.length - 1]?.id ?? null
  }

  const ids = slice.map((r) => r.id)
  const tagRows =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(journalTags)
          .where(
            or(...ids.map((id) => eq(journalTags.entryId, id))) as never
          )

  let filteredIds: number[] = ids
  if (args.tag) {
    const wantTag = normalizeTag(args.tag)
    const idsWithTag = new Set(
      tagRows.filter((t) => t.tag === wantTag).map((t) => t.entryId)
    )
    filteredIds = ids.filter((id) => idsWithTag.has(id))
  }
  if (args.categoryId != null) {
    filteredIds = filteredIds.filter((id) => {
      const row = slice.find((r) => r.id === id)
      return row?.categoryId === args.categoryId
    })
  }

  const tagsByEntry = new Map<number, string[]>()
  for (const t of tagRows) {
    if (!tagsByEntry.has(t.entryId)) tagsByEntry.set(t.entryId, [])
    tagsByEntry.get(t.entryId)!.push(t.tag)
  }

  // Fetch categories referenced by the slice
  const categoryIds = Array.from(
    new Set(slice.map((r) => r.categoryId).filter((id): id is number => id != null))
  )
  const categories =
    categoryIds.length === 0
      ? []
      : await db
          .select()
          .from(journalCategories)
          .where(
            or(...categoryIds.map((id) => eq(journalCategories.id, id))) as never
          )
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return {
    items: slice
      .filter((r) => filteredIds.includes(r.id))
      .map((r) => ({
        id: r.id,
        entryDate: r.entryDate,
        snippet: snippet(r.content),
        moodScore: r.moodScore,
        moodLabel: r.moodLabel,
        tags: tagsByEntry.get(r.id) ?? [],
        category: r.categoryId != null ? categoryMap.get(r.categoryId) ?? null : null,
      })),
    nextCursor,
  }
}

/** List wiki-link targets for the suggestion popup. Matches on entryDate (YYYYMMDD as text) or content snippet. */
export async function listWikiLinkTargets(query: string, limit = 10) {
  const cleaned = query.replace(/[\[\]]/g, "").trim()
  if (!cleaned) return []
  const isoLike = cleaned.replace(/[^0-9]/g, "").slice(0, 8)
  const rows = await db
    .select({
      id: journalEntries.id,
      entryDate: journalEntries.entryDate,
      content: journalEntries.content,
    })
    .from(journalEntries)
    .where(
      or(
        isoLike.length > 0
          ? sql`CAST(${journalEntries.entryDate} AS TEXT) LIKE ${`%${isoLike}%`}`
          : (undefined as never),
        sql`${journalEntries.content} LIKE ${`%${cleaned}%`}`
      ) as never
    )
    .orderBy(desc(journalEntries.entryDate))
    .limit(limit)
  return rows.map((r) => ({
    id: r.id,
    entryDate: r.entryDate,
    label: `${keyToIso(r.entryDate)} · ${snippet(r.content)}`,
  }))
}

export async function listAllTags(): Promise<Array<{ tag: string; count: number }>> {
  const rows = await db
    .select({ tag: journalTags.tag, count: count() })
    .from(journalTags)
    .groupBy(journalTags.tag)
    .orderBy(desc(count()))
  return rows.map((r) => ({ tag: r.tag, count: Number(r.count) }))
}