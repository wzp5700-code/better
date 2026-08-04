"use client"

import * as React from "react"
import { toast } from "sonner"
import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  useDeleteBookMutation,
  type BookRow,
} from "@/lib/queries/books"
import { formatDateKey } from "@/lib/dates"

export function BookCard({
  book,
  onEdit,
}: {
  book: BookRow
  onEdit: (b: BookRow) => void
}) {
  const del = useDeleteBookMutation()
  const progress = book.progress ?? 0
  const done = book.finishDate != null

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{book.name}</span>
              {done ? (
                <Badge variant="secondary" className="font-normal">
                  已读完
                </Badge>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {book.startDate ? (
                <span>开始 {formatDateKey(book.startDate, "yyyy年M月d日")}</span>
              ) : null}
              {book.finishDate ? (
                <span>完成 {formatDateKey(book.finishDate, "yyyy年M月d日")}</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(book)}
              aria-label="编辑"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!window.confirm(`删除「${book.name}」？`)) return
                const res = await del.mutateAsync(book.id)
                if (res.ok) toast.success("已删除")
                else toast.error(res.error)
              }}
              aria-label="删除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">进度</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
