import { sql } from "drizzle-orm"
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * 阅读板块：一本在读/已读/想读的书。
 *
 * - progress: 0-100 整数（百分比），null = 未记录
 * - startDate / finishDate: YYYYMMDD 整数（用户本地时区日期）
 */
export const books = sqliteTable(
  "books",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    startDate: integer("start_date"), // YYYYMMDD
    progress: integer("progress"), // 0-100
    finishDate: integer("finish_date"), // YYYYMMDD
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    nameLen: check(
      "books_name_len_check",
      sql`length(${t.name}) BETWEEN 1 AND 200`
    ),
    progressRange: check(
      "books_progress_range_check",
      sql`${t.progress} IS NULL OR (${t.progress} BETWEEN 0 AND 100)`
    ),
    startDateRange: check(
      "books_start_date_range_check",
      sql`${t.startDate} IS NULL OR (${t.startDate} BETWEEN 19000101 AND 29991231)`
    ),
    finishDateRange: check(
      "books_finish_date_range_check",
      sql`${t.finishDate} IS NULL OR (${t.finishDate} BETWEEN 19000101 AND 29991231)`
    ),
  })
)

export type Book = typeof books.$inferSelect
export type NewBook = typeof books.$inferInsert
