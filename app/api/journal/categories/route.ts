import "server-only"
import { NextResponse } from "next/server"

import {
  createCategory,
  getCategoriesWithCount,
} from "@/lib/services/journal-category-service"
import { createCategoryInput } from "@/lib/validation/journal-category"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get("includeArchived") === "1"
  const rows = await getCategoriesWithCount()
  const filtered = includeArchived
    ? rows
    : rows.filter((r) => !r.archived)
  return NextResponse.json(filtered, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = createCategoryInput.parse(body)
    const row = await createCategory(input)
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}