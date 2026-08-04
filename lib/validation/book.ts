import { z } from "zod"

import { isValidDateKey } from "@/lib/dates"

export const createBookInput = z.object({
  name: z.string().min(1, "请填写书名").max(200),
  startDate: z
    .number()
    .int()
    .refine(isValidDateKey, { message: "开始日期非法" })
    .nullable()
    .optional(),
  progress: z.number().int().min(0).max(100).nullable().optional(),
  finishDate: z
    .number()
    .int()
    .refine(isValidDateKey, { message: "完成日期非法" })
    .nullable()
    .optional(),
})

export const updateBookInput = createBookInput.partial()

export type CreateBookInput = z.infer<typeof createBookInput>
export type UpdateBookInput = z.infer<typeof updateBookInput>
