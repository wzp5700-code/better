"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  JournalEditorLoader,
  type JournalEditorHandle,
} from "@/components/journal/editor/journal-editor-loader"
import { EditorToolbar } from "@/components/journal/editor/editor-toolbar"
import { CategoryPicker } from "@/components/journal/category-picker-popover"
import { MoodSlider } from "@/components/journal/mood-slider"
import { useUpdateJournalMutation } from "@/lib/queries/journal"
import { formatDateKey } from "@/lib/dates"
import { LoadingBlock } from "@/components/shared/loading-block"
import { EmptyState } from "@/components/shared/empty-state"

interface EntryLike {
  id: number
  entryDate: number
  content: string
  moodScore: number | null
  moodLabel: string | null
  category: { id: number; name: string; color: string | null } | null
}

export default function JournalEntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>
}) {
  const { entryId } = React.use(params)
  const id = Number(entryId)
  const router = useRouter()
  const [entry, setEntry] = React.useState<EntryLike | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const update = useUpdateJournalMutation()

  const editorRef = React.useRef<JournalEditorHandle>(null)
  const [draftScore, setDraftScore] = React.useState<number | null>(null)
  const [draftLabel, setDraftLabel] = React.useState<string | null>(null)
  const [draftCategoryId, setDraftCategoryId] = React.useState<number | null>(null)
  const [dirty, setDirty] = React.useState(false)

  // 进入页面 → 拉取单篇
  React.useEffect(() => {
    const token = localStorage.getItem("pgd.token")
    if (!token) {
      router.replace("/settings/setup")
      return
    }
    fetch(`/api/journal/${id}`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`加载失败 (${r.status})`)
        return r.json()
      })
      .then((d: EntryLike) => {
        setEntry(d)
        setDraftScore(d.moodScore)
        setDraftLabel((d.moodLabel as never) ?? null)
        setDraftCategoryId(d.category?.id ?? null)
        setDirty(false)
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "未知错误"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onSave = async () => {
    if (!entry) return
    const handle = editorRef.current
    if (!handle) return
    if (handle.isEmpty()) {
      toast.error("内容不能为空")
      return
    }
    const json = handle.getJson()
    const res = await update.mutateAsync({
      id: entry.id,
      content: json as never,
      moodScore: draftScore,
      moodLabel: (draftLabel as never) ?? null,
      categoryId: draftCategoryId,
    })
    if (res.ok) {
      toast.success("已保存")
      setDirty(false)
    } else {
      toast.error(res.error)
    }
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <EmptyState title="加载失败" description={loadError} />
      </div>
    )
  }
  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <LoadingBlock lines={2} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶部条：左 = 返回 / 中 = 分类可切换 / 右 = 保存 */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 sm:px-6 sm:py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/journal")}
          aria-label="返回"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex justify-center">
          <CategoryPicker
            value={draftCategoryId}
            onChange={(cid) => {
              setDraftCategoryId(cid)
              setDirty(true)
            }}
          />
        </div>

        <Button
          variant={dirty ? "default" : "ghost"}
          size="sm"
          onClick={onSave}
          disabled={update.isPending}
        >
          <Save className="h-4 w-4" />
          {update.isPending ? "保存中" : "保存"}
        </Button>
      </div>

      {/* 心情（精简一行） */}
      <div className="shrink-0 border-b px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="text-xs text-muted-foreground">
            {formatDateKey(entry.entryDate, "yyyy年M月d日")}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">心情</span>
            <div className="w-56">
              <MoodSlider
                value={draftScore}
                onChange={(score, label) => {
                  setDraftScore(score)
                  setDraftLabel(label)
                  setDirty(true)
                }}
              />
            </div>
          </div>
        </div>
        <Separator />
      </div>

      {/* 编辑区：占满剩余空间，点进即可写 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl h-full px-4 sm:px-8 py-4 sm:py-8">
          <JournalEditorLoader
            ref={editorRef}
            initialContent={safeParseJson(entry.content)}
            onUpdate={() => setDirty(true)}
          />
        </div>
      </div>

      {/* 工具栏：sticky 在视口底部 */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur p-2 sm:p-3">
        <div className="mx-auto max-w-3xl">
          <EditorToolbar editor={editorRef.current?.getEditor() ?? null} />
        </div>
      </div>
    </div>
  )
}

function safeParseJson(content: string): unknown {
  try {
    return JSON.parse(content)
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] }
  }
}
