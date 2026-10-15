import {
  STORY_VIDEO_BADGE_IDS,
  STORY_VIDEO_BADGE_META,
  type StoryVideoBadgeId,
} from "@/lib/story-video-theme"

const cache = new Map<string, Promise<HTMLImageElement | null>>()

function loadSrc(src: string): Promise<HTMLImageElement | null> {
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

/** Загрузка одной SVG-иконки бейджа. */
export function loadStoryVideoBadgeIcon(
  badge: StoryVideoBadgeId | "none" | null | undefined
): Promise<HTMLImageElement | null> {
  if (!badge || badge === "none") return Promise.resolve(null)
  if (!(STORY_VIDEO_BADGE_IDS as readonly string[]).includes(badge)) {
    return Promise.resolve(null)
  }
  return loadSrc(STORY_VIDEO_BADGE_META[badge].iconSrc)
}

/** Загрузка иконок для всех выбранных бейджей. */
export async function loadStoryVideoBadgeIcons(
  badges: StoryVideoBadgeId[]
): Promise<Partial<Record<StoryVideoBadgeId, HTMLImageElement>>> {
  const unique = STORY_VIDEO_BADGE_IDS.filter((id) => badges.includes(id))
  const entries = await Promise.all(
    unique.map(async (id) => {
      const img = await loadStoryVideoBadgeIcon(id)
      return [id, img] as const
    })
  )
  const out: Partial<Record<StoryVideoBadgeId, HTMLImageElement>> = {}
  for (const [id, img] of entries) {
    if (img) out[id] = img
  }
  return out
}
