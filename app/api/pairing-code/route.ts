import "server-only"
import { NextResponse } from "next/server"

import { mintPairingCode } from "@/lib/auth/pairing"
import { getDeviceContext } from "@/lib/auth/middleware"

export const runtime = "nodejs"

/**
 * POST /api/pairing-code
 *
 * Master-only. Returns a short-lived pairing code that the user enters
 * (or scans a QR for) on the new device.
 */
export async function POST(request: Request) {
  const ctx = getDeviceContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }
  if (!ctx.device.master) {
    return NextResponse.json(
      { error: "只有主设备可以生成配对码" },
      { status: 403 }
    )
  }

  const code = await mintPairingCode(ctx.device.id)
  return NextResponse.json({
    pairingCode: code.code,
    expiresAt: code.expiresAt.toISOString(),
  })
}