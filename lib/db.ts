import fs from "fs"
import path from "path"
import { getPool, withTransaction } from "./database"
import { backfillTrackAcceptancesWithCurrentOffer } from "./legal-acceptance"

let initPromise: Promise<void> | null = null

/**
 * При старте сервера: применить SQL-миграции и однократный backfill юридических акцептов.
 */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = runInit().catch((err) => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}

async function runInit(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("[db] DATABASE_URL is required (PostgreSQL)")
  }

  await applyMigrations()

  try {
    const n = await withTransaction(async (client) => backfillTrackAcceptancesWithCurrentOffer(client))
    if (n > 0) {
      console.log("[db] Backfilled legal acceptance events for tracks:", n)
    }
  } catch (e) {
    console.error("[db] legal acceptance backfill failed:", e)
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[db] PostgreSQL connected")
  }
}

async function applyMigrations(): Promise<void> {
  const migrationsDir = path.join(process.cwd(), "migrations")
  if (!fs.existsSync(migrationsDir)) {
    console.warn("[db] migrations/ not found, skipping schema apply")
    return
  }

  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()

  for (const file of files) {
    const id = file.replace(/\.sql$/, "")
    const applied = await pool.query(`SELECT 1 FROM schema_migrations WHERE id = $1`, [id])
    if (applied.rowCount && applied.rowCount > 0) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8")
    console.log(`[db] applying migration ${file}`)
    await pool.query(sql)
    await pool.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [id])
  }
}
