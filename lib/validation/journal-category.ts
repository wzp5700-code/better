import { z } from "zod"

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export const createCategoryInput = z.object({
  name: z.string().min(1, "请填写分类名").max(40),
  color: z
    .string()
    .regex(HEX_COLOR, "颜色格式不正确")
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).max(999).optional(),
})

export const updateCategoryInput = z.object({
  name: z.string().min(1).max(40).optional(),
  color: z.string().regex(HEX_COLOR).optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  archived: z.boolean().optional(),
})

export const setCategoryForEntryInput = z.object({
  entryId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable(),
})

export type CreateCategoryInput = z.infer<typeof createCategoryInput>
export type UpdateCategoryInput = z.infer<typeof updateCategoryInput>
export type SetCategoryForEntryInput = z.infer<typeof setCategoryForEntryInput>