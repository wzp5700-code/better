// Safe SQLite backup via better-sqlite3's backup API.
// Baked into the app image at /app/backup.js so it survives container
// recreation (the old flow used /tmp/backup.js, which was wiped on rebuild).
// Usage: node backup.js <dest-path>
const Db = require("better-sqlite3");
const db = new Db("/app/data/app.db");
db.backup(process.argv[2]);
console.log("ok", process.argv[2]);
