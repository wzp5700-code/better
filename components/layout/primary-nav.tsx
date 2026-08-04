"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, BookOpen, Home, CalendarRange, Settings, BookMarked } from "lucide-react"

import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/", label: "今日", icon: Home },
  { href: "/habits", label: "习惯", icon: CalendarDays },
  { href: "/journal", label: "日记", icon: BookOpen },
  { href: "/calendar", label: "日历", icon: CalendarRange },
  { href: "/reading", label: "阅读", icon: BookMarked },
  { href: "/settings/devices", label: "设备", icon: Settings },
] as const

export function PrimaryNav({ orientation = "horizontal" }: { orientation?: "horizontal" | "vertical" }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="主导航"
      className={cn(
        orientation === "horizontal"
          ? "flex items-center gap-1"
          : "flex flex-col gap-1"
      )}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}