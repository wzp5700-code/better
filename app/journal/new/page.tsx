"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { JournalEditorLoader, type JournalEditorHandle } from "@/components/journal/editor/journal-editor-loader"
import { CategorySelector } from "@/components/journal/category-selector"
import { MoodSlider } from "@/components/journal/mood-slider"
import { useCreateJournalMutation } from "@/lib/queries/journal"
import { formatDateKey, isValidDateKey, todayDateKey } from "@/lib/dates"

function NewJournalInner() {
  const router = useRouter()
  const params = useSearchParams()
  const dateParam = params.get("date")
  const entryDate =
    dateParam && isValidDateKey(Number(dateParam))
      ? Number(dateParam)
      : todayDateKey()

  const editorRef = React.useRef<JournalEditorHandle>(null)
  const [moodScore, setMoodScore] = React.useState<number | null>(null)
  const [moodLabel, setMoodLabel] = React.useState<string | null>(null)
  const [categoryId, setCategoryId] = React.useState<number | null>(null)
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
      moodScore,
      moodLabel: moodLabel as never,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">写日记</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateKey(entryDate, "yyyy年M月d日")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/journal">取消</Link>
          </Button>
          <Button onClick={onSave} disabled={create.isPending}>
            <Save className="h-4 w-4" />
            {create.isPending ? "保存中…" : "保存"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">正文</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalEditorLoader
            ref={editorRef}
            initialContent={{ type: "doc", content: [{ type: "paragraph" }] }}
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
            <CategorySelector value={categoryId} onChange={setCategoryId} />
          </div>
          <MoodSlider
            value={moodScore}
            onChange={(score, label) => {
              setMoodScore(score)
              setMoodLabel(label)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewJournalPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">写日记</h1>
          <p className="text-sm text-muted-foreground">加载中…</p>
        </div>
      }
    >
      <NewJournalInner />
    </React.Suspense>
  )
}