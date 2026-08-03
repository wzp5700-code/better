import { Card, CardContent } from "@/components/ui/card"

export function StreakSummary({
  current,
  longest,
  totalCompletions,
  unit,
}: {
  current: number
  longest: number
  totalCompletions: number
  unit?: string | null
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="py-4">
          <div className="text-xs text-muted-foreground">当前连续</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {current}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              天
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <div className="text-xs text-muted-foreground">历史最长</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {longest}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              天
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <div className="text-xs text-muted-foreground">累计完成</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {totalCompletions}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit ? ` ${unit}` : "次"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}