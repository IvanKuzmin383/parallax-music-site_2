import { clientExecute, clientQuery, withTransaction, queryOne } from "@/lib/database"
import { getServicePriceRub } from "@/lib/service-prices"
import {
  TOOLS_STORY_VIDEO_CREDITS_PER_PURCHASE,
  TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB,
  type ToolsStoryVideoEntitlement,
} from "@/lib/tools-story-video-pricing"

export type { ToolsStoryVideoEntitlement }

type EntitlementRow = {
  tools_story_video_free_used: boolean | null
  tools_story_video_credits: number | null
}

function rowToEntitlement(
  row: EntitlementRow | null | undefined,
  priceRub: number
): ToolsStoryVideoEntitlement {
  const freeUsed = row?.tools_story_video_free_used === true
  const credits = Math.max(0, Number(row?.tools_story_video_credits ?? 0) || 0)
  return {
    freeUsed,
    freeAvailable: !freeUsed,
    credits,
    canDownload: !freeUsed || credits > 0,
    priceRub,
  }
}

async function storyVideoPriceRub(): Promise<number> {
  try {
    return await getServicePriceRub("tools_story_video")
  } catch {
    return TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB
  }
}

export async function getToolsStoryVideoEntitlement(
  userId: string
): Promise<ToolsStoryVideoEntitlement> {
  const [row, priceRub] = await Promise.all([
    queryOne<EntitlementRow>(
      `SELECT tools_story_video_free_used, tools_story_video_credits FROM cabinet_users WHERE id = ?`,
      [userId]
    ),
    storyVideoPriceRub(),
  ])
  return rowToEntitlement(row, priceRub)
}

export type ConsumeStoryVideoDownloadResult =
  | { ok: true; used: "free" | "credit"; entitlement: ToolsStoryVideoEntitlement }
  | {
      ok: false
      error: "payment_required" | "user_not_found"
      entitlement?: ToolsStoryVideoEntitlement
    }

/** Списать 1 download: сначала бесплатный (навсегда), затем кредиты. */
export async function consumeToolsStoryVideoDownload(
  userId: string
): Promise<ConsumeStoryVideoDownloadResult> {
  const priceRub = await storyVideoPriceRub()
  return withTransaction(async (client) => {
    const rows = await clientQuery<EntitlementRow>(
      client,
      `SELECT tools_story_video_free_used, tools_story_video_credits FROM cabinet_users WHERE id = ? FOR UPDATE`,
      [userId]
    )
    const row = rows[0]
    if (!row) {
      return { ok: false, error: "user_not_found" }
    }

    const freeUsed = row.tools_story_video_free_used === true
    const credits = Math.max(0, Number(row.tools_story_video_credits ?? 0) || 0)

    if (!freeUsed) {
      await clientExecute(
        client,
        `UPDATE cabinet_users SET tools_story_video_free_used = TRUE WHERE id = ?`,
        [userId]
      )
      return {
        ok: true,
        used: "free",
        entitlement: {
          freeUsed: true,
          freeAvailable: false,
          credits,
          canDownload: credits > 0,
          priceRub,
        },
      }
    }

    if (credits <= 0) {
      return {
        ok: false,
        error: "payment_required",
        entitlement: rowToEntitlement(row, priceRub),
      }
    }

    const nextCredits = credits - 1
    await clientExecute(
      client,
      `UPDATE cabinet_users SET tools_story_video_credits = ? WHERE id = ?`,
      [nextCredits, userId]
    )
    return {
      ok: true,
      used: "credit",
      entitlement: {
        freeUsed: true,
        freeAvailable: false,
        credits: nextCredits,
        canDownload: nextCredits > 0,
        priceRub,
      },
    }
  })
}

export async function addToolsStoryVideoCredits(
  userId: string,
  addCredits: number = TOOLS_STORY_VIDEO_CREDITS_PER_PURCHASE
): Promise<ToolsStoryVideoEntitlement | null> {
  const add = Math.max(0, Math.floor(addCredits))
  if (add <= 0) return getToolsStoryVideoEntitlement(userId)

  const priceRub = await storyVideoPriceRub()
  return withTransaction(async (client) => {
    const rows = await clientQuery<EntitlementRow>(
      client,
      `SELECT tools_story_video_free_used, tools_story_video_credits FROM cabinet_users WHERE id = ? FOR UPDATE`,
      [userId]
    )
    const row = rows[0]
    if (!row) return null

    const credits = Math.max(0, Number(row.tools_story_video_credits ?? 0) || 0) + add
    await clientExecute(
      client,
      `UPDATE cabinet_users SET tools_story_video_credits = ? WHERE id = ?`,
      [credits, userId]
    )
    return {
      freeUsed: row.tools_story_video_free_used === true,
      freeAvailable: row.tools_story_video_free_used !== true,
      credits,
      canDownload: row.tools_story_video_free_used !== true || credits > 0,
      priceRub,
    }
  })
}
