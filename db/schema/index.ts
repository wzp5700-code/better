export * from "./habits"
export * from "./journal"
export * from "./auth"

import { relations } from "drizzle-orm"
import {
  habitCompletions,
  habitStreaks,
  habits,
} from "./habits"
import {
  journalCategories,
  journalEntries,
  journalLinks,
  journalTags,
} from "./journal"
import { devices, pairingCodes, pushTokens } from "./auth"

export const habitsRelations = relations(habits, ({ many, one }) => ({
  completions: many(habitCompletions),
  streak: one(habitStreaks, {
    fields: [habits.id],
    references: [habitStreaks.habitId],
  }),
}))

export const habitCompletionsRelations = relations(
  habitCompletions,
  ({ one }) => ({
    habit: one(habits, {
      fields: [habitCompletions.habitId],
      references: [habits.id],
    }),
  })
)

export const journalEntriesRelations = relations(
  journalEntries,
  ({ many, one }) => ({
    tags: many(journalTags),
    outgoingLinks: many(journalLinks, { relationName: "fromEntry" }),
    incomingLinks: many(journalLinks, { relationName: "toEntry" }),
    category: one(journalCategories, {
      fields: [journalEntries.categoryId],
      references: [journalCategories.id],
    }),
  })
)

export const journalCategoriesRelations = relations(
  journalCategories,
  ({ many }) => ({
    entries: many(journalEntries),
  })
)

export const journalTagsRelations = relations(journalTags, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalTags.entryId],
    references: [journalEntries.id],
  }),
}))

export const journalLinksRelations = relations(journalLinks, ({ one }) => ({
  fromEntry: one(journalEntries, {
    fields: [journalLinks.fromEntryId],
    references: [journalEntries.id],
    relationName: "fromEntry",
  }),
  toEntry: one(journalEntries, {
    fields: [journalLinks.toEntryId],
    references: [journalEntries.id],
    relationName: "toEntry",
  }),
}))

export const devicesRelations = relations(devices, ({ many }) => ({
  pairingCodesCreated: many(pairingCodes, { relationName: "createdBy" }),
  pairingCodesUsed: many(pairingCodes, { relationName: "usedBy" }),
  pushTokens: many(pushTokens),
}))

export const pairingCodesRelations = relations(pairingCodes, ({ one }) => ({
  createdBy: one(devices, {
    fields: [pairingCodes.createdByDeviceId],
    references: [devices.id],
    relationName: "createdBy",
  }),
  usedBy: one(devices, {
    fields: [pairingCodes.usedByDeviceId],
    references: [devices.id],
    relationName: "usedBy",
  }),
}))

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  device: one(devices, {
    fields: [pushTokens.deviceId],
    references: [devices.id],
  }),
}))