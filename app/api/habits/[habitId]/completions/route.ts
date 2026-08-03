import "server-only"
import { NextResponse } from "next/server"

import {
  toggleHabitCompletion,
  upsertHabitCompletion,
} from "@/lib/services/habit-completion-service"
import { isValidDateKey } from "@/lib/dates"
import {
  toggleCompletionInput,
  upsertCompletionInput,
} from "@/lib/validation/habit"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ habitId: string }> }

export async function POST(request: Request, ctx: RouteContext) {
  const { habitId } = await ctx.params
  const id = Number(habitId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    const body = await request.json()
    const input = toggleCompletionInput.parse({ ...body, habitId: id })
    const result = await toggleHabitCompletion(input)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: Request, ctx: RouteContext) {
  const { habitId } = await ctx.params
  const id = Number(habitId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    const body = await request.json()
    const input = upsertCompletionInput.parse({ ...body, habitId: id })
    const row = await upsertHabitCompletion(input)
    return NextResponse.json(row)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// Helper for the heatmap query: list completions in a date range.
// (Not in plan strictly but useful for habit detail heatmap.)
export async function GET(request: Request, ctx: RouteContext) {
  const { habitId } = await ctx.params
  const id = Number(habitId)
  const { searchParams } = new URL(request.url)
  const from = Number(searchParams.get("from") ?? "")
  const to = Number(searchParams.get("to") ?? "")
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  if (!isValidDateKey(from) || !isValidDateKey(to) || from > to) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 })
  }
  const { listCompletionsInRange } = await import("@/lib/services/habit-service")
  const rows = await listCompletionsInRange(id, from, to)
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "no-store" },
  })
}