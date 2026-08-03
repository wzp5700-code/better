import "server-only"
import { NextResponse } from "next/server"

import { listWikiLinkTargets } from "@/lib/services/journal-service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") ?? ""
  const limit = searchParams.get("limit")
  const rows = await listWikiLinkTargets(q, limit ? Number(limit) : 10)
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "no-store" },
  })
}