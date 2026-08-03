/**
 * Parse TipTap JSON document to extract tags and wiki-links.
 * The TipTap schema we use: paragraph, heading, blockquote, bulletList, orderedList, listItem,
 * codeBlock, hardBreak, text nodes. Tags render as inline atom nodes `journalTag`
 * (attrs.tag). Wiki-links render as inline atom nodes `wikiLink` (attrs.target, attrs.entryId).
 *
 * Server is the source of truth: we re-parse and re-materialize tags/links on every save.
 */

const ALLOWED_NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "hardBreak",
  "text",
])

export interface TipTapNode {
  type?: string
  text?: string
  marks?: Array<{ type?: string }>
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
}

export interface ParsedWikiLink {
  target: string
  entryId: number | null
  position: number
}

const WIKI_TARGET_RE = /^\[\[([\s\S]+?)\]\]$/

/** Recursively walk the doc and collect node positions. */
function* walk(
  node: TipTapNode,
  parent: "root" | "tag" | "wiki" = "root"
): Generator<{ kind: "tag" | "wiki"; target: string; entryId: number | null; position: number }> {
  if (!node) return
  if (node.type === "journalTag" && node.attrs && typeof node.attrs.tag === "string") {
    yield {
      kind: "tag",
      target: node.attrs.tag,
      entryId: typeof node.attrs.entryId === "number" ? node.attrs.entryId : null,
      position: 0,
    }
  }
  if (node.type === "wikiLink" && node.attrs && typeof node.attrs.target === "string") {
    yield {
      kind: "wiki",
      target: node.attrs.target,
      entryId: typeof node.attrs.entryId === "number" ? node.attrs.entryId : null,
      position: 0,
    }
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) yield* walk(child, parent)
  }
}

/**
 * Normalize a tag: NFKC, trim, lowercase, strip leading "#".
 * Preserve Chinese and CJK characters.
 */
export function normalizeTag(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .slice(0, 80)
}

/** Extract unique normalized tags from a TipTap doc. */
export function extractTags(doc: unknown): string[] {
  if (!doc || typeof doc !== "object") return []
  const set = new Set<string>()
  for (const item of walk(doc as TipTapNode)) {
    if (item.kind === "tag") {
      const t = normalizeTag(item.target)
      if (t) set.add(t)
    }
  }
  return Array.from(set)
}

