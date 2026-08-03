"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function OfflineNotice({ className }: { className?: string }) {
  const [online, setOnline] = React.useState(true)

  React.useEffect(() => {
    if (typeof navigator === "undefined") return
    setOnline(navigator.onLine)
    const onUp = () => setOnline(true)
    const onDown = () => setOnline(false)
    window.addEventListener("online", onUp)
    window.addEventListener("offline", onDown)
    return () => {
      window.removeEventListener("online", onUp)
      window.removeEventListener("offline", onDown)
    }
  }, [])

  if (online) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 bottom-14 md:bottom-3 z-40 mx-auto max-w-md rounded-md border bg-card px-4 py-2 text-center text-xs text-muted-foreground shadow-md",
        className
      )}
    >
      当前处于离线状态，仅可查看已缓存页面；写入操作需恢复连接后再试。
    </div>
  )
}