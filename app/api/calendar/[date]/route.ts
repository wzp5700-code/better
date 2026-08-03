import "server-only"
import { NextResponse } from "next/server"

import { getDay } from "@/lib/services/calendar-service"
import { isValidDateKey } from "@/lib/dates"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ date: string }> }

export async function GET(_request: Request, ctx: RouteContext) {
  const { date } = await ctx.params
  const key = Number(date)
  if (!isValidDateKey(key)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 })
  }
  const result = await getDay(key)
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  })
}