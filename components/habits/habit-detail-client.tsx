"use client"

import * as React from "react"
import { toast } from "sonner"
import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingBlock } from "@/components/shared/loading-block"
import { CompletionNoteDialog } from "@/components/habits/completion-note-dialog"
import { HabitFormDialog } from "@/components/habits/habit-form-dialog"
import { HabitHeatmap } from "@/components/habits/habit-heatmap"
import { StreakSummary } from "@/components/habits/streak-summary"
import {
  useHabitCompletionsQuery,
  useHabitQuery,
} from "@/lib/queries/habits"
import { addDaysKey, formatDateKey, logicalTodayKey, WEEKDAY_LABELS_CN_SUN_FIRST } from "@/lib/dates"
import type { Habit } from "@/db/schema"

function describeFrequency(h: Habit): string {
  if (h.frequencyType === "daily") return "每日"
  if (h.frequencyType === "weekly") {
    const bits = h.weeklyDaysMask
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      if (bits & (1 << i)) days.push(WEEKDAY_LABELS_CN_SUN_FIRST[i]!)
    }
    return `每周 · ${days.join("、")}`
  }
  return `每 ${h.intervalDays ?? "?"} 天`
}

export function HabitDetailClient({ habitId }: { habitId: number }) {
  const habitQuery = useHabitQuery(habitId)
  const today = React.useMemo(() => logicalTodayKey(), [])
  const from = React.useMemo(() => addDaysKey(today, -364), [today])
  const completionsQuery = useHabitCompletionsQuery(habitId, from, today)

  const [editing, setEditing] = React.useState(false)
  const [cellDate, setCellDate] = React.useState<number | null>(null)

  if (habitQuery.isLoading) return <LoadingBlock lines={3} />
  if (habitQuery.error) {
    return <EmptyState title="加载失败" description={(habitQuery.error as Error).message} />
  }
  if (!habitQuery.data) {
    notFound()
  }

  const habit = habitQuery.data as Habit & {
    streak: { currentStreak: number; longestStreak: number } | null
    todayStatus: "due" | "not-due" | "paused" | "archived"
    completedToday: boolean
    completions: { completedOn: number; value: number; note: string | null }[]
  }

  const completions = completionsQuery.data as
    | { completedOn: number; value: number; note: string | null }[]
    | undefined

  const cellCompletion = cellDate
    ? (completions ?? habit.completions).find((c) => c.completedOn === cellDate)
    : undefined

  const isNumeric = habit.targetValue != null
  const totalValue = (completions ?? habit.completions).reduce(
    (s, c) => s + c.value,
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{habit.name}</h1>
            {habit.status === "archived" ? (
              <Badge variant="outline">已归档</Badge>
            ) : habit.status === "paused" ? (
              <Badge variant="secondary">暂停</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{describeFrequency(habit)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" /> 编辑
        </Button>
      </div>

      {habit.description ? (
        <p className="text-sm text-muted-foreground">{habit.description}</p>
      ) : null}

      <StreakSummary
        current={habit.streak?.currentStreak ?? 0}
        longest={habit.streak?.longestStreak ?? 0}
        totalCompletions={isNumeric ? Math.round(totalValue) : (completions ?? habit.completions).length}
        unit={isNumeric ? habit.targetUnit : null}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">近一年</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitHeatmap
            habitId={habit.id}
            targetValue={habit.targetValue}
            completions={completions ?? habit.completions}
            onCellClick={(dateKey) => {
              if (dateKey > today) {
                toast.error("不能为未来日期签到")
                return
              }
              setCellDate(dateKey)
            }}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            点击任意一天可查看或修改。每次点击深色 = 达标。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">最近记录</CardTitle>
        </CardHeader>
        <CardContent>
          {(completions ?? habit.completions).length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有记录。</p>
          ) : (
            <ul className="divide-y" role="list">
              {(completions ?? habit.completions)
                .slice()
                .sort((a, b) => b.completedOn - a.completedOn)
                .slice(0, 30)
                .map((c) => (
                  <li
                    key={c.completedOn}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>{formatDateKey(c.completedOn, "yyyy年M月d日")}</span>
                    <span className="flex items-center gap-3 text-muted-foreground">
                      {isNumeric ? (
                        <span className="tabular-nums">
                          {c.value}
                          {habit.targetUnit ? ` ${habit.targetUnit}` : ""}
                          {habit.targetValue != null
                            ? c.value >= habit.targetValue
                              ? " · 达标"
                              : ""
                            : ""}
                        </span>
                      ) : (
                        <span>完成</span>
                      )}
                      {c.note ? (
                        <span className="max-w-[280px] truncate" title={c.note}>
                          {c.note}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <HabitFormDialog
        open={editing}
        onOpenChange={setEditing}
        habit={habit}
      />

      {cellDate != null ? (
        <CompletionNoteDialog
          open
          onOpenChange={(v) => {
            if (!v) setCellDate(null)
          }}
          habitId={habit.id}
          habitName={habit.name}
          dateKey={cellDate}
          hasCompletion={!!cellCompletion}
          existingValue={cellCompletion?.value ?? 0}
          existingNote={cellCompletion?.note ?? null}
          isNumeric={isNumeric}
          targetValue={habit.targetValue}
          targetUnit={habit.targetUnit}
        />
      ) : null}
    </div>
  )
}