import { clientExecute, clientQuery, withTransaction, queryOne } from "@/lib/database"
import { getServicePriceRub } from "@/lib/service-prices"
import {
  TOOLS_SLOWED_REVERB_CREDITS_PER_PURCHASE,
  TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB,
  type ToolsSlowedReverbEntitlement,
} from "@/lib/tools-slowed-reverb-pricing"

export type { ToolsSlowedReverbEntitlement }

type EntitlementRow = {
  tools_slowed_reverb_free_used: boolean | null
  tools_slowed_reverb_credits: number | null
}

function rowToEntitlement(
  row: EntitlementRow | null | undefined,
  priceRub: number
): ToolsSlowedReverbEntitlement {
  const freeUsed = row?.tools_slowed_reverb_free_used === true
  const credits = Math.max(0, Number(row?.tools_slowed_reverb_credits ?? 0) || 0)
  return {
    freeUsed,
    freeAvailable: !freeUsed,
    credits,
    canDownload: !freeUsed || credits > 0,
    priceRub,
  }
}

async function slowedReverbPriceRub(): Promise<number> {
  try {
    return await getServicePriceRub("tools_slowed_reverb")
  } catch {
    return TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB
  }
}

export async function getToolsSlowedReverbEntitlement(
  userId: string
): Promise<ToolsSlowedReverbEntitlement> {
  const [row, priceRub] = await Promise.all([
    queryOne<EntitlementRow>(
      `SELECT tools_slowed_reverb_free_used, tools_slowed_reverb_credits FROM cabinet_users WHERE id = ?`,
      [userId]
    ),
    slowedReverbPriceRub(),
  ])
  return rowToEntitlement(row, priceRub)
}

export type ConsumeSlowedReverbDownloadResult =
  | { ok: true; used: "free" | "credit"; entitlement: ToolsSlowedReverbEntitlement }
  | {
      ok: false
      error: "payment_required" | "user_not_found"
      entitlement?: ToolsSlowedReverbEntitlement
    }

/** Списать 1 download: сначала бесплатный (навсегда), затем кредиты. */
export async function consumeToolsSlowedReverbDownload(
  userId: string
): Promise<ConsumeSlowedReverbDownloadResult> {
  const priceRub = await slowedReverbPriceRub()
  return withTransaction(async (client) => {
    const rows = await clientQuery<EntitlementRow>(
      client,
      `SELECT tools_slowed_reverb_free_used, tools_slowed_reverb_credits FROM cabinet_users WHERE id = ? FOR UPDATE`,
      [userId]
    )
    const row = rows[0]
    if (!row) {
      return { ok: false, error: "user_not_found" }
    }

    const freeUsed = row.tools_slowed_reverb_free_used === true
    const credits = Math.max(0, Number(row.tools_slowed_reverb_credits ?? 0) || 0)

    if (!freeUsed) {
      await clientExecute(
        client,
        `UPDATE cabinet_users SET tools_slowed_reverb_free_used = TRUE WHERE id = ?`,
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
      `UPDATE cabinet_users SET tools_slowed_reverb_credits = ? WHERE id = ?`,
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

export async function addToolsSlowedReverbCredits(
  userId: string,
  addCredits: number = TOOLS_SLOWED_REVERB_CREDITS_PER_PURCHASE
): Promise<ToolsSlowedReverbEntitlement | null> {
  const add = Math.max(0, Math.floor(addCredits))
  if (add <= 0) return getToolsSlowedReverbEntitlement(userId)

  const priceRub = await slowedReverbPriceRub()
  return withTransaction(async (client) => {
    const rows = await clientQuery<EntitlementRow>(
      client,
      `SELECT tools_slowed_reverb_free_used, tools_slowed_reverb_credits FROM cabinet_users WHERE id = ? FOR UPDATE`,
      [userId]
    )
    const row = rows[0]
    if (!row) return null

    const credits = Math.max(0, Number(row.tools_slowed_reverb_credits ?? 0) || 0) + add
    await clientExecute(
      client,
      `UPDATE cabinet_users SET tools_slowed_reverb_credits = ? WHERE id = ?`,
      [credits, userId]
    )
    return {
      freeUsed: row.tools_slowed_reverb_free_used === true,
      freeAvailable: row.tools_slowed_reverb_free_used !== true,
      credits,
      canDownload: row.tools_slowed_reverb_free_used !== true || credits > 0,
      priceRub,
    }
  })
}
