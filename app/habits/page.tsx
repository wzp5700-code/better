import { PageHeader } from "@/components/layout/page-header"
import { HabitList } from "@/components/habits/habit-list"

export default function HabitsPage() {
  return (
    <div>
      <PageHeader
        title="习惯"
        description="把要做的事摆出来。做完就点一下。"
      />
      <HabitList />
    </div>
  )
}