import { describe, expect, it } from "vitest"

import {
  createJournalInput,
  moodLabelForScore,
  MOOD_LABELS,
} from "@/lib/validation/journal"

describe("createJournalInput", () => {
  it("null/null mood is OK", () => {
    const r = createJournalInput.safeParse({
      entryDate: 20260802,
      content: "今天很平静。",
      moodScore: null,
      moodLabel: null,
    })
    expect(r.success).toBe(true)
  })

  it("missing mood fields is OK", () => {
    const r = createJournalInput.safeParse({
      entryDate: 20260802,
      content: "",
    })
    expect(r.success).toBe(true)
  })

  it("score without label rejected", () => {
    const r = createJournalInput.safeParse({
      entryDate: 20260802,
      content: "",
      moodScore: 3,
      moodLabel: null,
    })
    expect(r.success).toBe(false)
  })

  it("label without score rejected", () => {
    const r = createJournalInput.safeParse({
      entryDate: 20260802,
      content: "",
      moodScore: null,
      moodLabel: "平静",
    })
    expect(r.success).toBe(false)
  })

  it("score 0, 6, 1.5 rejected", () => {
    for (const score of [0, 6, 1.5]) {
      const r = createJournalInput.safeParse({
        entryDate: 20260802,
        content: "",
        moodScore: score,
        moodLabel: "平静",
      })
      expect(r.success).toBe(false)
    }
  })

  it("score/label mapping mismatch rejected", () => {
    const r = createJournalInput.safeParse({
      entryDate: 20260802,
      content: "",
      moodScore: 5,
      moodLabel: "低落",
    })
    expect(r.success).toBe(false)
  })

  it("valid score 3 → 平静 accepted", () => {
    const r = createJournalInput.safeParse({
      entryDate: 20260802,
      content: "",
      moodScore: 3,
      moodLabel: "平静",
    })
    expect(r.success).toBe(true)
  })

  it("invalid date key rejected", () => {
    const r = createJournalInput.safeParse({
      entryDate: 20260230,
      content: "",
    })
    expect(r.success).toBe(false)
  })
})

describe("moodLabelForScore", () => {
  it("maps 1..5 to labels", () => {
    expect(moodLabelForScore(1)).toBe("低落")
    expect(moodLabelForScore(2)).toBe("偏低")
    expect(moodLabelForScore(3)).toBe("平静")
    expect(moodLabelForScore(4)).toBe("愉快")
    expect(moodLabelForScore(5)).toBe("很好")
  })

  it("rejects out-of-range", () => {
    expect(() => moodLabelForScore(0)).toThrow()
    expect(() => moodLabelForScore(6)).toThrow()
  })

  it("labels list length 5", () => {
    expect(MOOD_LABELS.length).toBe(5)
  })
})