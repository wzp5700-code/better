/**
 * DateKey = integer YYYYMMDD in user's local timezone.
 * Cheap to compare, group, and store. All habit/journal date math uses this.
 *
 * The week starts on Monday (ISO 8601).
 */

const DATE_KEY_MIN = 19000101
const DATE_KEY_MAX = 29991231

export function toDateKey(date: Date): number {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return y * 10000 + m * 100 + d
}

export function fromDateKey(key: number): Date {
  if (!isValidDateKey(key)) {
    throw new Error(`invalid DateKey: ${key}`)
  }
  const y = Math.floor(key / 10000)
  const m = Math.floor((key % 10000) / 100)
  const d = key % 100
  return new Date(y, m - 1, d)
}

export function parseDateKey(key: number): Date | null {
  return isValidDateKey(key) ? fromDateKey(key) : null
}

export function todayDateKey(now: Date = new Date()): number {
  return toDateKey(now)
}

/** Returns YYYYMMDD of the Monday of the week containing `key`. */
export function startOfWeekKey(key: number): number {
  const date = fromDateKey(key)
  // getDay: 0=Sun, 1=Mon, ... 6=Sat. We want Monday=0..Sunday=6.
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  return toDateKey(date)
}

export function addDaysKey(key: number, days: number): number {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function diffDays(a: number, b: number): number {
  const ms = fromDateKey(a).getTime() - fromDateKey(b).getTime()
  return Math.round(ms / (24 * 3600 * 1000))
}

export function isValidDateKey(key: number): boolean {
  if (!Number.isInteger(key)) return false
  if (key < DATE_KEY_MIN || key > DATE_KEY_MAX) return false
  const y = Math.floor(key / 10000)
  const m = Math.floor((key % 10000) / 100)
  const d = key % 100
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  const date = new Date(y, m - 1, d)
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  )
}

const WEEKDAY_LABELS_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const
export const WEEKDAY_LABELS_CN_MON_FIRST = [
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
  "周日",
] as const

/** Bit position 0=Sun, 1=Mon, ... 6=Sat. */
export function weekdayBit(weekdaySunFirst: number): number {
  return 1 << weekdaySunFirst
}

/** Returns the Mon-Fri weekend-first weekday list using a Mon-first index (0=Mon..6=Sun). */
export function weekdayLabelMonFirst(monFirstIndex: number): string {
  return WEEKDAY_LABELS_CN_MON_FIRST[monFirstIndex]
}

export const WEEKDAY_LABELS_CN_SUN_FIRST = WEEKDAY_LABELS_CN

export function weekdayLabelSunFirst(sunFirstIndex: number): string {
  return WEEKDAY_LABELS_CN[sunFirstIndex]
}

export function formatDateKey(
  key: number,
  pattern: "yyyy-MM-dd" | "yyyy年M月d日" | "M月d日" = "yyyy-MM-dd"
): string {
  const date = fromDateKey(key)
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  if (pattern === "yyyy-MM-dd") {
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  }
  if (pattern === "M月d日") {
    return `${m}月${d}日`
  }
  return `${y}年${m}月${d}日`
}