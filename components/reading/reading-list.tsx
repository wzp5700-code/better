"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingBlock } from "@/components/shared/loading-block"
import { BookCard } from "@/components/reading/book-card"
import { BookFormDialog } from "@/components/reading/book-form-dialog"
import { useBooksQuery, type BookRow } from "@/lib/queries/books"

export function ReadingList() {
  const { data, isLoading, error } = useBooksQuery()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<BookRow | null>(null)

  const books = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {books.length === 0 ? "" : `共 ${books.length} 本书`}
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4" /> 添加书籍
        </Button>
      </div>

      {isLoading ? (
        <LoadingBlock lines={3} />
      ) : error ? (
        <EmptyState title="加载失败" description={(error as Error).message} />
      ) : books.length === 0 ? (
        <EmptyState
          title="还没有书"
          description="添加一本想读或正在读的书吧。"
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> 添加书籍
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {books.map((b: BookRow) => (
            <BookCard
              key={b.id}
              book={b}
              onEdit={(it) => {
                setEditing(it)
                setOpen(true)
              }}
            />
          ))}
        </div>
      )}

      <BookFormDialog open={open} onOpenChange={setOpen} book={editing ?? undefined} />
    </div>
  )
}
