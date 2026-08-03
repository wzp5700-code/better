import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { habitCompletions, habitStreaks, habits } from "@/db/schema"
import { addDaysKey, fromDateKey, toDateKey } from "@/lib/dates"
import { isWeeklyDayInMask } from "@/lib/validation/habit"

export type FrequencyType = "daily" | "weekly" | "interval"
export interface HabitLike {
  id: number
  frequencyType: FrequencyType
  weeklyDaysMask: number
  intervalDays: number | null
  startDate: Date
  targetValue: number | null
  targetUnit: string | null
  status: "active" | "paused" | "archived"
  pausedUntil: Date | null
}

/** Is `dateKey` a day on which the habit is due? */
export function isHabitDueOn(habit: HabitLike, dateKey: number): boolean {
  if (habit.status !== "active") return false
  // pausedUntil = first day of pause (inclusive). Days on/after it are paused.
  if (habit.pausedUntil) {
    const pauseKey = toDateKey(habit.pausedUntil)
    if (dateKey >= pauseKey) return false
  }
  switch (habit.frequencyType) {
    case "daily":
      return true
    case "weekly":
      return isWeeklyDayInMask(habit.weeklyDaysMask, dateKey)
    case "interval": {
      const interval = habit.intervalDays ?? 0
      if (interval <= 0) return false
      const startKey = toDateKey(habit.startDate)
      const diff = Math.floor(
        (fromDateKey(dateKey).getTime() - fromDateKey(startKey).getTime()) /
          (24 * 3600 * 1000)
      )
      return diff >= 0 && diff % interval === 0
    }
  }
}

/** Whether the completion's `value` counts as "completed" for the habit. */
export function isCompletionCounted(habit: HabitLike, value: number): boolean {
  if (habit.targetValue == null) return value >= 1
  return value >= habit.targetValue
}

/**
 * Update habit_streaks.current_streak and last_check_on based on the latest
 * completion. Counts consecutive eligible days backwards from `referenceDate`.
 *
 * The strategy:
 *  1. Fetch distinct eligible completion dates (those whose value met target).
 *  2. Walk back from `referenceDate` (must itself be an eligible day; otherwise
 *     streak may have already ended — we still allow last_check_on = prev).
 */
export async function refreshCurrentStreak(
  habitId: number,
  referenceDate: number
): Promise<{
  current: number
  longest: number
  lastCheckOn: number | null
}> {
  const [habit] = await db
    .select()
    .from(habits)
    .where(eq(habits.id, habitId))
    .limit(1)
  if (!habit) {
    return { current: 0, longest: 0, lastCheckOn: null }
  }
  const habitLike: HabitLike = {
    id: habit.id,
    frequencyType: habit.frequencyType as FrequencyType,
    weeklyDaysMask: habit.weeklyDaysMask,
    intervalDays: habit.intervalDays,
    startDate: habit.startDate,
    targetValue: habit.targetValue,
    targetUnit: habit.targetUnit,
    status: habit.status as HabitLike["status"],
    pausedUntil: habit.pausedUntil,
  }

  const eligibleDates = await db
    .select({ d: habitCompletions.completedOn, v: habitCompletions.value })
    .from(habitCompletions)
    .where(eq(habitCompletions.habitId, habitId))

  const eligibleSet = new Set<number>()
  for (const row of eligibleDates) {
    if (isCompletionCounted(habitLike, row.v)) eligibleSet.add(row.d)
  }
  const allEligible = Array.from(eligibleSet).sort((a, b) => a - b)

  // current streak: walk back from referenceDate (or today-equivalent),
  // stepping through expected due days and counting consecutive hits.
  let current = 0
  let cursor = referenceDate
  let lastCheckOn: number | null = null
  // Cap walk to avoid runaway loops
  const maxSteps = 365 * 5
  let steps = 0
  while (steps < maxSteps) {
    if (isHabitDueOn(habitLike, cursor)) {
      if (eligibleSet.has(cursor)) {
        current += 1
        lastCheckOn = cursor
      } else {
        // current streak broken
        break
      }
    }
    cursor = addDaysKey(cursor, -1)
    steps += 1
    // stop once we've walked past the habit start date
    if (
      fromDateKey(cursor) <
      new Date(habitLike.startDate.getFullYear(), habitLike.startDate.getMonth(), habitLike.startDate.getDate())
    ) {
      break
    }
  }

  // longest streak: gaps-and-islands using DateKey arithmetic
  const longest = computeLongestStreak(habitLike, allEligible)

  await db
    .insert(habitStreaks)
    .values({
      habitId,
      currentStreak: current,
      longestStreak: longest,
      lastCheckOn,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: habitStreaks.habitId,
      set: {
        currentStreak: current,
        longestStreak: Math.max(longest, current),
        lastCheckOn,
        updatedAt: new Date(),
      },
    })

  return { current, longest, lastCheckOn }
}

/**
 * Gaps-and-islands longest streak over eligible completion dates,
 * counting only consecutive eligible due days.
 */
export function computeLongestStreak(
  habit: HabitLike,
  sortedDateKeys: number[]
): number {
  if (sortedDateKeys.length === 0) return 0
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const k of sortedDateKeys) {
    // skip completions on non-due days; they neither extend nor reset the streak
    if (!isHabitDueOn(habit, k)) continue
    if (prev == null) {
      run = 1
      prev = k
    } else {
      // walk forward from prev through due days until we reach k
      let expected = addDaysKey(prev, 1)
      while (!isHabitDueOn(habit, expected) && expected < k) {
        expected = addDaysKey(expected, 1)
      }
      if (expected === k) {
        run += 1
        prev = k
      } else {
        run = 1
        prev = k
      }
    }
    if (run > best) best = run
  }
  return best
}