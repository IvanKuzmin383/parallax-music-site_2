/**
 * Однократный перенос опубликованных отзывов из SQLite в reviews.json.
 * Запуск: pnpm exec tsx scripts/export-reviews-sqlite-to-json.ts
 */
import fs from "fs"
import path from "path"
import Database from "better-sqlite3"
import { getReviewsJsonPathForScripts } from "../lib/reviews"

const DB_FILE_NAME = "app.db"

function getDbPath(): string {
  try {
    if (fs.existsSync("/data")) {
      return path.posix.join("/data", DB_FILE_NAME)
    }
  } catch {
    // ignore
  }
  return path.join(process.cwd(), "data", DB_FILE_NAME)
}

type ReviewRow = {
  id: string
  author_name: string
  rating: number
  text: string
  created_at: string
  updated_at: string
}

function main(): void {
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    console.error("SQLite not found:", dbPath)
    process.exit(1)
  }

  const db = new Database(dbPath, { readonly: true })
  const rows = db
    .prepare(
      `SELECT id, author_name, rating, text, created_at, updated_at
       FROM reviews WHERE is_published = 1 ORDER BY datetime(created_at) DESC`
    )
    .all() as ReviewRow[]

  const outPath = getReviewsJsonPathForScripts()
  const dir = path.dirname(outPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const payload = {
    reviews: rows.map((row) => ({
      id: row.id,
      authorName: row.author_name,
      rating: row.rating,
      text: row.text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  }

  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  console.log(`Exported ${payload.reviews.length} reviews to ${outPath}`)
}

main()
