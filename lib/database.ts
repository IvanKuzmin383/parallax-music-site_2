import { Pool, type PoolClient, type QueryResultRow } from "pg"

let pool: Pool | null = null

/**
 * PostgreSQL connection pool. Requires DATABASE_URL (e.g. Managed PG on Yandex Cloud).
 */
export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL?.trim()
    if (!url) {
      throw new Error("[database] DATABASE_URL is not set")
    }
    pool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
    pool.on("error", (err) => {
      console.error("[database] idle client error:", err)
    })
  }
  return pool
}

/** SQLite `?` placeholders → PostgreSQL `$1`, `$2`, … */
export function convertSql(sql: string): string {
  let index = 0
  return sql.replace(/\?/g, () => `$${++index}`)
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(convertSql(sql), params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(sql, params)
  return rows[0]
}

export async function execute(sql: string, params: unknown[] = []): Promise<number> {
  const result = await getPool().query(convertSql(sql), params)
  return result.rowCount ?? 0
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

/** Run SQL with `?` placeholders on a transaction client. */
export async function clientQuery<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await client.query<T>(convertSql(sql), params)
  return result.rows
}

export async function clientExecute(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<number> {
  const result = await client.query(convertSql(sql), params)
  return result.rowCount ?? 0
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

/** pg driver returns TIMESTAMPTZ as Date; app types expect ISO strings. */
export function normalizePgTimestamptz(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string" && value.trim()) return value
  return ""
}

/** Sort helper: newest first (works with Date or string from PostgreSQL). */
export function compareTimestampsDesc(a: unknown, b: unknown): number {
  return normalizePgTimestamptz(b).localeCompare(normalizePgTimestamptz(a))
}
