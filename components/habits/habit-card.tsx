"use client"

import * as React from "react"
import { toast } from "sonner"
import { Pencil, Pause, Play, Archive, ArchiveRestore } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import {
  useSetHabitStatusMutation,
} from "@/lib/queries/habits"
import type { HabitWithStreak } from "@/lib/services/habit-service"

function describeFrequency(h: HabitWithStreak): string {
  if (h.frequencyType === "daily") return "每日"
  if (h.frequencyType === "weekly") {
    const bits = h.weeklyDaysMask
    const days: string[] = []
    const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    for (let i = 0; i < 7; i++) {
      if (bits & (1 << i)) days.push(labels[i]!)
    }
    return `每周 · ${days.join("、")}`
  }
  return `每 ${h.intervalDays ?? "?"} 天`
}

function StatusBadge({ h }: { h: HabitWithStreak }) {
  if (h.status === "archived") return <Badge variant="outline">已归档</Badge>
  if (h.status === "paused") return <Badge variant="secondary">暂停</Badge>
  if (h.todayStatus === "due") return <Badge>今日</Badge>
  return <Badge variant="outline">今日非执行日</Badge>
}

export function HabitCard({
  habit,
  onEdit,
  detailHref,
}: {
  habit: HabitWithStreak
  onEdit?: (h: HabitWithStreak) => void
  detailHref?: string
}) {
  const setStatus = useSetHabitStatusMutation()
  const current = habit.streak?.currentStreak ?? 0
  const longest = habit.streak?.longestStreak ?? 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{habit.name}</CardTitle>
          <CardDescription>{describeFrequency(habit)}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge h={habit} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="更多操作"
                className="h-8 w-8"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit ? (
                <DropdownMenuItem onSelect={() => onEdit(habit)}>
                  <Pencil className="h-4 w-4" /> 编辑
                </DropdownMenuItem>
              ) : null}
              {habit.status === "active" ? (
                <DropdownMenuItem
                  onSelect={async () => {
                    const res = await setStatus.mutateAsync({
                      id: habit.id,
                      status: "paused",
                    })
                    if (!res.ok) toast.error(res.error)
                  }}
                >
                  <Pause className="h-4 w-4" /> 暂停
                </DropdownMenuItem>
              ) : habit.status === "paused" ? (
                <DropdownMenuItem
                  onSelect={async () => {
                    const res = await setStatus.mutateAsync({
                      id: habit.id,
                      status: "active",
                    })
                    if (!res.ok) toast.error(res.error)
                  }}
                >
                  <Play className="h-4 w-4" /> 恢复
                </DropdownMenuItem>
              ) : null}
              {habit.status !== "archived" ? (
                <DropdownMenuItem
                  onSelect={async () => {
                    const res = await setStatus.mutateAsync({
                      id: habit.id,
                      status: "archived",
                    })
                    if (!res.ok) toast.error(res.error)
                  }}
                >
                  <Archive className="h-4 w-4" /> 归档
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={async () => {
                    const res = await setStatus.mutateAsync({
                      id: habit.id,
                      status: "active",
                    })
                    if (!res.ok) toast.error(res.error)
                  }}
                >
                  <ArchiveRestore className="h-4 w-4" /> 取消归档
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {detailHref ? (
                <DropdownMenuItem asChild>
                  <a href={detailHref}>查看详情</a>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {habit.description ? (
          <p className="text-sm text-muted-foreground">{habit.description}</p>
        ) : null}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>
              当前连续{" "}
              <span className="font-medium text-foreground">{current}</span> 天
            </span>
            <span>
              最长{" "}
              <span className="font-medium text-foreground">{longest}</span> 天
            </span>
          </div>
          {habit.targetValue != null ? (
            <span className="text-xs text-muted-foreground">
              目标 {habit.targetValue}
              {habit.targetUnit ? ` ${habit.targetUnit}` : ""}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}