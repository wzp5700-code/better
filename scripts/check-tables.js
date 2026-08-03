/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require("better-sqlite3")
const db = new Database("./data/app.db")
const tables = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )
  .all()
console.log("Tables:", tables.map((t) => t.name).join(", "))
console.log(
  "Indexes:",
  db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all()
    .map((i) => i.name)
    .join(", ")
)
db.close()