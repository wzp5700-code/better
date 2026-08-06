"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingBlock } from "@/components/shared/loading-block"
import { JournalEntryCard } from "@/components/journal/journal-entry-card"
import { JournalFilters } from "@/components/journal/journal-filters"
import { useJournalEntriesQuery } from "@/lib/queries/journal"
import { logicalTodayKey } from "@/lib/dates"

export function JournalTimeline({
  initialTag,
  initialQuery,
  initialCategoryId,
}: {
  initialTag?: string
  initialQuery?: string
  initialCategoryId?: number | null
}) {
  const { data, isLoading, error } = useJournalEntriesQuery({
    tag: initialTag || undefined,
    query: initialQuery || undefined,
    categoryId: initialCategoryId,
  })
  if (isLoading) return <LoadingBlock lines={4} />
  if (error) {
    return (
      <EmptyState
        title="加载失败"
        description={(error as Error).message}
      />
    )
  }
  const items = data?.items ?? []
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <JournalFilters />
        <Button asChild>
          <Link href={`/journal/new?date=${logicalTodayKey()}`}>
            <Plus className="h-4 w-4" /> 写日记
          </Link>
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="还没有日记"
          description="今天想留点什么吗？"
          action={
            <Button asChild>
              <Link href={`/journal/new?date=${logicalTodayKey()}`}>
                <Plus className="h-4 w-4" /> 写第一篇
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((it: {
            id: number
            entryDate: number
            snippet: string
            moodScore: number | null
            moodLabel: string | null
            tags: string[]
            category: { id: number; name: string; color: string | null } | null
          }) => (
            <JournalEntryCard key={it.id} entry={it} />
          ))}
        </div>
      )}
    </div>
  )
}