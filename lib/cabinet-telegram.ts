import crypto from "crypto"
import { execute, queryOne } from "@/lib/database"
import type { CabinetNotificationType } from "@/lib/cabinet-notifications"
import {
  buildTelegramUserDeepLink,
  escapeHtml,
  isUserTelegramBotConfigured,
  sendTelegramUserMessage,
} from "@/lib/telegram-user"

const LINK_CODE_TTL_MS = 15 * 60 * 1000
const LINK_CODE_HEX_LEN = 8

export type CabinetTelegramNotifyPrefs = {
  enabled: boolean
  releases: boolean
  payments: boolean
  withdrawals: boolean
  royalty: boolean
}

export type CabinetTelegramStatus = {
  configured: boolean
  linked: boolean
  username: string | null
  linkedAt: string | null
  prefs: CabinetTelegramNotifyPrefs
  botUsername: string | null
}

type TelegramUserRow = {
  id: string
  telegram_chat_id: string | null
  telegram_username: string | null
  telegram_linked_at: string | null
  telegram_notify_enabled: boolean | null
  telegram_notify_releases: boolean | null
  telegram_notify_payments: boolean | null
  telegram_notify_withdrawals: boolean | null
  telegram_notify_royalty: boolean | null
}

type LinkCodeRow = {
  code: string
  user_id: string
  expires_at: string
  created_at: string
}

const DEFAULT_PREFS: CabinetTelegramNotifyPrefs = {
  enabled: true,
  releases: true,
  payments: true,
  withdrawals: true,
  royalty: true,
}

function boolOrDefault(v: boolean | null | undefined, fallback: boolean): boolean {
  if (v === true) return true
  if (v === false) return false
  return fallback
}

function rowToPrefs(row: TelegramUserRow | null | undefined): CabinetTelegramNotifyPrefs {
  if (!row) return { ...DEFAULT_PREFS }
  return {
    enabled: boolOrDefault(row.telegram_notify_enabled, true),
    releases: boolOrDefault(row.telegram_notify_releases, true),
    payments: boolOrDefault(row.telegram_notify_payments, true),
    withdrawals: boolOrDefault(row.telegram_notify_withdrawals, true),
    royalty: boolOrDefault(row.telegram_notify_royalty, true),
  }
}

export async function getCabinetTelegramStatus(userId: string): Promise<CabinetTelegramStatus> {
  const configured = isUserTelegramBotConfigured()
  const row = await queryOne<TelegramUserRow>(
    `
    SELECT
      id,
      telegram_chat_id,
      telegram_username,
      telegram_linked_at,
      telegram_notify_enabled,
      telegram_notify_releases,
      telegram_notify_payments,
      telegram_notify_withdrawals,
      telegram_notify_royalty
    FROM cabinet_users
    WHERE id = ?
    `,
    [userId]
  )

  const linked = Boolean(row?.telegram_chat_id)
  return {
    configured,
    linked,
    username: linked ? row?.telegram_username ?? null : null,
    linkedAt: linked ? row?.telegram_linked_at ?? null : null,
    prefs: rowToPrefs(row),
    botUsername: configured
      ? (process.env.TELEGRAM_USER_BOT_USERNAME?.trim() || "").replace(/^@/, "") || null
      : null,
  }
}

function generateLinkCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase()
}

export async function createCabinetTelegramLinkCode(userId: string): Promise<{
  code: string
  expiresAt: string
  deepLink: string | null
  botUsername: string | null
}> {
  if (!isUserTelegramBotConfigured()) {
    throw new Error("USER_BOT_NOT_CONFIGURED")
  }

  await execute(`DELETE FROM cabinet_telegram_link_codes WHERE user_id = ? OR expires_at < ?`, [
    userId,
    new Date().toISOString(),
  ])

  let code = generateLinkCode()
  for (let i = 0; i < 5; i++) {
    const existing = await queryOne<{ code: string }>(
      `SELECT code FROM cabinet_telegram_link_codes WHERE code = ?`,
      [code]
    )
    if (!existing) break
    code = generateLinkCode()
  }

  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + LINK_CODE_TTL_MS)
  await execute(
    `
    INSERT INTO cabinet_telegram_link_codes (code, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
    `,
    [code, userId, expiresAt.toISOString(), createdAt.toISOString()]
  )

  const botUsername =
    (process.env.TELEGRAM_USER_BOT_USERNAME?.trim() || "").replace(/^@/, "") || null

  return {
    code,
    expiresAt: expiresAt.toISOString(),
    deepLink: buildTelegramUserDeepLink(code),
    botUsername,
  }
}

export async function unlinkCabinetTelegram(userId: string): Promise<void> {
  await execute(
    `
    UPDATE cabinet_users
    SET
      telegram_chat_id = NULL,
      telegram_username = NULL,
      telegram_linked_at = NULL
    WHERE id = ?
    `,
    [userId]
  )
  await execute(`DELETE FROM cabinet_telegram_link_codes WHERE user_id = ?`, [userId])
}

