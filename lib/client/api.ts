"use client"

import { getToken, clearToken } from "./auth-storage"

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/**
 * Authenticated fetch. Adds `Authorization: Bearer <token>` from
 * localStorage. On 401, clears the token and reloads the page so the
 * setup wizard can run again.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`)
  }
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401 && token) {
    // token invalid / revoked — reset and reload
    clearToken()
    if (typeof window !== "undefined") {
      window.location.href = "/settings/setup"
    }
    throw new ApiError("会话已失效", 401, null)
  }
  return res
}

export async function apiJson<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(input, init)
  const text = await res.text()
  const body: unknown = text ? safeJson(text) : null
  if (!res.ok) {
    const message =
      isErrorBody(body) && body.error ? body.error : `HTTP ${res.status}`
    throw new ApiError(message, res.status, body)
  }
  return body as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isErrorBody(b: unknown): b is { error?: string } {
  return typeof b === "object" && b != null && "error" in b
}