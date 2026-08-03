import "server-only"

import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm"

import { db } from "@/db/client"
import {
  habitCompletions,
  habits,
  journalCategories,
  journalEntries,
} from "@/db/schema"
import { addDaysKey, fromDateKey, toDateKey } from "@/lib/dates"

export interface MonthDaySummary {
  date: number // YYYYMMDD
  completedHabitCount: number
  distinctHabits: number
  journalEntryCount: number
  hasContent: boolean
}

export interface DayDetail {
  date: number
  habitCompletions: Array<{
    habitId: number
    habitName: string
    color: string | null
    value: number
    note: string | null
  }>
  journalEntries: Array<{
    id: number
    snippet: string
    moodLabel: string | null
    moodScore: number | null
    category: { id: number; name: string; color: string | null } | null
  }>
}

export async function getMonth(
  year: number,
  month: number // 1..12
): Promise<{ year: number; month: number; days: MonthDaySummary[] }> {
  if (!Number.isInteger(year) || year < 1970 || year > 2999) {
    throw new Error("year out of range")
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("month out of range")
  }
  const firstKey = year * 10000 + month * 100 + 1
  // last day of month
  const nextMonth = month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 }
  const nextMonthFirstKey = nextMonth.year * 10000 + nextMonth.month * 100 + 1
  const lastKey = addDaysKey(nextMonthFirstKey, -1)

  const completionRows = await db
    .select({
      completedOn: habitCompletions.completedOn,
      habitId: habitCompletions.habitId,
      value: habitCompletions.value,
    })
    .from(habitCompletions)
    .where(
      and(
        gte(habitCompletions.completedOn, firstKey),
        lte(habitCompletions.completedOn, lastKey)
      )
    )

  const journalRows = await db
    .select({ id: journalEntries.id, entryDate: journalEntries.entryDate })
    .from(journalEntries)
    .where(
      and(
        gte(journalEntries.entryDate, firstKey),
        lte(journalEntries.entryDate, lastKey)
      )
    )

  // Build per-day aggregations
  const daysMap = new Map<number, MonthDaySummary>()
  for (let k = firstKey; k <= lastKey; k = addDaysKey(k, 1)) {
    daysMap.set(k, {
      date: k,
      completedHabitCount: 0,
      distinctHabits: 0,
      journalEntryCount: 0,
      hasContent: false,
    })
  }

  const habitsByDay = new Map<number, Set<number>>()
  for (const r of completionRows) {
    const day = daysMap.get(r.completedOn)
    if (!day) continue
    day.completedHabitCount += 1
    day.hasContent = true
    let set = habitsByDay.get(r.completedOn)
    if (!set) {
      set = new Set<number>()
      habitsByDay.set(r.completedOn, set)
    }
    set.add(r.habitId)
  }
  for (const [k, set] of habitsByDay.entries()) {
    const day = daysMap.get(k)
    if (day) day.distinctHabits = set.size
  }

  for (const r of journalRows) {
    const day = daysMap.get(r.entryDate)
    if (!day) continue
    day.journalEntryCount += 1
    day.hasContent = true
  }

  return {
    year,
    month,
    days: Array.from(daysMap.values()),
  }
}

export async function getDay(dateKey: number): Promise<DayDetail> {
  const completions = await db
    .select({
      habitId: habitCompletions.habitId,
      habitName: habits.name,
      color: habits.color,
      value: habitCompletions.value,
      note: habitCompletions.note,
    })
    .from(habitCompletions)
    .innerJoin(habits, eq(habits.id, habitCompletions.habitId))
    .where(eq(habitCompletions.completedOn, dateKey))
    .orderBy(asc(habits.name))

  const entries = await db
    .select({
      id: journalEntries.id,
      content: journalEntries.content,
      moodLabel: journalEntries.moodLabel,
      moodScore: journalEntries.moodScore,
      categoryId: journalEntries.categoryId,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(eq(journalEntries.entryDate, dateKey))
    .orderBy(desc(journalEntries.createdAt), desc(journalEntries.id))

  const categoryIds = Array.from(
    new Set(entries.map((e) => e.categoryId).filter((id): id is number => id != null))
  )
  const categories =
    categoryIds.length === 0
      ? []
      : await db
          .select({
            id: journalCategories.id,
            name: journalCategories.name,
            color: journalCategories.color,
          })
          .from(journalCategories)
          .where(
            sql`${journalCategories.id} IN (${sql.join(
              categoryIds.map((v) => sql`${v}`),
              sql`, `
            )})`
          )
  const catMap = new Map(categories.map((c) => [c.id, c]))

  return {
    date: dateKey,
    habitCompletions: completions.map((c) => ({
      habitId: c.habitId,
      habitName: c.habitName,
      color: c.color,
      value: c.value,
      note: c.note,
    })),
    journalEntries: entries.map((e) => ({
      id: e.id,
      snippet: snippetFromJson(e.content),
      moodLabel: e.moodLabel,
      moodScore: e.moodScore,
      category: e.categoryId != null ? catMap.get(e.categoryId) ?? null : null,
    })),
  }
}

function snippetFromJson(content: string): string {
  try {
    const parsed = JSON.parse(content) as
      | { type?: string; text?: string; content?: Array<{ text?: string }> }
      | undefined
    const buf: string[] = []
    walkText(parsed, buf)
    return buf.join(" ").trim().slice(0, 100)
  } catch {
    return ""
  }
}

function walkText(
  node:
    | { type?: string; text?: string; content?: Array<{ text?: string }> }
    | undefined,
  buf: string[]
): void {
  if (!node) return
  if (typeof node.text === "string") buf.push(node.text)
  if (Array.isArray(node.content)) {
    for (const c of node.content) walkText(c, buf)
  }
}

// Re-export for testing
export const __calendarHelpers = { fromDateKey, toDateKey }