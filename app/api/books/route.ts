import "server-only"
import { NextResponse } from "next/server"

import { createBook, listBooks } from "@/lib/services/book-service"
import { createBookInput } from "@/lib/validation/book"

export const runtime = "nodejs"

export async function GET() {
  const rows = await listBooks()
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = createBookInput.parse(body)
    const row = await createBook(input)
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
