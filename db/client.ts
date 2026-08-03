import "server-only"

import { existsSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "@/db/schema"

const DATABASE_URL = process.env.DATABASE_URL ?? "./data/app.db"
const dbPath = resolve(process.cwd(), DATABASE_URL)

// ensure data dir exists
const dir = dirname(dbPath)
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true })
}

declare global {
  // eslint-disable-next-line no-var
  var __pgd_sqlite: Database.Database | undefined
}

function createConnection(): Database.Database {
  const sqlite = new Database(dbPath)
  sqlite.pragma("foreign_keys = ON")
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("busy_timeout = 5000")
  return sqlite
}

// HMR singleton — re-use across hot reloads to avoid WAL locks
const sqlite =
  globalThis.__pgd_sqlite ?? (globalThis.__pgd_sqlite = createConnection())

export const db = drizzle(sqlite, { schema, logger: false })
export const rawDb = sqlite
export type Db = typeof db