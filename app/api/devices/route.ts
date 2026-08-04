import "server-only"
import { NextResponse } from "next/server"

import { db } from "@/db/client"
import { devices } from "@/db/schema"
import { desc, eq, isNull } from "drizzle-orm"
import { getDeviceContext } from "@/lib/auth/middleware"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const ctx = getDeviceContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  // Only show connected devices (not revoked). Revoked rows are hard-deleted
  // on revoke, so this is a defensive filter as well.
  const rows = await db
    .select({
      id: devices.id,
      name: devices.name,
      platform: devices.platform,
      master: devices.master,
      createdAt: devices.createdAt,
      lastSeenAt: devices.lastSeenAt,
      revokedAt: devices.revokedAt,
    })
    .from(devices)
    .where(isNull(devices.revokedAt))
    .orderBy(desc(devices.createdAt))

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "no-store" },
  })
}

export async function DELETE(request: Request) {
  const ctx = getDeviceContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }
  let body: { id?: number } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const id = Number(body.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  if (id === ctx.device.id) {
    return NextResponse.json(
      { error: "不能撤销当前正在使用的设备" },
      { status: 400 }
    )
  }
  // master can revoke anyone except self; non-master can revoke themselves
  if (!ctx.device.master) {
    // non-master can only revoke themselves
    if (id !== ctx.device.id) {
      return NextResponse.json(
        { error: "无权撤销其他设备" },
        { status: 403 }
      )
    }
  } else {
    // master cannot revoke itself (handled above)
    // master also cannot revoke another master (defensive)
    const [target] = await db
      .select({ master: devices.master })
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1)
    if (!target) {
      return NextResponse.json({ error: "设备不存在" }, { status: 404 })
    }
    if (target.master) {
      return NextResponse.json(
        { error: "不能撤销另一个主设备" },
        { status: 400 }
      )
    }
  }

  // Hard-delete the device row (FK cascades push_tokens / pairing_codes).
  // This removes revoked devices entirely so the list only shows connected ones.
  await db.delete(devices).where(eq(devices.id, id))

  return NextResponse.json({ ok: true })
}
