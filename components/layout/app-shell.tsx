import * as React from "react"
import Link from "next/link"

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
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground">主题</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          王彦昊迭代平台
        </Link>
        <ThemeToggle />
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