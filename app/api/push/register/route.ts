import "server-only"
import { NextResponse } from "next/server"

import { db } from "@/db/client"
import { pushTokens } from "@/db/schema"
import { getDeviceContext } from "@/lib/auth/middleware"

export const runtime = "nodejs"

/**
 * POST /api/push/register
 *
 * Body: { token: string, provider?: "fcm"|"apns"|"webpush"|"ntfy", platform: string }
 * Registers (or refreshes) a push token for the current device.
 */
export async function POST(request: Request) {
  const ctx = getDeviceContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }
  let body: {
    token?: string
    provider?: "fcm" | "apns" | "webpush" | "ntfy"
    platform?: string
  } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const token = (body.token ?? "").trim()
  const provider = body.provider ?? "fcm"
  const platform = (body.platform ?? ctx.device.platform).trim().slice(0, 32)

  if (!token || token.length < 8) {
    return NextResponse.json({ error: "缺少 token" }, { status: 400 })
  }
  if (!["fcm", "apns", "webpush", "ntfy"].includes(provider)) {
    return NextResponse.json({ error: "不支持的 provider" }, { status: 400 })
  }

  // Upsert: same deviceId + token → refresh lastSeenAt + clear revokedAt.
  // Different device adopting the same token → just attach to current device.
  const existing = await db
    .select({ id: pushTokens.id, deviceId: pushTokens.deviceId, revokedAt: pushTokens.revokedAt })
    .from(pushTokens)
    .where(eqToken(token))
    .limit(1)

  if (existing.length === 0) {
    await db.insert(pushTokens).values({
      deviceId: ctx.device.id,
      provider,
      token,
      platform,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    })
  } else {
    const row = existing[0]!
    await db
      .update(pushTokens)
      .set({
        deviceId: ctx.device.id,
        provider,
        platform,
        lastSeenAt: new Date(),
        revokedAt: null,
      })
      .where(eqPushId(row.id))
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/push/register — revoke the current device's push token.
 * Body: { token?: string } — if omitted, revokes all tokens for this device.
 */
export async function DELETE(request: Request) {
  const ctx = getDeviceContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }
  let body: { token?: string } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    // empty body is OK
  }
  const token = body.token?.trim()

  if (token) {
    await db
      .update(pushTokens)
      .set({ revokedAt: new Date() })
      .where(eqToken(token))
  } else {
    await db
      .update(pushTokens)
      .set({ revokedAt: new Date() })
      .where(eqDevice(ctx.device.id))
  }
  return NextResponse.json({ ok: true })
}

// helpers
import { eq as _eq } from "drizzle-orm"
function eqToken(token: string) {
  return _eq(pushTokens.token, token)
}
function eqDevice(id: number) {
  return _eq(pushTokens.deviceId, id)
}
function eqPushId(id: number) {
  return _eq(pushTokens.id, id)
}