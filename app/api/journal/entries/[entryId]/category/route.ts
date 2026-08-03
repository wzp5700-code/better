import "server-only"
import { NextResponse } from "next/server"

import { setCategoryForEntry } from "@/lib/services/journal-category-service"
import { setCategoryForEntryInput } from "@/lib/validation/journal-category"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ entryId: string }> }

export async function PUT(request: Request, ctx: RouteContext) {
  const { entryId } = await ctx.params
  const id = Number(entryId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    const body = await request.json()
    const input = setCategoryForEntryInput.parse({
      ...body,
      entryId: id,
    })
    const r = await setCategoryForEntry(input)
    return NextResponse.json(r)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}