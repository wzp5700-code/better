import { useMutation } from "@tanstack/react-query"

import { apiFetch } from "@/lib/client/api"

export interface RegisterPushInput {
  token: string
  provider?: "fcm" | "apns" | "webpush" | "ntfy"
  platform: string
}

export function useRegisterPushMutation() {
  return useMutation({
    mutationFn: (input: RegisterPushInput) =>
      apiFetch("/api/push/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }).then((r) => {
        if (!r.ok) throw new Error(`register push: ${r.status}`)
        return r.json()
      }),
  })
}

export function useRevokePushMutation() {
  return useMutation({
    mutationFn: (token?: string) =>
      apiFetch("/api/push/register", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(token ? { token } : {}),
      }).then((r) => {
        if (!r.ok) throw new Error(`revoke push: ${r.status}`)
        return r.json()
      }),
  })
}