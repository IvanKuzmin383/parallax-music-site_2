import crypto from "crypto"
import bcrypt from "bcryptjs"
import type { CounterpartyType, ProfilePatchInput } from "@/lib/cabinet-counterparty"
import { getDb } from "./db"

export type { CounterpartyType }

export interface CabinetUser {
  id: string
  email: string
  passwordHash: string
  isDisabled?: boolean
  createdAt: string
  artistName?: string
  telegram?: string
  lastName?: string
  firstName?: string
  patronymic?: string
  phone?: string
  registrationAddress?: string
  bankAccountNumber?: string
  bankBic?: string
  bankName?: string
  bankCorrespondentAccount?: string
  counterpartyType?: CounterpartyType
  companyFullName?: string
  companyShortName?: string
  inn?: string
  kpp?: string
  ogrn?: string
  ogrnip?: string
  legalAddress?: string
  postalAddress?: string
  ipFullName?: string
  signatoryFullName?: string
  signatoryPosition?: string
  signatoryAuthorityBasis?: string
  documentsEmail?: string
  vatPayer?: boolean
  taxSystem?: string
  edoRequired?: boolean
  edoIdentifier?: string
  subscriptionName?: string
  subscriptionExpiresAt?: string
  subscriptionTrackLimit?: number
  purchasedTracksBalance?: number
  streamingBalance?: number
  /** YooKassa: id сохранённого способа оплаты для рекуррентов */
  yookassaPaymentMethodId?: string
  autopayEnabled?: boolean
  autopayPlanId?: string
  autopayPeriod?: "month" | "year"
  autopayPeriodsCount?: number
  autopayNextChargeAt?: string
  autopayLastReminderSentAt?: string
}

interface CabinetUserRow {
  id: string
  email: string
  password_hash: string
  is_disabled: number | null
  created_at: string
  artist_name: string | null
  telegram: string | null
  last_name: string | null
  first_name: string | null
  patronymic: string | null
  phone: string | null
  registration_address: string | null
  bank_account_number: string | null
  bank_bic: string | null
  bank_name: string | null
  bank_correspondent_account: string | null
  counterparty_type: string | null
  company_full_name: string | null
  company_short_name: string | null
  inn: string | null
  kpp: string | null
  ogrn: string | null
  ogrnip: string | null
  legal_address: string | null
  postal_address: string | null
  ip_full_name: string | null
  signatory_full_name: string | null
  signatory_position: string | null
  signatory_authority_basis: string | null
  documents_email: string | null
  vat_payer: number | null
  tax_system: string | null
  edo_required: number | null
  edo_identifier: string | null
  subscription_name: string | null
  subscription_expires_at: string | null
  subscription_track_limit: number | null
  purchased_tracks_balance: number | null
  streaming_balance: number | null
  yookassa_payment_method_id: string | null
  autopay_enabled: number | null
  autopay_plan_id: string | null
  autopay_period: string | null
  autopay_periods_count: number | null
  autopay_next_charge_at: string | null
  autopay_last_reminder_sent_at: string | null
}

interface CabinetUserDeletionRow {
  deleted_at: string
}

/** SQLite/драйверы могут отдать флаг не только как число 1 - иначе блокировка не распознаётся при логине. */
function cabinetUserRowIsDisabled(row: Pick<CabinetUserRow, "is_disabled"> | undefined): boolean {
  if (!row || row.is_disabled == null) return false
  const n = Number(row.is_disabled)
  return !Number.isNaN(n) && n !== 0
}

