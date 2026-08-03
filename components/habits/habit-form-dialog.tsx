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
import { FrequencyFields, type FrequencyForm } from "@/components/habits/frequency-fields"
import {
  useCreateHabitMutation,
  useUpdateHabitMutation,
} from "@/lib/queries/habits"
import type { Habit } from "@/db/schema"

interface FormState {
  name: string
  description: string
  color: string
  targetValue: string
  targetUnit: string
  frequency: FrequencyForm
}

const emptyForm: FormState = {
  name: "",
  description: "",
  color: "",
  targetValue: "",
  targetUnit: "",
  frequency: {
    frequencyType: "daily",
    weeklyDaysMask: 0,
    intervalDays: 0,
    timesPerPeriod: null,
    periodDays: null,
  },
}

function habitToForm(h: Habit): FormState {
  return {
    name: h.name,
    description: h.description ?? "",
    color: h.color ?? "",
    targetValue: h.targetValue != null ? String(h.targetValue) : "",
    targetUnit: h.targetUnit ?? "",
    frequency: {
      frequencyType: h.frequencyType as FrequencyForm["frequencyType"],
      weeklyDaysMask: h.weeklyDaysMask,
      intervalDays: h.intervalDays ?? 0,
      timesPerPeriod: h.timesPerPeriod,
      periodDays: h.periodDays,
    },
  }
}

export function HabitFormDialog({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  habit?: Habit
}) {
  const [form, setForm] = React.useState<FormState>(
    habit ? habitToForm(habit) : emptyForm
  )
  React.useEffect(() => {
    setForm(habit ? habitToForm(habit) : emptyForm)
  }, [habit, open])

  const create = useCreateHabitMutation()
  const update = useUpdateHabitMutation()
  const isEditing = !!habit
  const busy = create.isPending || update.isPending

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const base = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color || null,
    }
    const freq = {
      frequencyType: form.frequency.frequencyType,
      weeklyDaysMask:
        form.frequency.frequencyType === "weekly"
          ? form.frequency.weeklyDaysMask
          : 0,
      intervalDays:
        form.frequency.frequencyType === "interval" && form.frequency.intervalDays > 0
          ? form.frequency.intervalDays
          : undefined,
    }
    const numeric = {
      targetValue: form.targetValue ? Number(form.targetValue) : null,
      targetUnit: form.targetUnit || null,
    }
    const payload = { ...base, ...freq, ...numeric }

    if (isEditing && habit) {
      const res = await update.mutateAsync({ id: habit.id, input: payload })
      if (res.ok) {
        toast.success("已保存")
        onOpenChange(false)
      } else {
        toast.error(res.error)
      }
    } else {
      const res = await create.mutateAsync(payload)
      if (res.ok) {
        toast.success("已创建")
        onOpenChange(false)
      } else {
        toast.error(res.error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑习惯" : "新建习惯"}</DialogTitle>
          <DialogDescription>
            把它做成一个安静的小动作。不要给自己立军令状。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="habit-name">名称</Label>
            <Input
              id="habit-name"
              required
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：静坐、阅读、跑步"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="habit-desc">备注（可选）</Label>
            <Textarea
              id="habit-desc"
              maxLength={400}
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="给自己一句提醒"
            />
          </div>

          <FrequencyFields
            value={form.frequency}
            onChange={(v) => setForm({ ...form, frequency: v })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target-value">数值型目标（可选）</Label>
              <Input
                id="target-value"
                type="number"
                min={0}
                step="any"
                value={form.targetValue}
                onChange={(e) =>
                  setForm({ ...form, targetValue: e.target.value })
                }
                placeholder="如 8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-unit">单位</Label>
              <Input
                id="target-unit"
                maxLength={20}
                value={form.targetUnit}
                onChange={(e) =>
                  setForm({ ...form, targetUnit: e.target.value })
                }
                placeholder="如 杯"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="habit-color">主题色（可选，HEX）</Label>
            <Input
              id="habit-color"
              pattern="^#[0-9a-fA-F]{6}$"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="#6b7c93"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "保存中…" : isEditing ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}