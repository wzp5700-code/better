"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Check, Circle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingBlock } from "@/components/shared/loading-block"
import {
  useHabitsQuery,
  useToggleCompletionMutation,
} from "@/lib/queries/habits"
import { todayDateKey } from "@/lib/dates"
import type { HabitWithStreak } from "@/lib/services/habit-service"

export function TodayHabitList() {
  const today = React.useMemo(() => todayDateKey(), [])
  const { data, isLoading, error } = useHabitsQuery({ status: "active" })
  const toggle = useToggleCompletionMutation()
  const items = (data ?? []) as HabitWithStreak[]
  const due = items.filter((h) => h.todayStatus === "due")

  if (isLoading) return <LoadingBlock lines={3} />
  if (error) {
    return <EmptyState title="加载失败" description={(error as Error).message} />
  }
  if (due.length === 0) {
    return (
      <EmptyState
        title="今日没有安排"
        description={
          items.length === 0
            ? "先去习惯页建一个吧。"
            : "今天的练习都完成了 — 或者今天本来就不是执行日。"
        }
        action={
          items.length === 0 ? (
            <Button asChild>
              <Link href="/habits">去新建</Link>
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <ul className="space-y-2" role="list" aria-label="今日待办习惯">
      {due.map((h) => {
        const completed = h.completedToday
        return (
          <li key={h.id}>
            <Card>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{h.name}</span>
                    {h.targetValue != null ? (
                      <span className="text-xs text-muted-foreground">
                        目标 {h.targetValue}
                        {h.targetUnit ? ` ${h.targetUnit}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    连续 {h.streak?.currentStreak ?? 0} 天 · 最长{" "}
                    {h.streak?.longestStreak ?? 0} 天
                  </p>
                </div>
                <Button
                  variant={completed ? "secondary" : "default"}
                  size="sm"
                  aria-pressed={completed}
                  disabled={toggle.isPending}
                  onClick={async () => {
                    const res = await toggle.mutateAsync({
                      habitId: h.id,
                      completedOn: today,
                    })
                    if (!res.ok) {
                      toast.error(res.error)
                    } else {
                      toast.message(res.data.completed ? "已完成" : "已取消", {
                        description: h.name,
                      })
                    }
                  }}
                >
                  {completed ? (
                    <>
                      <Check className="h-4 w-4" /> 已完成
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4" /> 打卡
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}