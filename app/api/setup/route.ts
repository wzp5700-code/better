import "server-only"
import { NextResponse } from "next/server"

import { db } from "@/db/client"
import { devices } from "@/db/schema"
import { generateToken, hashToken } from "@/lib/auth/tokens"

export const runtime = "nodejs"

/**
 * First-time setup. No auth required. Creates a master device + returns
 * the raw token (shown to the user exactly once).
 *
 * Idempotent? No. Subsequent calls return 409. To rotate the master
 * device, use the master device to revoke the old one first, then
 * re-bootstrap manually via direct DB access (documented in README).
 */
export async function POST(request: Request) {
  let body: { name?: string; platform?: string; publicKey?: string } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    // empty body is OK
  }
  const name = (body.name ?? "").trim().slice(0, 60) || "主设备"
  const platform = normalizePlatform(body.platform)
  const publicKey = (body.publicKey ?? "").trim().slice(0, 4000) || null

  // only one master allowed
  const existingMaster = await db
    .select({ id: devices.id })
    .from(devices)
    .where(eqMaster(true))
    .limit(1)
  if (existingMaster.length > 0) {
    return NextResponse.json(
      { error: "已有主设备；如需重置请通过直接修改数据库。" },
      { status: 409 }
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
      master: true,
      createdAt: new Date(),
    })
    .returning()
  if (!row) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 })
  }

  return NextResponse.json(
    {
      deviceId: row.id,
      deviceName: row.name,
      platform: row.platform,
      master: true,
      token: rawToken,
      warning:
        "这是你唯一一次看到这个 token。请把它复制到密码管理器，并在所有设备上使用配对流程而不是重复运行 setup。",
    },
    { status: 201 }
  )
}

// Drizzle's `eq(true)` import path; keep local helper to avoid extra imports
import { eq as _eq } from "drizzle-orm"
function eqMaster(value: boolean) {
  return _eq(devices.master, value)
}

function normalizePlatform(p?: string) {
  const allowed = ["web", "ios", "android", "windows", "macos", "linux"] as const
  if (p && (allowed as readonly string[]).includes(p)) return p as typeof allowed[number]
  return "web" as const
}