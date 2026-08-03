import Link from "next/link"

import { HabitDetailClient } from "@/components/habits/habit-detail-client"

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ habitId: string }>
}) {
  const { habitId } = await params
  const id = Number(habitId)
  if (!Number.isInteger(id) || id <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        习惯 ID 不正确。
        <Link href="/habits" className="underline">
          返回列表
        </Link>
      </p>
    )
  }
  return <HabitDetailClient habitId={id} />
}