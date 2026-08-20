import { promises as fs } from "fs"
import path from "path"
import { getUploadsBasePath } from "@/lib/tracks"

export const BLOG_COVER_PUBLIC_PREFIX = "/api/blog-covers"
export const MAX_BLOG_COVER_BYTES = 10 * 1024 * 1024

const SAFE_NAME_RE = /^[a-zA-Z0-9._-]+\.(jpe?g|png)$/i

export function isBlogCoverPublicPath(value: string | null | undefined): boolean {
  if (!value) return false
  return value.startsWith(`${BLOG_COVER_PUBLIC_PREFIX}/`) && value.length > BLOG_COVER_PUBLIC_PREFIX.length + 1
}

/** Допустимое значение ogImage: URL, /blog/..., /api/blog-covers/... */
export function isValidArticleOgImage(value: string | null | undefined): boolean {
  if (!value) return true
  const v = value.trim()
  if (!v) return true
  if (v.startsWith("http://") || v.startsWith("https://")) return true
  if (v.startsWith("/blog/") && v.length > 6) return true
  if (isBlogCoverPublicPath(v)) {
    const name = path.basename(v)
    return SAFE_NAME_RE.test(name)
  }
  return false
}

export function blogCoverPublicPath(fileName: string): string {
  return `${BLOG_COVER_PUBLIC_PREFIX}/${fileName}`
}

export function parseBlogCoverFileName(publicPath: string): string | null {
  if (!isBlogCoverPublicPath(publicPath)) return null
  const name = path.basename(publicPath)
  if (!SAFE_NAME_RE.test(name)) return null
  return name
}

export async function getBlogCoversDir(): Promise<string> {
  const base = await getUploadsBasePath()
  const dir = path.join(base, "blog-covers")
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export function resolveBlogCoverAbsolutePath(fileName: string, coversDir: string): string | null {
  if (!SAFE_NAME_RE.test(fileName)) return null
  const resolvedDir = path.resolve(coversDir)
  const resolved = path.resolve(coversDir, fileName)
  const rel = path.relative(resolvedDir, resolved)
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null
  return resolved
}
