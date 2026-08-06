"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import { Bold, Italic, Underline } from "lucide-react"

import { Button } from "@/components/ui/button"

const FONT_SIZES = [
  { label: "默认", value: "" },
  { label: "小", value: "14px" },
  { label: "正常", value: "16px" },
  { label: "大", value: "18px" },
  { label: "特大", value: "22px" },
]

/** 独立工具栏组件 — 由父页面放在编辑区下方，移动端贴底通栏，桌面端悬浮。 */
export function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [chars, setChars] = React.useState(0)

  React.useEffect(() => {
    if (!editor) return
    setChars(editor.storage.characterCount?.characters() ?? 0)
    const onUpdate = () => {
      setChars(editor.storage.characterCount?.characters() ?? 0)
    }
    editor.on("update", onUpdate)
    return () => {
      editor.off("update", onUpdate)
    }
  }, [editor])

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

  const currentFont =
    (editor.getAttributes("textStyle").fontSize as string | undefined) ?? ""

  return (
    <div
      role="toolbar"
      aria-label="格式"
      className="flex items-center justify-center gap-6 border-t bg-card/95 px-2 py-2.5 backdrop-blur md:rounded-md md:border md:border-t md:shadow-sm md:sticky md:bottom-3 md:mt-3 z-10"
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
        "下划线",
        Underline,
        editor.isActive("underline"),
        () => editor.chain().focus().toggleUnderline().run()
      )}
      <span className="mx-2 h-5 w-px bg-border" aria-hidden />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        字号
        <select
          value={currentFont}
          onChange={(e) => {
            const v = e.target.value
            if (v) editor.chain().focus().setFontSize(v).run()
            else editor.chain().focus().unsetFontSize().run()
          }}
          className="h-8 rounded-md border bg-transparent px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="字体大小"
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <span
        className="tabular-nums text-xs text-muted-foreground"
        aria-live="polite"
        aria-label="已写字数"
      >
        {chars} 字
      </span>
    </div>
  )
}
