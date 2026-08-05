"use client"

import * as React from "react"

import { Slider } from "@/components/ui/slider"
import { moodLabelForScore } from "@/lib/validation/journal"

/**
 * 心情控件 — 纯滑块（无标签、无表情、无清除按钮）。
 * value 为 null 时显示中性位置，拖动即记录分数。
 */
export function MoodSlider({
  value,
  onChange,
}: {
  value: number | null
  onChange: (score: number | null, label: string | null) => void
}) {
  return (
    <Slider
      value={value == null ? [3] : [value]}
      min={1}
      max={5}
      step={1}
      onValueChange={(v) => {
        const n = Array.isArray(v) ? v[0] : v
        if (typeof n === "number") onChange(n, moodLabelForScore(n))
      }}
      aria-label="心情打分"
    />
  )
}
