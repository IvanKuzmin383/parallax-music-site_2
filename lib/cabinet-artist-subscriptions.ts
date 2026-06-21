import crypto from "crypto"
import { query, queryOne, execute } from "./database"

export type CabinetArtistSubscription = {
  id: string
  userId: string
  artistName: string | null
  subscriptionName: string
  subscriptionExpiresAt: string | null
  subscriptionTrackLimit: number | null
  createdAt: string
  updatedAt: string
}

type CabinetArtistSubscriptionRow = {
  id: string
  user_id: string
  artist_name: string | null
  subscription_name: string
  subscription_expires_at: string | null
  subscription_track_limit: number | null
  created_at: string
  updated_at: string
}

function rowToModel(row: CabinetArtistSubscriptionRow): CabinetArtistSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    artistName: row.artist_name,
    subscriptionName: row.subscription_name,
    subscriptionExpiresAt: row.subscription_expires_at,
    subscriptionTrackLimit: row.subscription_track_limit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeArtist(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function isSlotActive(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return new Date(expiresAt) >= today
}

export async function createCabinetArtistSubscriptionSlot(params: {
  userId: string
  subscriptionName: string
  subscriptionExpiresAt: string | null
  subscriptionTrackLimit?: number | null
  artistName?: string | null
}): Promise<CabinetArtistSubscription> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await execute(
    `INSERT INTO cabinet_user_artist_subscriptions
      (id, user_id, artist_name, subscription_name, subscription_expires_at, subscription_track_limit, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.userId,
      params.artistName?.trim() || null,
      params.subscriptionName,
      params.subscriptionExpiresAt ?? null,
      params.subscriptionTrackLimit ?? null,
      now,
      now,
    ]
  )
  const row = await queryOne<CabinetArtistSubscriptionRow>(
    "SELECT * FROM cabinet_user_artist_subscriptions WHERE id = ?",
    [id]
  )
  return rowToModel(row!)
}

export async function listCabinetArtistSubscriptionsByUserId(userId: string): Promise<CabinetArtistSubscription[]> {
  const rows = await query<CabinetArtistSubscriptionRow>(
    `SELECT * FROM cabinet_user_artist_subscriptions
     WHERE user_id = ?
     ORDER BY created_at ASC`,
    [userId]
  )
  return rows.map(rowToModel)
}

export async function listActiveCabinetArtistSubscriptionsByUserId(
  userId: string
): Promise<CabinetArtistSubscription[]> {
  const all = await listCabinetArtistSubscriptionsByUserId(userId)
  return all.filter((s) => isSlotActive(s.subscriptionExpiresAt))
}

export async function claimArtistForActiveSlot(
  userId: string,
  artistName: string
): Promise<CabinetArtistSubscription | null> {
  const normalizedIncoming = normalizeArtist(artistName)
  const active = await listActiveCabinetArtistSubscriptionsByUserId(userId)

  const matched = active.find(
    (s) => s.artistName && normalizeArtist(s.artistName) === normalizedIncoming
  )
  if (matched) return matched

  const freeSlot = active.find((s) => !s.artistName || !s.artistName.trim())
  if (!freeSlot) return null

  const now = new Date().toISOString()
  await execute(
    `UPDATE cabinet_user_artist_subscriptions
     SET artist_name = ?, updated_at = ?
     WHERE id = ?`,
    [artistName.trim(), now, freeSlot.id]
  )

  const row = await queryOne<CabinetArtistSubscriptionRow>(
    "SELECT * FROM cabinet_user_artist_subscriptions WHERE id = ?",
    [freeSlot.id]
  )
  return row ? rowToModel(row) : null
}

export async function updateCabinetArtistSubscriptionSlot(
  id: string,
  params: {
    artistName?: string | null
    subscriptionName?: string
    subscriptionExpiresAt?: string | null
    subscriptionTrackLimit?: number | null
  }
): Promise<CabinetArtistSubscription | null> {
  const existing = await queryOne<CabinetArtistSubscriptionRow>(
    "SELECT * FROM cabinet_user_artist_subscriptions WHERE id = ?",
    [id]
  )
  if (!existing) return null

  const nextArtistName =
    params.artistName !== undefined ? (params.artistName?.trim() || null) : existing.artist_name
  const nextSubscriptionName = params.subscriptionName ?? existing.subscription_name
  const nextExpiresAt =
    params.subscriptionExpiresAt !== undefined ? (params.subscriptionExpiresAt ?? null) : existing.subscription_expires_at
  const nextTrackLimit =
    params.subscriptionTrackLimit !== undefined ? (params.subscriptionTrackLimit ?? null) : existing.subscription_track_limit

  await execute(
    `UPDATE cabinet_user_artist_subscriptions
     SET artist_name = ?, subscription_name = ?, subscription_expires_at = ?, subscription_track_limit = ?, updated_at = ?
     WHERE id = ?`,
    [nextArtistName, nextSubscriptionName, nextExpiresAt, nextTrackLimit, new Date().toISOString(), id]
  )

  const row = await queryOne<CabinetArtistSubscriptionRow>(
    "SELECT * FROM cabinet_user_artist_subscriptions WHERE id = ?",
    [id]
  )
  return row ? rowToModel(row) : null
}

export async function deleteCabinetArtistSubscriptionSlot(id: string): Promise<boolean> {
  const changes = await execute("DELETE FROM cabinet_user_artist_subscriptions WHERE id = ?", [id])
  return changes > 0
}
