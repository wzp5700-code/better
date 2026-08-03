"use client"

import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    journalTag: {
      insertJournalTag: (attrs: { tag: string }) => ReturnType
    }
  }
}

/**
 * Tag input rule: matches `#foo` only when preceded by start-of-line,
 * whitespace, or punctuation (not part of a URL fragment or word).
 * Allowed tag chars: Chinese, CJK, ASCII letters/digits, underscore, hyphen.
 */
const TAG_INPUT_RE = /(?:^|\s|[(\[,;:!?。，；：、！？「」『』《》])(#([\p{L}\p{N}_-]{1,80}))$/u

export const TagExtension = Node.create({
  name: "journalTag",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      tag: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-tag") ?? "",
        renderHTML: (attrs) => ({ "data-tag": String(attrs.tag) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-journal-tag]" }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const tag = (node.attrs as { tag?: string }).tag ?? ""
    const attrs = mergeAttributes(
      { "data-journal-tag": "true", "data-tag": tag },
      HTMLAttributes
    )
    return ["span", attrs, `#${tag}`]
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: TAG_INPUT_RE,
        type: this.type,
        getAttributes: (match) => ({
          tag: match[2] ?? "",
        }),
      }),
    ]
  },

  addCommands() {
    return {
      insertJournalTag:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { tag: attrs.tag },
          })
        },
    }
  },
})