function rowToUser(row: CabinetUserRow): CabinetUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    isDisabled: cabinetUserRowIsDisabled(row),
    createdAt: row.created_at,
    artistName: row.artist_name ?? undefined,
    telegram: row.telegram ?? undefined,
    lastName: row.last_name ?? undefined,
    firstName: row.first_name ?? undefined,
    patronymic: row.patronymic ?? undefined,
    phone: row.phone ?? undefined,
    registrationAddress: row.registration_address ?? undefined,
    bankAccountNumber: row.bank_account_number ?? undefined,
    bankBic: row.bank_bic ?? undefined,
    bankName: row.bank_name ?? undefined,
    bankCorrespondentAccount: row.bank_correspondent_account ?? undefined,
    counterpartyType:
      row.counterparty_type === "sole_proprietor" ||
      row.counterparty_type === "legal_entity" ||
      row.counterparty_type === "individual"
        ? row.counterparty_type
        : "individual",
    companyFullName: row.company_full_name ?? undefined,
    companyShortName: row.company_short_name ?? undefined,
    inn: row.inn ?? undefined,
    kpp: row.kpp ?? undefined,
    ogrn: row.ogrn ?? undefined,
    ogrnip: row.ogrnip ?? undefined,
    legalAddress: row.legal_address ?? undefined,
    postalAddress: row.postal_address ?? undefined,
    ipFullName: row.ip_full_name ?? undefined,
    signatoryFullName: row.signatory_full_name ?? undefined,
    signatoryPosition: row.signatory_position ?? undefined,
    signatoryAuthorityBasis: row.signatory_authority_basis ?? undefined,
    documentsEmail: row.documents_email ?? undefined,
    vatPayer: row.vat_payer === 1 ? true : row.vat_payer === 0 ? false : undefined,
    taxSystem: row.tax_system ?? undefined,
    edoRequired: row.edo_required === 1,
    edoIdentifier: row.edo_identifier ?? undefined,
    subscriptionName: row.subscription_name ?? undefined,
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    subscriptionTrackLimit: row.subscription_track_limit ?? undefined,
    purchasedTracksBalance: row.purchased_tracks_balance ?? undefined,
    streamingBalance: row.streaming_balance ?? undefined,
    yookassaPaymentMethodId: row.yookassa_payment_method_id ?? undefined,
    autopayEnabled: row.autopay_enabled === 1 ? true : row.autopay_enabled === 0 ? false : undefined,
    autopayPlanId: row.autopay_plan_id ?? undefined,
    autopayPeriod:
      row.autopay_period === "month" || row.autopay_period === "year" ? row.autopay_period : undefined,
    autopayPeriodsCount: row.autopay_periods_count ?? undefined,
    autopayNextChargeAt: row.autopay_next_charge_at ?? undefined,
    autopayLastReminderSentAt: row.autopay_last_reminder_sent_at ?? undefined,
  }
}

export async function getAllCabinetUsers(): Promise<CabinetUser[]> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM cabinet_users").all() as CabinetUserRow[]
  return rows.map(rowToUser)
}

/** Пользователи с включённым автопродлением и сохранённым способом оплаты */
export async function listCabinetUsersWithActiveAutopay(): Promise<CabinetUser[]> {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT * FROM cabinet_users
       WHERE autopay_enabled = 1
         AND is_disabled = 0
         AND yookassa_payment_method_id IS NOT NULL
         AND autopay_next_charge_at IS NOT NULL
         AND autopay_plan_id IS NOT NULL
         AND autopay_period IS NOT NULL
         AND autopay_periods_count IS NOT NULL`
    )
    .all() as CabinetUserRow[]
  return rows.map(rowToUser)
}

export async function getCabinetUserByEmail(
  email: string,
  options?: { includeDisabled?: boolean }
): Promise<CabinetUser | null> {
  const db = getDb()
  const row = db
    .prepare("SELECT * FROM cabinet_users WHERE LOWER(email) = LOWER(?)")
    .get(email) as CabinetUserRow | undefined
  if (!options?.includeDisabled && cabinetUserRowIsDisabled(row)) {
    return null
  }
  return row ? rowToUser(row) : null
}

export async function getCabinetUserById(id: string): Promise<CabinetUser | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM cabinet_users WHERE id = ?").get(id) as CabinetUserRow | undefined
  return row ? rowToUser(row) : null
}

export async function getLastCabinetUserDeletionAt(email: string): Promise<string | null> {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT deleted_at
       FROM cabinet_user_deletions
       WHERE LOWER(email) = LOWER(?)
       ORDER BY deleted_at DESC
       LIMIT 1`
    )
    .get(email) as CabinetUserDeletionRow | undefined
  return row?.deleted_at ?? null
}

