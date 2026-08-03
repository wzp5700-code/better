import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const habits = sqliteTable(
  "habits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    color: text("color"),

    // discriminated union: daily | weekly | interval
    frequencyType: text("frequency_type", {
      enum: ["daily", "weekly", "interval"],
    }).notNull(),
    weeklyDaysMask: integer("weekly_days_mask").notNull().default(0),
    intervalDays: integer("interval_days"),
    timesPerPeriod: integer("times_per_period"),
    periodDays: integer("period_days"),

    targetValue: real("target_value"),
    targetUnit: text("target_unit"),

    reminderTime: text("reminder_time"), // "HH:MM"
    reminderDaysMask: integer("reminder_days_mask").notNull().default(0),

    status: text("status", {
      enum: ["active", "paused", "archived"],
    })
      .notNull()
      .default("active"),
    pausedUntil: integer("paused_until", { mode: "timestamp_ms" }),

    startDate: integer("start_date", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    statusIdx: index("habits_status_idx").on(t.status, t.createdAt),
    frequencyTypeCheck: check(
      "habits_frequency_type_check",
      sql`${t.frequencyType} IN ('daily','weekly','interval')`
    ),
    statusCheck: check(
      "habits_status_check",
      sql`${t.status} IN ('active','paused','archived')`
    ),
    weeklyMaskCheck: check(
      "habits_weekly_mask_check",
      sql`(${t.frequencyType} != 'weekly') OR (${t.weeklyDaysMask} > 0)`
    ),
    intervalCheck: check(
      "habits_interval_check",
      sql`(${t.frequencyType} != 'interval') OR (${t.intervalDays} IS NOT NULL AND ${t.intervalDays} > 0)`
    ),
    targetValueCheck: check(
      "habits_target_value_check",
      sql`${t.targetValue} IS NULL OR ${t.targetValue} > 0`
    ),
  })
)

export const habitCompletions = sqliteTable(
  "habit_completions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    completedOn: integer("completed_on").notNull(), // YYYYMMDD int
    value: real("value").notNull().default(1),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uniqHabitDay: uniqueIndex("habit_day_uniq").on(t.habitId, t.completedOn),
    habitDateIdx: index("completion_habit_date_idx").on(
      t.habitId,
      t.completedOn
    ),
    dateIdx: index("completion_date_idx").on(t.completedOn),
    completedOnRange: check(
      "completion_day_range_check",
      sql`${t.completedOn} BETWEEN 19000101 AND 29991231`
    ),
  })
)

export const habitStreaks = sqliteTable("habit_streaks", {
  habitId: integer("habit_id")
    .primaryKey()
    .references(() => habits.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCheckOn: integer("last_check_on"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export type Habit = typeof habits.$inferSelect
export type NewHabit = typeof habits.$inferInsert
export type HabitCompletion = typeof habitCompletions.$inferSelect
export type NewHabitCompletion = typeof habitCompletions.$inferInsert
export type HabitStreak = typeof habitStreaks.$inferSelect