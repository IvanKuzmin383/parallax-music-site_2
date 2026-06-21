import crypto from "crypto"
import { execute, query, queryOne } from "./database"

export type CabinetAnnouncement = {
  id: string
  title: string
  body: string
  active: boolean
  createdAt: string
}

function rowToAnnouncement(row: {
  id: string
  title: string
  body: string
  active: boolean
  created_at: string
}): CabinetAnnouncement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    active: row.active,
    createdAt: row.created_at,
  }
}

export async function listPendingAnnouncementsForUser(userId: string): Promise<CabinetAnnouncement[]> {
  const rows = await query<{
    id: string
    title: string
    body: string
    active: boolean
    created_at: string
  }>(
    `SELECT a.id, a.title, a.body, a.active, a.created_at
     FROM cabinet_announcements a
     WHERE a.active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM cabinet_announcement_dismissals d
         WHERE d.user_id = ? AND d.announcement_id = a.id
       )
     ORDER BY a.created_at ASC`,
    [userId]
  )
  return rows.map(rowToAnnouncement)
}

export async function dismissCabinetAnnouncement(userId: string, announcementId: string): Promise<boolean> {
  const exists = await queryOne(`SELECT 1 FROM cabinet_announcements WHERE id = ?`, [announcementId])
  if (!exists) return false
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO cabinet_announcement_dismissals (user_id, announcement_id, dismissed_at)
     VALUES (?, ?, ?)
     ON CONFLICT (user_id, announcement_id) DO NOTHING`,
    [userId, announcementId, now]
  )
  return true
}

export async function listAllCabinetAnnouncements(): Promise<CabinetAnnouncement[]> {
  const rows = await query<{
    id: string
    title: string
    body: string
    active: boolean
    created_at: string
  }>(
    `SELECT id, title, body, active, created_at FROM cabinet_announcements ORDER BY created_at DESC`
  )
  return rows.map(rowToAnnouncement)
}

export async function createCabinetAnnouncement(title: string, body: string): Promise<CabinetAnnouncement> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  await execute(
    `INSERT INTO cabinet_announcements (id, title, body, active, created_at)
     VALUES (?, ?, ?, TRUE, ?)`,
    [id, title.trim(), body.trim(), createdAt]
  )
  return { id, title: title.trim(), body: body.trim(), active: true, createdAt }
}

export async function updateCabinetAnnouncement(
  id: string,
  patch: { title?: string; body?: string; active?: boolean }
): Promise<CabinetAnnouncement | null> {
  const current = await queryOne<{
    id: string
    title: string
    body: string
    active: boolean
    created_at: string
  }>(`SELECT id, title, body, active, created_at FROM cabinet_announcements WHERE id = ?`, [id])
  if (!current) return null

  const title = patch.title !== undefined ? patch.title.trim() : current.title
  const body = patch.body !== undefined ? patch.body.trim() : current.body
  const active = patch.active !== undefined ? patch.active : current.active

  await execute(`UPDATE cabinet_announcements SET title = ?, body = ?, active = ? WHERE id = ?`, [
    title,
    body,
    active,
    id,
  ])

  return {
    id: current.id,
    title,
    body,
    active,
    createdAt: current.created_at,
  }
}

export async function deleteCabinetAnnouncement(id: string): Promise<boolean> {
  await execute(`DELETE FROM cabinet_announcement_dismissals WHERE announcement_id = ?`, [id])
  const n = await execute(`DELETE FROM cabinet_announcements WHERE id = ?`, [id])
  return n > 0
}
