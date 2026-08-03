"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Save, Pencil, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { JournalEditorLoader, type JournalEditorHandle } from "@/components/journal/editor/journal-editor-loader"
import { CategorySelector } from "@/components/journal/category-selector"
import { MoodSlider } from "@/components/journal/mood-slider"
import { BacklinksPanel } from "@/components/journal/backlinks-panel"
import { JournalDeleteButton } from "@/components/journal/journal-delete-button"
import {
  useJournalEntryQuery,
  useUpdateJournalMutation,
} from "@/lib/queries/journal"
import { formatDateKey } from "@/lib/dates"
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

  const [editing, setEditing] = React.useState(false)
  const editorRef = React.useRef<JournalEditorHandle>(null)
  const [draftScore, setDraftScore] = React.useState<number | null>(null)
  const [draftLabel, setDraftLabel] = React.useState<string | null>(null)
  const [draftCategoryId, setDraftCategoryId] = React.useState<number | null>(null)

  const enterEdit = () => {
    if (!data) return
    setDraftScore(data.moodScore)
    setDraftLabel(data.moodLabel as never)
    setDraftCategoryId(data.category?.id ?? null)
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
  }

  const onSave = async () => {
    const handle = editorRef.current
    if (!handle || !data) return
    if (handle.isEmpty()) {
      toast.error("内容不能为空")
      return
    }
    const json = handle.getJson()
    const res = await update.mutateAsync({
      id: data.id,
      content: json as never,
      moodScore: draftScore,
      moodLabel: draftLabel as never,
      categoryId: draftCategoryId,
    })
    if (res.ok) {
      toast.success("已保存")
      setEditing(false)
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {formatDateKey(data.entryDate, "yyyy年M月d日")}
          </h1>
          <div className="flex items-center gap-2">
            {data.category ? (
              <Badge
                variant="outline"
                className="font-normal"
                style={
                  data.category.color
                    ? {
                        borderColor: data.category.color,
                        color: data.category.color,
                      }
                    : undefined
                }
              >
                {data.category.name}
              </Badge>
            ) : null}
            {data.moodLabel ? (
              <Badge variant="outline" className="font-normal">
                {data.moodLabel}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" onClick={cancelEdit}>
                <X className="h-4 w-4" /> 取消
              </Button>
              <Button onClick={onSave} disabled={update.isPending}>
                <Save className="h-4 w-4" />
                {update.isPending ? "保存中…" : "保存"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/journal">返回</Link>
              </Button>
              <Button variant="outline" onClick={enterEdit}>
                <Pencil className="h-4 w-4" /> 编辑
              </Button>
              <JournalDeleteButton id={data.id} />
            </>
          )}
        </div>
      </div>

      {editing ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">正文</CardTitle>
            </CardHeader>
            <CardContent>
              <JournalEditorLoader
                ref={editorRef}
                initialContent={safeParseJson(data.content)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">分类与心情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="entry-category">分类</Label>
                  <Link
                    href="/categories"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    管理分类
                  </Link>
                </div>
                <CategorySelector
                  value={draftCategoryId}
                  onChange={setDraftCategoryId}
                />
              </div>
              <MoodSlider
                value={draftScore}
                onChange={(score, label) => {
                  setDraftScore(score)
                  setDraftLabel(label)
                }}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardContent className="py-6">
              {data.contentHtml ? (
                <div
                  className="prose-journal"
                  dangerouslySetInnerHTML={{ __html: data.contentHtml }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">（空白）</p>
              )}
              {data.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1">
                  {data.tags.map((tag: string) => (
                    <Link
                      key={tag}
                      href={`/journal?tag=${encodeURIComponent(tag)}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {data.outgoingLinks && data.outgoingLinks.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">引用的日记</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.outgoingLinks.map((l: { id: number; toTarget: string; toEntryId: number | null; toEntryDate: number | null; toEntryTitle: string | null }) =>
                  l.toEntryId != null ? (
                    <Link
                      key={l.id}
                      href={`/journal/${l.toEntryId}`}
                      className="block text-sm hover:underline"
                    >
                      <span className="text-muted-foreground text-xs">
                        {l.toEntryDate
                          ? formatDateKey(l.toEntryDate, "yyyy年M月d日")
                          : "未知日期"}
                      </span>
                      <div className="line-clamp-1">
                        {l.toEntryTitle ?? `[[${l.toTarget}]]`}
                      </div>
                    </Link>
                  ) : (
                    <div key={l.id} className="text-sm text-muted-foreground">
                      <span className="text-xs">未解析 · {l.toTarget}</span>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ) : null}

          <BacklinksPanel links={data.incomingLinks ?? []} />
        </>
      )}
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