export async function createCabinetUser(params: {
  email: string
  password: string
  artistName?: string
  telegram?: string
}): Promise<CabinetUser> {
  const existing = await getCabinetUserByEmail(params.email, { includeDisabled: true })
  if (existing) {
    throw new Error("Cabinet user with this email already exists")
  }

  const passwordHash = await bcrypt.hash(params.password, 10)
  const user: CabinetUser = {
    id: crypto.randomUUID(),
    email: params.email,
    passwordHash,
    createdAt: new Date().toISOString(),
    artistName: params.artistName?.trim() || undefined,
    telegram: params.telegram?.trim() || undefined,
    counterpartyType: "individual",
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO cabinet_users (
      id, email, password_hash, is_disabled, created_at, artist_name, telegram,
      counterparty_type,
      subscription_name, subscription_expires_at, subscription_track_limit, purchased_tracks_balance, streaming_balance
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    user.email,
    user.passwordHash,
    0,
    user.createdAt,
    user.artistName ?? null,
    user.telegram ?? null,
    "individual",
    null,
    null,
    null,
    null,
    null
  )

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Created user", { id: user.id, email: user.email })
  }

  return user
}

export async function updateCabinetUserPassword(id: string, newPassword: string): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(id)
  if (!user) return null

  const passwordHash = await bcrypt.hash(newPassword, 10)
  const db = getDb()
  db.prepare("UPDATE cabinet_users SET password_hash = ? WHERE id = ?").run(passwordHash, id)

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Updated password for user", { id, email: user.email })
  }

  return getCabinetUserById(id)
}

export async function touchAutopayReminderSent(userId: string, sentAtIso: string): Promise<void> {
  const db = getDb()
  db.prepare(`UPDATE cabinet_users SET autopay_last_reminder_sent_at = ? WHERE id = ?`).run(sentAtIso, userId)
}

export async function setCabinetUserAutopay(
  id: string,
  params: {
    yookassaPaymentMethodId: string | null
    autopayEnabled: boolean
    autopayPlanId: string | null
    autopayPeriod: "month" | "year" | null
    autopayPeriodsCount: number | null
    autopayNextChargeAt: string | null
    autopayLastReminderSentAt: string | null
  }
): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(id)
  if (!user) return null

  const db = getDb()
  db.prepare(
    `
    UPDATE cabinet_users SET
      yookassa_payment_method_id = ?,
      autopay_enabled = ?,
      autopay_plan_id = ?,
      autopay_period = ?,
      autopay_periods_count = ?,
      autopay_next_charge_at = ?,
      autopay_last_reminder_sent_at = ?
    WHERE id = ?
  `
  ).run(
    params.yookassaPaymentMethodId,
    params.autopayEnabled ? 1 : 0,
    params.autopayPlanId,
    params.autopayPeriod,
    params.autopayPeriodsCount,
    params.autopayNextChargeAt,
    params.autopayLastReminderSentAt,
    id
  )

  return getCabinetUserById(id)
}

export async function updateCabinetUserSubscription(
  id: string,
  subscriptionName: string | null,
  subscriptionExpiresAt: string | null,
  subscriptionTrackLimit?: number | null
): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(id)
  if (!user) return null

  const db = getDb()
  db.prepare(`
    UPDATE cabinet_users SET subscription_name = ?, subscription_expires_at = ?, subscription_track_limit = ?
    WHERE id = ?
  `).run(
    subscriptionName ?? null,
    subscriptionExpiresAt ?? null,
    subscriptionTrackLimit ?? null,
    id
  )

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Updated subscription for user", { id, email: user.email, subscriptionName, subscriptionExpiresAt, subscriptionTrackLimit })
  }

  return getCabinetUserById(id)
}

export async function updateCabinetUserPurchasedTracks(userId: string, addTracks: number): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(userId)
  if (!user) return null

  const current = user.purchasedTracksBalance ?? 0
  const db = getDb()
  db.prepare("UPDATE cabinet_users SET purchased_tracks_balance = ? WHERE id = ?").run(current + addTracks, userId)

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Updated purchasedTracksBalance for user", { id: userId, email: user.email, addTracks, newBalance: current + addTracks })
  }

  return getCabinetUserById(userId)
}

