import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import { execute, query, queryOne, withTransaction, clientExecute } from "@/lib/database"
import { getCabinetUserById, type CabinetUser } from "@/lib/cabinet-users"
import { tryCreateCabinetNotification } from "@/lib/cabinet-notifications"
import { escapeHtml } from "@/lib/telegram"
import { notifyStaffInBackground } from "@/lib/form-notifications"

export const KYC_STATUSES = ["unverified", "pending", "verified", "rejected"] as const
export type KycStatus = (typeof KYC_STATUSES)[number]

export const KYC_APPLICATION_STATUSES = ["pending", "approved", "rejected", "expired"] as const
export type KycApplicationStatus = (typeof KYC_APPLICATION_STATUSES)[number]

export const KYC_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "application/pdf"])
export const KYC_MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export type CabinetKycApplication = {
  id: string
  userId: string
  status: KycApplicationStatus
  lastName: string
  firstName: string
  patronymic: string | null
  phone: string | null
  passportSeries: string | null
  passportNumber: string | null
  passportMasked: string | null
  birthDate: string
  documentStorageKey: string | null
  documentMime: string | null
  documentSize: number | null
  documentSha256: string | null
  consentKycAt: string
  submittedAt: string
  reviewedAt: string | null
  reviewedByAdmin: string | null
  rejectionReason: string | null
  documentDeletedAt: string | null
  createdAt: string
  updatedAt: string
}

type KycApplicationRow = {
  id: string
  user_id: string
  status: string
  last_name: string
  first_name: string
  patronymic: string | null
  phone: string | null
  passport_series: string | null
  passport_number: string | null
  passport_masked: string | null
  birth_date: string
  document_storage_key: string | null
  document_mime: string | null
  document_size: number | null
  document_sha256: string | null
  consent_kyc_at: string
  submitted_at: string
  reviewed_at: string | null
  reviewed_by_admin: string | null
  rejection_reason: string | null
  document_deleted_at: string | null
  created_at: string
  updated_at: string
}

function asKycStatus(value: string | null | undefined): KycStatus {
  if (value === "pending" || value === "verified" || value === "rejected") return value
  return "unverified"
}

function asApplicationStatus(value: string): KycApplicationStatus {
  if (value === "approved" || value === "rejected" || value === "expired") return value
  return "pending"
}

function rowToApplication(row: KycApplicationRow): CabinetKycApplication {
  return {
    id: row.id,
    userId: row.user_id,
    status: asApplicationStatus(row.status),
    lastName: row.last_name,
    firstName: row.first_name,
    patronymic: row.patronymic,
    phone: row.phone,
    passportSeries: row.passport_series,
    passportNumber: row.passport_number,
    passportMasked: row.passport_masked,
    birthDate: String(row.birth_date).slice(0, 10),
    documentStorageKey: row.document_storage_key,
    documentMime: row.document_mime,
    documentSize: row.document_size,
    documentSha256: row.document_sha256,
    consentKycAt: row.consent_kyc_at,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedByAdmin: row.reviewed_by_admin,
    rejectionReason: row.rejection_reason,
    documentDeletedAt: row.document_deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getCabinetUserKycStatus(user: CabinetUser | null | undefined): KycStatus {
  return asKycStatus(user?.kycStatus)
}

export function isCabinetKycVerified(user: CabinetUser | null | undefined): boolean {
  return getCabinetUserKycStatus(user) === "verified"
}

export function maskPassport(series: string, number: string): string {
  const s = series.replace(/\D/g, "")
  const n = number.replace(/\D/g, "")
  const tail = n.slice(-2)
  return `**** ****${tail || "**"} (${s.length}+${n.length})`
}

export function normalizePassportSeries(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  return digits.length === 4 ? digits : null
}

export function normalizePassportNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  return digits.length === 6 ? digits : null
}

export function parsePassportCombined(raw: string): { series: string; number: string } | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 10) return null
  return { series: digits.slice(0, 4), number: digits.slice(4) }
}

