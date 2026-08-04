import { describe, expect, it } from "vitest"

import {
  generatePairingCode,
  generateToken,
  hashToken,
  PAIRING_CODE_TTL_MS,
  safeEqual,
} from "@/lib/auth/tokens"

describe("auth/tokens", () => {
  it("generateToken produces 43-char base64url", () => {
    const t = generateToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it("generateToken is unique across calls", () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).not.toBe(b)
  })

  it("generatePairingCode has the XXXX-XXXX-XXXX-XXXX shape", () => {
    const c = generatePairingCode()
    // Unambiguous alphabet: 4 groups of 4 chars each, no punctuation.
    // Alphabet = 23456789 + ABCDEFGHJKMNPQRSTUVWXYZ (no 0/1/I/L/O).
    // Total length = 4*4 + 3 dashes = 19.
    expect(c).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/)
    expect(c.length).toBe(19)
    // Sanity: no truly ambiguous chars (0, 1, I, L, O)
    expect(c).not.toMatch(/[01ILO]/)
  })

  it("hashToken is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"))
    expect(hashToken("abc")).not.toBe(hashToken("def"))
  })

  it("safeEqual handles equal/unequal/different length", () => {
    expect(safeEqual(hashToken("x"), hashToken("x"))).toBe(true)
    expect(safeEqual(hashToken("x"), hashToken("y"))).toBe(false)
    // different-length strings → false (no throw)
    expect(safeEqual("aa", "aaa")).toBe(false)
  })

  it("PAIRING_CODE_TTL_MS is 5 minutes", () => {
    expect(PAIRING_CODE_TTL_MS).toBe(5 * 60 * 1000)
  })
})