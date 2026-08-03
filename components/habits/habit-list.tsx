"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { HabitCard } from "@/components/habits/habit-card"
import { HabitFormDialog } from "@/components/habits/habit-form-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingBlock } from "@/components/shared/loading-block"
import { useHabitsQuery } from "@/lib/queries/habits"
import type { HabitWithStreak } from "@/lib/services/habit-service"
import type { Habit } from "@/db/schema"

type Filter = "active" | "paused" | "archived" | "all"

export function HabitList() {
  const [filter, setFilter] = React.useState<Filter>("active")
  const { data, isLoading, error } = useHabitsQuery({
    includeArchived: filter === "all" || filter === "archived",
    status:
      filter === "active" || filter === "paused" || filter === "archived"
        ? filter
        : undefined,
  })
  const [editing, setEditing] = React.useState<Habit | null>(null)
  const [open, setOpen] = React.useState(false)

  const items = (data ?? []) as HabitWithStreak[]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border bg-card p-1 text-sm">
          {(["active", "paused", "archived", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={
                "rounded-sm px-3 py-1 transition-colors " +
                (filter === f
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {f === "active"
                ? "进行中"
                : f === "paused"
                  ? "暂停"
                  : f === "archived"
                    ? "归档"
                    : "全部"}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
        >
          <Plus className="h-4 w-4" /> 新建习惯
        </Button>
      </div>

      {isLoading ? (
        <LoadingBlock lines={3} />
      ) : error ? (
        <EmptyState
          title="加载失败"
          description={(error as Error).message}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="还没有习惯"
          description="先建一个最小的动作。"
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> 新建习惯
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              onEdit={(it) => {
                const asHabit: Habit = {
                  id: it.id,
                  name: it.name,
                  description: it.description,
                  icon: it.icon,
                  color: it.color,
                  frequencyType: it.frequencyType,
                  weeklyDaysMask: it.weeklyDaysMask,
                  intervalDays: it.intervalDays,
                  timesPerPeriod: it.timesPerPeriod,
                  periodDays: it.periodDays,
                  targetValue: it.targetValue,
                  targetUnit: it.targetUnit,
                  reminderTime: it.reminderTime,
                  reminderDaysMask: it.reminderDaysMask,
                  status: it.status,
                  pausedUntil: it.pausedUntil,
                  startDate: it.startDate,
                  createdAt: it.createdAt,
                  updatedAt: it.updatedAt,
                }
                setEditing(asHabit)
                setOpen(true)
              }}
              detailHref={`/habits/${h.id}`}
            />
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">
            回到今日 →
          </Link>
        </p>
      ) : null}

      <HabitFormDialog
        open={open}
        onOpenChange={setOpen}
        habit={editing ?? undefined}
      />
    </div>
  )
}