export async function updateCabinetUserBalance(id: string, balance: number): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(id)
  if (!user) return null

  const db = getDb()
  db.prepare("UPDATE cabinet_users SET streaming_balance = ? WHERE id = ?").run(balance, id)

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Updated balance for user", { id, email: user.email, balance })
  }

  return getCabinetUserById(id)
}

export async function updateCabinetUserCounterpartyType(
  id: string,
  counterpartyType: CounterpartyType
): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(id)
  if (!user) return null

  const db = getDb()
  db.prepare("UPDATE cabinet_users SET counterparty_type = ? WHERE id = ?").run(counterpartyType, id)

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Updated counterparty type", { id, email: user.email, counterpartyType })
  }

  return getCabinetUserById(id)
}

export async function updateCabinetUserArtistName(id: string, artistName: string | null): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(id)
  if (!user) return null

  const db = getDb()
  db.prepare("UPDATE cabinet_users SET artist_name = ? WHERE id = ?").run(artistName?.trim() || null, id)

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Updated artistName for user", { id, email: user.email, artistName: artistName?.trim() || null })
  }

  return getCabinetUserById(id)
}

export async function updateCabinetUserDisabled(
  id: string,
  isDisabled: boolean
): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(id)
  if (!user) return null

  const db = getDb()
  db.prepare("UPDATE cabinet_users SET is_disabled = ? WHERE id = ?").run(isDisabled ? 1 : 0, id)

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Updated disabled status for user", { id, email: user.email, isDisabled })
  }

  return getCabinetUserById(id)
}

function nullIfEmpty(value: string | undefined | null): string | null {
  const t = value?.trim()
  return t && t.length > 0 ? t : null
}

