import "server-only"
import { NextResponse } from "next/server"

import {
  archiveCategory,
  deleteCategory,
  getCategory,
  unarchiveCategory,
  updateCategory,
} from "@/lib/services/journal-category-service"
import { updateCategoryInput } from "@/lib/validation/journal-category"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ categoryId: string }> }

export async function GET(_request: Request, ctx: RouteContext) {
  const { categoryId } = await ctx.params
  const id = Number(categoryId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  const row = await getCategory(id)
  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  return NextResponse.json(row, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const { categoryId } = await ctx.params
  const id = Number(categoryId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    const body = await request.json()
    const input = updateCategoryInput.parse(body)
    const row = await updateCategory(id, input)
    return NextResponse.json(row)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const { categoryId } = await ctx.params
  const id = Number(categoryId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    await deleteCategory(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}