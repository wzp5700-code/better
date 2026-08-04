"use client"

import * as React from "react"
import { toast } from "sonner"
import { CalendarIcon } from "lucide-react"

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  useCreateBookMutation,
  useUpdateBookMutation,
} from "@/lib/queries/books"
import { formatDateKey } from "@/lib/dates"
import { cn } from "@/lib/utils"

interface BookLike {
  id: number
  name: string
  startDate: number | null
  progress: number | null
  finishDate: number | null
}

function dateKeyToDate(key: number): Date {
  return new Date(Math.floor(key / 10000), Math.floor((key % 10000) / 100) - 1, key % 100)
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
              <Label>开始阅读</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? formatDateKey(startDate, "yyyy-MM-dd") : "未记录"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? dateKeyToDate(startDate) : undefined}
                    onSelect={(d) =>
                      setStartDate(
                        d ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() : null
                      )
                    }
                    footer={
                      <button
                        type="button"
                        className="w-full py-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setStartDate(null)}
                      >
                        清除日期
                      </button>
                    }
                  />
                </PopoverContent>
              </Popover>
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
            <Label>完成阅读</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !finishDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {finishDate ? formatDateKey(finishDate, "yyyy-MM-dd") : "未记录"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={finishDate ? dateKeyToDate(finishDate) : undefined}
                  onSelect={(d) =>
                    setFinishDate(
                      d ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() : null
                    )
                  }
                  footer={
                    <button
                      type="button"
                      className="w-full py-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setFinishDate(null)}
                    >
                      清除日期
                    </button>
                  }
                />
              </PopoverContent>
            </Popover>
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