export async function updateCabinetUserProfile(
  id: string,
  params: ProfilePatchInput
): Promise<CabinetUser | null> {
  const user = await getCabinetUserById(id)
  if (!user) return null

  const shared = {
    counterparty_type: params.counterpartyType,
    phone: params.phone,
    telegram: params.telegram?.trim() || null,
    artist_name: nullIfEmpty(params.artistName ?? null),
    documents_email: nullIfEmpty(
      "documentsEmail" in params ? (params.documentsEmail as string | undefined) : null
    ),
    vat_payer:
      "vatPayer" in params && params.vatPayer != null ? (params.vatPayer ? 1 : 0) : null,
    tax_system: "taxSystem" in params ? nullIfEmpty(params.taxSystem ?? null) : null,
    edo_required: "edoRequired" in params && params.edoRequired ? 1 : 0,
    edo_identifier:
      "edoRequired" in params && params.edoRequired
        ? nullIfEmpty(params.edoIdentifier ?? null)
        : null,
  }

  let typeFields: Record<string, string | number | null>

  if (params.counterpartyType === "individual") {
    typeFields = {
      last_name: params.lastName,
      first_name: params.firstName,
      patronymic: params.patronymic,
      registration_address: params.registrationAddress.trim(),
      ip_full_name: null,
      company_full_name: null,
      company_short_name: null,
      inn: null,
      kpp: null,
      ogrn: null,
      ogrnip: null,
      legal_address: null,
      postal_address: null,
      signatory_full_name: null,
      signatory_position: null,
      signatory_authority_basis: null,
      bank_account_number: nullIfEmpty(params.bankAccountNumber ?? null),
      bank_bic: nullIfEmpty(params.bankBic ?? null),
      bank_name: nullIfEmpty(params.bankName ?? null),
      bank_correspondent_account: nullIfEmpty(params.bankCorrespondentAccount ?? null),
    }
  } else if (params.counterpartyType === "sole_proprietor") {
    typeFields = {
      last_name: null,
      first_name: null,
      patronymic: nullIfEmpty(params.patronymic ?? null),
      registration_address: params.registrationAddress.trim(),
      ip_full_name: params.ipFullName.trim(),
      company_full_name: null,
      company_short_name: null,
      inn: params.inn,
      kpp: null,
      ogrn: null,
      ogrnip: params.ogrnip,
      legal_address: null,
      postal_address: null,
      signatory_full_name: null,
      signatory_position: null,
      signatory_authority_basis: null,
      bank_account_number: nullIfEmpty(params.bankAccountNumber ?? null),
      bank_bic: nullIfEmpty(params.bankBic ?? null),
      bank_name: nullIfEmpty(params.bankName ?? null),
      bank_correspondent_account: nullIfEmpty(params.bankCorrespondentAccount ?? null),
    }
  } else {
    typeFields = {
      last_name: null,
      first_name: null,
      patronymic: null,
      registration_address: null,
      ip_full_name: null,
      company_full_name: params.companyFullName.trim(),
      company_short_name: nullIfEmpty(params.companyShortName ?? null),
      inn: params.inn,
      kpp: params.kpp,
      ogrn: params.ogrn,
      ogrnip: null,
      legal_address: params.legalAddress.trim(),
      postal_address: nullIfEmpty(params.postalAddress ?? null),
      signatory_full_name: params.signatoryFullName.trim(),
      signatory_position: params.signatoryPosition.trim(),
      signatory_authority_basis: params.signatoryAuthorityBasis.trim(),
      bank_account_number: params.bankAccountNumber,
      bank_bic: params.bankBic,
      bank_name: params.bankName.trim(),
      bank_correspondent_account: nullIfEmpty(params.bankCorrespondentAccount ?? null),
    }
  }

  const db = getDb()
  db.prepare(`
    UPDATE cabinet_users
    SET
      counterparty_type = ?,
      last_name = ?,
      first_name = ?,
      patronymic = ?,
      phone = ?,
      telegram = ?,
      registration_address = ?,
      artist_name = ?,
      bank_account_number = ?,
      bank_bic = ?,
      bank_name = ?,
      bank_correspondent_account = ?,
      company_full_name = ?,
      company_short_name = ?,
      inn = ?,
      kpp = ?,
      ogrn = ?,
      ogrnip = ?,
      legal_address = ?,
      postal_address = ?,
      ip_full_name = ?,
      signatory_full_name = ?,
      signatory_position = ?,
      signatory_authority_basis = ?,
      documents_email = ?,
      vat_payer = ?,
      tax_system = ?,
      edo_required = ?,
      edo_identifier = ?
    WHERE id = ?
  `).run(
    shared.counterparty_type,
    typeFields.last_name,
    typeFields.first_name,
    typeFields.patronymic,
    shared.phone,
    shared.telegram,
    typeFields.registration_address,
    shared.artist_name,
    typeFields.bank_account_number,
    typeFields.bank_bic,
    typeFields.bank_name,
    typeFields.bank_correspondent_account,
    typeFields.company_full_name,
    typeFields.company_short_name,
    typeFields.inn,
    typeFields.kpp,
    typeFields.ogrn,
    typeFields.ogrnip,
    typeFields.legal_address,
    typeFields.postal_address,
    typeFields.ip_full_name,
    typeFields.signatory_full_name,
    typeFields.signatory_position,
    typeFields.signatory_authority_basis,
    shared.documents_email,
    shared.vat_payer,
    shared.tax_system,
    shared.edo_required,
    shared.edo_identifier,
    id
  )

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Updated cabinet user profile", {
      id,
      email: user.email,
      counterpartyType: params.counterpartyType,
    })
  }

  return getCabinetUserById(id)
}

export async function deleteCabinetUser(id: string): Promise<boolean> {
  const db = getDb()
  const existing = db
    .prepare("SELECT email FROM cabinet_users WHERE id = ?")
    .get(id) as { email: string } | undefined
  if (!existing) return false

  const deletedAt = new Date().toISOString()
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM cabinet_users WHERE id = ?").run(id)
    db.prepare(
      "INSERT INTO cabinet_user_deletions (id, email, deleted_at) VALUES (?, ?, ?)"
    ).run(crypto.randomUUID(), existing.email, deletedAt)
  })

  tx()

  if (process.env.NODE_ENV === "development") {
    console.log("[cabinet-users] Deleted user", { id, email: existing.email, deletedAt })
  }

  return true
}
