import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatDateKey } from "@/lib/dates"

interface Backlink {
  id: number
  fromEntryId: number
  fromEntryDate: number
  fromEntryTitle: string | null
  toTarget: string
}

export function BacklinksPanel({ links }: { links: Backlink[] }) {
  if (links.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">被引用 ({links.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.map((link, i) => (
          <div key={link.id}>
            {i > 0 ? <Separator className="my-2" /> : null}
            <Link
              href={`/journal/${link.fromEntryId}`}
              className="block text-sm hover:underline"
            >
              <div className="text-muted-foreground text-xs">
                {formatDateKey(link.fromEntryDate, "yyyy年M月d日")}
              </div>
              <div className="line-clamp-2">
                {link.fromEntryTitle || "（空白）"}
              </div>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}