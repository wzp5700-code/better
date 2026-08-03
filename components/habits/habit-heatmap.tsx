"use client"

import * as React from "react"
import CalendarHeatmap from "react-calendar-heatmap"
import "react-calendar-heatmap/dist/styles.css"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { addDaysKey, fromDateKey, todayDateKey, toDateKey } from "@/lib/dates"
import { cn } from "@/lib/utils"

interface Completion {
  completedOn: number
  value: number
}

interface Props {
  habitId: number
  targetValue: number | null
  completions: Completion[]
  className?: string
  onCellClick?: (dateKey: number) => void
}

const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
]

function levelFor(value: number, target: number | null): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0) return 0
  if (target == null) return 4
  const ratio = value / target
  if (ratio >= 1) return 4
  if (ratio >= 0.75) return 3
  if (ratio >= 0.4) return 2
  return 1
}

function dateKeyToIso(key: number): string {
  // use UTC noon to avoid tz drift
  const d = fromDateKey(key)
  const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12))
  return iso.toISOString().slice(0, 10)
}

function isoToDateKey(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number]
  return y * 10000 + m * 100 + d
}

export function HabitHeatmap({
  habitId,
  targetValue,
  completions,
  className,
  onCellClick,
}: Props) {
  const today = React.useMemo(() => todayDateKey(), [])
  const from = addDaysKey(today, -364)

  const completionMap = React.useMemo(() => {
    const m = new Map<number, number>()
    for (const c of completions) m.set(c.completedOn, c.value)
    return m
  }, [completions])

  const data = React.useMemo(() => {
    return completions.map((c) => ({
      date: dateKeyToIso(c.completedOn),
      count: c.value,
    }))
  }, [completions])

  const getClassForValue = (v: { value?: number | string; date?: string | Date }) => {
    if (!v.date) return "color-empty"
    const iso =
      typeof v.date === "string"
        ? v.date.slice(0, 10)
        : v.date.toISOString().slice(0, 10)
    const key = isoToDateKey(iso)
    const value = (typeof v.value === "number" ? v.value : 0) || 0
    const lvl = levelFor(value, targetValue)
    return `color-h${lvl}`
  }

  // Tooltip + click handler via wrapping each rect is tricky with the library.
  // Use the library's titleForValue as a fallback, plus an onClick on the svg.
  const titleForValue = (v: { value?: number | string; date?: string | Date }) => {
    if (!v.date) return ""
    const iso =
      typeof v.date === "string"
        ? v.date.slice(0, 10)
        : v.date.toISOString().slice(0, 10)
    const key = isoToDateKey(iso)
    const date = fromDateKey(key)
    const dateLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const value = completionMap.get(key) ?? 0
    const status =
      value > 0
        ? targetValue != null
          ? value >= targetValue
            ? "完成"
            : `进行中（${value}/${targetValue}）`
          : "完成"
        : "未签到"
    return `${dateLabel}：${status}`
  }

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <TooltipProvider delayDuration={150}>
        <CalendarHeatmap
          startDate={dateKeyToIso(from)}
          endDate={dateKeyToIso(today)}
          values={data}
          classForValue={getClassForValue}
          titleForValue={titleForValue}
          showWeekdayLabels
          gutterSize={3}
          onClick={(v: { value?: number | string; date?: string | Date } | null) => {
            if (!v?.date) return
            const iso =
              typeof v.date === "string"
                ? v.date.slice(0, 10)
                : v.date.toISOString().slice(0, 10)
            const key = isoToDateKey(iso)
            if (key > today) return // future
            onCellClick?.(key)
          }}
          transformDayElement={(
            element: React.ReactElement<Record<string, unknown>>,
            value: { value?: number | string; date?: string | Date }
          ) => {
            if (!value?.date) return element
            const iso =
              typeof value.date === "string"
                ? value.date.slice(0, 10)
                : value.date.toISOString().slice(0, 10)
            const key = isoToDateKey(iso)
            const date = fromDateKey(key)
            const weekday = date.getDay()
            const isWeekend = weekday === 0 || weekday === 6
            return React.cloneElement(element, {
              role: "button",
              tabIndex: 0,
              "aria-label": titleForValue(value),
              onKeyDown: (e: React.KeyboardEvent<SVGRectElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  if (key <= today) onCellClick?.(key)
                }
              },
              className: cn(
                (element.props as { className?: string }).className,
                "cursor-pointer transition-colors",
                isWeekend ? "rx-1" : ""
              ),
              "data-habit-id": habitId,
              "data-date-key": key,
            })
          }}
        />
      </TooltipProvider>
      <style jsx global>{`
        .react-calendar-heatmap text {
          font-size: 10px;
          fill: var(--muted-foreground);
        }
        .react-calendar-heatmap rect.color-empty {
          fill: var(--heat-0);
        }
        .react-calendar-heatmap rect.color-h1 {
          fill: var(--heat-1);
        }
        .react-calendar-heatmap rect.color-h2 {
          fill: var(--heat-2);
        }
        .react-calendar-heatmap rect.color-h3 {
          fill: var(--heat-3);
        }
        .react-calendar-heatmap rect.color-h4 {
          fill: var(--heat-4);
        }
        .react-calendar-heatmap rect {
          rx: 2;
          ry: 2;
          stroke: transparent;
          stroke-width: 1;
        }
        .react-calendar-heatmap rect:hover {
          stroke: var(--foreground);
        }
      `}</style>
    </div>
  )
}

// expose MONTH_LABELS for future legend; currently unused but kept for stability
export const HEATMAP_MONTH_LABELS = MONTH_LABELS
// re-export to silence "unused" if strict
export const __heatmap = { fromDateKey, toDateKey }