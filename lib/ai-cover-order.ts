import type { OrderServiceDetails } from "./order-service-details"

export const AI_COVER_PRICE_RUB = 500
export const AI_COVER_CONTACT_TYPES = ["telegram", "vk", "max"] as const
export type AiCoverContactType = (typeof AI_COVER_CONTACT_TYPES)[number]

export type AiCoverOrderInput = {
  includeTextOnCover: boolean
  artistName?: string | null
  releaseTitle?: string | null
  /** Legacy alias for releaseTitle from older clients */
  trackTitle?: string | null
  comment?: string | null
  contactType?: string | null
  contactValue?: string | null
}

export type AiCoverFieldErrors = {
  artistName?: string
  releaseTitle?: string
  comment?: string
  contactType?: string
  contactValue?: string
}

export type AiCoverValidationResult =
  | {
      ok: true
      includeTextOnCover: boolean
      artistName: string | null
      releaseTitle: string | null
      comment: string
      contactType: AiCoverContactType
      contactValue: string
      totalAmount: string
      serviceDetails: OrderServiceDetails
    }
  | {
      ok: false
      error: string
      fieldErrors: AiCoverFieldErrors
    }

function trimStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function isAiCoverContactType(value: string): value is AiCoverContactType {
  return (AI_COVER_CONTACT_TYPES as readonly string[]).includes(value)
}

/**
 * Server/client shared validation for AI cover orders.
 * Track binding is never required. Text fields are required only when includeTextOnCover is true.
 */
export function validateAiCoverOrder(input: AiCoverOrderInput): AiCoverValidationResult {
  const includeTextOnCover = input.includeTextOnCover === true
  const artistName = trimStr(input.artistName)
  const releaseTitle = trimStr(input.releaseTitle) || trimStr(input.trackTitle)
  const comment = trimStr(input.comment)
  const contactTypeRaw = trimStr(input.contactType).toLowerCase()
  const contactValue = trimStr(input.contactValue)

  const fieldErrors: AiCoverFieldErrors = {}

  if (includeTextOnCover) {
    if (!artistName) fieldErrors.artistName = "Укажите имя артиста"
    if (!releaseTitle) fieldErrors.releaseTitle = "Укажите название релиза"
  }

  if (!comment) {
    fieldErrors.comment = "Поле «Пожелания / комментарии» обязательно"
  }

  if (!isAiCoverContactType(contactTypeRaw)) {
    fieldErrors.contactType = "Выберите корректный контакт для связи"
  }

  if (!contactValue) {
    fieldErrors.contactValue = "Укажите контакт для связи"
  }

  const firstError =
    fieldErrors.artistName ||
    fieldErrors.releaseTitle ||
    fieldErrors.comment ||
    fieldErrors.contactType ||
    fieldErrors.contactValue

  if (firstError) {
    return { ok: false, error: firstError, fieldErrors }
  }

  const contactType = contactTypeRaw as AiCoverContactType
  const serviceDetails: OrderServiceDetails = {
    includeTextOnCover,
    comment,
    contactType,
    contactValue,
  }

  if (includeTextOnCover) {
    serviceDetails.artistName = artistName
    serviceDetails.trackTitle = releaseTitle
  }

  return {
    ok: true,
    includeTextOnCover,
    artistName: includeTextOnCover ? artistName : null,
    releaseTitle: includeTextOnCover ? releaseTitle : null,
    comment,
    contactType,
    contactValue,
    totalAmount: AI_COVER_PRICE_RUB.toFixed(2),
    serviceDetails,
  }
}
