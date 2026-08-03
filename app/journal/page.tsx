import { PageHeader } from "@/components/layout/page-header"
import { JournalTimeline } from "@/components/journal/journal-timeline"

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; categoryId?: string }>
}) {
  const sp = await searchParams
  const categoryId =
    sp.categoryId === undefined
      ? undefined
      : sp.categoryId === "null"
        ? null
        : Number(sp.categoryId)
  return (
    <div>
      <PageHeader
        title="日记"
        description="把每天最值得留下的一句话写下来。"
      />
      <JournalTimeline
        initialTag={sp.tag}
        initialQuery={sp.q}
        initialCategoryId={categoryId}
      />
    </div>
  )
}