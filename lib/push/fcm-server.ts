import "server-only"

import { readFileSync } from "node:fs"

import { GoogleAuth } from "google-auth-library"

/**
 * FCM HTTP v1 API client. Single dependency: `google-auth-library`
 * (mints access tokens from the service-account JSON).
 *
 * Configure via env:
 *   FCM_SERVICE_ACCOUNT_JSON_PATH — absolute path to the service account JSON
 *   FCM_PROJECT_ID                — optional; defaults to the project_id inside the JSON
 *
 * If `FCM_SERVICE_ACCOUNT_JSON_PATH` is unset (e.g., local dev), all calls
 * are no-ops and `isFcmConfigured()` returns false. The scheduler skips
 * silently in that case.
 */

interface ServiceAccountJson {
  type: string
  project_id: string
  client_email: string
  private_key: string
  // other fields we ignore
  [k: string]: unknown
}

let cached:
  | {
      auth: GoogleAuth
      projectId: string
    }
  | null
  | { error: string } = null

function loadCredentials(): { auth: GoogleAuth; projectId: string } | { error: string } {
  if (cached) return cached
  const path = process.env.FCM_SERVICE_ACCOUNT_JSON_PATH
  if (!path) {
    const out = { error: "FCM_SERVICE_ACCOUNT_JSON_PATH not set" }
    cached = out
    return out
  }
  let raw: ServiceAccountJson
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as ServiceAccountJson
  } catch (e) {
    const out = {
      error: `failed to read FCM service account JSON at ${path}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    }
    cached = out
    return out
  }
  if (!raw.project_id || !raw.client_email || !raw.private_key) {
    const out = {
      error: `FCM service account JSON missing required fields (project_id / client_email / private_key)`,
    }
    cached = out
    return out
  }
  const auth = new GoogleAuth({
    credentials: {
      type: raw.type,
      project_id: raw.project_id,
      client_email: raw.client_email,
      private_key: raw.private_key,
    },
    // Scope required for FCM HTTP v1
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  })
  cached = { auth, projectId: process.env.FCM_PROJECT_ID ?? raw.project_id }
  return cached
}

export function isFcmConfigured(): boolean {
  return !("error" in loadCredentials())
}

interface FcmMessageInput {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

interface FcmSendResult {
  ok: boolean
  messageId?: string
  error?: string
  /** Set when the token is permanently invalid (UNREGISTERED). */
  tokenInvalid?: boolean
}

const FCM_ENDPOINT = (projectId: string) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

/**
 * Send one FCM message. Caches the access token until it expires (~1 hour).
 */
export async function sendFcmMessage(input: FcmMessageInput): Promise<FcmSendResult> {
  const c = loadCredentials()
  if ("error" in c) {
    return { ok: false, error: c.error }
  }
  let accessToken: string
  try {
    const client = await c.auth.getClient()
    const tokenResp = await client.getAccessToken()
    accessToken = tokenResp.token ?? ""
  } catch (e) {
    return { ok: false, error: `auth: ${e instanceof Error ? e.message : String(e)}` }
  }
  if (!accessToken) {
    return { ok: false, error: "no access token from google-auth-library" }
  }
  const res = await fetch(FCM_ENDPOINT(c.projectId), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token: input.token,
        notification: {
          title: input.title,
          body: input.body,
        },
        data: input.data,
        apns: {
          payload: {
            aps: {
              sound: "default",
              "thread-id": input.data?.habitId ?? "growthdesk",
            },
          },
        },
        android: {
          priority: "HIGH",
          notification: {
            sound: "default",
            click_action: "OPEN_HABIT",
          },
        },
      },
    }),
  })

  if (res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      name?: string
    }
    return { ok: true, messageId: body.name }
  }

  const text = await res.text().catch(() => "")
  // UNREGISTERED = token is permanently invalid; caller should mark revoked.
  let tokenInvalid = false
  try {
    const parsed = JSON.parse(text) as {
      error?: { details?: Array<{ errorCode?: string }> }
    }
    const code = parsed.error?.details?.[0]?.errorCode
    if (code === "UNREGISTERED" || code === "INVALID_ARGUMENT") {
      tokenInvalid = true
    }
  } catch {
    // ignore parse errors
  }
  return {
    ok: false,
    error: `FCM ${res.status}: ${text.slice(0, 200)}`,
    tokenInvalid,
  }
}