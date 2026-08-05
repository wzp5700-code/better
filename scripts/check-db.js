/* eslint-disable @typescript-eslint/no-require-imports */
const Db = require("/app/node_modules/.pnpm/better-sqlite3@13.0.2/node_modules/better-sqlite3")
const db = new Db("/app/data/app.db")
for (const table of ["habits", "journal_entries", "books", "devices"]) {
  const r = db.prepare(`SELECT COUNT(*) c FROM ${table}`).get()
  console.log(table, r.c)
}
db.close()
