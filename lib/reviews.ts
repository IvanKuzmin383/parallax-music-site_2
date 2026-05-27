import crypto from "crypto"
import fs from "fs"
import path from "path"
import { revalidatePath } from "next/cache"

const REVIEWS_FILE_NAME = "reviews.json"

export interface Review {
  id: string
  authorName: string
  rating: number
  text: string
  createdAt: string
  updatedAt: string
}

interface ReviewsFile {
  reviews: Review[]
}

function getReviewsFilePath(): string {
  if (process.env.REVIEWS_JSON_PATH?.trim()) {
    return process.env.REVIEWS_JSON_PATH.trim()
  }
  try {
    if (fs.existsSync("/data")) {
      return path.posix.join("/data", REVIEWS_FILE_NAME)
    }
  } catch {
    // ignore
  }
  return path.join(process.cwd(), "data", REVIEWS_FILE_NAME)
}

function ensureReviewsFile(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(filePath)) {
    const initial: ReviewsFile = { reviews: [] }
    fs.writeFileSync(filePath, `${JSON.stringify(initial, null, 2)}\n`, "utf8")
  }
}

function readReviewsFile(): ReviewsFile {
  const filePath = getReviewsFilePath()
  ensureReviewsFile(filePath)
  const raw = fs.readFileSync(filePath, "utf8")
  const parsed = JSON.parse(raw) as ReviewsFile
  if (!parsed || !Array.isArray(parsed.reviews)) {
    return { reviews: [] }
  }
  return parsed
}

function writeReviewsFile(data: ReviewsFile): void {
  const filePath = getReviewsFilePath()
  ensureReviewsFile(filePath)
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
  fs.renameSync(tmpPath, filePath)
}

function sortReviewsNewestFirst(reviews: Review[]): Review[] {
  return [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function revalidateReviewsCache(): void {
  revalidatePath("/")
}

export async function getPublishedReviews(limit = 24): Promise<Review[]> {
  const { reviews } = readReviewsFile()
  return sortReviewsNewestFirst(reviews).slice(0, limit)
}

export async function getAllReviews(): Promise<Review[]> {
  const { reviews } = readReviewsFile()
  return sortReviewsNewestFirst(reviews)
}

export async function createAdminReview(params: {
  authorName: string
  text: string
  rating: number
}): Promise<Review> {
  const now = new Date().toISOString()
  const review: Review = {
    id: crypto.randomUUID(),
    authorName: params.authorName.trim(),
    text: params.text.trim(),
    rating: params.rating,
    createdAt: now,
    updatedAt: now,
  }

  const data = readReviewsFile()
  data.reviews.push(review)
  writeReviewsFile(data)
  revalidateReviewsCache()
  return review
}

export async function updateReview(
  id: string,
  patch: Partial<Pick<Review, "authorName" | "text" | "rating">>
): Promise<Review | null> {
  const data = readReviewsFile()
  const index = data.reviews.findIndex((r) => r.id === id)
  if (index < 0) return null

  const existing = data.reviews[index]
  const updated: Review = {
    ...existing,
    authorName: patch.authorName?.trim() ?? existing.authorName,
    text: patch.text?.trim() ?? existing.text,
    rating: patch.rating ?? existing.rating,
    updatedAt: new Date().toISOString(),
  }
  data.reviews[index] = updated
  writeReviewsFile(data)
  revalidateReviewsCache()
  return updated
}

export async function deleteReview(id: string): Promise<boolean> {
  const data = readReviewsFile()
  const next = data.reviews.filter((r) => r.id !== id)
  if (next.length === data.reviews.length) return false
  writeReviewsFile({ reviews: next })
  revalidateReviewsCache()
  return true
}

/** Путь к JSON (для скрипта миграции с SQLite). */
export function getReviewsJsonPathForScripts(): string {
  return getReviewsFilePath()
}
