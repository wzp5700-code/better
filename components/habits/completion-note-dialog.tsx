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
import { Textarea } from "@/components/ui/textarea"
import {
  useToggleCompletionMutation,
  useUpsertCompletionMutation,
} from "@/lib/queries/habits"
import { formatDateKey } from "@/lib/dates"

export function CompletionNoteDialog({
  open,
  onOpenChange,
  habitId,
  habitName,
  dateKey,
  hasCompletion,
  existingValue,
  existingNote,
  isNumeric,
  targetValue,
  targetUnit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  habitId: number
  habitName: string
  dateKey: number
  hasCompletion: boolean
  existingValue: number
  existingNote: string | null
  isNumeric: boolean
  targetValue: number | null
  targetUnit: string | null
}) {
  const [value, setValue] = React.useState(String(existingValue || ""))
  const [note, setNote] = React.useState(existingNote ?? "")
  React.useEffect(() => {
    setValue(String(existingValue || ""))
    setNote(existingNote ?? "")
  }, [existingValue, existingNote, open])

  const upsert = useUpsertCompletionMutation()
  const toggle = useToggleCompletionMutation()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = value === "" ? 1 : Number(value)
    const res = await upsert.mutateAsync({
      habitId,
      completedOn: dateKey,
      value: v,
      note: note || undefined,
    })
    if (res.ok) {
      toast.success("已保存")
      onOpenChange(false)
    } else {
      toast.error(res.error)
    }
  }

  const onRemove = async () => {
    const res = await toggle.mutateAsync({
      habitId,
      completedOn: dateKey,
    })
    if (res.ok) {
      toast.success("已取消签到")
      onOpenChange(false)
    } else {
      toast.error(res.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{habitName}</DialogTitle>
          <DialogDescription>{formatDateKey(dateKey, "yyyy年M月d日")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {isNumeric ? (
            <div className="space-y-2">
              <Label htmlFor="value">
                数值
                {targetValue != null
                  ? ` (目标 ${targetValue}${targetUnit ? ` ${targetUnit}` : ""})`
                  : ""}
              </Label>
              <Input
                id="value"
                type="number"
                step="any"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="如 8"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              这是一个布尔型习惯。保存即视为完成。
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="note">备注（可选）</Label>
            <Textarea
              id="note"
              maxLength={400}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="今天的一点想法…"
            />
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            {hasCompletion ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onRemove}
                disabled={toggle.isPending}
                className="text-muted-foreground"
              >
                取消签到
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "保存中…" : "保存"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}