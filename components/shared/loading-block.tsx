import { Skeleton } from "@/components/ui/skeleton"

export function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="加载中">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}