export function isValidBirthDateIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return false
  const iso = d.toISOString().slice(0, 10)
  if (iso !== value) return false
  const now = new Date()
  const min = new Date(Date.UTC(now.getUTCFullYear() - 120, 0, 1))
  const max = new Date(Date.UTC(now.getUTCFullYear() - 14, now.getUTCMonth(), now.getUTCDate()))
  return d >= min && d <= max
}

export function detectKycDocumentMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg"
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png"
  }
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf"
  }
  return null
}

async function getKycBasePath(): Promise<string> {
  try {
    await fs.access("/data")
    return path.posix.join("/data", "kyc")
  } catch {
    return path.join(process.cwd(), "data", "kyc")
  }
}

export async function resolveKycDocumentAbsolutePath(storageKey: string): Promise<string> {
  const base = await getKycBasePath()
  const safeKey = storageKey.replace(/\\/g, "/").replace(/^\/+/, "")
  if (safeKey.includes("..") || path.isAbsolute(safeKey)) {
    throw new Error("Invalid KYC storage key")
  }
  const absolute = path.join(base, ...safeKey.split("/"))
  const normalizedBase = path.resolve(base)
  const normalizedAbs = path.resolve(absolute)
  if (!normalizedAbs.startsWith(normalizedBase + path.sep) && normalizedAbs !== normalizedBase) {
    throw new Error("Invalid KYC storage path")
  }
  return normalizedAbs
}

async function writeKycDocumentFile(params: {
  userId: string
  applicationId: string
  buffer: Buffer
}): Promise<{ storageKey: string; sha256: string }> {
  const base = await getKycBasePath()
  const dir = path.join(base, params.userId, params.applicationId)
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  const filePath = path.join(dir, "document.bin")
  const sha256 = crypto.createHash("sha256").update(params.buffer).digest("hex")
  await fs.writeFile(filePath, params.buffer, { mode: 0o600 })
  const storageKey = path.posix.join(params.userId, params.applicationId, "document.bin")
  return { storageKey, sha256 }
}

export async function deleteKycDocumentFile(storageKey: string | null | undefined): Promise<void> {
  if (!storageKey) return
  try {
    const absolute = await resolveKycDocumentAbsolutePath(storageKey)
    await fs.unlink(absolute)
    const dir = path.dirname(absolute)
    await fs.rmdir(dir).catch(() => undefined)
    const parent = path.dirname(dir)
    await fs.rmdir(parent).catch(() => undefined)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code !== "ENOENT") {
      console.error("[cabinet-kyc] delete document failed", error)
    }
  }
}

export async function getKycApplicationById(id: string): Promise<CabinetKycApplication | null> {
  const row = await queryOne<KycApplicationRow>(
    `SELECT * FROM cabinet_kyc_applications WHERE id = ?`,
    [id]
  )
  return row ? rowToApplication(row) : null
}

export async function getPendingKycApplicationForUser(
  userId: string
): Promise<CabinetKycApplication | null> {
  const row = await queryOne<KycApplicationRow>(
    `
    SELECT * FROM cabinet_kyc_applications
    WHERE user_id = ? AND status = 'pending'
    ORDER BY submitted_at DESC
    LIMIT 1
    `,
    [userId]
  )
  return row ? rowToApplication(row) : null
}

export async function getLatestKycApplicationForUser(
  userId: string
): Promise<CabinetKycApplication | null> {
  const row = await queryOne<KycApplicationRow>(
    `
    SELECT * FROM cabinet_kyc_applications
    WHERE user_id = ?
    ORDER BY submitted_at DESC
    LIMIT 1
    `,
    [userId]
  )
  return row ? rowToApplication(row) : null
}

export async function listKycApplications(options?: {
  status?: KycApplicationStatus | "all"
  limit?: number
}): Promise<CabinetKycApplication[]> {
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500)
  const status = options?.status && options.status !== "all" ? options.status : null
  const rows = status
    ? await query<KycApplicationRow>(
        `
        SELECT * FROM cabinet_kyc_applications
        WHERE status = ?
        ORDER BY submitted_at DESC
        LIMIT ?
        `,
        [status, limit]
      )
    : await query<KycApplicationRow>(
        `
        SELECT * FROM cabinet_kyc_applications
        ORDER BY submitted_at DESC
        LIMIT ?
        `,
        [limit]
      )
  return rows.map(rowToApplication)
}

