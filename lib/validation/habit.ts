import { z } from "zod"

import { fromDateKey, isValidDateKey, weekdayBit } from "@/lib/dates"

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const frequencyType = z.enum(["daily", "weekly", "interval"])

const baseHabitShape = {
  name: z.string().min(1, "请填写习惯名称").max(80),
  description: z.string().max(400).optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "颜色格式不正确")
    .optional()
    .nullable(),

  frequencyType,
  // Weekly: must contain at least one day. Bit0=Sun..Bit6=Sat.
  weeklyDaysMask: z.number().int().min(0).max(127).optional(),
  // Interval: 1..365 days.
  intervalDays: z.number().int().min(1).max(365).optional(),
  timesPerPeriod: z.number().int().min(1).max(100).optional(),
  periodDays: z.number().int().min(1).max(365).optional(),

  targetValue: z.number().positive().max(1_000_000).optional().nullable(),
  targetUnit: z.string().max(20).optional().nullable(),

  reminderTime: z.string().regex(HHMM).optional().nullable(),
  reminderDaysMask: z.number().int().min(0).max(127).optional(),

  startDate: z
    .number()
    .int()
    .refine(isValidDateKey, { message: "起始日期非法" })
    .optional(),
}

export const createHabitInput = z
  .object(baseHabitShape)
  .superRefine((val, ctx) => {
    if (val.frequencyType === "weekly") {
      if (!val.weeklyDaysMask || val.weeklyDaysMask === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "每周习惯至少选择一个执行日",
          path: ["weeklyDaysMask"],
        })
      }
    }
    if (val.frequencyType === "interval") {
      if (!val.intervalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "间隔习惯必须填写间隔天数",
          path: ["intervalDays"],
        })
      }
    }
  })

const updateShape = {
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(400).optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),

  frequencyType: frequencyType.optional(),
  weeklyDaysMask: z.number().int().min(0).max(127).optional(),
  intervalDays: z.number().int().min(1).max(365).optional(),
  timesPerPeriod: z.number().int().min(1).max(100).optional(),
  periodDays: z.number().int().min(1).max(365).optional(),

  targetValue: z.number().positive().max(1_000_000).optional().nullable(),
  targetUnit: z.string().max(20).optional().nullable(),

  reminderTime: z.string().regex(HHMM).optional().nullable(),
  reminderDaysMask: z.number().int().min(0).max(127).optional(),

  startDate: z
    .number()
    .int()
    .refine(isValidDateKey, { message: "起始日期非法" })
    .optional(),

  status: z.enum(["active", "paused", "archived"]).optional(),
  pausedUntil: z
    .number()
    .int()
    .refine(isValidDateKey, { message: "暂停日期非法" })
    .optional()
    .nullable(),
}

export const updateHabitInput = z.object(updateShape)

export const toggleCompletionInput = z.object({
  habitId: z.number().int().positive(),
  completedOn: z
    .number()
    .int()
    .refine(isValidDateKey, { message: "日期非法" }),
  value: z.number().min(0).max(1_000_000).optional(),
  note: z.string().max(400).optional().nullable(),
})

export const upsertCompletionInput = toggleCompletionInput

export type CreateHabitInput = z.infer<typeof createHabitInput>
export type UpdateHabitInput = z.infer<typeof updateHabitInput>
export type ToggleCompletionInput = z.infer<typeof toggleCompletionInput>
export type UpsertCompletionInput = z.infer<typeof upsertCompletionInput>

/**
 * Helper: build a weekly mask from a list of (Mon-first) weekday indices,
 * e.g. [0,2,4] → Mon, Wed, Fri.
 */
export function weeklyMaskFromMonFirstIndices(indices: number[]): number {
  let mask = 0
  for (const i of indices) {
    if (i < 0 || i > 6) continue
    const sunFirst = (i + 1) % 7 // Mon=1..Sun=0
    mask |= weekdayBit(sunFirst)
  }
  return mask
}

/**
 * Validate that a DateKey exists in a habit's weekly mask (or always for daily / interval).
 * Used at service layer for "is this date a due day?".
 */
export function isWeeklyDayInMask(mask: number, dateKey: number): boolean {
  const dow = fromDateKey(dateKey).getDay() // 0=Sun..6=Sat
  return (mask & (1 << dow)) !== 0
}