import * as React from "react"
import Link from "next/link"
import { Settings, CalendarRange } from "lucide-react"

import { PrimaryNav } from "@/components/layout/primary-nav"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Separator } from "@/components/ui/separator"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      {/* desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-card/40 md:px-4 md:py-6">
        <div className="mb-6 px-2">
          <Link href="/" className="text-base font-semibold tracking-tight">
            王彦昊迭代平台
          </Link>
        </div>
        <PrimaryNav orientation="vertical" />
        <div className="mt-auto pt-6">
          <Separator className="mb-4" />
          <div className="space-y-1">
            <Link
              href="/calendar"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <CalendarRange className="h-4 w-4" aria-hidden />
              <span>日历</span>
            </Link>
            <Link
              href="/settings/devices"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4" aria-hidden />
              <span>设备</span>
            </Link>
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">主题</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          王彦昊迭代平台
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/calendar"
            aria-label="日历"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <CalendarRange className="h-4 w-4" />
          </Link>
          <Link
            href="/settings/devices"
            aria-label="设备"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 min-w-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>

      {/* mobile bottom nav */}
      <nav
        aria-label="主导航（移动端）"
        className="md:hidden sticky bottom-0 z-10 flex border-t bg-background/95 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-around py-2">
          <PrimaryNav orientation="horizontal" />
        </div>
      </nav>
    </div>
  )
}