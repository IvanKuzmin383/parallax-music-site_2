import { clientExecute, clientQuery, withTransaction, queryOne } from "@/lib/database"
import { getServicePriceRub } from "@/lib/service-prices"
import {
  TOOLS_MASTERING_CREDITS_PER_PURCHASE,
  TOOLS_MASTERING_DOWNLOAD_PRICE_RUB,
  type ToolsMasteringEntitlement,
} from "@/lib/tools-mastering-pricing"

export type { ToolsMasteringEntitlement }

type EntitlementRow = {
  tools_mastering_free_used: boolean | null
  tools_mastering_credits: number | null
}

function rowToEntitlement(
  row: EntitlementRow | null | undefined,
  priceRub: number
): ToolsMasteringEntitlement {
  const freeUsed = row?.tools_mastering_free_used === true
  const credits = Math.max(0, Number(row?.tools_mastering_credits ?? 0) || 0)
  return {
    freeUsed,
    freeAvailable: !freeUsed,
    credits,
    canDownload: !freeUsed || credits > 0,
    priceRub,
  }
}

async function masteringPriceRub(): Promise<number> {
  try {
    return await getServicePriceRub("tools_mastering")
  } catch {
    return TOOLS_MASTERING_DOWNLOAD_PRICE_RUB
  }
}

export async function getToolsMasteringEntitlement(userId: string): Promise<ToolsMasteringEntitlement> {
  const [row, priceRub] = await Promise.all([
    queryOne<EntitlementRow>(
      `SELECT tools_mastering_free_used, tools_mastering_credits FROM cabinet_users WHERE id = ?`,
      [userId]
    ),
    masteringPriceRub(),
  ])
  return rowToEntitlement(row, priceRub)
}

export type ConsumeDownloadResult =
  | { ok: true; used: "free" | "credit"; entitlement: ToolsMasteringEntitlement }
  | { ok: false; error: "payment_required" | "user_not_found"; entitlement?: ToolsMasteringEntitlement }

/** Списать 1 download: сначала бесплатный (навсегда), затем кредиты. */
export async function consumeToolsMasteringDownload(userId: string): Promise<ConsumeDownloadResult> {
  const priceRub = await masteringPriceRub()
  return withTransaction(async (client) => {
    const rows = await clientQuery<EntitlementRow>(
      client,
      `SELECT tools_mastering_free_used, tools_mastering_credits FROM cabinet_users WHERE id = ? FOR UPDATE`,
      [userId]
    )
    const row = rows[0]
    if (!row) {
      return { ok: false, error: "user_not_found" }
    }

    const freeUsed = row.tools_mastering_free_used === true
    const credits = Math.max(0, Number(row.tools_mastering_credits ?? 0) || 0)

    if (!freeUsed) {
      await clientExecute(
        client,
        `UPDATE cabinet_users SET tools_mastering_free_used = TRUE WHERE id = ?`,
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
      `UPDATE cabinet_users SET tools_mastering_credits = ? WHERE id = ?`,
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

export async function addToolsMasteringCredits(
  userId: string,
  addCredits: number = TOOLS_MASTERING_CREDITS_PER_PURCHASE
): Promise<ToolsMasteringEntitlement | null> {
  const add = Math.max(0, Math.floor(addCredits))
  if (add <= 0) return getToolsMasteringEntitlement(userId)

  const priceRub = await masteringPriceRub()
  return withTransaction(async (client) => {
    const rows = await clientQuery<EntitlementRow>(
      client,
      `SELECT tools_mastering_free_used, tools_mastering_credits FROM cabinet_users WHERE id = ? FOR UPDATE`,
      [userId]
    )
    const row = rows[0]
    if (!row) return null

    const credits = Math.max(0, Number(row.tools_mastering_credits ?? 0) || 0) + add
    await clientExecute(
      client,
      `UPDATE cabinet_users SET tools_mastering_credits = ? WHERE id = ?`,
      [credits, userId]
    )
    return {
      freeUsed: row.tools_mastering_free_used === true,
      freeAvailable: row.tools_mastering_free_used !== true,
      credits,
      canDownload: row.tools_mastering_free_used !== true || credits > 0,
      priceRub,
    }
  })
}
