"use client"

import * as React from "react"
import dynamic from "next/dynamic"

const JournalEditor = dynamic(
  () => import("./journal-editor").then((m) => m.JournalEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border bg-card">
        <div className="px-4 py-6 text-sm text-muted-foreground">编辑器加载中…</div>
      </div>
    ),
  }
)

export const JournalEditorLoader = JournalEditor
export type { JournalEditorHandle } from "./journal-editor"