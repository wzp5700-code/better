"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { hasToken } from "@/lib/client/auth-storage"

/**
 * Global auth guard. If the user has no token (e.g. a fresh PWA install,
 * or a new browser), redirect them to the setup/pairing page so they don't
 * stare at "加载失败" errors.
 *
 * `hasToken()` is async-safe (localStorage read) — runs client-side after mount.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (hasToken()) return

    const current = pathname ?? ""
    // Don't bounce off the setup page itself
    if (current === "/settings/setup") return
    // Allow dev/static pages through untouched (nothing else needs auth pre-check)
    if (current.startsWith("/api/")) return

    router.replace("/settings/setup")
  }, [pathname, router])

  return <>{children}</>
}