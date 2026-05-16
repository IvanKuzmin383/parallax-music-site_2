import crypto from "crypto"
import { getDb } from "./db"

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
  active: number
  created_at: string
}): CabinetAnnouncement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    active: row.active === 1,
    createdAt: row.created_at,
  }
}

export function listPendingAnnouncementsForUser(userId: string): CabinetAnnouncement[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT a.id, a.title, a.body, a.active, a.created_at
       FROM cabinet_announcements a
       WHERE a.active = 1
         AND NOT EXISTS (
           SELECT 1 FROM cabinet_announcement_dismissals d
           WHERE d.user_id = ? AND d.announcement_id = a.id
         )
       ORDER BY a.created_at ASC`
    )
    .all(userId) as {
    id: string
    title: string
    body: string
    active: number
    created_at: string
  }[]
  return rows.map(rowToAnnouncement)
}

export function dismissCabinetAnnouncement(userId: string, announcementId: string): boolean {
  const db = getDb()
  const exists = db.prepare(`SELECT 1 FROM cabinet_announcements WHERE id = ?`).get(announcementId)
  if (!exists) return false
  const now = new Date().toISOString()
  db.prepare(
    `INSERT OR IGNORE INTO cabinet_announcement_dismissals (user_id, announcement_id, dismissed_at)
     VALUES (?, ?, ?)`
  ).run(userId, announcementId, now)
  return true
}

export function listAllCabinetAnnouncements(): CabinetAnnouncement[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT id, title, body, active, created_at FROM cabinet_announcements ORDER BY created_at DESC`
    )
    .all() as {
    id: string
    title: string
    body: string
    active: number
    created_at: string
  }[]
  return rows.map(rowToAnnouncement)
}

export function createCabinetAnnouncement(title: string, body: string): CabinetAnnouncement {
  const db = getDb()
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO cabinet_announcements (id, title, body, active, created_at)
     VALUES (?, ?, ?, 1, ?)`
  ).run(id, title.trim(), body.trim(), createdAt)
  return { id, title: title.trim(), body: body.trim(), active: true, createdAt }
}

export function updateCabinetAnnouncement(
  id: string,
  patch: { title?: string; body?: string; active?: boolean }
): CabinetAnnouncement | null {
  const db = getDb()
  const current = db
    .prepare(`SELECT id, title, body, active, created_at FROM cabinet_announcements WHERE id = ?`)
    .get(id) as
    | {
        id: string
        title: string
        body: string
        active: number
        created_at: string
      }
    | undefined
  if (!current) return null

  const title = patch.title !== undefined ? patch.title.trim() : current.title
  const body = patch.body !== undefined ? patch.body.trim() : current.body
  const active =
    patch.active !== undefined ? (patch.active ? 1 : 0) : current.active

  db.prepare(
    `UPDATE cabinet_announcements SET title = ?, body = ?, active = ? WHERE id = ?`
  ).run(title, body, active, id)

  return {
    id: current.id,
    title,
    body,
    active: active === 1,
    createdAt: current.created_at,
  }
}

export function deleteCabinetAnnouncement(id: string): boolean {
  const db = getDb()
  db.prepare(`DELETE FROM cabinet_announcement_dismissals WHERE announcement_id = ?`).run(id)
  const res = db.prepare(`DELETE FROM cabinet_announcements WHERE id = ?`).run(id)
  return res.changes > 0
}
