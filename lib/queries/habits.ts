import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createHabitAction,
  deleteHabitAction,
  setHabitStatusAction,
  toggleCompletionAction,
  updateHabitAction,
  upsertCompletionAction,
} from "@/lib/actions/habit-actions"
import type {
  CreateHabitInput,
  ToggleCompletionInput,
  UpdateHabitInput,
  UpsertCompletionInput,
} from "@/lib/validation/habit"
import { apiFetch } from "@/lib/client/api"

export const habitKeys = {
  all: ["habits"] as const,
  list: (filter?: { status?: string; includeArchived?: boolean }) =>
    ["habits", "list", filter ?? {}] as const,
  detail: (id: number) => ["habits", "detail", id] as const,
  completions: (habitId: number, from: number, to: number) =>
    ["habits", "completions", habitId, from, to] as const,
}

async function fetchHabits(
  filter?: { status?: "active" | "paused" | "archived"; includeArchived?: boolean }
): Promise<unknown[]> {
  const params = new URLSearchParams()
  if (filter?.status) params.set("status", filter.status)
  if (filter?.includeArchived) params.set("includeArchived", "1")
  const qs = params.toString()
  const r = await apiFetch(`/api/habits${qs ? `?${qs}` : ""}`, { cache: "no-store" })
  if (!r.ok) throw new Error(`fetch habits: ${r.status}`)
  return r.json()
}

export function useHabitsQuery(filter?: {
  status?: "active" | "paused" | "archived"
  includeArchived?: boolean
}) {
  return useQuery({
    queryKey: habitKeys.list(filter),
    queryFn: () => fetchHabits(filter),
  })
}

async function fetchHabit(id: number): Promise<unknown | null> {
  const r = await apiFetch(`/api/habits/${id}`, { cache: "no-store" })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`fetch habit: ${r.status}`)
  return r.json()
}

export function useHabitQuery(id: number) {
  return useQuery({
    queryKey: habitKeys.detail(id),
    queryFn: () => fetchHabit(id),
    enabled: Number.isInteger(id) && id > 0,
  })
}

async function fetchCompletions(
  habitId: number,
  from: number,
  to: number
): Promise<unknown[]> {
  const r = await apiFetch(
    `/api/habits/${habitId}/completions?from=${from}&to=${to}`,
    { cache: "no-store" }
  )
  if (!r.ok) throw new Error(`fetch completions: ${r.status}`)
  return r.json()
}

export function useHabitCompletionsQuery(
  habitId: number,
  from: number,
  to: number
) {
  return useQuery({
    queryKey: habitKeys.completions(habitId, from, to),
    queryFn: () => fetchCompletions(habitId, from, to),
    enabled: Number.isInteger(habitId) && habitId > 0,
  })
}

export function useCreateHabitMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHabitInput) => createHabitAction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitKeys.all })
    },
  })
}

export function useUpdateHabitMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateHabitInput }) =>
      updateHabitAction(id, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: habitKeys.all })
      qc.invalidateQueries({ queryKey: habitKeys.detail(vars.id) })
    },
  })
}

export function useSetHabitStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      pausedUntil,
    }: {
      id: number
      status: "active" | "paused" | "archived"
      pausedUntil?: number
    }) => setHabitStatusAction(id, status, pausedUntil),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitKeys.all })
    },
  })
}

export function useDeleteHabitMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteHabitAction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitKeys.all })
    },
  })
}

export function useToggleCompletionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ToggleCompletionInput) => toggleCompletionAction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitKeys.all })
    },
  })
}

export function useUpsertCompletionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertCompletionInput) => upsertCompletionAction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitKeys.all })
    },
  })
}