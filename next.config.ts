import type { NextConfig } from "next"

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  // output: "standalone" for VPS Docker build (Linux); disable on Windows
  // to avoid symlink EPERM errors. Toggle via env if needed.
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // instrumentation.ts runs once at boot (Next.js 15: top-level)
  instrumentationHook: true,
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        // Capacitor WebView loads the app from a different origin; allow it
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
  // Surface ALLOWED_ORIGINS to the runtime; client components can read it
  // via NEXT_PUBLIC_* if we choose to expose it later.
  env: {
    ALLOWED_ORIGINS: allowedOrigins.join(","),
  },
}

export default nextConfig