"use server"

import { revalidatePath } from "next/cache"

import {
  createJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
} from "@/lib/services/journal-service"
import type {
  CreateJournalInput,
  UpdateJournalInput,
} from "@/lib/validation/journal"

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createJournalAction(
  input: CreateJournalInput
): Promise<ActionResult<{ id: number }>> {
  try {
    const row = await createJournalEntry(input)
    revalidatePath("/journal")
    revalidatePath(`/journal/${row.id}`)
    revalidatePath("/")
    return { ok: true, data: { id: row.id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function updateJournalAction(
  input: UpdateJournalInput
): Promise<ActionResult<{ id: number }>> {
  try {
    const row = await updateJournalEntry(input.id, input)
    revalidatePath("/journal")
    revalidatePath(`/journal/${row.id}`)
    return { ok: true, data: { id: row.id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function deleteJournalAction(
  id: number
): Promise<ActionResult<{ id: number }>> {
  try {
    await deleteJournalEntry(id)
    revalidatePath("/journal")
    revalidatePath("/")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}