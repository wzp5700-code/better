/* eslint-disable */
const { execSync } = require("node:child_process");
try {
  const out = execSync("pnpm test", { cwd: "C:\\Users\\15008\\projects\\personal-growth-desk", encoding: "utf8" });
  console.log(out);
} catch (e) {
  console.log(e.stdout || e.message);
  console.log("STDERR:", e.stderr);
}