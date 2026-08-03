import "server-only"
import { NextResponse } from "next/server"

import {
  deleteJournalEntry,
  getJournalEntry,
  updateJournalEntry,
} from "@/lib/services/journal-service"
import { updateJournalInput } from "@/lib/validation/journal"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ entryId: string }> }

export async function GET(_request: Request, ctx: RouteContext) {
  const { entryId } = await ctx.params
  const id = Number(entryId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  const row = await getJournalEntry(id)
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  return NextResponse.json(row, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const { entryId } = await ctx.params
  const id = Number(entryId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    const body = await request.json()
    const input = updateJournalInput.parse({ ...body, id })
    const row = await updateJournalEntry(id, input)
    return NextResponse.json(row)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const { entryId } = await ctx.params
  const id = Number(entryId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    await deleteJournalEntry(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}