import "server-only"

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"

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

/**
 * Pairing codes use a deliberately unambiguous alphabet:
 * - No `0`/`O`, `1`/`I`/`L`, `Z`/`2` confusions
 * - No punctuation (the old base64url version contained `-` and `_`, which
 *   collided with the grouping `-` and made manual entry near-impossible)
 */
const PAIRING_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
const PAIRING_CHUNK = 4
const PAIRING_GROUPS = 4

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export function generatePairingCode(): string {
  const groups: string[] = []
  for (let g = 0; g < PAIRING_GROUPS; g++) {
    let chunk = ""
    for (let i = 0; i < PAIRING_CHUNK; i++) {
      chunk += PAIRING_ALPHABET[randomInt(PAIRING_ALPHABET.length)]!
    }
    groups.push(chunk)
  }
  return groups.join("-")
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