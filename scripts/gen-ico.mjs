// Generate a Windows .ico from the PWA icon PNG.
// ICO format: header + multiple PNG-encoded images at different sizes.
import { promises as fs } from "node:fs"
import path from "node:path"
import sharp from "sharp"

const sizes = [16, 32, 48, 64, 128, 256]

// ICO header
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(sizes.length, 4) // image count

const entries = []
const datas = []

for (let i = 0; i < sizes.length; i++) {
  const size = sizes[i]
  const png = await sharp("public/icons/icon-1024.png")
    .resize(size, size, { fit: "cover" })
    .png()
    .toBuffer()

  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0) // width (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
  entry.writeUInt8(0, 2) // color count
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8) // size
  entry.writeUInt32LE(0, 12) // offset (patched below)

  entries.push(entry)
  datas.push(png)
}

// Patch offsets: header (6) + entries (16*n) + previous data
let offset = 6 + 16 * sizes.length
for (let i = 0; i < sizes.length; i++) {
  entries[i].writeUInt32LE(offset, 12)
  offset += datas[i].length
}

await fs.mkdir("desktop/build", { recursive: true })
const ico = Buffer.concat([header, ...entries, ...datas])
await fs.writeFile("desktop/build/icon.ico", ico)
console.log("wrote desktop/build/icon.ico", ico.length, "bytes")
