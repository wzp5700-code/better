import "server-only"

import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

/**
 * Tokens are 32-byte random strings, base64url-encoded.
 * We never store the raw token; only a SHA-256 hash. The client gets the
 * raw token exactly once. On every request, we hash the bearer and look it up.
 *
 * Hashing (rather than HMAC with a server secret) keeps the DB self-contained:
 * a stolen DB dump does not let an attacker forge tokens, because the secret
 * lives only in the device's memory. A leaked DB lets the attacker read
 * tokens, which is the same as a leaked token. So SHA-256 is fine.
 */

const TOKEN_BYTES = 32
const PAIRING_CODE_BYTES = 16

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export function generatePairingCode(): string {
  // 16 bytes → 22 base64url chars (no padding). Group into 4 fixed-width
  // chunks (5-6-5-6) for readability. Explicit slicing avoids regex
  // splitting on `-` / `_` characters which are valid in base64url.
  const raw = randomBytes(PAIRING_CODE_BYTES).toString("base64url")
  return [
    raw.slice(0, 5),
    raw.slice(5, 11),
    raw.slice(11, 16),
    raw.slice(16, 22),
  ]
    .join("-")
    .toUpperCase()
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Constant-time string comparison for hashes. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
}

export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000 // 5 minutes