/** Extract wiki-link targets with their entry id (best-effort). */
export function extractWikiLinks(doc: unknown): ParsedWikiLink[] {
  if (!doc || typeof doc !== "object") return []
  const out: ParsedWikiLink[] = []
  const seen = new Set<string>()
  for (const item of walk(doc as TipTapNode)) {
    if (item.kind === "wiki") {
      const key = `${item.entryId ?? "u"}::${item.target}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        target: item.target.slice(0, 200),
        entryId: item.entryId,
        position: out.length,
      })
    }
  }
  return out
}

/**
 * Serialize a TipTap doc to safe HTML. We do NOT trust client input — only
 * the JSON is the source of truth, and this renders a minimal subset.
 */
export function renderJournalHtml(doc: unknown): string {
  if (!doc || typeof doc !== "object") return ""
  return renderNode(doc as TipTapNode, "body")
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function escapeAttr(s: string): string {
  return escapeText(s)
}

function renderInline(node: TipTapNode): string {
  if (!node) return ""
  if (node.type === "text") {
    let html = escapeText(node.text ?? "")
    if (Array.isArray(node.marks)) {
      for (const m of node.marks) {
        if (m.type === "bold") html = `<strong>${html}</strong>`
        else if (m.type === "italic") html = `<em>${html}</em>`
        else if (m.type === "code") html = `<code>${html}</code>`
        else if (m.type === "link" && node.attrs && typeof node.attrs.href === "string") {
          html = `<a href="${escapeAttr(node.attrs.href)}" target="_blank" rel="noopener noreferrer">${html}</a>`
        }
      }
    }
    return html
  }
  if (node.type === "hardBreak") return "<br />"
  if (node.type === "wikiLink" && node.attrs && typeof node.attrs.target === "string") {
    const target = escapeAttr(node.attrs.target)
    const label = escapeText(((node.content?.[0] as TipTapNode | undefined)?.text) ?? node.attrs.target)
    const entryIdAttr =
      typeof node.attrs.entryId === "number"
        ? ` data-entry-id="${escapeAttr(String(node.attrs.entryId))}"`
        : ` data-unresolved="true"`
    return `<a href="/journal?target=${encodeURIComponent(target)}" data-wiki-link data-target="${target}"${entryIdAttr}>${label}</a>`
  }
  if (node.type === "journalTag" && node.attrs && typeof node.attrs.tag === "string") {
    const tag = escapeAttr(node.attrs.tag)
    return `<a href="/journal?tag=${encodeURIComponent(tag)}" data-journal-tag data-tag="${tag}">#${escapeText(tag)}</a>`
  }
  if (Array.isArray(node.content)) {
    return node.content.map(renderInline).join("")
  }
  return ""
}

function renderNode(node: TipTapNode, ctx: "body" | "list" | "listItem" | "blockquote" | "code"): string {
  if (!node || !node.type) return ""
  if (!ALLOWED_NODE_TYPES.has(node.type) && !["wikiLink", "journalTag"].includes(node.type)) {
    return ""
  }
  const inner = (n: TipTapNode) => renderNode(n, "body")
  const inline = (n: TipTapNode) => renderInline(n)

  switch (node.type) {
    case "doc":
      return (node.content ?? []).map((c) => renderNode(c, "body")).join("")
    case "paragraph":
      return `<p>${(node.content ?? []).map(inline).join("")}</p>`
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)))
      return `<h${level}>${(node.content ?? []).map(inline).join("")}</h${level}>`
    }
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map((c) => renderNode(c, "blockquote")).join("")}</blockquote>`
    case "bulletList":
      return `<ul>${(node.content ?? []).map((c) => renderNode(c, "list")).join("")}</ul>`
    case "orderedList":
      return `<ol>${(node.content ?? []).map((c) => renderNode(c, "list")).join("")}</ol>`
    case "listItem":
      return `<li>${(node.content ?? []).map((c) => renderNode(c, "listItem")).join("")}</li>`
    case "codeBlock":
      return `<pre><code>${escapeText((node.content ?? []).map((c) => c.text ?? "").join(""))}</code></pre>`
    case "hardBreak":
      return "<br />"
    default:
      if (ctx === "listItem" || ctx === "list") return inline(node)
      if (ctx === "blockquote") return `<p>${inline(node)}</p>`
      return inline(node)
  }
}

/** Validate that the JSON shape is something we can render. */
export function isValidTipTapDoc(doc: unknown): doc is TipTapNode {
  if (!doc || typeof doc !== "object") return false
  const n = doc as TipTapNode
  return typeof n.type === "string"
}

/** Build an empty TipTap doc with one empty paragraph. */
export function emptyDoc(): TipTapNode {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  }
}

/** Parse a markdown-ish string into a tiny TipTap doc (MVP convenience, optional). */
export function docFromPlainText(text: string): TipTapNode {
  const lines = text.split(/\r?\n/)
  const paragraphs: TipTapNode[] = []
  let buffer: TipTapNode[] = []
  const flush = () => {
    if (buffer.length === 0) return
    paragraphs.push({ type: "paragraph", content: buffer })
    buffer = []
  }
  for (const line of lines) {
    if (line.trim() === "") {
      flush()
      continue
    }
    buffer.push({ type: "text", text: line })
  }
  flush()
  if (paragraphs.length === 0) paragraphs.push({ type: "paragraph" })
  return { type: "doc", content: paragraphs }
}

// Re-export for tests
export const __parserInternals = { WIKI_TARGET_RE }