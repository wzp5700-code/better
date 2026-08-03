"use client"

import * as React from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"

import { EditorToolbar } from "./editor-toolbar"
import { WikiLinkExtension } from "../extensions/wiki-link-extension"
import { TagExtension } from "../extensions/tag-extension"

export interface JournalEditorHandle {
  getJson: () => unknown
  isEmpty: () => boolean
  reset: (content: unknown) => void
}

export const JournalEditor = React.forwardRef<
  JournalEditorHandle,
  {
    initialContent: unknown
    placeholder?: string
    onUpdate?: () => void
  }
>(function JournalEditor({ initialContent, placeholder, onUpdate }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // we don't need these yet; keep editor light
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "写下今天的一个想法。",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      WikiLinkExtension,
      TagExtension,
    ],
    content: initialContent ?? { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    onUpdate: () => onUpdate?.(),
    editorProps: {
      attributes: {
        class:
          "prose-journal min-h-[180px] max-w-none px-4 py-3 focus:outline-none",
      },
    },
  })

  React.useImperativeHandle(ref, () => ({
    getJson: () => editor?.getJSON() ?? { type: "doc", content: [{ type: "paragraph" }] },
    isEmpty: () => editor?.isEmpty ?? true,
    reset: (content) => {
      editor?.commands.setContent(content ?? { type: "doc", content: [{ type: "paragraph" }] })
    },
  }))

  if (!editor) {
    return (
      <div className="rounded-md border bg-card">
        <div className="px-4 py-6 text-sm text-muted-foreground">编辑器加载中…</div>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
})