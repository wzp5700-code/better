import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  archiveCategoryAction,
  createCategoryAction,
  deleteCategoryAction,
  setCategoryForEntryAction,
  unarchiveCategoryAction,
  updateCategoryAction,
} from "@/lib/actions/journal-category-actions"
import type {
  CreateCategoryInput,
  SetCategoryForEntryInput,
  UpdateCategoryInput,
} from "@/lib/validation/journal-category"
import { apiFetch } from "@/lib/client/api"

export const categoryKeys = {
  all: ["journal-categories"] as const,
  list: (includeArchived?: boolean) =>
    ["journal-categories", "list", includeArchived ?? false] as const,
}

export interface CategoryWithCount {
  id: number
  name: string
  color: string | null
  sortOrder: number
  archived: boolean
  createdAt: Date | string
  updatedAt: Date | string
  entryCount: number
}

async function fetchCategories(includeArchived = false): Promise<CategoryWithCount[]> {
  const qs = includeArchived ? "?includeArchived=1" : ""
  const r = await apiFetch(`/api/journal/categories${qs}`, { cache: "no-store" })
  if (!r.ok) throw new Error(`fetch categories: ${r.status}`)
  return r.json()
}

export function useCategoriesQuery(includeArchived = false) {
  return useQuery({
    queryKey: categoryKeys.list(includeArchived),
    queryFn: () => fetchCategories(includeArchived),
  })
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategoryAction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useUpdateCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateCategoryInput }) =>
      updateCategoryAction(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useArchiveCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      archived ? archiveCategoryAction(id) : unarchiveCategoryAction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useDeleteCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCategoryAction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
      qc.invalidateQueries({ queryKey: ["journal"] })
    },
  })
}

export function useSetEntryCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SetCategoryForEntryInput) =>
      setCategoryForEntryAction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] })
    },
  })
}