/* eslint-disable @typescript-eslint/no-require-imports */
// Run all .sql migration files not yet applied.
// Invoked inside the container: node /tmp/migrate-inline.js
const Database = require("/app/node_modules/.pnpm/better-sqlite3@13.0.2/node_modules/better-sqlite3")
const fs = require("fs")
const path = require("path")

const db = new Database("/app/data/app.db")
const dir = "/app/db/migrations"

// Track applied via __drizzle_migrations if it exists
let applied = new Set()
try {
  applied = new Set(
    db
      .prepare("SELECT hash FROM __drizzle_migrations")
      .all()
      .map((r) => r.hash)
  )
} catch {
  // table doesn't exist yet — first run
}

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()

for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), "utf8")
  try {
    db.exec(sql)
    console.log("applied", f)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("already exists")) {
      console.log("skip (exists)", f)
    } else {
      console.log("FAIL", f, msg.slice(0, 120))
    }
  }
}

const books = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'")
  .all()
console.log("books table:", books.length ? "OK" : "MISSING")
db.close()
