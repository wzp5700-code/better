"use client"

import * as React from "react"
import { X, Share, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * PWA install hint.
 *
 * - On Chrome/Edge (desktop & Android): we get the `beforeinstallprompt` event
 *   and can offer a one-click "Install" button.
 * - On iOS Safari: no event. We show a small instruction card with the
 *   "Share → Add to Home Screen" steps instead.
 * - When the app is already installed (navigator.standalone / display-mode),
 *   the banner is hidden automatically.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = React.useState<null | Event>(null)
  const [dismissed, setDismissed] = React.useState(false)
  const [installed, setInstalled] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    // Detect if already running as installed PWA
    if (typeof window === "undefined") return
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // iOS Safari
      (window.navigator as { standalone?: boolean }).standalone === true
    setInstalled(isStandalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  // Don't show if installed or user dismissed
  if (installed || dismissed) return null

  // iOS Safari (no beforeinstallprompt event) — show instructions
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as { MSStream?: unknown }).MSStream
  const showIOSGuide = isIOS && !deferred
  // Chrome/Edge — offer one-click install
  const showChromeButton = !!deferred

  if (!showIOSGuide && !showChromeButton) return null

  return (
    <div
      role="region"
      aria-label="安装应用"
      className={cn(
        "fixed bottom-14 right-3 z-30 max-w-[320px] md:bottom-4",
        "animate-in fade-in slide-in-from-bottom-4"
      )}
    >
      <Card className="border-border/60 bg-card/95 shadow-lg backdrop-blur">
        <CardContent className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">
              添加到主屏幕
            </p>
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {showIOSGuide ? (
            <ol className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5">1.</span>
                <span>
                  点底部 <Share className="inline h-3 w-3" />{" "}
                  <strong>分享</strong> 按钮
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5">2.</span>
                <span>
                  选 <strong>添加到主屏幕</strong>
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5">3.</span>
                <span>点右上角 <strong>添加</strong></span>
              </li>
            </ol>
          ) : null}
          {showChromeButton ? (
            <Button
              size="sm"
              className="w-full"
              onClick={async () => {
                if (!deferred) return
                // prompt() is the legacy API but still works in Chromium
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(deferred as unknown as { prompt: () => Promise<void> }).prompt?.()
                setDismissed(true)
              }}
            >
              <Plus className="h-4 w-4" /> 安装到桌面
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
