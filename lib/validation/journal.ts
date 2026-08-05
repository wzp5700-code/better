import { z } from "zod"

import { isValidDateKey } from "@/lib/dates"

export const MOOD_LABELS = ["低落", "偏低", "平静", "愉快", "很好"] as const
export type MoodLabel = (typeof MOOD_LABELS)[number]

export const moodScore = z
  .number()
  .int()
  .min(1)
  .max(5)
  .nullable()
  .optional()

export const moodLabel = z.enum(MOOD_LABELS).nullable().optional()

export const createJournalInput = z
  .object({
    entryDate: z
      .number()
      .int()
      .refine(isValidDateKey, { message: "日期非法" }),
    // TipTap JSON document (object). Service validates shape via isValidTipTapDoc.
    content: z.any(),
    moodScore,
    moodLabel,
    categoryId: z.number().int().positive().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const scoreNull = val.moodScore === null || val.moodScore === undefined
    const labelNull = val.moodLabel === null || val.moodLabel === undefined
    if (scoreNull !== labelNull) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "心情分数与标签必须同时设置或同时省略",
        path: ["moodScore"],
      })
    }
    if (!scoreNull && val.moodLabel !== null && val.moodLabel !== undefined) {
      const expectedLabel = MOOD_LABELS[(val.moodScore ?? 1) - 1]
      if (val.moodLabel !== expectedLabel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "心情分数与标签映射不一致",
          path: ["moodLabel"],
        })
      }
    }
  })

export const updateJournalInput = z.object({
  id: z.number().int().positive(),
  entryDate: z
    .number()
    .int()
    .refine(isValidDateKey, { message: "日期非法" })
    .optional(),
  content: z.any().optional(),
  moodScore,
  moodLabel,
  categoryId: z.number().int().positive().nullable().optional(),
})

export type CreateJournalInput = z.infer<typeof createJournalInput>
export type UpdateJournalInput = z.infer<typeof updateJournalInput>

export function moodLabelForScore(score: number): MoodLabel {
  if (score < 1 || score > 5) {
    throw new Error(`mood score out of range: ${score}`)
  }
  return MOOD_LABELS[score - 1]
}