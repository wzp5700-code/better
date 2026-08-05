"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Check, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCategoriesQuery, type CategoryWithCount } from "@/lib/queries/journal-categories"
import { createCategoryAction } from "@/lib/actions/journal-category-actions"
import { cn } from "@/lib/utils"

interface Category {
  id: number
  name: string
  color: string | null
}

export function CategoryPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (id: number | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [newName, setNewName] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const { data, isLoading, refetch } = useCategoriesQuery(false)
  const items = data ?? []
  const current = value != null ? items.find((c: CategoryWithCount) => c.id === value) : null

  const filtered = items.filter((c: CategoryWithCount) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const res = await createCategoryAction({ name, color: null })
      if (res.ok) {
        onChange(res.data.id)
        setNewName("")
        setOpen(false)
        refetch()
      } else {
        toast.error(res.error)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          aria-label="切换分类"
        >
          {current ? (
            <Badge
              variant="outline"
              className="font-normal"
              style={
                current.color
                  ? { borderColor: current.color, color: current.color }
                  : undefined
              }
            >
              {current.name}
            </Badge>
          ) : (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> 设置分类
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="center">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索分类…"
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              加载中…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {query ? "没有匹配的分类" : "还没有分类"}
            </div>
          ) : (
            filtered.map((c: CategoryWithCount) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id)
                  setOpen(false)
                  setQuery("")
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-sm px-3 py-1.5 text-sm",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  {c.color ? (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                      aria-hidden
                    />
                  ) : null}
                  {c.name}
                </span>
                {c.id === value ? (
                  <Check className="h-3.5 w-3.5 text-muted-foreground" />
                ) : null}
              </button>
            ))
          )}
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
                setQuery("")
              }}
              className="flex w-full items-center rounded-sm px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              清除分类
            </button>
          </div>
        </div>
        <div className="border-t p-2 flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate()
            }}
            placeholder="新增分类名"
            className="h-8"
            aria-label="新增分类名"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            {creating ? "…" : "新增"}
          </Button>
        </div>
        <div className="border-t p-1">
          <Link
            href="/categories"
            className="block rounded-sm px-3 py-1.5 text-center text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            管理分类
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
