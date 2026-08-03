"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function JournalFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const initialTag = params.get("tag") ?? ""
  const initialQ = params.get("q") ?? ""
  const [tag, setTag] = React.useState(initialTag)
  const [q, setQ] = React.useState(initialQ)

  React.useEffect(() => {
    setTag(initialTag)
    setQ(initialQ)
  }, [initialTag, initialQ])

  const apply = (next: { tag?: string; q?: string }) => {
    const sp = new URLSearchParams(params.toString())
    if (next.tag !== undefined) {
      if (next.tag) sp.set("tag", next.tag)
      else sp.delete("tag")
    }
    if (next.q !== undefined) {
      if (next.q) sp.set("q", next.q)
      else sp.delete("q")
    }
    router.push(`/journal?${sp.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[180px] space-y-1">
        <Label htmlFor="filter-tag">标签</Label>
        <Input
          id="filter-tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onBlur={() => apply({ tag })}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply({ tag })
          }}
          placeholder="#反思"
        />
      </div>
      <div className="flex-1 min-w-[180px] space-y-1">
        <Label htmlFor="filter-q">关键字</Label>
        <Input
          id="filter-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => apply({ q })}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply({ q })
          }}
          placeholder="搜索正文"
        />
      </div>
    </div>
  )
}