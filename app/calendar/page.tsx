"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, BookOpen, Check } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingBlock } from "@/components/shared/loading-block"
import { EmptyState } from "@/components/shared/empty-state"
import {
  useCalendarDay,
  useCalendarMonth,
  type MonthDaySummary,
} from "@/lib/queries/calendar"
import { addDaysKey, formatDateKey, fromDateKey, todayDateKey } from "@/lib/dates"

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const

function dateToKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function keyToDate(k: number): Date {
  return fromDateKey(k)
}

function startOfMonthGrid(year: number, month: number): number {
  // returns DateKey of the Monday of the week containing the 1st of the month
  const firstOfMonth = new Date(year, month - 1, 1)
  const day = (firstOfMonth.getDay() + 6) % 7 // Mon=0
  return dateToKey(new Date(year, month - 1, 1 - day))
}

function monthSummaryByDate(
  days: MonthDaySummary[]
): Map<number, MonthDaySummary> {
  const m = new Map<number, MonthDaySummary>()
  for (const d of days) m.set(d.date, d)
  return m
}

function DayCell({
  dateKey,
  summary,
  isToday,
  isCurrentMonth,
  selected,
  onSelect,
}: {
  dateKey: number
  summary: MonthDaySummary | undefined
  isToday: boolean
  isCurrentMonth: boolean
  selected: boolean
  onSelect: (k: number) => void
}) {
  const d = keyToDate(dateKey)
  const hasHabits = (summary?.completedHabitCount ?? 0) > 0
  const hasJournal = (summary?.journalEntryCount ?? 0) > 0
  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      aria-pressed={selected}
      aria-label={`${formatDateKey(dateKey, "yyyy年M月d日")} — ${
        hasHabits ? `${summary?.completedHabitCount} 次打卡` : "无打卡"
      }${hasJournal ? `，${summary?.journalEntryCount} 篇日记` : ""}`}
      className={[
        "group flex min-h-[64px] flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors",
        isCurrentMonth ? "bg-card" : "bg-card/40",
        selected
          ? "border-primary ring-1 ring-ring"
          : isToday
            ? "border-primary/40"
            : "border-border",
        "hover:bg-accent/40",
      ].join(" ")}
    >
      <span
        className={[
          "text-xs tabular-nums",
          isToday
            ? "font-medium text-foreground"
            : isCurrentMonth
              ? "text-foreground/80"
              : "text-muted-foreground",
        ].join(" ")}
      >
        {d.getDate()}
      </span>
      <div className="flex items-center gap-1">
        {hasHabits ? (
          <span
            className="inline-flex h-1.5 w-1.5 rounded-full bg-primary"
            aria-hidden
          />
        ) : null}
        {hasJournal ? (
          <span
            className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground"
            aria-hidden
          />
        ) : null}
        {hasHabits || hasJournal ? (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {hasHabits ? summary?.completedHabitCount : ""}
            {hasHabits && hasJournal ? " · " : ""}
            {hasJournal ? summary?.journalEntryCount : ""}
          </span>
        ) : null}
      </div>
    </button>
  )
}

