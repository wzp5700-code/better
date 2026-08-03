import { describe, expect, it } from "vitest"

import {
  currentLocalHHMM,
  dayBitForDate,
  isReminderDay,
  pickDueHabits,
  type DueHabit,
} from "@/lib/push/scheduler"

function makeHabit(overrides: Partial<DueHabit> = {}): DueHabit {
  return {
    id: 1,
    name: "静坐",
    reminderTime: "07:30",
    reminderDaysMask: 0,
    ...overrides,
  }
}

describe("push/currentLocalHHMM", () => {
  it("formats hh:mm with two digits", () => {
    expect(currentLocalHHMM(new Date(2026, 7, 1, 7, 30))).toBe("07:30")
    expect(currentLocalHHMM(new Date(2026, 7, 1, 23, 5))).toBe("23:05")
    expect(currentLocalHHMM(new Date(2026, 7, 1, 0, 0))).toBe("00:00")
  })
})

describe("push/dayBitForDate", () => {
  it("encodes Sun..Sat as bit0..bit6", () => {
    // 2026-08-02 is a Sunday (per real calendar)
    expect(dayBitForDate(new Date(2026, 7, 2))).toBe(1)
    // 2026-08-03 is Monday → bit1
    expect(dayBitForDate(new Date(2026, 7, 3))).toBe(2)
    // 2026-08-08 is Saturday → bit6
    expect(dayBitForDate(new Date(2026, 7, 8))).toBe(64)
  })
})

describe("push/isReminderDay", () => {
  // Mon (bit1) + Wed (bit3) + Fri (bit5)
  const mwf = (1 << 1) | (1 << 3) | (1 << 5)
  const mon = new Date(2026, 7, 3) // Mon
  const tue = new Date(2026, 7, 4) // Tue
  const wed = new Date(2026, 7, 5) // Wed
  const sat = new Date(2026, 7, 8) // Sat

  it("mask=0 means every day", () => {
    expect(isReminderDay(mon, 0)).toBe(true)
    expect(isReminderDay(sat, 0)).toBe(true)
  })

  it("mask with no bits set for the weekday returns false", () => {
    expect(isReminderDay(tue, mwf)).toBe(false)
    expect(isReminderDay(sat, mwf)).toBe(false)
  })

  it("mask with the weekday's bit set returns true", () => {
    expect(isReminderDay(mon, mwf)).toBe(true)
    expect(isReminderDay(wed, mwf)).toBe(true)
  })
})

describe("push/pickDueHabits", () => {
  const now = new Date(2026, 7, 3, 7, 30) // Mon 07:30
  const habits: DueHabit[] = [
    makeHabit({ id: 1, reminderTime: "07:30" }),
    makeHabit({ id: 2, reminderTime: "08:00" }),
    makeHabit({ id: 3, reminderTime: "07:30", name: "另一个" }),
  ]

  it("returns habits matching the current HH:MM", () => {
    const due = pickDueHabits(habits, now)
    expect(due.map((h) => h.id)).toEqual([1, 3])
  })

  it("returns empty if no match", () => {
    const future = new Date(2026, 7, 3, 12, 0)
    expect(pickDueHabits(habits, future)).toEqual([])
  })

  it("returns empty if list empty", () => {
    expect(pickDueHabits([], now)).toEqual([])
  })
})