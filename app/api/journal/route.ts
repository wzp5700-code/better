import "server-only"
import { NextResponse } from "next/server"

import {
  createJournalEntry,
  listJournalEntries,
} from "@/lib/services/journal-service"
import { createJournalInput } from "@/lib/validation/journal"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const tag = searchParams.get("tag")
  const query = searchParams.get("q")
  const limit = searchParams.get("limit")
  const cursor = searchParams.get("cursor")
  const categoryIdParam = searchParams.get("categoryId")
  const result = await listJournalEntries({
    from: from ? Number(from) : undefined,
    to: to ? Number(to) : undefined,
    tag: tag ?? undefined,
    query: query ?? undefined,
    limit: limit ? Number(limit) : undefined,
    cursor: cursor ? Number(cursor) : undefined,
    categoryId:
      categoryIdParam === null
        ? undefined
        : categoryIdParam === "null"
          ? null
          : Number(categoryIdParam),
  })
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = createJournalInput.parse(body)
    const row = await createJournalEntry(input)
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}