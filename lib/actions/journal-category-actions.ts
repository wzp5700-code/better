"use server"

import { revalidatePath } from "next/cache"

import {
  archiveCategory,
  createCategory,
  deleteCategory,
  setCategoryForEntry,
  unarchiveCategory,
  updateCategory,
} from "@/lib/services/journal-category-service"
import type {
  CreateCategoryInput,
  SetCategoryForEntryInput,
  UpdateCategoryInput,
} from "@/lib/validation/journal-category"

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createCategoryAction(
  input: CreateCategoryInput
): Promise<ActionResult<{ id: number }>> {
  try {
    const row = await createCategory(input)
    revalidatePath("/categories")
    revalidatePath("/journal")
    return { ok: true, data: { id: row.id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function updateCategoryAction(
  id: number,
  input: UpdateCategoryInput
): Promise<ActionResult<{ id: number }>> {
  try {
    await updateCategory(id, input)
    revalidatePath("/categories")
    revalidatePath("/journal")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function archiveCategoryAction(
  id: number
): Promise<ActionResult<{ id: number }>> {
  try {
    await archiveCategory(id)
    revalidatePath("/categories")
    revalidatePath("/journal")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function unarchiveCategoryAction(
  id: number
): Promise<ActionResult<{ id: number }>> {
  try {
    await unarchiveCategory(id)
    revalidatePath("/categories")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function deleteCategoryAction(
  id: number
): Promise<ActionResult<{ id: number }>> {
  try {
    await deleteCategory(id)
    revalidatePath("/categories")
    revalidatePath("/journal")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function setCategoryForEntryAction(
  input: SetCategoryForEntryInput
): Promise<ActionResult<{ entryId: number; categoryId: number | null }>> {
  try {
    const r = await setCategoryForEntry(input)
    revalidatePath(`/journal/${r.entryId}`)
    revalidatePath("/journal")
    return { ok: true, data: r }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}