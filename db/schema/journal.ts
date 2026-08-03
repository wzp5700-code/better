import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryDate: integer("entry_date").notNull(), // YYYYMMDD
    content: text("content").notNull().default(""),
    contentHtml: text("content_html"),

    moodScore: integer("mood_score"), // 1..5 or null
    moodLabel: text("mood_label"),

    categoryId: integer("category_id").references(
      () => journalCategories.id,
      { onDelete: "set null" }
    ),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    entryDateIdx: index("journal_entry_date_idx").on(
      t.entryDate,
      t.createdAt
    ),
    updatedAtIdx: index("journal_updated_idx").on(t.updatedAt),
    categoryIdx: index("journal_category_idx").on(t.categoryId),
    moodScoreRange: check(
      "journal_mood_score_check",
      sql`${t.moodScore} IS NULL OR (${t.moodScore} BETWEEN 1 AND 5)`
    ),
    moodPair: check(
      "journal_mood_pair_check",
      sql`(${t.moodScore} IS NULL AND ${t.moodLabel} IS NULL) OR (${t.moodScore} IS NOT NULL AND ${t.moodLabel} IS NOT NULL)`
    ),
    entryDateRange: check(
      "journal_entry_date_range_check",
      sql`${t.entryDate} BETWEEN 19000101 AND 29991231`
    ),
  })
)

export const journalCategories = sqliteTable(
  "journal_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: integer("archived", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uniqName: uniqueIndex("journal_category_name_uniq").on(t.name),
    archivedIdx: index("journal_category_archived_idx").on(t.archived, t.sortOrder),
    nameLen: check(
      "journal_category_name_len_check",
      sql`length(${t.name}) BETWEEN 1 AND 40`
    ),
  })
)

export const journalTags = sqliteTable(
  "journal_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryId: integer("entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => ({
    uniqEntryTag: uniqueIndex("entry_tag_uniq").on(t.entryId, t.tag),
    tagIdx: index("journal_tag_idx").on(t.tag),
  })
)

export const journalLinks = sqliteTable(
  "journal_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fromEntryId: integer("from_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    toEntryId: integer("to_entry_id"),
    toTarget: text("to_target").notNull(),
    position: integer("position").notNull(),
  },
  (t) => ({
    fromIdx: index("journal_link_from_idx").on(t.fromEntryId, t.position),
    toIdx: index("journal_link_to_idx").on(t.toEntryId),
    targetIdx: index("journal_link_target_idx").on(t.toTarget),
    uniqLink: uniqueIndex("journal_link_uniq").on(
      t.fromEntryId,
      t.toTarget,
      t.position
    ),
    positionCheck: check(
      "journal_link_position_check",
      sql`${t.position} >= 0`
    ),
    targetCheck: check(
      "journal_link_target_check",
      sql`length(${t.toTarget}) > 0`
    ),
  })
)

export type JournalEntry = typeof journalEntries.$inferSelect
export type NewJournalEntry = typeof journalEntries.$inferInsert
export type JournalTag = typeof journalTags.$inferSelect
export type JournalLink = typeof journalLinks.$inferSelect
export type JournalCategory = typeof journalCategories.$inferSelect
export type NewJournalCategory = typeof journalCategories.$inferInsert