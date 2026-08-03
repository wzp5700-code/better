"use client"

import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core"

/**
 * Inline atom node: [[target]] renders as a styled span and stores target
 * + entryId (resolved lazily on the server). The node is `selectable` so
 * backspace at its boundary deletes it cleanly.
 */
export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (attrs: { target: string; entryId?: number | null }) => ReturnType
    }
  }
}

const WIKI_INPUT_RE = /\[\[([^\[\]\n]{1,200})\]\]$/

export const WikiLinkExtension = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      target: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-target") ?? "",
        renderHTML: (attrs) =>
          attrs.target ? { "data-target": String(attrs.target) } : {},
      },
      entryId: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-entry-id")
          return v ? Number(v) : null
        },
        renderHTML: (attrs) =>
          attrs.entryId != null
            ? { "data-entry-id": String(attrs.entryId) }
            : { "data-unresolved": "true" },
      },
      label: {
        default: null,
        parseHTML: (el) => el.textContent ?? "",
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-wiki-link]" }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const target = (node.attrs as { target?: string }).target ?? ""
    const entryId = (node.attrs as { entryId?: number | null }).entryId
    const label =
      (node.attrs as { label?: string | null }).label?.trim() || target
    const dataAttrs = entryId != null
      ? mergeAttributes(
          { "data-wiki-link": "true", "data-target": target, "data-entry-id": String(entryId) },
          HTMLAttributes
        )
      : mergeAttributes(
          {
            "data-wiki-link": "true",
            "data-target": target,
            "data-unresolved": "true",
          },
          HTMLAttributes
        )
    return ["span", dataAttrs, label]
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: WIKI_INPUT_RE,
        type: this.type,
        getAttributes: (match) => ({
          target: match[1]?.trim() ?? "",
          entryId: null,
          label: match[1]?.trim() ?? "",
        }),
      }),
    ]
  },

  addCommands() {
    return {
      insertWikiLink:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              target: attrs.target,
              entryId: attrs.entryId ?? null,
              label: attrs.target,
            },
          })
        },
    }
  },
})