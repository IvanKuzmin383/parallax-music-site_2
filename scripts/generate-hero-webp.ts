/**
 * Конвертирует фон Hero JPG → WebP в public/ (запуск на сервере или локально, если есть JPG).
 * pnpm generate-hero-webp
 */
import fs from "fs"
import path from "path"
import sharp from "sharp"
import { HERO_BACKGROUND } from "../lib/hero-background"

const publicDir = path.join(process.cwd(), "public")
const inputPath = path.join(publicDir, path.basename(HERO_BACKGROUND.jpg))
const outputPath = path.join(publicDir, path.basename(HERO_BACKGROUND.webp))

async function main(): Promise<void> {
  if (!fs.existsSync(inputPath)) {
    console.warn(`[generate-hero-webp] JPG not found: ${inputPath}`)
    console.warn("Положите файл в public/ или пропустите — сайт использует JPG как fallback.")
    process.exit(0)
  }

  await sharp(inputPath, { failOn: "none" })
    .rotate()
    .resize(1920, undefined, { withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(outputPath)

  const inStat = fs.statSync(inputPath)
  const outStat = fs.statSync(outputPath)
  console.log(
    `[generate-hero-webp] ${path.basename(outputPath)} — ${Math.round(outStat.size / 1024)} KiB (from ${Math.round(inStat.size / 1024)} KiB JPG)`,
  )
}

main().catch((err) => {
  console.error("[generate-hero-webp]", err)
  process.exit(1)
})
