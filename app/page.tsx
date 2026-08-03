import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { TodayHabitList } from "@/components/habits/today-habit-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateKey, todayDateKey } from "@/lib/dates"

export default function HomePage() {
  const today = todayDateKey()
  return (
    <div className="space-y-8">
      <PageHeader
        title="今日"
        description={formatDateKey(today, "yyyy年M月d日")}
      />

      <section aria-labelledby="today-habits" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="today-habits" className="text-sm font-medium text-muted-foreground">
            习惯
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/habits">查看全部</Link>
          </Button>
        </div>
        <TodayHabitList />
      </section>

      <section aria-labelledby="today-journal" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="today-journal"
            className="text-sm font-medium text-muted-foreground"
          >
            写日记
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/journal">查看时间线</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              今天想留点什么吗？
            </p>
            <div className="mt-3">
              <Button asChild>
                <Link href={`/journal/new?date=${today}`}>开始写</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}