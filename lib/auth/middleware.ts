import "server-only"

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { db } from "@/db/client"
import { devices } from "@/db/schema"
import { eq } from "drizzle-orm"

import { hashToken, safeEqual } from "./tokens"

export type AuthedContext = {
  device: {
    id: number
    name: string
    platform: string
    master: boolean
  }
}

const PUBLIC_PATHS = [
  "/api/setup",
  "/api/pair",
  "/api/health",
  "/manifest.webmanifest",
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith("/_next/")) return true
  if (pathname.startsWith("/icons/")) return true
  if (pathname === "/favicon.ico") return true
  if (pathname === "/sw.js") return true
  return false
}

function unauthorized(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Auth middleware. Reads `Authorization: Bearer <token>`, hashes it, looks
 * up the device row, and attaches the device info to downstream request
 * headers (`x-device-id`, `x-device-name`, `x-device-platform`,
 * `x-device-master`) so route handlers can read it cheaply.
 *
 * Public paths (bootstrap / health / static) skip the DB lookup.
 *
 * `/api/pairing-code` is NOT public — it requires a valid Bearer token
 * (master only); the route handler enforces master via getDeviceContext().
 */
export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const auth = request.headers.get("authorization")
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return unauthorized("missing bearer token")
  }
  const token = auth.slice("bearer ".length).trim()
  if (!token) return unauthorized("empty bearer token")

  const tokenHash = hashToken(token)

  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.tokenHash, tokenHash))
    .limit(1)
  if (!device || device.revokedAt != null) {
    return unauthorized("invalid or revoked token")
  }

  // Constant-time check (defense in depth; SQLite already filtered)
  if (!safeEqual(device.tokenHash, tokenHash)) {
    return unauthorized("invalid token")
  }

  // Update last_seen_at opportunistically. Errors here must not break the request.
  try {
    await db
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.id, device.id))
  } catch {
    // ignore
  }

  // Forward the resolved device to downstream via request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-device-id", String(device.id))
  requestHeaders.set("x-device-name", device.name)
  requestHeaders.set("x-device-platform", device.platform)
  requestHeaders.set("x-device-master", device.master ? "1" : "0")

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

/** Convenience for route handlers to extract device context. */
export function getDeviceContext(request: Request): AuthedContext | null {
  const id = Number(request.headers.get("x-device-id") ?? "0")
  const name = request.headers.get("x-device-name") ?? ""
  const platform = request.headers.get("x-device-platform") ?? "unknown"
  const master = request.headers.get("x-device-master") === "1"
  if (!id || !name) return null
  return { device: { id, name, platform, master } }
}