export function toPublicKycApplication(app: CabinetKycApplication) {
  return {
    id: app.id,
    status: app.status,
    lastName: app.lastName,
    firstName: app.firstName,
    patronymic: app.patronymic,
    phone: app.phone,
    passportMasked: app.passportMasked,
    birthDate: app.birthDate,
    submittedAt: app.submittedAt,
    reviewedAt: app.reviewedAt,
    rejectionReason: app.rejectionReason,
    documentDeletedAt: app.documentDeletedAt,
    hasDocument: Boolean(app.documentStorageKey && !app.documentDeletedAt),
  }
}

export function toAdminKycApplication(app: CabinetKycApplication) {
  return {
    ...toPublicKycApplication(app),
    passportSeries: app.passportSeries,
    passportNumber: app.passportNumber,
    documentMime: app.documentMime,
    documentSize: app.documentSize,
    reviewedByAdmin: app.reviewedByAdmin,
  }
}

export async function submitKycApplication(params: {
  user: CabinetUser
  lastName: string
  firstName: string
  patronymic?: string | null
  phone?: string | null
  passportSeries: string
  passportNumber: string
  birthDate: string
  documentBuffer: Buffer
}): Promise<{ ok: true; application: CabinetKycApplication } | { ok: false; error: string; status: number }> {
  const status = getCabinetUserKycStatus(params.user)
  if (status === "verified") {
    return { ok: false, status: 409, error: "Аккаунт уже верифицирован" }
  }
  if (status === "pending") {
    return { ok: false, status: 409, error: "Заявка уже на проверке" }
  }

  const pending = await getPendingKycApplicationForUser(params.user.id)
  if (pending) {
    return { ok: false, status: 409, error: "Заявка уже на проверке" }
  }

  if (!isValidBirthDateIso(params.birthDate)) {
    return { ok: false, status: 400, error: "Укажите корректную дату рождения" }
  }

  const series = normalizePassportSeries(params.passportSeries)
  const number = normalizePassportNumber(params.passportNumber)
  if (!series || !number) {
    return { ok: false, status: 400, error: "Номер документа: серия 4 цифры и номер 6 цифр" }
  }

  if (params.documentBuffer.length === 0) {
    return { ok: false, status: 400, error: "Прикрепите скан документа" }
  }
  if (params.documentBuffer.length > KYC_MAX_DOCUMENT_BYTES) {
    return { ok: false, status: 400, error: "Файл слишком большой (максимум 10 МБ)" }
  }

  const mime = detectKycDocumentMime(params.documentBuffer)
  if (!mime || !KYC_ALLOWED_MIME.has(mime)) {
    return { ok: false, status: 400, error: "Допустимы только JPG, PNG или PDF" }
  }

  const lastName = params.lastName.trim()
  const firstName = params.firstName.trim()
  const patronymic = params.patronymic?.trim() || null
  const phone = params.phone?.trim() || null
  if (lastName.length < 1 || firstName.length < 1) {
    return { ok: false, status: 400, error: "Укажите фамилию и имя" }
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const masked = maskPassport(series, number)

  let written: { storageKey: string; sha256: string }
  try {
    written = await writeKycDocumentFile({
      userId: params.user.id,
      applicationId: id,
      buffer: params.documentBuffer,
    })
  } catch (error) {
    console.error("[cabinet-kyc] write document failed", error)
    return { ok: false, status: 500, error: "Не удалось сохранить файл документа" }
  }

  try {
    await withTransaction(async (client) => {
      await clientExecute(
        client,
        `
        INSERT INTO cabinet_kyc_applications (
          id, user_id, status,
          last_name, first_name, patronymic, phone,
          passport_series, passport_number, passport_masked, birth_date,
          document_storage_key, document_mime, document_size, document_sha256,
          consent_kyc_at, submitted_at, created_at, updated_at
        ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          params.user.id,
          lastName,
          firstName,
          patronymic,
          phone,
          series,
          number,
          masked,
          params.birthDate,
          written.storageKey,
          mime,
          params.documentBuffer.length,
          written.sha256,
          now,
          now,
          now,
          now,
        ]
      )
      await clientExecute(
        client,
        `
        UPDATE cabinet_users
        SET kyc_status = 'pending',
            kyc_rejected_at = NULL,
            kyc_rejection_reason = NULL
        WHERE id = ?
        `,
        [params.user.id]
      )
    })
  } catch (error) {
    await deleteKycDocumentFile(written.storageKey)
    console.error("[cabinet-kyc] submit failed", error)
    return { ok: false, status: 500, error: "Не удалось создать заявку" }
  }

  const application = await getKycApplicationById(id)
  if (!application) {
    return { ok: false, status: 500, error: "Не удалось создать заявку" }
  }

  notifyStaffInBackground({
    telegramMessage: [
      "<b>Новая заявка на верификацию (KYC)</b>",
      "",
      `<b>Email:</b> ${escapeHtml(params.user.email)}`,
      `<b>ФИО:</b> ${escapeHtml([lastName, firstName, patronymic].filter(Boolean).join(" "))}`,
      `<b>ID заявки:</b> ${escapeHtml(id)}`,
      "",
      "#kyc #верификация",
    ].join("\n"),
    emailSubject: `[Parallax] KYC заявка: ${params.user.email}`,
    logContext: "cabinet-kyc/submit",
  })

  return { ok: true, application }
}

async function writeKycAudit(params: {
  applicationId: string
  adminLabel: string
  action: string
}): Promise<void> {
  await execute(
    `
    INSERT INTO cabinet_kyc_audit_log (id, application_id, admin_label, action, created_at)
    VALUES (?, ?, ?, ?, ?)
    `,
    [crypto.randomUUID(), params.applicationId, params.adminLabel, params.action, new Date().toISOString()]
  )
}

export async function logKycDocumentView(params: {
  applicationId: string
  adminLabel: string
}): Promise<void> {
  await writeKycAudit({
    applicationId: params.applicationId,
    adminLabel: params.adminLabel,
    action: "view_document",
  })
}

async function clearDocumentFieldsAndDelete(app: CabinetKycApplication): Promise<void> {
  await deleteKycDocumentFile(app.documentStorageKey)
  await execute(
    `
    UPDATE cabinet_kyc_applications
    SET document_storage_key = NULL,
        document_deleted_at = COALESCE(document_deleted_at, ?),
        passport_series = NULL,
        passport_number = NULL,
        updated_at = ?
    WHERE id = ?
    `,
    [new Date().toISOString(), new Date().toISOString(), app.id]
  )
}

export async function approveKycApplication(params: {
  applicationId: string
  adminLabel: string
}): Promise<{ ok: true; application: CabinetKycApplication } | { ok: false; error: string; status: number }> {
  const app = await getKycApplicationById(params.applicationId)
  if (!app) return { ok: false, status: 404, error: "Заявка не найдена" }
  if (app.status !== "pending") {
    return { ok: false, status: 409, error: "Заявка уже обработана" }
  }

  const now = new Date().toISOString()
  await withTransaction(async (client) => {
    await clientExecute(
      client,
      `
      UPDATE cabinet_kyc_applications
      SET status = 'approved',
          reviewed_at = ?,
          reviewed_by_admin = ?,
          updated_at = ?
      WHERE id = ? AND status = 'pending'
      `,
      [now, params.adminLabel, now, app.id]
    )
    await clientExecute(
      client,
      `
      UPDATE cabinet_users
      SET kyc_status = 'verified',
          kyc_verified_at = ?,
          kyc_rejected_at = NULL,
          kyc_rejection_reason = NULL,
          kyc_birth_date = ?
      WHERE id = ?
      `,
      [now, app.birthDate, app.userId]
    )
  })

  await writeKycAudit({
    applicationId: app.id,
    adminLabel: params.adminLabel,
    action: "approve",
  })
  await clearDocumentFieldsAndDelete(app)

  await tryCreateCabinetNotification({
    userId: app.userId,
    type: "kyc_status",
    title: "Верификация пройдена",
    body: "Аккаунт подтверждён. Можно загружать релизы и клипы, а также выводить роялти.",
    href: "/cabinet/settings?tab=profile",
    entityType: "kyc",
    entityId: app.id,
  })

  const updated = await getKycApplicationById(app.id)
  return { ok: true, application: updated! }
}

export async function rejectKycApplication(params: {
  applicationId: string
  adminLabel: string
  reason: string
}): Promise<{ ok: true; application: CabinetKycApplication } | { ok: false; error: string; status: number }> {
  const reason = params.reason.trim()
  if (reason.length < 3) {
    return { ok: false, status: 400, error: "Укажите причину отклонения" }
  }

  const app = await getKycApplicationById(params.applicationId)
  if (!app) return { ok: false, status: 404, error: "Заявка не найдена" }
  if (app.status !== "pending") {
    return { ok: false, status: 409, error: "Заявка уже обработана" }
  }

  const now = new Date().toISOString()
  await withTransaction(async (client) => {
    await clientExecute(
      client,
      `
      UPDATE cabinet_kyc_applications
      SET status = 'rejected',
          reviewed_at = ?,
          reviewed_by_admin = ?,
          rejection_reason = ?,
          updated_at = ?
      WHERE id = ? AND status = 'pending'
      `,
      [now, params.adminLabel, reason, now, app.id]
    )
    await clientExecute(
      client,
      `
      UPDATE cabinet_users
      SET kyc_status = 'rejected',
          kyc_rejected_at = ?,
          kyc_rejection_reason = ?
      WHERE id = ?
      `,
      [now, reason, app.userId]
    )
  })

  await writeKycAudit({
    applicationId: app.id,
    adminLabel: params.adminLabel,
    action: "reject",
  })
  await clearDocumentFieldsAndDelete(app)

  await tryCreateCabinetNotification({
    userId: app.userId,
    type: "kyc_status",
    title: "Верификация отклонена",
    body: reason,
    href: "/cabinet/settings?tab=profile",
    entityType: "kyc",
    entityId: app.id,
  })

  const updated = await getKycApplicationById(app.id)
  return { ok: true, application: updated! }
}

/** Удаляет сканы у уже решённых заявок (safety net) и очень старые pending-файлы не трогает без решения. */
export async function cleanupSettledKycDocuments(options?: {
  olderThanHours?: number
}): Promise<{ cleaned: number }> {
  const olderThanHours = Math.max(options?.olderThanHours ?? 1, 0)
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString()
  const rows = await query<KycApplicationRow>(
    `
    SELECT * FROM cabinet_kyc_applications
    WHERE document_storage_key IS NOT NULL
      AND document_deleted_at IS NULL
      AND status IN ('approved', 'rejected', 'expired')
      AND reviewed_at IS NOT NULL
      AND reviewed_at <= ?
    LIMIT 200
    `,
    [cutoff]
  )

  let cleaned = 0
  for (const row of rows) {
    const app = rowToApplication(row)
    await clearDocumentFieldsAndDelete(app)
    cleaned += 1
  }
  return { cleaned }
}

export async function getKycPublicStateForUser(user: CabinetUser) {
  const latest = await getLatestKycApplicationForUser(user.id)
  return {
    kycStatus: getCabinetUserKycStatus(user),
    kycVerifiedAt: user.kycVerifiedAt ?? null,
    kycRejectedAt: user.kycRejectedAt ?? null,
    kycRejectionReason: user.kycRejectionReason ?? null,
    kycBirthDate: user.kycBirthDate ?? null,
    application: latest ? toPublicKycApplication(latest) : null,
    canSubmit: getCabinetUserKycStatus(user) === "unverified" || getCabinetUserKycStatus(user) === "rejected",
  }
}

export async function assertUserExistsForKyc(userId: string): Promise<CabinetUser | null> {
  return getCabinetUserById(userId)
}
