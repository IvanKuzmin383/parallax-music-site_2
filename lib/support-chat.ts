import crypto from "crypto"
import { execute, query, queryOne, withTransaction, clientExecute, clientQuery } from "@/lib/database"
import { tryCreateCabinetNotification } from "@/lib/cabinet-notifications"
import { escapeHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram"

export const SUPPORT_MESSAGE_MAX_LEN = 4000
export const SUPPORT_MESSAGES_LIMIT = 200

export type SupportThreadStatus = "open" | "closed"
export type SupportMessageAuthor = "user" | "admin"

export type SupportThread = {
  id: string
  userId: string
  status: SupportThreadStatus
  lastMessageAt: string | null
  unreadForAdmin: number
  unreadForUser: number
  createdAt: string
}

export type SupportMessage = {
  id: string
  threadId: string
  author: SupportMessageAuthor
  body: string
  createdAt: string
}

export type SupportThreadListItem = SupportThread & {
  userEmail: string
  userDisplayName: string
  lastMessagePreview: string | null
}

type ThreadRow = {
  id: string
  user_id: string
  status: string
  last_message_at: Date | string | null
  unread_for_admin: number | string
  unread_for_user: number | string
  created_at: Date | string
}

type MessageRow = {
  id: string
  thread_id: string
  author: string
  body: string
  created_at: Date | string
}

type ThreadListRow = ThreadRow & {
  email: string
  artist_name: string | null
  first_name: string | null
  last_name: string | null
  last_body: string | null
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString()
}

function toInt(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
}

function rowToThread(row: ThreadRow): SupportThread {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status === "closed" ? "closed" : "open",
    lastMessageAt: toIso(row.last_message_at),
    unreadForAdmin: toInt(row.unread_for_admin),
    unreadForUser: toInt(row.unread_for_user),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  }
}

function rowToMessage(row: MessageRow): SupportMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    author: row.author === "admin" ? "admin" : "user",
    body: row.body,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  }
}

function displayName(row: {
  artist_name: string | null
  first_name: string | null
  last_name: string | null
  email: string
}): string {
  const artist = row.artist_name?.trim()
  if (artist) return artist
  const fio = [row.first_name, row.last_name].filter(Boolean).join(" ").trim()
  if (fio) return fio
  return row.email
}

export function normalizeSupportMessageBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const body = raw.trim().replace(/\r\n/g, "\n")
  if (!body || body.length > SUPPORT_MESSAGE_MAX_LEN) return null
  return body
}

export async function getSupportThreadByUserId(
  userId: string,
): Promise<SupportThread | null> {
  const row = await queryOne<ThreadRow>(
    `SELECT * FROM support_threads WHERE user_id = ?`,
    [userId],
  )
  return row ? rowToThread(row) : null
}

export async function getSupportThreadById(
  threadId: string,
): Promise<SupportThread | null> {
  const row = await queryOne<ThreadRow>(
    `SELECT * FROM support_threads WHERE id = ?`,
    [threadId],
  )
  return row ? rowToThread(row) : null
}

export async function listSupportMessages(
  threadId: string,
  options?: { after?: string | null; limit?: number },
): Promise<SupportMessage[]> {
  const limit = Math.min(
    Math.max(options?.limit ?? SUPPORT_MESSAGES_LIMIT, 1),
    SUPPORT_MESSAGES_LIMIT,
  )
  const after = options?.after?.trim() || null

  if (after) {
    const rows = await query<MessageRow>(
      `
      SELECT * FROM support_messages
      WHERE thread_id = ?
        AND created_at > ?
      ORDER BY created_at ASC
      LIMIT ?
      `,
      [threadId, after, limit],
    )
    return rows.map(rowToMessage)
  }

  // Последние N в хронологическом порядке.
  const rows = await query<MessageRow>(
    `
    SELECT * FROM (
      SELECT * FROM support_messages
      WHERE thread_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    ) recent
    ORDER BY created_at ASC
    `,
    [threadId, limit],
  )
  return rows.map(rowToMessage)
}

