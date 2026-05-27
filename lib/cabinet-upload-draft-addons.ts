import type { UploadDraftPayload } from "./upload-drafts"
import { calculateUploadAddonBundleAmount, getOrderById, type UploadAddonBundleItem } from "./orders"

/** Не считать `addons.trackCover` дважды, если сингл уже заказал AI через `requestAiCover`. */
export function payloadForUploadDraftPricing(payload: UploadDraftPayload): UploadDraftPayload {
  if (Boolean(payload.requestAiCover) && payload.addons?.trackCover?.enabled) {
    return {
      ...payload,
      addons: {
        ...payload.addons,
        trackCover: {
          ...payload.addons.trackCover,
          enabled: false,
        },
      },
    }
  }
  return payload
}

/** Платные услуги из payload черновика (без single `requestAiCover` — см. {@link uploadDraftRequiredPaymentRub}). */
export function addonBundleItemsFromUploadDraftPayload(payload: UploadDraftPayload): UploadAddonBundleItem[] {
  const priced = payloadForUploadDraftPricing(payload)
  const items: UploadAddonBundleItem[] = []
  if (priced.addons?.trackCover?.enabled) items.push({ type: "track_cover", quantity: 1 })
  if (priced.addons?.verticalVideo?.enabled) {
    items.push({ type: "vertical_video", quantity: Number(priced.addons.verticalVideo.videosCount ?? 0) })
  }
  if (priced.addons?.aiMastering?.enabled) {
    items.push({ type: "ai_mastering", quantity: Number(priced.addons.aiMastering.tracksCount ?? 0) })
  }
  if (priced.addons?.yandexVideoshot?.enabled) items.push({ type: "yandex_videoshot", quantity: 1 })
  if (priced.addons?.yandexVideoshotCreation?.enabled) {
    items.push({ type: "yandex_videoshot_creation", quantity: 1 })
  }
  if (priced.addons?.yandexVideoavatar?.enabled) items.push({ type: "yandex_videoavatar", quantity: 1 })
  if (priced.addons?.spotifyVideoshot?.enabled) items.push({ type: "spotify_videoshot", quantity: 1 })
  if (Boolean(priced.requestAiCover) && !items.some((i) => i.type === "track_cover")) {
    items.push({ type: "track_cover", quantity: 1 })
  }
  return items
}

export function uploadDraftAddonBundleTotalRub(payload: UploadDraftPayload): number {
  return calculateUploadAddonBundleAmount(addonBundleItemsFromUploadDraftPayload(payload)).totalRub
}

/** Сумма к оплате перед finalize: допы из `addons` + ИИ-обложка сингла (`requestAiCover`). */
export function uploadDraftRequiredPaymentRub(payload: UploadDraftPayload): number {
  return uploadDraftAddonBundleTotalRub(payloadForUploadDraftPricing(payload))
}

const PAYMENT_CHANGED_ERROR =
  "Состав услуг изменился после оплаты. Сохраните черновик и оплатите обновлённый пакет услуг"

function paidOrderAmountKopecks(totalAmount: string): number | null {
  const n = Number.parseFloat(totalAmount)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Проверка оплаты пакета допов перед отправкой (finalize / альбом). */
export async function assertUploadDraftBundlePayment(
  payload: UploadDraftPayload,
  bundleOrderId: string | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  const requiredRub = uploadDraftRequiredPaymentRub(payload)
  if (requiredRub <= 0) {
    return { ok: true }
  }
  if (!bundleOrderId) {
    return { ok: false, error: "Сначала оплатите выбранные услуги" }
  }
  const order = await getOrderById(bundleOrderId)
  if (!order || order.status !== "paid" || order.orderType !== "upload_addon_bundle") {
    return { ok: false, error: "Сначала оплатите выбранные услуги" }
  }
  const paidKopecks = paidOrderAmountKopecks(order.totalAmount)
  const requiredKopecks = Math.round(requiredRub * 100)
  if (paidKopecks === null || requiredKopecks > paidKopecks) {
    return { ok: false, error: PAYMENT_CHANGED_ERROR }
  }
  return { ok: true }
}

/** Сбросить привязку к оплате, если в черновик добавили услуги сверх оплаченной суммы. */
export async function bundleOrderIdIfStillCoversPayload(
  bundleOrderId: string | null | undefined,
  payload: UploadDraftPayload
): Promise<string | null> {
  if (!bundleOrderId) return null
  const requiredRub = uploadDraftRequiredPaymentRub(payload)
  if (requiredRub <= 0) {
    const order = await getOrderById(bundleOrderId)
    if (!order || order.status !== "paid") return null
    return bundleOrderId
  }
  const order = await getOrderById(bundleOrderId)
  if (!order || order.status !== "paid" || order.orderType !== "upload_addon_bundle") {
    return null
  }
  const paidKopecks = paidOrderAmountKopecks(order.totalAmount)
  const requiredKopecks = Math.round(requiredRub * 100)
  if (paidKopecks === null || requiredKopecks > paidKopecks) {
    return null
  }
  return bundleOrderId
}
