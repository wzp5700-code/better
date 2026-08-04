import "server-only"
import { NextResponse } from "next/server"

import { deleteBook, getBook, updateBook } from "@/lib/services/book-service"
import { updateBookInput } from "@/lib/validation/book"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ bookId: string }> }

export async function GET(_request: Request, ctx: RouteContext) {
  const { bookId } = await ctx.params
  const id = Number(bookId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  const row = await getBook(id)
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(row, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const { bookId } = await ctx.params
  const id = Number(bookId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    const body = await request.json()
    const input = updateBookInput.parse(body)
    const row = await updateBook(id, input)
    return NextResponse.json(row)
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const { bookId } = await ctx.params
  const id = Number(bookId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  try {
    await deleteBook(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
