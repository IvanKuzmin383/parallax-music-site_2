/**
 * Перенос данных SQLite → PostgreSQL.
 * Usage:
 *   SQLITE_PATH=/data/app.db DATABASE_URL=postgresql://... pnpm exec tsx scripts/migrate-sqlite-to-pg.ts
 *
 * Требует: better-sqlite3 (dev), pg, предварительно применённые миграции (pnpm db:migrate).
 */
import fs from "fs"
import path from "path"
import Database from "better-sqlite3"
import { getPool, closePool } from "../lib/database"

const BOOL_COLS: Record<string, Set<string>> = {
  cabinet_users: new Set([
    "is_disabled",
    "vat_payer",
    "edo_required",
    "autopay_enabled",
  ]),
  tracks: new Set([
    "is_ai_made",
    "is_instrumental",
    "needs_ai_cover",
    "transfer_from_other_distributor",
  ]),
  articles: new Set(["published"]),
  orders: new Set(["is_recurring_renewal"]),
  reviews: new Set(["is_published", "created_by_admin"]),
  cabinet_announcements: new Set(["active"]),
}

const TABLES_IN_ORDER = [
  "cabinet_users",
  "cabinet_user_deletions",
  "tracks",
  "articles",
  "albums",
  "orders",
  "upload_drafts",
  "withdrawal_requests",
  "streaming_reports",
  "password_reset_tokens",
  "reviews",
  "service_fulfillments",
  "pending_subscription_autopay",
  "autopay_disable_tokens",
  "pending_fix_credits",
  "subscription_billing_runs",
  "cabinet_user_artist_subscriptions",
  "music_stat_imports",
  "music_platform_tracks",
  "music_platform_track_daily_plays",
  "music_platform_daily_stats",
  "music_platform_top_tracks",
  "music_platform_track_daily_plays_by_country",
  "cabinet_music_track_map",
  "cabinet_announcements",
  "cabinet_announcement_dismissals",
  "legal_document_versions",
  "legal_acceptance_events",
  "tbank_recurrent_test_state",
  "tbank_receipt_test_state",
] as const

function resolveSqlitePath(): string {
  if (process.env.SQLITE_PATH?.trim()) return process.env.SQLITE_PATH.trim()
  if (fs.existsSync("/data/app.db")) return "/data/app.db"
  return path.join(process.cwd(), "data", "app.db")
}

function normalizeValue(table: string, col: string, value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (BOOL_COLS[table]?.has(col)) {
    if (typeof value === "number") return value === 1
    if (typeof value === "boolean") return value
    return Boolean(value)
  }
  return value
}

async function migrateTable(sqlite: Database.Database, table: string): Promise<number> {
  const pool = getPool()
  const cols = sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[]
  if (cols.length === 0) {
    console.log(`[migrate-data] skip ${table} (no sqlite table)`)
    return 0
  }

  const colNames = cols.map((c) => c.name)
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[]
  if (rows.length === 0) {
    console.log(`[migrate-data] ${table}: 0 rows`)
    return 0
  }

  const placeholders = colNames.map((_, i) => `$${i + 1}`).join(", ")
  const sql = `INSERT INTO ${table} (${colNames.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (const row of rows) {
      const values = colNames.map((col) => normalizeValue(table, col, row[col]))
      await client.query(sql, values)
    }
    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK")
    throw e
  } finally {
    client.release()
  }

  // pending_fix_credits: reset serial sequence
  if (table === "pending_fix_credits" && rows.length > 0) {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('pending_fix_credits', 'id'), COALESCE((SELECT MAX(id) FROM pending_fix_credits), 1))`
    )
  }

  console.log(`[migrate-data] ${table}: ${rows.length} rows`)
  return rows.length
}

async function main(): Promise<void> {
  const sqlitePath = resolveSqlitePath()
  if (!fs.existsSync(sqlitePath)) {
    console.error("SQLite not found:", sqlitePath)
    process.exit(1)
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required")
    process.exit(1)
  }

  console.log("[migrate-data] SQLite:", sqlitePath)
  const sqlite = new Database(sqlitePath, { readonly: true })

  let total = 0
  for (const table of TABLES_IN_ORDER) {
    try {
      total += await migrateTable(sqlite, table)
    } catch (e) {
      console.error(`[migrate-data] failed on ${table}:`, e)
      process.exit(1)
    }
  }

  sqlite.close()
  await closePool()
  console.log(`[migrate-data] done, ${total} rows copied`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
