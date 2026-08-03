import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

import { habits } from "./habits"

/**
 * Single-user, multi-device auth.
 *
 *   - On first visit, the browser/device calls /api/setup with no token.
 *     The server creates a `devices` row marked `master=true` and returns
 *     a master token. The token itself is stored as `token_hash` so the
 *     server never holds the raw secret.
 *   - To add another device, the master device POSTs /api/pairing-code to
 *     mint a short-lived `pairing_codes` row. The new device POSTs /api/pair
 *     with that code and receives its own device token.
 *   - Each request carries `Authorization: Bearer <token>`. middleware.ts
 *     hashes the token, looks up the device row, and rejects revoked rows.
 */

export const devices = sqliteTable(
  "devices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    platform: text("platform", { enum: ["web", "ios", "android", "windows", "macos", "linux", "unknown"] })
      .notNull()
      .default("unknown"),
    publicKey: text("public_key"),
    tokenHash: text("token_hash").notNull(),
    master: integer("master", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    tokenHashUniq: uniqueIndex("devices_token_hash_uniq").on(t.tokenHash),
    masterIdx: index("devices_master_idx").on(t.master),
    revokedIdx: index("devices_revoked_idx").on(t.revokedAt),
    nameLen: check(
      "devices_name_len_check",
      sql`length(${t.name}) BETWEEN 1 AND 60`
    ),
  })
)

export const pairingCodes = sqliteTable(
  "pairing_codes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    codeHash: text("code_hash").notNull(),
    createdByDeviceId: integer("created_by_device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedByDeviceId: integer("used_by_device_id").references(() => devices.id, {
      onDelete: "set null",
    }),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    codeHashUniq: uniqueIndex("pairing_codes_code_hash_uniq").on(t.codeHash),
    expiresIdx: index("pairing_codes_expires_idx").on(t.expiresAt),
    createdByIdx: index("pairing_codes_created_by_idx").on(t.createdByDeviceId),
  })
)

export const pushTokens = sqliteTable(
  "push_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: integer("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["fcm", "apns", "webpush", "ntfy"] })
      .notNull(),
    token: text("token").notNull(),
    platform: text("platform").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    tokenUniq: uniqueIndex("push_tokens_token_uniq").on(t.token),
    deviceIdx: index("push_tokens_device_idx").on(t.deviceId),
  })
)

export type Device = typeof devices.$inferSelect
export type NewDevice = typeof devices.$inferInsert
export type PairingCode = typeof pairingCodes.$inferSelect
export type PushToken = typeof pushTokens.$inferSelect

/**
 * Idempotency log for scheduled reminders. The scheduler inserts a row
 * before sending; the UNIQUE constraint on (habit_id, date_key) guarantees
 * we never send twice for the same habit on the same day even if the
 * scheduler crashes between INSERT and the FCM HTTP call.
 */
export const pushDeliveryLog = sqliteTable(
  "push_delivery_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    dateKey: integer("date_key").notNull(),
    pushTokenId: integer("push_token_id")
      .notNull()
      .references(() => pushTokens.id, { onDelete: "cascade" }),
    sentAt: integer("sent_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    status: text("status", { enum: ["sent", "failed"] }).notNull().default("sent"),
    errorMessage: text("error_message"),
  },
  (t) => ({
    uniqHabitDay: uniqueIndex("push_log_habit_day_uniq").on(t.habitId, t.dateKey),
    dateIdx: index("push_log_date_idx").on(t.dateKey),
  })
)

export type PushDeliveryLog = typeof pushDeliveryLog.$inferSelect
export type NewPushDeliveryLog = typeof pushDeliveryLog.$inferInsert