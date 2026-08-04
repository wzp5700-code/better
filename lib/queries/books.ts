import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createBookAction,
  deleteBookAction,
  updateBookAction,
} from "@/lib/actions/book-actions"
import type {
  CreateBookInput,
  UpdateBookInput,
} from "@/lib/validation/book"
import { apiFetch } from "@/lib/client/api"

export const bookKeys = {
  all: ["books"] as const,
}

export interface BookRow {
  id: number
  name: string
  startDate: number | null
  progress: number | null
  finishDate: number | null
  createdAt: string
  updatedAt: string
}

async function fetchBooks(): Promise<BookRow[]> {
  const r = await apiFetch("/api/books", { cache: "no-store" })
  if (!r.ok) throw new Error(`fetch books: ${r.status}`)
  return r.json()
}

export function useBooksQuery() {
  return useQuery({
    queryKey: bookKeys.all,
    queryFn: fetchBooks,
  })
}

export function useCreateBookMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBookInput) => createBookAction(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  })
}

export function useUpdateBookMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBookInput }) =>
      updateBookAction(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  })
}

export function useDeleteBookMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteBookAction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  })
}