function CalendarBoard({
  year,
  month,
  onSelectDay,
  selectedDate,
}: {
  year: number
  month: number
  onSelectDay: (k: number) => void
  selectedDate: number | null
}) {
  const { data, isLoading, error } = useCalendarMonth(year, month)
  const summaryByDate = React.useMemo(
    () => monthSummaryByDate(data?.days ?? []),
    [data]
  )

  if (isLoading) return <LoadingBlock lines={4} />
  if (error) {
    return <EmptyState title="加载失败" description={(error as Error).message} />
  }

  const firstKey = startOfMonthGrid(year, month)
  const today = todayDateKey()
  const cells: number[] = []
  for (let i = 0; i < 42; i++) cells.push(addDaysKey(firstKey, i))

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((k) => {
          const d = keyToDate(k)
          const isCurrentMonth = d.getMonth() + 1 === month
          const summary = summaryByDate.get(k)
          return (
            <DayCell
              key={k}
              dateKey={k}
              summary={summary}
              isToday={k === today}
              isCurrentMonth={isCurrentMonth}
              selected={k === selectedDate}
              onSelect={onSelectDay}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          打卡
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          日记
        </span>
      </div>
    </div>
  )
}

function DayPanel({ date }: { date: number }) {
  const { data, isLoading, error } = useCalendarDay(date)
  if (isLoading) return <LoadingBlock lines={3} />
  if (error)
    return <EmptyState title="加载失败" description={(error as Error).message} />
  if (!data) return null
  return (
    <Card>
      <CardContent className="space-y-5 py-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-medium">
            {formatDateKey(date, "yyyy年M月d日")}
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/journal/new?date=${date}`}>
              <BookOpen className="h-4 w-4" /> 写日记
            </Link>
          </Button>
        </div>

        <section>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            当天打卡（{data.habitCompletions.length}）
          </h3>
          {data.habitCompletions.length === 0 ? (
            <p className="text-sm text-muted-foreground">这一天没有打卡。</p>
          ) : (
            <ul className="space-y-2" role="list">
              {data.habitCompletions.map((c: { habitId: number; habitName: string; color: string | null; value: number; note: string | null }) => (
                <li
                  key={c.habitId}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card/40 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{c.habitName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {c.value > 1 ? (
                      <span className="tabular-nums">{c.value}</span>
                    ) : null}
                    {c.note ? (
                      <span className="max-w-[200px] truncate" title={c.note}>
                        {c.note}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            当天日记（{data.journalEntries.length}）
          </h3>
          {data.journalEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">这一天没有日记。</p>
          ) : (
            <ul className="space-y-2" role="list">
              {data.journalEntries.map((e: { id: number; snippet: string; moodLabel: string | null; moodScore: number | null; category: { id: number; name: string; color: string | null } | null }) => (
                <li key={e.id}>
                  <Link
                    href={`/journal/${e.id}`}
                    className="block rounded-md border bg-card/40 px-3 py-2 text-sm hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-2">
                        {e.snippet || (
                          <span className="text-muted-foreground">（空白）</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {e.category ? (
                          <span
                            className="rounded-md border px-1.5 py-0.5"
                            style={
                              e.category.color
                                ? {
                                    borderColor: e.category.color,
                                    color: e.category.color,
                                  }
                                : undefined
                            }
                          >
                            {e.category.name}
                          </span>
                        ) : null}
                        {e.moodLabel ? (
                          <span className="rounded-md border border-border px-1.5 py-0.5">
                            {e.moodLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  )
}

function currentMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default function CalendarPage() {
  const [{ year, month }, setView] = React.useState(() => currentMonth())
  const [selectedDate, setSelectedDate] = React.useState<number | null>(null)

  const moveMonth = (delta: number) => {
    let next = month + delta
    let nextYear = year
    if (next < 1) {
      next = 12
      nextYear -= 1
    } else if (next > 12) {
      next = 1
      nextYear += 1
    }
    setView({ year: nextYear, month: next })
    setSelectedDate(null)
  }

  const goToday = () => {
    const t = currentMonth()
    setView(t)
    setSelectedDate(todayDateKey())
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="日历"
        description="回顾每个日子 — 打了哪些卡，记了哪些字。"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => moveMonth(-1)}
            aria-label="上个月"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[8rem] text-center text-base font-medium">
            {year} 年 {month} 月
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => moveMonth(1)}
            aria-label="下个月"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>
          回到今天
        </Button>
      </div>

      <CalendarBoard
        year={year}
        month={month}
        selectedDate={selectedDate}
        onSelectDay={(k) => setSelectedDate(k)}
      />

      {selectedDate != null ? (
        <DayPanel date={selectedDate} />
      ) : (
        <p className="text-xs text-muted-foreground">
          点击任一天查看打卡与日记。
        </p>
      )}
    </div>
  )
}