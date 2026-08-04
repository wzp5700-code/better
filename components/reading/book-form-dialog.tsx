"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useCreateBookMutation,
  useUpdateBookMutation,
} from "@/lib/queries/books"
import { isValidDateKey } from "@/lib/dates"

interface BookLike {
  id: number
  name: string
  startDate: number | null
  progress: number | null
  finishDate: number | null
}

/** DateKey (YYYYMMDD) <-> "YYYY-MM-DD" string for <input type="date"> */
function keyToInput(key: number | null): string {
  if (key == null) return ""
  const y = Math.floor(key / 10000)
  const m = Math.floor((key % 10000) / 100)
  const d = key % 100
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function inputToKey(value: string): number | null {
  if (!value) return null
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return null
  const key = y * 10000 + m * 100 + d
  return isValidDateKey(key) ? key : null
}

export function BookFormDialog({
  open,
  onOpenChange,
  book,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  book?: BookLike
}) {
  const [name, setName] = React.useState("")
  const [startDate, setStartDate] = React.useState<number | null>(null)
  const [progress, setProgress] = React.useState<string>("")
  const [finishDate, setFinishDate] = React.useState<number | null>(null)

  React.useEffect(() => {
    setName(book?.name ?? "")
    setStartDate(book?.startDate ?? null)
    setProgress(book?.progress != null ? String(book.progress) : "")
    setFinishDate(book?.finishDate ?? null)
  }, [book, open])

  const create = useCreateBookMutation()
  const update = useUpdateBookMutation()
  const isEditing = !!book
  const busy = create.isPending || update.isPending

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("请填写书名")
      return
    }
    const payload = {
      name: name.trim(),
      startDate,
      progress: progress === "" ? null : Number(progress),
      finishDate,
    }
    if (isEditing && book) {
      const res = await update.mutateAsync({ id: book.id, input: payload })
      if (res.ok) {
        toast.success("已保存")
        onOpenChange(false)
      } else {
        toast.error(res.error)
      }
    } else {
      const res = await create.mutateAsync(payload)
      if (res.ok) {
        toast.success("已添加")
        onOpenChange(false)
      } else {
        toast.error(res.error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑书籍" : "添加书籍"}</DialogTitle>
          <DialogDescription>记录一本书的阅读进度。</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="book-name">书名</Label>
            <Input
              id="book-name"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="书名"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="book-start">开始阅读时间</Label>
              <Input
                id="book-start"
                type="date"
                value={keyToInput(startDate)}
                onChange={(e) => setStartDate(inputToKey(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="book-progress">进度（%）</Label>
              <Input
                id="book-progress"
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                placeholder="0-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-finish">完成阅读时间</Label>
            <Input
              id="book-finish"
              type="date"
              value={keyToInput(finishDate)}
              onChange={(e) => setFinishDate(inputToKey(e.target.value))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "保存中…" : isEditing ? "保存" : "添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
