"use client"

import * as React from "react"

import { weekdayLabelMonFirst } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6] as const // Mon-first

export function WeekdayMaskPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (mask: number) => void
}) {
  const toggle = (monIndex: number) => {
    const sunFirst = (monIndex + 1) % 7
    const bit = 1 << sunFirst
    const next = value & bit ? value & ~bit : value | bit
    onChange(next)
  }
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="选择执行日">
      {DAY_INDICES.map((i) => {
        const sunFirst = (i + 1) % 7
        const active = (value & (1 << sunFirst)) !== 0
        return (
          <Button
            key={i}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            aria-pressed={active}
            className={cn(
              "h-8 w-12 text-xs",
              active ? "" : "text-muted-foreground"
            )}
            onClick={() => toggle(i)}
          >
            {weekdayLabelMonFirst(i)}
          </Button>
        )
      })}
    </div>
  )
}

/** Mon-first list of weekday labels (Mon-Fri weekend-first, 7 items). */
export const WEEKDAY_LABELS_MON_FIRST = DAY_INDICES.map((i) => weekdayLabelMonFirst(i))