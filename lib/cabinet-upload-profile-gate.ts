import type { CabinetUser } from "@/lib/cabinet-users"
import { cabinetProfileCompleteForUpload } from "@/lib/cabinet-counterparty"

export { cabinetProfileCompleteForUpload }

export const PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE = "profile_incomplete" as const

const PROFILE_INCOMPLETE_TITLE =
  "Заполните обязательные данные в разделе «Профиль» (по типу контрагента), чтобы отправить релиз."

export const PROFILE_INCOMPLETE_LEGAL_BASIS_RU = `Для приёма и распространения релизов Parallax Music действует на основании договорных отношений (в том числе публичной оферты) и должен однозначно идентифицировать правообладателя и сторону договора. Законодательство РФ - в частности Федеральный закон № 152-ФЗ «О персональных данных» - предполагает определение и обоснование целей обработки персональных данных; сведения о стороне договора (ФИО или реквизиты организации/ИП, адрес, контактный телефон) необходимы также для корректного исполнения договора, связи с вами по релизу и соблюдения требований к взаиморасчётам (включая налоговый учёт и банковские правила при перечислении вознаграждения).`

export function profileIncompleteUploadResponseBody(): {
  error: string
  errorCode: typeof PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE
  legalBasis: string
} {
  return {
    error: PROFILE_INCOMPLETE_TITLE,
    errorCode: PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE,
    legalBasis: PROFILE_INCOMPLETE_LEGAL_BASIS_RU,
  }
}

export function checkProfileCompleteForUpload(
  user: CabinetUser | null | undefined
): { status: 403; body: ReturnType<typeof profileIncompleteUploadResponseBody> } | null {
  if (cabinetProfileCompleteForUpload(user)) return null
  return { status: 403, body: profileIncompleteUploadResponseBody() }
}
