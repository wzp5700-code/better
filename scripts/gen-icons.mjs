// Generate PWA icon PNGs from the existing SVG.
// Run with: node scripts/gen-icons.mjs
import { promises as fs } from "node:fs"
import path from "node:path"
import sharp from "sharp"

const root = path.resolve(process.cwd(), "public/icons")
await fs.mkdir(root, { recursive: true })

// Inline SVG so we don't depend on external file path. Matches our brand.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <rect width="192" height="192" rx="42" fill="#0f1115"/>
  <circle cx="96" cy="96" r="60" fill="none" stroke="#cbd5e1" stroke-opacity="0.25" stroke-width="3"/>
  <path d="M96 56 V96 L120 112" fill="none" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
  <text x="96" y="148" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="22" fill="#cbd5e1" font-weight="500">成长</text>
</svg>`

const sizes = [180, 192, 512, 1024]
for (const s of sizes) {
  const out = path.join(root, `icon-${s}.png`)
  await sharp(Buffer.from(svg))
    .resize(s, s, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`wrote ${out}`)
}
