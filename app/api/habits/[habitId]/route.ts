import "server-only"
import { NextResponse } from "next/server"

import {
  deleteHabit as deleteHabitService,
  getHabit,
  updateHabit as updateHabitService,
} from "@/lib/services/habit-service"
import { updateHabitInput } from "@/lib/validation/habit"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ habitId: string }> }

export async function GET(_request: Request, ctx: RouteContext) {
  const { habitId } = await ctx.params
  const id = Number(habitId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  const row = await getHabit(id)
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  return NextResponse.json(row, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const { habitId } = await ctx.params
  const id = Number(habitId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    const body = await request.json()
    const input = updateHabitInput.parse(body)
    const row = await updateHabitService(id, input)
    return NextResponse.json(row)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const { habitId } = await ctx.params
  const id = Number(habitId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    await deleteHabitService(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}