import { PageHeader } from "@/components/layout/page-header"
import { ReadingList } from "@/components/reading/reading-list"

export default function ReadingPage() {
  return (
    <div>
      <PageHeader
        title="阅读"
        description="记录每一本书的进度。"
      />
      <ReadingList />
    </div>
  )
}
