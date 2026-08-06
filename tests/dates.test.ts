import { describe, expect, it } from "vitest"

import {
  addDaysKey,
  DAY_ROLL_HOUR,
  diffDays,
  formatDateKey,
  fromDateKey,
  isValidDateKey,
  logicalTodayKey,
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

  it("logicalTodayKey — ≥ DAY_ROLL_HOUR counts as same calendar day", () => {
    // 10:00 AM on Aug 6, 2026 → logical today = 2026-08-06
    const morning = new Date(2026, 7, 6, 10, 0, 0)
    expect(logicalTodayKey(morning)).toBe(20260806)
    expect(DAY_ROLL_HOUR).toBe(2)
  })

  it("logicalTodayKey — 00:00 through (DAY_ROLL_HOUR-1):59 rolls back one day", () => {
    // 00:30 on Aug 7, 2026 → logical today = 2026-08-06 (still up late)
    const lateNight = new Date(2026, 7, 7, 0, 30, 0)
    expect(logicalTodayKey(lateNight)).toBe(20260806)
    // 01:59 last second before roll-over
    const almost = new Date(2026, 7, 7, 1, 59, 59)
    expect(logicalTodayKey(almost)).toBe(20260806)
  })

  it("logicalTodayKey — exactly DAY_ROLL_HOUR is the new day", () => {
    // 02:00 sharp on Aug 7, 2026 → logical today = 2026-08-07
    const justIn = new Date(2026, 7, 7, 2, 0, 0)
    expect(logicalTodayKey(justIn)).toBe(20260807)
    // 23:59 is unambiguously the current calendar day
    const evening = new Date(2026, 7, 6, 23, 59, 0)
    expect(logicalTodayKey(evening)).toBe(20260806)
  })

  it("logicalTodayKey — rolls across month and year boundaries", () => {
    // 00:15 on Mar 1, 2026 → still Feb 28
    const newMonth = new Date(2026, 2, 1, 0, 15, 0)
    expect(logicalTodayKey(newMonth)).toBe(20260228)
    // 00:15 on Jan 1, 2026 → still Dec 31, 2025
    const newYear = new Date(2026, 0, 1, 0, 15, 0)
    expect(logicalTodayKey(newYear)).toBe(20251231)
  })
})