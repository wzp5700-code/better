import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createJournalAction,
  deleteJournalAction,
  updateJournalAction,
} from "@/lib/actions/journal-actions"
import type {
  CreateJournalInput,
  UpdateJournalInput,
} from "@/lib/validation/journal"
import { apiFetch } from "@/lib/client/api"

export const journalKeys = {
  all: ["journal"] as const,
  list: (filter?: {
    from?: number
    to?: number
    tag?: string
    query?: string
    categoryId?: number | null
  }) => ["journal", "list", filter ?? {}] as const,
  detail: (id: number) => ["journal", "detail", id] as const,
  tags: ["journal", "tags"] as const,
}

async function fetchEntries(
  filter: {
    from?: number
    to?: number
    tag?: string
    query?: string
    cursor?: number
    limit?: number
    categoryId?: number | null
  } = {}
): Promise<{
  items: Array<{
    id: number
    entryDate: number
    snippet: string
    moodScore: number | null
    moodLabel: string | null
    tags: string[]
    category: { id: number; name: string; color: string | null } | null
  }>
  nextCursor: number | null
}> {
  const params = new URLSearchParams()
  if (filter.from != null) params.set("from", String(filter.from))
  if (filter.to != null) params.set("to", String(filter.to))
  if (filter.tag) params.set("tag", filter.tag)
  if (filter.query) params.set("q", filter.query)
  if (filter.cursor != null) params.set("cursor", String(filter.cursor))
  if (filter.limit != null) params.set("limit", String(filter.limit))
  if (filter.categoryId !== undefined) {
    params.set("categoryId", filter.categoryId == null ? "null" : String(filter.categoryId))
  }
  const r = await apiFetch(`/api/journal?${params.toString()}`, { cache: "no-store" })
  if (!r.ok) throw new Error(`fetch journal: ${r.status}`)
  return r.json()
}

export function useJournalEntriesQuery(filter?: {
  from?: number
  to?: number
  tag?: string
  query?: string
  categoryId?: number | null
}) {
  return useQuery({
    queryKey: journalKeys.list(filter),
    queryFn: () => fetchEntries(filter ?? {}),
  })
}

export function useJournalEntryQuery(id: number) {
  return useQuery({
    queryKey: journalKeys.detail(id),
    queryFn: async () => {
      const r = await apiFetch(`/api/journal/${id}`, { cache: "no-store" })
      if (r.status === 404) return null
      if (!r.ok) throw new Error(`fetch journal: ${r.status}`)
      return r.json()
    },
    enabled: Number.isInteger(id) && id > 0,
  })
}

async function fetchTags(): Promise<Array<{ tag: string; count: number }>> {
  // for MVP we read tags from list with limit=large, fallback to []
  const r = await apiFetch(`/api/journal?limit=100`, { cache: "no-store" })
  if (!r.ok) return []
  const data = (await r.json()) as { items: Array<{ tags: string[] }> }
  const counts = new Map<string, number>()
  for (const item of data.items) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

export function useJournalTagsQuery() {
  return useQuery({
    queryKey: journalKeys.tags,
    queryFn: fetchTags,
    staleTime: 60_000,
  })
}

export function useCreateJournalMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateJournalInput) => createJournalAction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all })
    },
  })
}

export function useUpdateJournalMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateJournalInput) => updateJournalAction(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: journalKeys.all })
      qc.invalidateQueries({ queryKey: journalKeys.detail(vars.id) })
    },
  })
}

export function useDeleteJournalMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteJournalAction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all })
    },
  })
}