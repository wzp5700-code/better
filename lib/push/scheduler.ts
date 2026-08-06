import "server-only"

import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm"

import { db } from "@/db/client"
import { habits, pushDeliveryLog, pushTokens } from "@/db/schema"
import { logicalTodayKey } from "@/lib/dates"
import { sendFcmMessage } from "./fcm-server"

/**
 * Reminder scheduler. Runs every PUSH_CHECK_INTERVAL_MS (default 60s).
 *
 * Algorithm:
 *   1. Fetch all active habits with a non-null reminder_time.
 *   2. For each: check `currentLocalHHMM` matches `reminder_time`.
 *      If not, skip.
 *   3. Check today's weekday is in `reminder_days_mask` (mask=0 means
 *      "every day").
 *   4. Check `push_delivery_log` doesn't already have a row for
 *      (habit_id, today). The UNIQUE constraint also blocks duplicates
 *      at the DB level — we INSERT first, then send.
 *   5. Fetch active push tokens for the habit's owner's device.
 *      ("owner's device" — for MVP we send to every active token.)
 *   6. Send via FCM. Mark token revoked on UNREGISTERED.
 */

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function currentLocalHHMM(now: Date = new Date()): string {
  const h = String(now.getHours()).padStart(2, "0")
  const m = String(now.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

export function dayBitForDate(d: Date): number {
  // bit0=Sun..bit6=Sat
  return 1 << d.getDay()
}

/** Is `date` (a JS Date in user's local TZ) a "reminder day" for `mask`? */
export function isReminderDay(date: Date, mask: number): boolean {
  if (mask === 0) return true
  return (mask & dayBitForDate(date)) !== 0
}

export interface DueHabit {
  id: number
  name: string
  reminderTime: string
  reminderDaysMask: number
}

export interface DispatchResult {
  scanned: number
  sent: number
  failed: number
  tokensRevoked: number
}

/** Pure decision function: which habits are due right now? */
export function pickDueHabits(
  habits: DueHabit[],
  now: Date = new Date()
): DueHabit[] {
  const hhmm = currentLocalHHMM(now)
  return habits.filter((h) => h.reminderTime === hhmm)
}

/**
 * One scan + dispatch cycle. Returns counts.
 * Safe to call multiple times in parallel — idempotency is enforced by
 * the UNIQUE constraint on `push_delivery_log(habit_id, date_key)`.
 */
export async function dispatchOnce(now: Date = new Date()): Promise<DispatchResult> {
  if (!process.env.FCM_SERVICE_ACCOUNT_JSON_PATH) {
    // Not configured — no-op so dev without secrets works.
    return { scanned: 0, sent: 0, failed: 0, tokensRevoked: 0 }
  }

  // 1. load active habits with reminder time
  const habitRows = await db
    .select({
      id: habits.id,
      name: habits.name,
      status: habits.status,
      reminderTime: habits.reminderTime,
      reminderDaysMask: habits.reminderDaysMask,
    })
    .from(habits)
    .where(
      and(
        eq(habits.status, "active"),
        isNotNull(habits.reminderTime)
      )
    )

  const validHabits: DueHabit[] = habitRows
    .filter(
      (h): h is typeof h & { reminderTime: string } =>
        typeof h.reminderTime === "string" &&
        HHMM_RE.test(h.reminderTime) &&
        isReminderDay(now, h.reminderDaysMask)
    )
    .map((h) => ({
      id: h.id,
      name: h.name,
      reminderTime: h.reminderTime,
      reminderDaysMask: h.reminderDaysMask,
    }))

  // 2. filter to due-now
  const due = pickDueHabits(validHabits, now)
  if (due.length === 0) {
    return { scanned: validHabits.length, sent: 0, failed: 0, tokensRevoked: 0 }
  }

  const today = logicalTodayKey(now)
  let sent = 0
  let failed = 0
  let tokensRevoked = 0

  // 3. for each due habit, send to all active FCM tokens
  for (const habit of due) {
    const tokens = await db
      .select()
      .from(pushTokens)
      .where(
        and(
          eq(pushTokens.provider, "fcm"),
          isNull(pushTokens.revokedAt)
        )
      )

    for (const token of tokens) {
      // idempotency check first
      const already = await db
        .select({ id: pushDeliveryLog.id })
        .from(pushDeliveryLog)
        .where(
          and(
            eq(pushDeliveryLog.habitId, habit.id),
            eq(pushDeliveryLog.pushTokenId, token.id),
            eq(pushDeliveryLog.dateKey, today)
          )
        )
        .limit(1)

      if (already.length > 0) continue

      // insert log row first; on UNIQUE collision another worker beat us
      try {
        await db.insert(pushDeliveryLog).values({
          habitId: habit.id,
          pushTokenId: token.id,
          dateKey: today,
          status: "sent",
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (/UNIQUE/i.test(msg)) continue
        // unexpected — record as failure and continue
        await db
          .insert(pushDeliveryLog)
          .values({
            habitId: habit.id,
            pushTokenId: token.id,
            dateKey: today,
            status: "failed",
            errorMessage: msg.slice(0, 200),
          })
          .onConflictDoNothing()
        failed += 1
        continue
      }

      const result = await sendFcmMessage({
        token: token.token,
        title: habit.name,
        body: "该打卡了。",
        data: { habitId: String(habit.id) },
      })

      if (result.ok) {
        sent += 1
      } else {
        failed += 1
        if (result.tokenInvalid) {
          await db
            .update(pushTokens)
            .set({ revokedAt: new Date() })
            .where(eq(pushTokens.id, token.id))
          tokensRevoked += 1
        }
        // mark the log row as failed
        await db
          .update(pushDeliveryLog)
          .set({
            status: "failed",
            errorMessage: result.error?.slice(0, 200) ?? null,
          })
          .where(
            and(
              eq(pushDeliveryLog.habitId, habit.id),
              eq(pushDeliveryLog.pushTokenId, token.id),
              eq(pushDeliveryLog.dateKey, today)
            )
          )
      }
    }
  }

  return { scanned: validHabits.length, sent, failed, tokensRevoked }
}

// Re-export utilities for testing
export { logicalTodayKey }

// Helper for cleaning old log entries (optional)
export async function pruneOldDeliveryLogs(keepDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - keepDays * 86_400_000)
  const cutoffKey =
    cutoff.getFullYear() * 10000 +
    (cutoff.getMonth() + 1) * 100 +
    cutoff.getDate()
  const result = await db
    .delete(pushDeliveryLog)
    .where(gt(pushDeliveryLog.dateKey, cutoffKey))
  return Number(
    (result as unknown as { rowsAffected?: number }).rowsAffected ?? 0
  )
}

// Keep sql import alive for future extensions
void sql