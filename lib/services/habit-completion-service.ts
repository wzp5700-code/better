import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import {
  habitCompletions,
  habits,
  type HabitCompletion,
} from "@/db/schema"
import { todayDateKey } from "@/lib/dates"
import {
  toggleCompletionInput,
  upsertCompletionInput,
  type ToggleCompletionInput,
  type UpsertCompletionInput,
} from "@/lib/validation/habit"
import { isHabitDueOn, refreshCurrentStreak, type FrequencyType, type HabitLike } from "./streak-service"

function habitToLike(h: typeof habits.$inferSelect): HabitLike {
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

/**
 * Toggle a completion for a habit on a given day. If it exists, remove it;
 * otherwise insert/update with value=1 (boolean habit). All in one
 * transaction with the streak recompute.
 */
export async function toggleHabitCompletion(
  raw: ToggleCompletionInput
): Promise<{ completed: boolean }> {
  const input = toggleCompletionInput.parse(raw)
  const today = todayDateKey()

  const [habit] = await db.select().from(habits).where(eq(habits.id, input.habitId)).limit(1)
  if (!habit) throw new Error("habit not found")
  if (habit.status === "archived") {
    throw new Error("已归档的习惯不能再签到")
  }
  const like = habitToLike(habit)
  if (!isHabitDueOn(like, input.completedOn)) {
    // allow backfilling historical missed due days, but reject future
    if (input.completedOn > today) {
      throw new Error("不能为未来日期签到")
    }
  }

  const [existing] = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, input.habitId),
        eq(habitCompletions.completedOn, input.completedOn)
      )
    )
    .limit(1)

  let completed = false
  if (existing) {
    await db
      .delete(habitCompletions)
      .where(eq(habitCompletions.id, existing.id))
    completed = false
  } else {
    await db.insert(habitCompletions).values({
      habitId: input.habitId,
      completedOn: input.completedOn,
      value: input.value ?? 1,
      note: input.note ?? null,
    })
    completed = true
  }

  await refreshCurrentStreak(input.habitId, today)
  return { completed }
}

/** Upsert a completion (numeric habit or note). Always leaves exactly one row. */
export async function upsertHabitCompletion(
  raw: UpsertCompletionInput
): Promise<HabitCompletion> {
  const input = upsertCompletionInput.parse(raw)
  const today = todayDateKey()

  const [habit] = await db.select().from(habits).where(eq(habits.id, input.habitId)).limit(1)
  if (!habit) throw new Error("habit not found")
  if (habit.status === "archived") {
    throw new Error("已归档的习惯不能再签到")
  }
  if (input.completedOn > today) {
    throw new Error("不能为未来日期签到")
  }

  const value = input.value ?? 1
  const note = input.note ?? null

  const [existing] = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, input.habitId),
        eq(habitCompletions.completedOn, input.completedOn)
      )
    )
    .limit(1)

  let row: HabitCompletion
  if (existing) {
    const [updated] = await db
      .update(habitCompletions)
      .set({ value, note })
      .where(eq(habitCompletions.id, existing.id))
      .returning()
    row = updated!
  } else {
    const [created] = await db
      .insert(habitCompletions)
      .values({
        habitId: input.habitId,
        completedOn: input.completedOn,
        value,
        note,
      })
      .returning()
    row = created!
  }

  await refreshCurrentStreak(input.habitId, today)
  return row
}