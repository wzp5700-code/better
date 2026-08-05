"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ChevronLeft, Save, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  JournalEditorLoader,
  type JournalEditorHandle,
} from "@/components/journal/editor/journal-editor-loader"
import { EditorToolbar } from "@/components/journal/editor/editor-toolbar"
import { CategoryPicker } from "@/components/journal/category-picker-popover"
import { MoodSlider } from "@/components/journal/mood-slider"
import { BacklinksPanel } from "@/components/journal/backlinks-panel"
import {
  useDeleteJournalMutation,
  useJournalEntryQuery,
  useUpdateJournalMutation,
} from "@/lib/queries/journal"
import { LoadingBlock } from "@/components/shared/loading-block"
import { EmptyState } from "@/components/shared/empty-state"

export default function JournalEntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>
}) {
  const { entryId } = React.use(params)
  const id = Number(entryId)
  const router = useRouter()
  const { data, isLoading, error } = useJournalEntryQuery(id)
  const update = useUpdateJournalMutation()
  const del = useDeleteJournalMutation()

  // 一进入页面就进入"可写"状态，无需按"编辑"按钮
  const editorRef = React.useRef<JournalEditorHandle>(null)

  const [draftScore, setDraftScore] = React.useState<number | null>(null)
  const [draftLabel, setDraftLabel] = React.useState<string | null>(null)
  const [draftCategoryId, setDraftCategoryId] = React.useState<number | null>(null)
  const [dirty, setDirty] = React.useState(false)

  // 拉取远端数据完成 → 初始化草稿（首次或切换到不同 entry）
  React.useEffect(() => {
    if (!data) return
    setDraftScore(data.moodScore)
    setDraftLabel((data.moodLabel as never) ?? null)
    setDraftCategoryId(data.category?.id ?? null)
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id])

  const onSave = async () => {
    if (!data) return
    const handle = editorRef.current
    if (!handle) return
    if (handle.isEmpty()) {
      toast.error("内容不能为空")
      return
    }
    const json = handle.getJson()
    const res = await update.mutateAsync({
      id: data.id,
      content: json as never,
      moodScore: draftScore,
      moodLabel: (draftLabel as never) ?? null,
      categoryId: draftCategoryId,
    })
    if (res.ok) {
      toast.success("已保存")
      setDirty(false)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  if (isLoading) return <LoadingBlock lines={4} />
  if (error)
    return <EmptyState title="加载失败" description={(error as Error).message} />
  if (!data)
    return (
      <EmptyState
        title="找不到这篇日记"
        description="它可能已被删除。"
        action={
          <Button asChild>
            <Link href="/journal">返回时间线</Link>
          </Button>
        }
      />
    )

  return (
    <div className="md:space-y-3 flex md:block flex-col h-dvh md:h-auto">
      {/* 顶部条：左 = 返回 / 中 = 分类可点击切换 / 右 = 保存 */}
      <div className="flex items-center gap-2 shrink-0 px-1 md:px-0 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" size="icon" asChild aria-label="返回">
          <Link href="/journal">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex-1 flex justify-center">
          <CategoryPicker
            value={draftCategoryId}
            onChange={(id) => {
              setDraftCategoryId(id)
              setDirty(true)
            }}
          />
        </div>

        <Button
          variant={dirty ? "default" : "ghost"}
          size="sm"
          onClick={onSave}
          disabled={update.isPending}
          aria-label="保存"
        >
          <Save className="h-5 w-5" />
          {update.isPending ? "保存中" : "保存"}
        </Button>
      </div>

      {/* 编辑区（点进即可写）— 移动端占满剩余高度，无边框 */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible md:flex-none md:min-h-0">
        <Card className="border-0 shadow-none md:border md:shadow-sm md:mt-3">
          <CardContent className="p-0 md:p-4">
            <JournalEditorLoader
              ref={editorRef}
              initialContent={safeParseJson(data.content)}
              onUpdate={() => setDirty(true)}
            />
          </CardContent>
        </Card>
      </div>

      {/* 心情滑块（编辑区下方）— 纯滑块，无日期 */}
      <div className="shrink-0 px-3 md:px-0 md:pt-3 pb-1 md:pb-0">
        <MoodSlider
          value={draftScore}
          onChange={(score, label) => {
            setDraftScore(score)
            setDraftLabel(label)
            setDirty(true)
          }}
        />
      </div>

      {/* 富文本工具栏 — 移动端固定贴底 */}
      <div className="shrink-0 md:static pb-[env(safe-area-inset-bottom)]">
        <EditorToolbar editor={editorRef.current?.getEditor() ?? null} />
      </div>

      {/* 删除 + 反向链接（桌面/次要） */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={async () => {
                  if (!window.confirm("删除这篇日记？")) return
                  const res = await del.mutateAsync(data.id)
                  if (res.ok) {
                    toast.success("已删除")
                    router.push("/journal")
                  } else {
                    toast.error(res.error)
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> 删除
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="mt-3">
          <BacklinksPanel links={data.incomingLinks ?? []} />
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
