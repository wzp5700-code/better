"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatDateKey, todayDateKey } from "@/lib/dates"

interface Category {
  id: number
  name: string
  color: string | null
}

interface Entry {
  id: number
  entryDate: number
  snippet: string
  moodScore: number | null
  moodLabel: string | null
  tags: string[]
  category: Category | null
}

export function JournalEntryCard({ entry }: { entry: Entry }) {
  const isToday = entry.entryDate === todayDateKey()
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={`/journal/${entry.id}`}
            className="text-sm font-medium hover:underline"
          >
            {formatDateKey(entry.entryDate, "yyyy年M月d日")}
            {isToday ? (
              <span className="ml-2 text-xs text-muted-foreground">今天</span>
            ) : null}
          </Link>
          <div className="flex items-center gap-2">
            {entry.category ? (
              <Link
                href={`/journal?categoryId=${entry.category.id}`}
                className="text-xs"
              >
                <Badge
                  variant="outline"
                  className="font-normal hover:opacity-80"
                  style={
                    entry.category.color
                      ? {
                          borderColor: entry.category.color,
                          color: entry.category.color,
                        }
                      : undefined
                  }
                >
                  {entry.category.name}
                </Badge>
              </Link>
            ) : null}
            {entry.moodLabel ? (
              <Badge variant="outline" className="font-normal">
                {entry.moodLabel}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90">
          {entry.snippet || <span className="text-muted-foreground">（空白）</span>}
        </p>
        {entry.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((tag) => (
              <Link
                key={tag}
                href={`/journal?tag=${encodeURIComponent(tag)}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}