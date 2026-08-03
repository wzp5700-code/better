"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WeekdayMaskPicker } from "@/components/habits/weekday-mask-picker"

export type FrequencyForm = {
  frequencyType: "daily" | "weekly" | "interval"
  weeklyDaysMask: number
  intervalDays: number
  timesPerPeriod: number | null
  periodDays: number | null
}

export function FrequencyFields({
  value,
  onChange,
}: {
  value: FrequencyForm
  onChange: (v: FrequencyForm) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(["daily", "weekly", "interval"] as const).map((t) => {
          const active = value.frequencyType === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...value, frequencyType: t })}
              aria-pressed={active}
              className={
                "rounded-md border px-3 py-2 text-sm transition-colors " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground")
              }
            >
              {t === "daily" ? "每日" : t === "weekly" ? "每周" : "间隔"}
            </button>
          )
        })}
      </div>

      {value.frequencyType === "weekly" ? (
        <div className="space-y-2">
          <Label>执行日（多选）</Label>
          <WeekdayMaskPicker
            value={value.weeklyDaysMask}
            onChange={(mask) => onChange({ ...value, weeklyDaysMask: mask })}
          />
        </div>
      ) : null}

      {value.frequencyType === "interval" ? (
        <div className="space-y-2">
          <Label htmlFor="interval-days">每多少天执行一次</Label>
          <Input
            id="interval-days"
            type="number"
            min={1}
            max={365}
            value={value.intervalDays || ""}
            onChange={(e) =>
              onChange({
                ...value,
                intervalDays: Number(e.target.value) || 0,
              })
            }
          />
        </div>
      ) : null}
    </div>
  )
}