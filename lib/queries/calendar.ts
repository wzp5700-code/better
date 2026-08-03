import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/client/api"

export interface MonthDaySummary {
  date: number
  completedHabitCount: number
  distinctHabits: number
  journalEntryCount: number
  hasContent: boolean
}

export interface DayDetail {
  date: number
  habitCompletions: Array<{
    habitId: number
    habitName: string
    color: string | null
    value: number
    note: string | null
  }>
  journalEntries: Array<{
    id: number
    snippet: string
    moodLabel: string | null
    moodScore: number | null
    category: { id: number; name: string; color: string | null } | null
  }>
}

export const calendarKeys = {
  month: (year: number, month: number) =>
    ["calendar", "month", year, month] as const,
  day: (date: number) => ["calendar", "day", date] as const,
}

async function fetchMonth(year: number, month: number) {
  const r = await apiFetch(
    `/api/calendar/month/${year}/${String(month).padStart(2, "0")}`,
    { cache: "no-store" }
  )
  if (!r.ok) throw new Error(`fetch calendar: ${r.status}`)
  return r.json() as Promise<{
    year: number
    month: number
    days: MonthDaySummary[]
  }>
}

export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryKey: calendarKeys.month(year, month),
    queryFn: () => fetchMonth(year, month),
  })
}

async function fetchDay(date: number): Promise<DayDetail> {
  const r = await apiFetch(`/api/calendar/${date}`, { cache: "no-store" })
  if (!r.ok) throw new Error(`fetch day: ${r.status}`)
  return r.json()
}

export function useCalendarDay(date: number | null) {
  return useQuery({
    queryKey: calendarKeys.day(date ?? 0),
    queryFn: () => fetchDay(date as number),
    enabled: date != null,
  })
}