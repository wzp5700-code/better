"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategoriesQuery, type CategoryWithCount } from "@/lib/queries/journal-categories"
import { cn } from "@/lib/utils"

export function CategorySelector({
  value,
  onChange,
  className,
  allowClear = true,
}: {
  value: number | null
  onChange: (next: number | null) => void
  className?: string
  allowClear?: boolean
}) {
  const { data } = useCategoriesQuery(false)
  const items = data ?? []
  return (
    <Select
      value={value == null ? "__none__" : String(value)}
      onValueChange={(v) => onChange(v === "__none__" ? null : Number(v))}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="未分类" />
      </SelectTrigger>
      <SelectContent>
        {allowClear ? (
          <SelectItem value="__none__">未分类</SelectItem>
        ) : null}
        {items.map((c: CategoryWithCount) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name}
            {c.entryCount > 0 ? ` · ${c.entryCount}` : ""}
          </SelectItem>
        ))}
        {items.length === 0 ? (
          <SelectItem value="__empty__" disabled>
            （还没有分类）
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  )
}