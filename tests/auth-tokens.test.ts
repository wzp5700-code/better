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
    // The output contains raw base64url chars, which may include `-` and `_`
    // that confuse a naive split. We check the high-level structure: the
    // dashed-string is built from 4 contiguous chunks of the 22-char
    // base64url string, joined by 3 dashes. Total length = 22 + 3 = 25
    // (the joining dashes add 3; base64url chars inside chunks don't add).
    expect(c).toMatch(/^[A-Z0-9_-]{4,6}-[A-Z0-9_-]{4,6}-[A-Z0-9_-]{4,6}-[A-Z0-9_-]{4,6}$/)
    expect(c.length).toBe(25)
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