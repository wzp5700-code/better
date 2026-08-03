"use server"

import { revalidatePath } from "next/cache"

import {
  createHabit as createHabitService,
  deleteHabit as deleteHabitService,
  setHabitStatus as setHabitStatusService,
  updateHabit as updateHabitService,
} from "@/lib/services/habit-service"
import {
  toggleCompletionInput,
  upsertCompletionInput,
  type CreateHabitInput,
  type ToggleCompletionInput,
  type UpdateHabitInput,
  type UpsertCompletionInput,
} from "@/lib/validation/habit"
import {
  toggleHabitCompletion,
  upsertHabitCompletion,
} from "@/lib/services/habit-completion-service"

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createHabitAction(
  input: CreateHabitInput
): Promise<ActionResult<{ id: number }>> {
  try {
    const row = await createHabitService(input)
    revalidatePath("/habits")
    revalidatePath("/")
    return { ok: true, data: { id: row.id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function updateHabitAction(
  id: number,
  input: UpdateHabitInput
): Promise<ActionResult<{ id: number }>> {
  try {
    const row = await updateHabitService(id, input)
    revalidatePath("/habits")
    revalidatePath(`/habits/${id}`)
    revalidatePath("/")
    return { ok: true, data: { id: row.id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function setHabitStatusAction(
  id: number,
  status: "active" | "paused" | "archived",
  pausedUntil?: number
): Promise<ActionResult<{ id: number }>> {
  try {
    await setHabitStatusService(id, status, pausedUntil)
    revalidatePath("/habits")
    revalidatePath(`/habits/${id}`)
    revalidatePath("/")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function deleteHabitAction(
  id: number
): Promise<ActionResult<{ id: number }>> {
  try {
    await deleteHabitService(id)
    revalidatePath("/habits")
    revalidatePath("/")
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function toggleCompletionAction(
  input: ToggleCompletionInput
): Promise<ActionResult<{ completed: boolean }>> {
  try {
    const parsed = toggleCompletionInput.parse(input)
    const result = await toggleHabitCompletion(parsed)
    revalidatePath("/habits")
    revalidatePath(`/habits/${parsed.habitId}`)
    revalidatePath("/")
    return { ok: true, data: { completed: result.completed } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}

export async function upsertCompletionAction(
  input: UpsertCompletionInput
): Promise<ActionResult<{ habitId: number; completedOn: number }>> {
  try {
    const parsed = upsertCompletionInput.parse(input)
    const row = await upsertHabitCompletion(parsed)
    revalidatePath("/habits")
    revalidatePath(`/habits/${parsed.habitId}`)
    revalidatePath("/")
    return { ok: true, data: { habitId: row.habitId, completedOn: row.completedOn } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "未知错误" }
  }
}