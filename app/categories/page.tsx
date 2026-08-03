"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingBlock } from "@/components/shared/loading-block"
import {
  type CategoryWithCount,
  useArchiveCategoryMutation,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useCategoriesQuery,
  useUpdateCategoryMutation,
} from "@/lib/queries/journal-categories"

function CategoryBadge({ cat }: { cat: { color: string | null; name: string } }) {
  return (
    <Badge
      variant="outline"
      className="font-normal"
      style={
        cat.color
          ? {
              borderColor: cat.color,
              color: cat.color,
            }
          : undefined
      }
    >
      {cat.name}
    </Badge>
  )
}

function CategoryRow({
  cat,
  onEdit,
  onArchiveToggle,
  onDelete,
}: {
  cat: CategoryWithCount
  onEdit: (cat: CategoryWithCount) => void
  onArchiveToggle: (id: number, archived: boolean) => void
  onDelete: (id: number) => void
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <CategoryBadge cat={cat} />
          <span className="text-xs text-muted-foreground">
            {cat.entryCount} 篇
          </span>
          {cat.archived ? (
            <Badge variant="secondary" className="font-normal">
              已归档
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(cat)}
            aria-label="编辑"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {cat.archived ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onArchiveToggle(cat.id, false)}
              aria-label="取消归档"
            >
              <ArchiveRestore className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onArchiveToggle(cat.id, true)}
              aria-label="归档"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(cat.id)}
            aria-label="删除"
            disabled={cat.entryCount > 0}
            title={
              cat.entryCount > 0
                ? `仍有 ${cat.entryCount} 篇日记使用此分类，不能删除`
                : "删除"
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EditDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  busy,
  error,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: { id: number; name: string; color: string | null }
  onSubmit: (v: { name: string; color: string | null }) => void
  busy: boolean
  error: string | null
}) {
  const [name, setName] = React.useState(initial?.name ?? "")
  const [color, setColor] = React.useState(initial?.color ?? "")
  React.useEffect(() => {
    setName(initial?.name ?? "")
    setColor(initial?.color ?? "")
  }, [initial, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑分类" : "新建分类"}</DialogTitle>
          <DialogDescription>
            分类帮你在时间线上把同主题的日记聚在一起。
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit({ name: name.trim(), color: color.trim() || null })
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="cat-name">名称</Label>
            <Input
              id="cat-name"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：复盘、阅读、灵感"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-color">主题色（HEX，可选）</Label>
            <Input
              id="cat-color"
              pattern="^#[0-9a-fA-F]{6}$"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#6b7c93"
            />
          </div>
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "保存中…" : initial ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CategoriesPage() {
  const { data, isLoading, error: loadError } = useCategoriesQuery(true)
  const create = useCreateCategoryMutation()
  const update = useUpdateCategoryMutation()
  const archive = useArchiveCategoryMutation()
  const del = useDeleteCategoryMutation()

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CategoryWithCount | null>(null)
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [dialogError, setDialogError] = React.useState<string | null>(null)

  const items = data ?? []
  const active = items.filter((c: CategoryWithCount) => !c.archived)
  const archived = items.filter((c: CategoryWithCount) => c.archived)

  if (isLoading) return <LoadingBlock lines={3} />
  if (loadError) {
    return <EmptyState title="加载失败" description={(loadError as Error).message} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="日记分类"
        description="为日记加一层主题维度。"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogError(null)
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> 新建分类
          </Button>
        }
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">进行中</h2>
        {active.length === 0 ? (
          <EmptyState
            title="还没有分类"
            description="建一个吧 — 比如「复盘」、「阅读」、「灵感」。"
          />
        ) : (
          active.map((c: CategoryWithCount) => (
            <CategoryRow
              key={c.id}
              cat={c}
              onEdit={(cat) => {
                setEditing(cat)
                setDialogError(null)
                setOpen(true)
              }}
              onArchiveToggle={(id, archived) => {
                archive.mutate({ id, archived })
              }}
              onDelete={(id) => setDeletingId(id)}
            />
          ))
        )}
      </section>

      {archived.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">已归档</h2>
          {archived.map((c: CategoryWithCount) => (
            <CategoryRow
              key={c.id}
              cat={c}
              onEdit={(cat) => {
                setEditing(cat)
                setDialogError(null)
                setOpen(true)
              }}
              onArchiveToggle={(id, archived) => {
                archive.mutate({ id, archived })
              }}
              onDelete={(id) => setDeletingId(id)}
            />
          ))}
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        <Link href="/journal" className="hover:underline">
          回到时间线 →
        </Link>
      </p>

      <EditDialog
        open={open}
        onOpenChange={setOpen}
        initial={
          editing
            ? { id: editing.id, name: editing.name, color: editing.color }
            : undefined
        }
        busy={create.isPending || update.isPending}
        error={dialogError}
        onSubmit={async (v) => {
          setDialogError(null)
          if (editing) {
            const res = await update.mutateAsync({
              id: editing.id,
              input: v,
            })
            if (res.ok) {
              toast.success("已保存")
              setOpen(false)
            } else {
              setDialogError(res.error)
            }
          } else {
            const res = await create.mutateAsync(v)
            if (res.ok) {
              toast.success("已创建")
              setOpen(false)
            } else {
              setDialogError(res.error)
            }
          }
        }}
      />

      <AlertDialog
        open={deletingId != null}
        onOpenChange={(v) => {
          if (!v) setDeletingId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类？</AlertDialogTitle>
            <AlertDialogDescription>
              若该分类下还有日记，删除会被阻止；先归档或迁移它们。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingId == null) return
                const res = await del.mutateAsync(deletingId)
                if (res.ok) {
                  toast.success("已删除")
                  setDeletingId(null)
                } else {
                  toast.error(res.error)
                  setDeletingId(null)
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}