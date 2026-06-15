/**
 * Apply SQL migrations from migrations/*.sql
 * Usage: pnpm exec tsx scripts/run-pg-migrations.ts
 * Requires: DATABASE_URL
 */
import fs from "fs"
import path from "path"
import { getPool, closePool } from "../lib/database"

async function main(): Promise<void> {
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
