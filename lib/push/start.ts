import "server-only"

import { dispatchOnce } from "./scheduler"

let started = false
let intervalHandle: ReturnType<typeof setInterval> | null = null

const DEFAULT_INTERVAL_MS = 60_000 // 1 minute

function getIntervalMs(): number {
  const raw = process.env.PUSH_CHECK_INTERVAL_MS
  if (!raw) return DEFAULT_INTERVAL_MS
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1000) return DEFAULT_INTERVAL_MS
  return n
}

export function startPushScheduler(): void {
  if (started) return
  started = true
  const intervalMs = getIntervalMs()
  if (!process.env.FCM_SERVICE_ACCOUNT_JSON_PATH) {
    // Skip silently in dev without secrets; the route handlers / queries
    // still work, just no actual pushes.
    return
  }
  // Run once on boot, then every interval.
  void dispatchOnce().catch((e) => {
    console.error("[push-scheduler] initial dispatch failed:", e)
  })
  intervalHandle = setInterval(() => {
    void dispatchOnce().catch((e) => {
      console.error("[push-scheduler] dispatch failed:", e)
    })
  }, intervalMs)
  // Don't keep the Node process alive just for the scheduler.
  if (typeof intervalHandle === "object" && intervalHandle && "unref" in intervalHandle) {
    ;(intervalHandle as unknown as { unref: () => void }).unref()
  }
}

export function stopPushScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
  started = false
}