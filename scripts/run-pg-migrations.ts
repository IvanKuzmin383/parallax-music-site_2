/**
 * Apply SQL migrations from migrations/*.sql
 * Usage: pnpm exec tsx scripts/run-pg-migrations.ts
 * Requires: DATABASE_URL (env or .env / .env.local in project root)
 */
import fs from "fs"
import path from "path"
import { getPool, closePool } from "../lib/database"

/** Минимальный парсер .env - без зависимости dotenv (как у Next на сервере). */
function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, "utf8")
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    if (process.env[key] !== undefined) continue
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL?.trim()) return
  const root = process.cwd()
  loadEnvFile(path.join(root, ".env"))
  loadEnvFile(path.join(root, ".env.local"))
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "[migrate] DATABASE_URL is not set. Export it or put it in .env / .env.local"
    )
    process.exit(1)
  }
}

async function main(): Promise<void> {
  ensureDatabaseUrl()

  const migrationsDir = path.join(process.cwd(), "migrations")
  if (!fs.existsSync(migrationsDir)) {
    console.error("migrations/ not found")
    process.exit(1)
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
    if (applied.rowCount && applied.rowCount > 0) {
      console.log(`[migrate] skip ${file}`)
      continue
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8")
    console.log(`[migrate] applying ${file}...`)
    await pool.query(sql)
    await pool.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [id])
    console.log(`[migrate] done ${file}`)
  }

  await closePool()
  console.log("[migrate] all migrations applied")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
