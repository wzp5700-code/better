import { describe, expect, it } from "vitest"

import {
  addDaysKey,
  diffDays,
  formatDateKey,
  fromDateKey,
  isValidDateKey,
  startOfWeekKey,
  toDateKey,
  todayDateKey,
  weekdayBit,
} from "@/lib/dates"

describe("dates", () => {
  it("toDateKey + fromDateKey round trip", () => {
    const d = new Date(2026, 7, 2) // Aug 2, 2026
    expect(toDateKey(d)).toBe(20260802)
    expect(toDateKey(fromDateKey(20260802)).valueOf()).toBe(20260802)
  })

  it("todayDateKey matches current local date", () => {
    const now = new Date()
    expect(todayDateKey(now)).toBe(
      now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
    )
  })

  it("isValidDateKey rejects garbage", () => {
    expect(isValidDateKey(20260230)).toBe(false) // Feb 30
    expect(isValidDateKey(20261301)).toBe(false) // month 13
    expect(isValidDateKey(20260000)).toBe(false) // day 0
    expect(isValidDateKey(20260032)).toBe(false) // day 32
    expect(isValidDateKey(20260800)).toBe(false) // day 0 of valid month
    expect(isValidDateKey(20260229)).toBe(false) // 2026 not leap
    expect(isValidDateKey(20240229)).toBe(true) // 2024 leap
    expect(isValidDateKey(19000101)).toBe(true)
    expect(isValidDateKey(29991231)).toBe(true)
    expect(isValidDateKey(18991231)).toBe(false)
    expect(isValidDateKey(30000101)).toBe(false)
  })

  it("startOfWeekKey returns Monday (ISO 8601)", () => {
    // 2026-08-02 is a Sunday → Monday should be 2026-07-27
    expect(startOfWeekKey(20260802)).toBe(20260727)
    // 2026-08-03 Monday → itself
    expect(startOfWeekKey(20260803)).toBe(20260803)
    // 2026-08-04 Tuesday → 2026-08-03
    expect(startOfWeekKey(20260804)).toBe(20260803)
  })

  it("addDaysKey handles month and year boundaries", () => {
    expect(addDaysKey(20260131, 1)).toBe(20260201)
    expect(addDaysKey(20261231, 1)).toBe(20270101)
    expect(addDaysKey(20280228, 1)).toBe(20280229) // 2028 is leap
    expect(addDaysKey(20260228, 1)).toBe(20260301)
  })

  it("diffDays", () => {
    expect(diffDays(20260802, 20260801)).toBe(1)
    expect(diffDays(20260801, 20260802)).toBe(-1)
    expect(diffDays(20260801, 20260801)).toBe(0)
  })

  it("weekdayBit + format helpers", () => {
    expect(weekdayBit(0)).toBe(1) // Sun
    expect(weekdayBit(6)).toBe(64) // Sat
    expect(formatDateKey(20260802, "yyyy-MM-dd")).toBe("2026-08-02")
    expect(formatDateKey(20260802, "M月d日")).toBe("8月2日")
    expect(formatDateKey(20260802, "yyyy年M月d日")).toBe("2026年8月2日")
  })

  it("fromDateKey throws on invalid", () => {
    expect(() => fromDateKey(20260230)).toThrow()
  })
})