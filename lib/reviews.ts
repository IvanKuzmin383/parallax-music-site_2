import crypto from "crypto"
import { getDb } from "./db"

export interface Review {
  id: string
  userId?: string
  authorName: string
  rating: number
  text: string
  isPublished: boolean
  createdByAdmin: boolean
  createdAt: string
  updatedAt: string
}

interface ReviewRow {
  id: string
  user_id: string | null
  author_name: string
  rating: number
  text: string
  is_published: number
  created_by_admin: number
  created_at: string
  updated_at: string
}

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    authorName: row.author_name,
    rating: row.rating,
    text: row.text,
    isPublished: row.is_published === 1,
    createdByAdmin: row.created_by_admin === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getPublishedReviews(limit = 12): Promise<Review[]> {
  const db = getDb()
  const rows = db
    .prepare(
      `
      SELECT * FROM reviews
      WHERE is_published = 1
      ORDER BY datetime(created_at) DESC
      LIMIT ?
      `
    )
    .all(limit) as ReviewRow[]
  return rows.map(rowToReview)
}

export async function getReviewByUserId(userId: string): Promise<Review | null> {
  const db = getDb()
  const row = db
    .prepare("SELECT * FROM reviews WHERE user_id = ? LIMIT 1")
    .get(userId) as ReviewRow | undefined
  return row ? rowToReview(row) : null
}

export async function getAllReviews(): Promise<Review[]> {
  const db = getDb()
  const rows = db
    .prepare("SELECT * FROM reviews ORDER BY datetime(created_at) DESC")
    .all() as ReviewRow[]
  return rows.map(rowToReview)
}

export async function createUserReview(params: {
  userId: string
  authorName: string
  text: string
  rating: number
}): Promise<Review> {
  const now = new Date().toISOString()
  const review: Review = {
    id: crypto.randomUUID(),
    userId: params.userId,
    authorName: params.authorName.trim(),
    text: params.text.trim(),
    rating: params.rating,
    isPublished: false,
    createdByAdmin: false,
    createdAt: now,
    updatedAt: now,
  }

  const db = getDb()
  db.prepare(
    `
    INSERT INTO reviews (
      id, user_id, author_name, rating, text, is_published, created_by_admin, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    review.id,
    review.userId ?? null,
    review.authorName,
    review.rating,
    review.text,
    review.isPublished ? 1 : 0,
    review.createdByAdmin ? 1 : 0,
    review.createdAt,
    review.updatedAt
  )

  return review
}

export async function createAdminReview(params: {
  authorName: string
  text: string
  rating: number
  isPublished: boolean
}): Promise<Review> {
  const now = new Date().toISOString()
  const review: Review = {
    id: crypto.randomUUID(),
    authorName: params.authorName.trim(),
    text: params.text.trim(),
    rating: params.rating,
    isPublished: params.isPublished,
    createdByAdmin: true,
    createdAt: now,
    updatedAt: now,
  }

  const db = getDb()
  db.prepare(
    `
    INSERT INTO reviews (
      id, user_id, author_name, rating, text, is_published, created_by_admin, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    review.id,
    null,
    review.authorName,
    review.rating,
    review.text,
    review.isPublished ? 1 : 0,
    1,
    review.createdAt,
    review.updatedAt
  )

  return review
}

export async function updateReview(
  id: string,
  patch: Partial<Pick<Review, "authorName" | "text" | "rating" | "isPublished">>
): Promise<Review | null> {
  const db = getDb()
  const existing = db
    .prepare("SELECT * FROM reviews WHERE id = ?")
    .get(id) as ReviewRow | undefined
  if (!existing) return null

  const nextAuthorName = patch.authorName?.trim() ?? existing.author_name
  const nextText = patch.text?.trim() ?? existing.text
  const nextRating = patch.rating ?? existing.rating
  const nextPublished =
    patch.isPublished === undefined ? existing.is_published === 1 : patch.isPublished
  const updatedAt = new Date().toISOString()

  db.prepare(
    `
    UPDATE reviews
    SET author_name = ?, text = ?, rating = ?, is_published = ?, updated_at = ?
    WHERE id = ?
    `
  ).run(nextAuthorName, nextText, nextRating, nextPublished ? 1 : 0, updatedAt, id)

  const updated = db
    .prepare("SELECT * FROM reviews WHERE id = ?")
    .get(id) as ReviewRow | undefined
  return updated ? rowToReview(updated) : null
}

export async function deleteReview(id: string): Promise<boolean> {
  const db = getDb()
  const result = db.prepare("DELETE FROM reviews WHERE id = ?").run(id)
  return result.changes > 0
}
