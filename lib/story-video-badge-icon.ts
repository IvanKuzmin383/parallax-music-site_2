import {
  STORY_VIDEO_BADGE_META,
  type StoryVideoBadge,
} from "@/lib/story-video-theme"

const cache = new Map<string, Promise<HTMLImageElement | null>>()

/** Загрузка SVG-иконки бейджа (same-origin, без CORS проблем). */
export function loadStoryVideoBadgeIcon(
  badge: StoryVideoBadge
): Promise<HTMLImageElement | null> {
  if (!badge || badge === "none") return Promise.resolve(null)
  const src = STORY_VIDEO_BADGE_META[badge].iconSrc
  if (!src) return Promise.resolve(null)

  const existing = cache.get(src)
  if (existing) return existing

  const job = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
  cache.set(src, job)
  return job
}