export async function appendSupportMessage(params: {
  author: SupportMessageAuthor
  body: string
  /** Обязателен для author=user. */
  userId?: string
  /** Обязателен для author=admin. */
  threadId?: string
}): Promise<{ thread: SupportThread; message: SupportMessage }> {
  const body = normalizeSupportMessageBody(params.body)
  if (!body) {
    throw new Error("INVALID_BODY")
  }
  if (params.author === "user" && !params.userId?.trim()) {
    throw new Error("USER_REQUIRED")
  }
  if (params.author === "admin" && !params.threadId?.trim()) {
    throw new Error("THREAD_REQUIRED")
  }

  const result = await withTransaction(async (client) => {
    let threadRow: ThreadRow | undefined

    if (params.author === "user") {
      const userId = params.userId!.trim()
      const rows = await clientQuery<ThreadRow>(
        client,
        `SELECT * FROM support_threads WHERE user_id = ? FOR UPDATE`,
        [userId],
      )
      threadRow = rows[0]
      if (!threadRow) {
        const id = crypto.randomUUID()
        const createdAt = new Date().toISOString()
        await clientExecute(
          client,
          `
          INSERT INTO support_threads (
            id, user_id, status, last_message_at, unread_for_admin, unread_for_user, created_at
          ) VALUES (?, ?, 'open', NULL, 0, 0, ?)
          `,
          [id, userId, createdAt],
        )
        const created = await clientQuery<ThreadRow>(
          client,
          `SELECT * FROM support_threads WHERE id = ? FOR UPDATE`,
          [id],
        )
        threadRow = created[0]
      }
    } else {
      const rows = await clientQuery<ThreadRow>(
        client,
        `SELECT * FROM support_threads WHERE id = ? FOR UPDATE`,
        [params.threadId!.trim()],
      )
      threadRow = rows[0]
      if (!threadRow) throw new Error("THREAD_NOT_FOUND")
    }

    if (!threadRow) throw new Error("THREAD_NOT_FOUND")

    const messageId = crypto.randomUUID()
    const createdAt = new Date().toISOString()

    await clientExecute(
      client,
      `
      INSERT INTO support_messages (id, thread_id, author, body, created_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [messageId, threadRow.id, params.author, body, createdAt],
    )

    if (params.author === "user") {
      await clientExecute(
        client,
        `
        UPDATE support_threads SET
          status = 'open',
          last_message_at = ?,
          unread_for_admin = unread_for_admin + 1
        WHERE id = ?
        `,
        [createdAt, threadRow.id],
      )
    } else {
      await clientExecute(
        client,
        `
        UPDATE support_threads SET
          status = 'open',
          last_message_at = ?,
          unread_for_user = unread_for_user + 1
        WHERE id = ?
        `,
        [createdAt, threadRow.id],
      )
    }

    const updated = await clientQuery<ThreadRow>(
      client,
      `SELECT * FROM support_threads WHERE id = ?`,
      [threadRow.id],
    )

    return {
      thread: rowToThread(updated[0]!),
      message: {
        id: messageId,
        threadId: threadRow.id,
        author: params.author,
        body,
        createdAt,
      },
    }
  })

  return result
}

export async function markSupportThreadReadForUser(userId: string): Promise<void> {
  await execute(
    `
    UPDATE support_threads
    SET unread_for_user = 0
    WHERE user_id = ? AND unread_for_user > 0
    `,
    [userId],
  )
}

export async function markSupportThreadReadForAdmin(threadId: string): Promise<void> {
  await execute(
    `
    UPDATE support_threads
    SET unread_for_admin = 0
    WHERE id = ? AND unread_for_admin > 0
    `,
    [threadId],
  )
}

export async function setSupportThreadStatus(
  threadId: string,
  status: SupportThreadStatus,
): Promise<SupportThread | null> {
  await execute(`UPDATE support_threads SET status = ? WHERE id = ?`, [status, threadId])
  return getSupportThreadById(threadId)
}

export async function listSupportThreads(options?: {
  status?: SupportThreadStatus | "all"
  limit?: number
}): Promise<SupportThreadListItem[]> {
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200)
  const status = options?.status ?? "all"
  const statusSql =
    status === "open" || status === "closed" ? `AND t.status = ?` : ""

  const params: unknown[] = []
  if (statusSql) params.push(status)
  params.push(limit)

  const rows = await query<ThreadListRow>(
    `
    SELECT
      t.*,
      u.email,
      u.artist_name,
      u.first_name,
      u.last_name,
      (
        SELECT m.body
        FROM support_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_body
    FROM support_threads t
    INNER JOIN cabinet_users u ON u.id = t.user_id
    WHERE t.last_message_at IS NOT NULL
      ${statusSql}
    ORDER BY t.last_message_at DESC
    LIMIT ?
    `,
    params,
  )

  return rows.map((row) => ({
    ...rowToThread(row),
    userEmail: row.email,
    userDisplayName: displayName(row),
    lastMessagePreview: row.last_body?.trim() || null,
  }))
}

export async function countUnreadSupportThreadsForAdmin(): Promise<number> {
  const row = await queryOne<{ c: number | string }>(
    `
    SELECT COUNT(*)::int AS c
    FROM support_threads
    WHERE unread_for_admin > 0
    `,
  )
  return toInt(row?.c)
}

/** Telegram-only staff alert (без email). */
export function notifyStaffSupportMessageInBackground(params: {
  userEmail: string
  userDisplayName: string
  bodyPreview: string
}): void {
  if (!isTelegramConfigured()) return

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(
    /\/$/,
    "",
  )
  const preview = params.bodyPreview.slice(0, 280)
  const message = [
    `<b>Чат поддержки</b>`,
    `<b>От:</b> ${escapeHtml(params.userDisplayName)}`,
    `<b>Email:</b> ${escapeHtml(params.userEmail)}`,
    ``,
    escapeHtml(preview),
    ``,
    `<a href="${escapeHtml(`${baseUrl}/admin26081993/support`)}">Открыть в админке</a>`,
  ].join("\n")

  void sendTelegramMessage(message).catch((err) => {
    console.error("[support-chat] Telegram notify failed:", err)
  })
}

export async function notifyUserSupportReply(params: {
  userId: string
  threadId: string
  bodyPreview: string
}): Promise<void> {
  await tryCreateCabinetNotification({
    userId: params.userId,
    type: "support_reply",
    title: "Ответ поддержки",
    body: params.bodyPreview.slice(0, 180),
    href: "/cabinet?support=1",
    entityType: "support_thread",
    entityId: params.threadId,
  })
}
