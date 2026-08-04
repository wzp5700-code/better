"use server"

import { revalidatePath } from "next/cache"

import {
  createBook,
  deleteBook,
  updateBook,
} from "@/lib/services/book-service"
import type { CreateBookInput, UpdateBookInput } from "@/lib/validation/book"

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createBookAction(
  input: CreateBookInput
): Promise<ActionResult<{ id: number }>> {
  try {
    const row = await createBook(input)
    revalidatePath("/reading")
    return { ok: true, data: { id: row.id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function updateBookAction(
  id: number,
  input: UpdateBookInput
): Promise<ActionResult<{ id: number }>> {
  try {
    await updateBook(id, input)
    revalidatePath("/reading")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function deleteBookAction(
  id: number
): Promise<ActionResult<{ id: number }>> {
  try {
    await deleteBook(id)
    revalidatePath("/reading")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}
