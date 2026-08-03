import "server-only"
import { NextResponse } from "next/server"

import { db } from "@/db/client"
import { devices } from "@/db/schema"
import { generateToken, hashToken } from "@/lib/auth/tokens"
import {
  consumePairingCode,
  markPairingCodeUsed,
} from "@/lib/auth/pairing"

export const runtime = "nodejs"

/**
 * POST /api/pair
 *
 * Body: { pairingCode: string, name: string, platform: string, publicKey?: string }
 *
 * Returns: { deviceId, name, platform, token } — same shape as /api/setup.
 * The pairing code is single-use; after this call the row's used_at is set
 * and future calls with the same code are rejected.
 */
export async function POST(request: Request) {
  let body: {
    pairingCode?: string
    name?: string
    platform?: string
    publicKey?: string
  } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const code = (body.pairingCode ?? "").trim()
  if (!code) {
    return NextResponse.json({ error: "缺少配对码" }, { status: 400 })
  }
  const name = (body.name ?? "").trim().slice(0, 60) || "新设备"
  const platform = normalizePlatform(body.platform)
  const publicKey = (body.publicKey ?? "").trim().slice(0, 4000) || null

  let consumed
  try {
    consumed = await consumePairingCode(code)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "配对失败" },
      { status: 400 }
    )
  }

  const rawToken = generateToken()
  const tokenHash = hashToken(rawToken)

  const [row] = await db
    .insert(devices)
    .values({
      name,
      platform,
      publicKey,
      tokenHash,
      master: false,
      createdAt: new Date(),
    })
    .returning()
  if (!row) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 })
  }

  await markPairingCodeUsed(consumed.id, row.id)

  return NextResponse.json(
    {
      deviceId: row.id,
      deviceName: row.name,
      platform: row.platform,
      master: false,
      token: rawToken,
    },
    { status: 201 }
  )
}

function normalizePlatform(p?: string) {
  const allowed = ["web", "ios", "android", "windows", "macos", "linux"] as const
  if (p && (allowed as readonly string[]).includes(p)) return p as typeof allowed[number]
  return "web" as const
}