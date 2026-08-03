import "server-only"

import { and, asc, desc, eq, inArray, lte, or } from "drizzle-orm"

import { db } from "@/db/client"
import {
  habitCompletions,
  habits,
  habitStreaks,
  type Habit,
  type HabitCompletion,
  type HabitStreak,
} from "@/db/schema"
import { todayDateKey, toDateKey } from "@/lib/dates"
import { createHabitInput, updateHabitInput, type CreateHabitInput, type UpdateHabitInput } from "@/lib/validation/habit"
import { isHabitDueOn, type FrequencyType, type HabitLike } from "./streak-service"
import { refreshCurrentStreak } from "./streak-service"

export type HabitWithStreak = Habit & {
  streak: HabitStreak | null
  todayStatus: "due" | "not-due" | "paused" | "archived"
  completedToday: boolean
}

export type HabitDetail = HabitWithStreak & {
  completions: HabitCompletion[]
}

function habitToLike(h: Habit): HabitLike {
  return {
    id: h.id,
    frequencyType: h.frequencyType as FrequencyType,
    weeklyDaysMask: h.weeklyDaysMask,
    intervalDays: h.intervalDays,
    startDate: h.startDate,
    targetValue: h.targetValue,
    targetUnit: h.targetUnit,
    status: h.status as HabitLike["status"],
    pausedUntil: h.pausedUntil,
  }
}

export async function createHabit(raw: unknown): Promise<Habit> {
  const input = createHabitInput.parse(raw)
  const now = new Date()
  const startDate = input.startDate
    ? new Date(
        Math.floor(input.startDate / 10000),
        Math.floor((input.startDate % 10000) / 100) - 1,
        input.startDate % 100
      )
    : now

  const [row] = await db
    .insert(habits)
    .values({
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      frequencyType: input.frequencyType,
      weeklyDaysMask:
        input.frequencyType === "weekly" ? input.weeklyDaysMask ?? 0 : 0,
      intervalDays:
        input.frequencyType === "interval" ? input.intervalDays ?? null : null,
      timesPerPeriod: input.timesPerPeriod ?? null,
      periodDays: input.periodDays ?? null,
      targetValue: input.targetValue ?? null,
      targetUnit: input.targetUnit ?? null,
      reminderTime: input.reminderTime ?? null,
      reminderDaysMask: input.reminderDaysMask ?? 0,
      status: "active",
      pausedUntil: null,
      startDate,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  if (!row) throw new Error("insert failed")

  await db.insert(habitStreaks).values({
    habitId: row.id,
    currentStreak: 0,
    longestStreak: 0,
    lastCheckOn: null,
    updatedAt: now,
  })
  return row
}

export async function updateHabit(id: number, raw: unknown): Promise<Habit> {
  const input = updateHabitInput.parse(raw)
  const now = new Date()
  const updates: Partial<typeof habits.$inferInsert> = { updatedAt: now }
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.icon !== undefined) updates.icon = input.icon
  if (input.color !== undefined) updates.color = input.color
  if (input.frequencyType !== undefined) updates.frequencyType = input.frequencyType
  if (input.weeklyDaysMask !== undefined) updates.weeklyDaysMask = input.weeklyDaysMask
  if (input.intervalDays !== undefined) updates.intervalDays = input.intervalDays
  if (input.timesPerPeriod !== undefined) updates.timesPerPeriod = input.timesPerPeriod
  if (input.periodDays !== undefined) updates.periodDays = input.periodDays
  if (input.targetValue !== undefined) updates.targetValue = input.targetValue
  if (input.targetUnit !== undefined) updates.targetUnit = input.targetUnit
  if (input.reminderTime !== undefined) updates.reminderTime = input.reminderTime
  if (input.reminderDaysMask !== undefined) updates.reminderDaysMask = input.reminderDaysMask
  if (input.status !== undefined) updates.status = input.status
  if (input.pausedUntil !== undefined) {
    updates.pausedUntil = input.pausedUntil
      ? new Date(
          Math.floor(input.pausedUntil / 10000),
          Math.floor((input.pausedUntil % 10000) / 100) - 1,
          input.pausedUntil % 100
        )
      : null
  }

  const [row] = await db
    .update(habits)
    .set(updates)
    .where(eq(habits.id, id))
    .returning()
  if (!row) throw new Error("habit not found")
  return row
}

export async function setHabitStatus(
  id: number,
  status: "active" | "paused" | "archived",
  pausedUntil?: number
): Promise<Habit> {
  return updateHabit(id, { status, pausedUntil: pausedUntil ?? null } as UpdateHabitInput)
}

export async function listHabits(filter?: {
  status?: "active" | "paused" | "archived"
  includeArchived?: boolean
}): Promise<HabitWithStreak[]> {
  const status = filter?.status
  const includeArchived = filter?.includeArchived ?? false
  const where =
    status
      ? eq(habits.status, status)
      : includeArchived
        ? undefined
        : or(
            eq(habits.status, "active"),
            eq(habits.status, "paused")
          )

  const rows = await db
    .select()
    .from(habits)
    .where(where as never)
    .orderBy(desc(habits.createdAt))

  const ids = rows.map((r) => r.id)
  const streaks =
    ids.length === 0
      ? []
      : await db.select().from(habitStreaks).where(inArray(habitStreaks.habitId, ids))

  const streakMap = new Map(streaks.map((s) => [s.habitId, s]))

  const today = todayDateKey()
  const todayCompletions =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(habitCompletions)
          .where(
            and(
              inArray(habitCompletions.habitId, ids),
              eq(habitCompletions.completedOn, today)
            )
          )
  const todayDone = new Set(todayCompletions.map((c) => c.habitId))

  return rows.map((h) => {
    const like = habitToLike(h)
    let todayStatus: HabitWithStreak["todayStatus"]
    if (h.status === "archived") todayStatus = "archived"
    else if (h.status === "paused") todayStatus = "paused"
    else if (!isHabitDueOn(like, today)) todayStatus = "not-due"
    else todayStatus = "due"

    return {
      ...h,
      streak: streakMap.get(h.id) ?? null,
      todayStatus,
      completedToday: todayDone.has(h.id),
    }
  })
}

export async function getHabit(id: number): Promise<HabitDetail | null> {
  const [row] = await db.select().from(habits).where(eq(habits.id, id)).limit(1)
  if (!row) return null

  const [streak] = await db
    .select()
    .from(habitStreaks)
    .where(eq(habitStreaks.habitId, id))
    .limit(1)

  const completions = await db
    .select()
    .from(habitCompletions)
    .where(eq(habitCompletions.habitId, id))
    .orderBy(desc(habitCompletions.completedOn))

  const today = todayDateKey()
  const like = habitToLike(row)
  let todayStatus: HabitWithStreak["todayStatus"]
  if (row.status === "archived") todayStatus = "archived"
  else if (row.status === "paused") todayStatus = "paused"
  else if (!isHabitDueOn(like, today)) todayStatus = "not-due"
  else todayStatus = "due"

  return {
    ...row,
    streak: streak ?? null,
    todayStatus,
    completedToday: completions.some((c) => c.completedOn === today),
    completions,
  }
}

export async function deleteHabit(id: number): Promise<void> {
  await db.delete(habits).where(eq(habits.id, id))
}

export async function listCompletionsInRange(
  habitId: number,
  fromKey: number,
  toKey: number
): Promise<HabitCompletion[]> {
  return db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        lte(habitCompletions.completedOn, toKey)
      )
    )
    .orderBy(asc(habitCompletions.completedOn))
    .then((rows) => rows.filter((r) => r.completedOn >= fromKey))
}