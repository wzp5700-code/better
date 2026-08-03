import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { authMiddleware } from "@/lib/auth/middleware"

// Force Node.js runtime so we can use node:crypto (hashToken + safeEqual).
export const runtime = "nodejs"

export const config = {
  // Only run on API routes. UI pages don't need Bearer auth at the edge;
  // each API call from a client component attaches the token itself.
  matcher: ["/api/:path*"],
}

export default async function middleware(request: NextRequest) {
  return authMiddleware(request)
}

// Re-export so Next.js treats this as the default export.
export { NextResponse }