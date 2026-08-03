/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Reset dev data: wipe auth tables (devices, pairing_codes, push_tokens)
 * and optionally habit / journal data. SQLite file is preserved.
 *
 * Usage:
 *   node scripts/dev-reset.js                # only clear auth
 *   node scripts/dev-reset.js --all          # also clear habits + journal + categories
 *   node scripts/dev-reset.js --wipe-data   # delete the SQLite file entirely
 */
const Database = require("better-sqlite3")
const fs = require("node:fs")
const path = require("node:path")

const dbPath = path.resolve(process.cwd(), "./data/app.db")
if (!fs.existsSync(dbPath)) {
  console.error(`no db at ${dbPath} — nothing to reset`)
  process.exit(1)
}

const args = process.argv.slice(2)
const wipeAll = args.includes("--all")
const wipeData = args.includes("--wipe-data")

if (wipeData) {
  fs.unlinkSync(dbPath)
  console.log(`deleted ${dbPath}`)
  process.exit(0)
}

const db = new Database(dbPath)

if (wipeAll) {
  db.prepare("DELETE FROM push_delivery_log").run()
  db.prepare("DELETE FROM habit_streaks").run()
  db.prepare("DELETE FROM habit_completions").run()
  db.prepare("DELETE FROM habits").run()
  db.prepare("DELETE FROM journal_links").run()
  db.prepare("DELETE FROM journal_tags").run()
  db.prepare("DELETE FROM journal_entries").run()
  db.prepare("DELETE FROM journal_categories").run()
  console.log("cleared habits + journal + categories")
}

db.prepare("DELETE FROM pairing_codes").run()
db.prepare("DELETE FROM push_tokens").run()
db.prepare("DELETE FROM devices").run()
console.log("cleared auth tables (devices / pairing_codes / push_tokens)")

db.close()