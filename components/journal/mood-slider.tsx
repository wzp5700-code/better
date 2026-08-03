"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { MOOD_LABELS, moodLabelForScore } from "@/lib/validation/journal"

export function MoodSlider({
  value,
  onChange,
}: {
  value: number | null
  onChange: (score: number | null, label: string | null) => void
}) {
  const setScore = (n: number) => {
    onChange(n, moodLabelForScore(n))
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>心情</Label>
        {value != null ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null, null)}
          >
            清除
          </Button>
        ) : null}
      </div>
      <Slider
        value={value == null ? [3] : [value]}
        min={1}
        max={5}
        step={1}
        onValueChange={(v) => {
          const n = Array.isArray(v) ? v[0] : v
          if (typeof n === "number") setScore(n)
        }}
        aria-valuetext={value == null ? "未记录" : MOOD_LABELS[value - 1]}
        aria-label="心情打分"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        {MOOD_LABELS.map((label, i) => (
          <span
            key={label}
            className={
              value === i + 1
                ? "font-medium text-foreground"
                : ""
            }
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}