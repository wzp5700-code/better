import { describe, expect, it } from "vitest"

import {
  extractTags,
  extractWikiLinks,
  normalizeTag,
  renderJournalHtml,
} from "@/lib/services/journal-parser"

describe("normalizeTag", () => {
  it("strips leading #, trims, NFKC, lowercases", () => {
    expect(normalizeTag("#Hello ")).toBe("hello")
    expect(normalizeTag("  反思  ")).toBe("反思")
    expect(normalizeTag("#Weekly_Review")).toBe("weekly_review")
  })

  it("caps length", () => {
    expect(normalizeTag("a".repeat(200)).length).toBeLessThanOrEqual(80)
  })

  it("returns empty for empty input", () => {
    expect(normalizeTag("")).toBe("")
    expect(normalizeTag("###")).toBe("")
    expect(normalizeTag("   ")).toBe("")
  })
})

describe("extractTags", () => {
  it("collects journalTag nodes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "hello " },
            { type: "journalTag", attrs: { tag: "反思" } },
            { type: "text", text: " and " },
            { type: "journalTag", attrs: { tag: "weekly_review" } },
          ],
        },
      ],
    }
    expect(new Set(extractTags(doc))).toEqual(new Set(["反思", "weekly_review"]))
  })

  it("deduplicates case-insensitively after normalization", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "journalTag", attrs: { tag: "Hello" } },
            { type: "journalTag", attrs: { tag: "HELLO" } },
          ],
        },
      ],
    }
    expect(extractTags(doc)).toEqual(["hello"])
  })

  it("empty doc → []", () => {
    expect(extractTags(null)).toEqual([])
    expect(extractTags({})).toEqual([])
  })
})

describe("extractWikiLinks", () => {
  it("collects wikiLink nodes with target and optional entryId", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "see " },
            {
              type: "wikiLink",
              attrs: { target: "entry:42", entryId: 42, label: "42" },
            },
            { type: "text", text: " and " },
            {
              type: "wikiLink",
              attrs: { target: "floating", entryId: null },
            },
          ],
        },
      ],
    }
    const links = extractWikiLinks(doc)
    expect(links).toHaveLength(2)
    expect(links[0]?.target).toBe("entry:42")
    expect(links[0]?.entryId).toBe(42)
    expect(links[1]?.target).toBe("floating")
    expect(links[1]?.entryId).toBe(null)
  })

  it("deduplicates same entry+target", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "wikiLink", attrs: { target: "x", entryId: 1 } },
            { type: "wikiLink", attrs: { target: "x", entryId: 1 } },
          ],
        },
      ],
    }
    expect(extractWikiLinks(doc)).toHaveLength(1)
  })
})

describe("renderJournalHtml", () => {
  it("renders paragraphs, headings, marks safely", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "标题" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold ", marks: [{ type: "bold" }] },
            { type: "text", text: "<script>alert(1)</script>" },
          ],
        },
      ],
    }
    const html = renderJournalHtml(doc)
    expect(html).toContain("<h2>标题</h2>")
    expect(html).toContain("<strong>bold </strong>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
  })

  it("renders tag and wiki-link as anchor", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "see " },
            { type: "wikiLink", attrs: { target: "entry:7", entryId: 7 } },
            { type: "text", text: " " },
            { type: "journalTag", attrs: { tag: "复盘" } },
          ],
        },
      ],
    }
    const html = renderJournalHtml(doc)
    expect(html).toContain('data-wiki-link')
    expect(html).toContain('data-entry-id="7"')
    expect(html).toContain('data-journal-tag')
    expect(html).toContain('data-tag="复盘"')
  })

  it("emits data-unresolved for unresolved wiki-links", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "wikiLink", attrs: { target: "floating", entryId: null } },
          ],
        },
      ],
    }
    const html = renderJournalHtml(doc)
    expect(html).toContain('data-unresolved="true"')
  })
})