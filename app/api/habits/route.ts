import "server-only"
import { NextResponse } from "next/server"

import {
  createHabit as createHabitService,
  listHabits,
} from "@/lib/services/habit-service"
import { createHabitInput } from "@/lib/validation/habit"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") as
    | "active"
    | "paused"
    | "archived"
    | null
  const includeArchived = searchParams.get("includeArchived") === "1"
  const rows = await listHabits({
    status: status ?? undefined,
    includeArchived,
  })
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = createHabitInput.parse(body)
    const row = await createHabitService(input)
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}