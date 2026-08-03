import { describe, expect, it } from "vitest"

import {
  createHabitInput,
  weeklyMaskFromMonFirstIndices,
} from "@/lib/validation/habit"

describe("createHabitInput", () => {
  it("accepts daily", () => {
    const r = createHabitInput.safeParse({
      name: "静坐",
      frequencyType: "daily",
    })
    expect(r.success).toBe(true)
  })

  it("rejects weekly without mask", () => {
    const r = createHabitInput.safeParse({
      name: "冥想",
      frequencyType: "weekly",
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("weeklyDaysMask"))).toBe(
        true
      )
    }
  })

  it("accepts weekly with mask", () => {
    const r = createHabitInput.safeParse({
      name: "冥想",
      frequencyType: "weekly",
      weeklyDaysMask: 0b0010101, // Sun, Tue, Thu
    })
    expect(r.success).toBe(true)
  })

  it("rejects interval without days", () => {
    const r = createHabitInput.safeParse({
      name: "长跑",
      frequencyType: "interval",
    })
    expect(r.success).toBe(false)
  })

  it("rejects invalid color", () => {
    const r = createHabitInput.safeParse({
      name: "x",
      frequencyType: "daily",
      color: "red",
    })
    expect(r.success).toBe(false)
  })

  it("rejects invalid HH:MM reminder", () => {
    const r = createHabitInput.safeParse({
      name: "x",
      frequencyType: "daily",
      reminderTime: "25:00",
    })
    expect(r.success).toBe(false)
  })

  it("accepts valid reminder", () => {
    const r = createHabitInput.safeParse({
      name: "x",
      frequencyType: "daily",
      reminderTime: "07:30",
    })
    expect(r.success).toBe(true)
  })
})

describe("weeklyMaskFromMonFirstIndices", () => {
  it("builds Mon/Wed/Fri mask", () => {
    // [0,2,4] → Mon(idx0)=bit1, Wed(idx2)=bit3, Fri(idx4)=bit5
    const mask = weeklyMaskFromMonFirstIndices([0, 2, 4])
    expect(mask).toBe((1 << 1) | (1 << 3) | (1 << 5))
  })

  it("ignores invalid indices", () => {
    expect(weeklyMaskFromMonFirstIndices([7])).toBe(0)
    expect(weeklyMaskFromMonFirstIndices([-1])).toBe(0)
  })

  it("empty → 0", () => {
    expect(weeklyMaskFromMonFirstIndices([])).toBe(0)
  })
})