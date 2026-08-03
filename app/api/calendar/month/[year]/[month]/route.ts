import "server-only"
import { NextResponse } from "next/server"

import { getMonth } from "@/lib/services/calendar-service"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ year: string; month: string }> }

export async function GET(_request: Request, ctx: RouteContext) {
  const { year, month } = await ctx.params
  const y = Number(year)
  const m = Number(month)
  if (!Number.isInteger(y) || !Number.isInteger(m)) {
    return NextResponse.json({ error: "invalid year/month" }, { status: 400 })
  }
  try {
    const result = await getMonth(y, m)
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}