export async function updateCabinetTelegramPrefs(
  userId: string,
  patch: Partial<CabinetTelegramNotifyPrefs>
): Promise<CabinetTelegramNotifyPrefs> {
  const current = await getCabinetTelegramStatus(userId)
  const next: CabinetTelegramNotifyPrefs = {
    enabled: patch.enabled ?? current.prefs.enabled,
    releases: patch.releases ?? current.prefs.releases,
    payments: patch.payments ?? current.prefs.payments,
    withdrawals: patch.withdrawals ?? current.prefs.withdrawals,
    royalty: patch.royalty ?? current.prefs.royalty,
  }

  await execute(
    `
    UPDATE cabinet_users SET
      telegram_notify_enabled = ?,
      telegram_notify_releases = ?,
      telegram_notify_payments = ?,
      telegram_notify_withdrawals = ?,
      telegram_notify_royalty = ?
    WHERE id = ?
    `,
    [
      next.enabled,
      next.releases,
      next.payments,
      next.withdrawals,
      next.royalty,
      userId,
    ]
  )

  return next
}

/** Привязка chat_id по коду из бота. Возвращает результат для ответа пользователю. */
export async function linkCabinetTelegramByCode(params: {
  code: string
  chatId: string
  username?: string | null
}): Promise<{ ok: true; alreadyLinked?: boolean } | { ok: false; reason: string }> {
  const code = params.code.trim().toUpperCase()
  if (!/^[A-F0-9]{8}$/.test(code)) {
    return { ok: false, reason: "invalid_code" }
  }

  const row = await queryOne<LinkCodeRow>(
    `SELECT code, user_id, expires_at, created_at FROM cabinet_telegram_link_codes WHERE code = ?`,
    [code]
  )
  if (!row) return { ok: false, reason: "not_found" }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await execute(`DELETE FROM cabinet_telegram_link_codes WHERE code = ?`, [code])
    return { ok: false, reason: "expired" }
  }

  const chatId = String(params.chatId).trim()
  if (!chatId) return { ok: false, reason: "invalid_chat" }

  const username = params.username?.trim().replace(/^@/, "") || null
  const linkedAt = new Date().toISOString()

  // Если этот chat уже у другого пользователя - отвязываем.
  await execute(
    `
    UPDATE cabinet_users
    SET telegram_chat_id = NULL, telegram_username = NULL, telegram_linked_at = NULL
    WHERE telegram_chat_id = ? AND id <> ?
    `,
    [chatId, row.user_id]
  )

  await execute(
    `
    UPDATE cabinet_users
    SET
      telegram_chat_id = ?,
      telegram_username = ?,
      telegram_linked_at = ?
    WHERE id = ?
    `,
    [chatId, username, linkedAt, row.user_id]
  )

  await execute(`DELETE FROM cabinet_telegram_link_codes WHERE user_id = ?`, [row.user_id])

  return { ok: true }
}

function prefKeyForType(
  type: CabinetNotificationType | string
): keyof Omit<CabinetTelegramNotifyPrefs, "enabled"> | null {
  switch (type) {
    case "release_status":
    case "release_moderation_note":
      return "releases"
    case "payment_success":
      return "payments"
    case "withdrawal_status":
      return "withdrawals"
    case "royalty_to_wallet":
      return "royalty"
    case "release_ai_analysis":
      return null
    default:
      return null
  }
}

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")
}

/** Дубль уведомления в Telegram (колокольчик уже записан). AI-анализ не шлём. */
export async function trySendCabinetTelegramNotification(params: {
  userId: string
  type: CabinetNotificationType | string
  title: string
  body?: string | null
  href?: string | null
}): Promise<void> {
  try {
    if (!isUserTelegramBotConfigured()) return

    const prefKey = prefKeyForType(params.type)
    if (!prefKey) return

    const row = await queryOne<TelegramUserRow>(
      `
      SELECT
        id,
        telegram_chat_id,
        telegram_username,
        telegram_linked_at,
        telegram_notify_enabled,
        telegram_notify_releases,
        telegram_notify_payments,
        telegram_notify_withdrawals,
        telegram_notify_royalty
      FROM cabinet_users
      WHERE id = ?
      `,
      [params.userId]
    )

    const chatId = row?.telegram_chat_id?.trim()
    if (!chatId) return

    const prefs = rowToPrefs(row)
    if (!prefs.enabled) return
    if (!prefs[prefKey]) return

    const lines = [
      `<b>${escapeHtml(params.title.trim())}</b>`,
    ]
    if (params.body?.trim()) {
      lines.push(escapeHtml(params.body.trim()))
    }
    if (params.href?.trim()) {
      const href = params.href.trim().startsWith("http")
        ? params.href.trim()
        : `${siteBase()}${params.href.trim().startsWith("/") ? "" : "/"}${params.href.trim()}`
      lines.push(`<a href="${escapeHtml(href)}">Открыть в кабинете</a>`)
    }

    const res = await sendTelegramUserMessage(chatId, lines.join("\n\n"))
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error("[cabinet-telegram] send failed", res.status, text.slice(0, 300))
    }
  } catch (error) {
    console.error("[cabinet-telegram] send error:", error)
  }
}

export function extractLinkCodeFromTelegramText(text: string): string | null {
  const raw = text.trim()
  if (!raw) return null

  const startMatch = raw.match(/^\/start(?:@\w+)?(?:\s+|_)([A-Za-z0-9]+)$/i)
  if (startMatch?.[1]) {
    const code = startMatch[1].toUpperCase()
    return /^[A-F0-9]{8}$/.test(code) ? code : null
  }

  const plain = raw.replace(/\s+/g, "").toUpperCase()
  if (/^[A-F0-9]{8}$/.test(plain)) return plain
  return null
}

export { LINK_CODE_TTL_MS, LINK_CODE_HEX_LEN }
