import pg from "pg"
import { readFileSync } from "fs"

const env = Object.fromEntries(
  readFileSync("/var/www/parallaxmusic/.env", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]
    })
)

const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
const { rows } = await pool.query(`
  SELECT track_name, artist_name, audio_path
  FROM tracks
  ORDER BY created_at::timestamptz DESC
  LIMIT 10
`)
console.log(JSON.stringify(rows, null, 2))
await pool.end()
