"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ChevronLeft, Save } from "lucide-react"
import type { Editor } from "@tiptap/react"

import { Button } from "@/components/ui/button"
import {
  JournalEditorLoader,
  type JournalEditorHandle,
} from "@/components/journal/editor/journal-editor-loader"
import { EditorToolbar } from "@/components/journal/editor/editor-toolbar"
import { CategoryPicker } from "@/components/journal/category-picker-popover"
import { useCreateJournalMutation } from "@/lib/queries/journal"
import { isValidDateKey, todayDateKey } from "@/lib/dates"
import { LoadingBlock } from "@/components/shared/loading-block"

function NewJournalInner() {
  const router = useRouter()
  const params = useSearchParams()
  const dateParam = params.get("date")
  const entryDate =
    dateParam && isValidDateKey(Number(dateParam))
      ? Number(dateParam)
      : todayDateKey()

  const editorRef = React.useRef<JournalEditorHandle>(null)
  const [toolbarEditor, setToolbarEditor] = React.useState<Editor | null>(null)
  const [categoryId, setCategoryId] = React.useState<number | null>(null)
  const [dirty, setDirty] = React.useState(false)
  const create = useCreateJournalMutation()

  const onSave = async () => {
    const handle = editorRef.current
    if (!handle || handle.isEmpty()) {
      toast.error("内容不能为空")
      return
    }
    const json = handle.getJson()
    const res = await create.mutateAsync({
      entryDate,
      content: json as never,
      moodScore: null,
      moodLabel: null,
      categoryId,
    })
    if (res.ok) {
      toast.success("已保存")
      router.push(`/journal/${res.data.id}`)
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="flex flex-col h-dvh md:h-auto">
      {/* 顶部条：左 = 返回 / 中 = 分类（可新增+选择）/ 右 = 保存 */}
      <div className="flex items-center gap-2 shrink-0 px-1 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" size="icon" asChild aria-label="返回">
          <Link href="/journal">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex-1 flex justify-center">
          <CategoryPicker
            value={categoryId}
            onChange={(id) => {
              setCategoryId(id)
              setDirty(true)
            }}
          />
        </div>

        <Button
          variant={dirty ? "default" : "ghost"}
          size="sm"
          onClick={onSave}
          disabled={create.isPending}
          aria-label="保存"
        >
          <Save className="h-5 w-5" />
          {create.isPending ? "保存中" : "保存"}
        </Button>
      </div>

      {/* 编辑区 — 无边框占满 */}
      <div className="flex-1 min-h-0 overflow-y-auto md:flex-none">
        <JournalEditorLoader
          ref={editorRef}
          initialContent={{ type: "doc", content: [{ type: "paragraph" }] }}
          onUpdate={() => setDirty(true)}
          onReady={setToolbarEditor}
        />
      </div>

      {/* 工具栏 — 贴底 */}
      <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
        <EditorToolbar editor={toolbarEditor} />
      </div>
    </div>
  )
}

export default function NewJournalPage() {
  return (
    <React.Suspense fallback={<LoadingBlock lines={4} />}>
      <NewJournalInner />
    </React.Suspense>
  )
}
