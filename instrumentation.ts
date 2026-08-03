/**
 * Next.js instrumentation hook. Runs once on server boot.
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPushScheduler } = await import("@/lib/push/start")
    startPushScheduler()
  }
}