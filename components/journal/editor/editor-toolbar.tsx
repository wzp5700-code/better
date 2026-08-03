"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import { Bold, Italic, Code, Heading2, List, Quote } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null
  const btn = (
    label: string,
    Icon: typeof Bold,
    active: boolean,
    onClick: () => void
  ) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="h-8 w-8 p-0"
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
  return (
    <div
      role="toolbar"
      aria-label="格式"
      className="flex items-center gap-1 border-b bg-card/50 px-2 py-1.5"
    >
      {btn(
        "加粗",
        Bold,
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run()
      )}
      {btn(
        "斜体",
        Italic,
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run()
      )}
      {btn(
        "行内代码",
        Code,
        editor.isActive("code"),
        () => editor.chain().focus().toggleCode().run()
      )}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      {btn(
        "二级标题",
        Heading2,
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run()
      )}
      {btn(
        "无序列表",
        List,
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run()
      )}
      {btn(
        "引用",
        Quote,
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run()
      )}
      <div className="ml-auto pr-1 text-xs text-muted-foreground">
        输入 <kbd className={cn("rounded border px-1 font-mono text-[10px]")}>[[</kbd>{" "}
        插入引用 · 输入{" "}
        <kbd className={cn("rounded border px-1 font-mono text-[10px]")}>#</kbd>{" "}
        添加标签
      </div>
    </div>
  )
}