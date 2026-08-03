/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require("better-sqlite3")
const db = new Database("./data/app.db")
db.prepare("DELETE FROM pairing_codes").run()
db.prepare("DELETE FROM push_tokens").run()
db.prepare("DELETE FROM devices").run()
console.log("cleared auth tables")
db.close()