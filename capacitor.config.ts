import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Capacitor wraps the Next.js web app for iOS and Windows desktop.
 *
 *   - appId: bundle id / package id (matches App Store + Microsoft Store)
 *   - appName: human-readable name shown on the splash screen
 *   - webDir: where Next.js outputs the static + server bundle
 *
 * For a true "remote mode" deployment (Capacitor WebView loads the
 * deployed VPS URL), set server.url below to your Caddy-served origin.
 * Alternatively, leave server.url empty to bundle the app into the
 * binary (requires `next export` to produce a static build, not used
 * here because we need server actions + API routes).
 */
const config = {
  appId: "com.personal.growthdesk",
  appName: "个人成长台",
  webDir: ".next",

  ios: {
    contentInset: "automatic",
  },

  windows: {
    // Visual background before WebView is ready. Tuned for zen / dark.
    backgroundColor: "#0f1115",
  },

  server: {
    // Leave empty in production; the app loads from ALLOWED_ORIGINS host.
    // For local dev, set this to http://192.168.x.x:3000 and rebuild.
    url: "",
    cleartext: false,
  },
} as CapacitorConfig & { windows: { backgroundColor: string } }

export default config