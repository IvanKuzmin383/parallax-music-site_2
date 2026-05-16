import { z } from "zod"
import type { CabinetUser } from "@/lib/cabinet-users"
import {
  normalizeDigits,
  validateBankAccount,
  validateBik,
  validateInn10,
  validateInn12,
  validateKpp,
  validateOgrn,
  validateOgrnip,
} from "@/lib/ru-tax-id-validation"

export const COUNTERPARTY_TYPES = ["individual", "sole_proprietor", "legal_entity"] as const
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number]

export const COUNTERPARTY_TYPE_LABELS: Record<CounterpartyType, string> = {
  individual: "Физлицо",
  sole_proprietor: "ИП",
  legal_entity: "Юридическое лицо",
}

export const TAX_SYSTEM_OPTIONS = [
  { value: "usn", label: "УСН" },
  { value: "osno", label: "ОСНО" },
  { value: "patent", label: "Патент" },
  { value: "eshn", label: "ЕСХН" },
  { value: "other", label: "Другое" },
] as const

export type TaxSystem = (typeof TAX_SYSTEM_OPTIONS)[number]["value"]

export const phoneSchema = z
  .string()
  .trim()
  .min(5, "Укажите номер телефона")
  .max(40, "Номер телефона слишком длинный")
  .refine((v) => /[0-9]/.test(v), "Номер телефона должен содержать цифры")
  .refine((v) => /^[0-9+\-() ]+$/.test(v), "Номер телефона содержит недопустимые символы")

export const telegramSchema = z.preprocess(
  (val) => {
    if (typeof val !== "string") return val
    const trimmed = val.trim()
    if (!trimmed) return undefined
    return trimmed
  },
  z.union([
    z.undefined(),
    z
      .string()
      .trim()
      .transform((v) => (v.startsWith("@") ? v : `@${v}`))
      .refine((v) => /^@[a-zA-Z0-9_]{3,32}$/.test(v), "Telegram username выглядит некорректно"),
  ])
)

const optionalTrimmed = (max: number) =>
  z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(max).optional()
  )

const bankAccountSchema = z
  .string()
  .trim()
  .transform(normalizeDigits)
  .refine((v) => validateBankAccount(v), "Расчётный счёт: 20 цифр")

const bankBicSchema = z
  .string()
  .trim()
  .transform(normalizeDigits)
  .refine((v) => validateBik(v), "БИК: 9 цифр")

const optionalBankAccountSchema = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  bankAccountSchema.optional()
)

const optionalBankBicSchema = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  bankBicSchema.optional()
)

const optionalBankCorrespondentSchema = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z
    .string()
    .trim()
    .transform(normalizeDigits)
    .refine((v) => /^\d{20}$/.test(v), "Корр. счёт: 20 цифр")
    .optional()
)

const sharedProfileFields = {
  phone: phoneSchema,
  telegram: telegramSchema.optional(),
  artistName: optionalTrimmed(100),
  bankAccountNumber: optionalBankAccountSchema,
  bankBic: optionalBankBicSchema,
  bankName: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().min(2, "Укажите наименование банка").max(200).optional()
  ),
  bankCorrespondentAccount: optionalBankCorrespondentSchema,
  documentsEmail: z
    .string()
    .trim()
    .email("Некорректный email для документов")
    .max(200)
    .optional()
    .or(z.literal("")),
  vatPayer: z.boolean().optional(),
  taxSystem: z.enum(["usn", "osno", "patent", "eshn", "other"]).optional(),
  edoRequired: z.boolean().optional(),
  edoIdentifier: optionalTrimmed(200),
}

const individualProfileSchema = z.object({
  counterpartyType: z.literal("individual"),
  lastName: z.string().trim().min(1, "Фамилия обязательна").max(100),
  firstName: z.string().trim().min(1, "Имя обязательно").max(100),
  patronymic: z.string().trim().min(1, "Отчество обязательно").max(100),
  registrationAddress: z.string().trim().min(5, "Укажите адрес регистрации").max(300),
  ...sharedProfileFields,
})

const soleProprietorProfileSchema = z.object({
  counterpartyType: z.literal("sole_proprietor"),
  ipFullName: z.string().trim().min(3, "Укажите ФИО ИП").max(200),
  patronymic: optionalTrimmed(100),
  inn: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .refine((v) => validateInn12(v), "ИНН ИП: 12 цифр с верной контрольной суммой"),
  ogrnip: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .refine((v) => validateOgrnip(v), "ОГРНИП: 15 цифр с верной контрольной суммой"),
  registrationAddress: z.string().trim().min(5, "Укажите адрес регистрации ИП").max(300),
  ...sharedProfileFields,
})

const legalEntityProfileSchema = z.object({
  counterpartyType: z.literal("legal_entity"),
  companyFullName: z.string().trim().min(3, "Укажите полное наименование").max(500),
  companyShortName: optionalTrimmed(200),
  inn: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .refine((v) => validateInn10(v), "ИНН организации: 10 цифр с верной контрольной суммой"),
  kpp: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .refine((v) => validateKpp(v), "КПП: 9 цифр"),
  ogrn: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .refine((v) => validateOgrn(v), "ОГРН: 13 цифр с верной контрольной суммой"),
  legalAddress: z.string().trim().min(5, "Укажите юридический адрес").max(500),
  postalAddress: optionalTrimmed(500),
  signatoryFullName: z.string().trim().min(3, "Укажите ФИО подписанта").max(200),
  signatoryPosition: z.string().trim().min(2, "Укажите должность").max(100),
  signatoryAuthorityBasis: z.string().trim().min(2, "Укажите основание полномочий").max(300),
  bankAccountNumber: bankAccountSchema,
  bankBic: bankBicSchema,
  bankName: z.string().trim().min(2, "Укажите наименование банка").max(200),
  bankCorrespondentAccount: optionalBankCorrespondentSchema,
  phone: phoneSchema,
  telegram: telegramSchema.optional(),
  artistName: optionalTrimmed(100),
  documentsEmail: z
    .string()
    .trim()
    .email("Некорректный email для документов")
    .max(200)
    .optional()
    .or(z.literal("")),
  vatPayer: z.boolean().optional(),
  taxSystem: z.enum(["usn", "osno", "patent", "eshn", "other"]).optional(),
  edoRequired: z.boolean().optional(),
  edoIdentifier: optionalTrimmed(200),
})

export const profilePatchSchema = z
  .discriminatedUnion("counterpartyType", [
    individualProfileSchema,
    soleProprietorProfileSchema,
    legalEntityProfileSchema,
  ])
  .superRefine((data, ctx) => {
    if (
      data.counterpartyType === "legal_entity" &&
      data.edoRequired &&
      !data.edoIdentifier?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите идентификатор в ЭДО",
        path: ["edoIdentifier"],
      })
    }
  })

export type ProfilePatchInput = z.infer<typeof profilePatchSchema>

function phoneOk(user: CabinetUser): boolean {
  const phone = user.phone?.trim() ?? ""
  return phone.length >= 5 && /[0-9]/.test(phone) && /^[0-9+\-() ]+$/.test(phone)
}

function bankOkForLegal(user: CabinetUser): boolean {
  const acc = user.bankAccountNumber?.trim() ?? ""
  const bic = user.bankBic?.trim() ?? ""
  const bank = user.bankName?.trim() ?? ""
  return validateBankAccount(normalizeDigits(acc)) && validateBik(normalizeDigits(bic)) && bank.length >= 2
}

export function cabinetProfileCompleteForUpload(user: CabinetUser | null | undefined): boolean {
  if (!user || !phoneOk(user)) return false

  const type: CounterpartyType =
    user.counterpartyType && COUNTERPARTY_TYPES.includes(user.counterpartyType)
      ? user.counterpartyType
      : "individual"

  if (type === "individual") {
    const lastName = user.lastName?.trim() ?? ""
    const firstName = user.firstName?.trim() ?? ""
    const patronymic = user.patronymic?.trim() ?? ""
    const address = user.registrationAddress?.trim() ?? ""
    return lastName.length >= 1 && firstName.length >= 1 && patronymic.length >= 1 && address.length >= 5
  }

  if (type === "sole_proprietor") {
    const ipName = user.ipFullName?.trim() ?? ""
    const address = user.registrationAddress?.trim() ?? ""
    const inn = user.inn?.trim() ?? ""
    const ogrnip = user.ogrnip?.trim() ?? ""
    return (
      ipName.length >= 3 &&
      address.length >= 5 &&
      validateInn12(normalizeDigits(inn)) &&
      validateOgrnip(normalizeDigits(ogrnip))
    )
  }

  const company = user.companyFullName?.trim() ?? ""
  const inn = user.inn?.trim() ?? ""
  const kpp = user.kpp?.trim() ?? ""
  const ogrn = user.ogrn?.trim() ?? ""
  const legalAddress = user.legalAddress?.trim() ?? ""
  const signatory = user.signatoryFullName?.trim() ?? ""
  const position = user.signatoryPosition?.trim() ?? ""
  const basis = user.signatoryAuthorityBasis?.trim() ?? ""

  if (user.edoRequired && !(user.edoIdentifier?.trim().length ?? 0)) return false

  return (
    company.length >= 3 &&
    validateInn10(normalizeDigits(inn)) &&
    validateKpp(normalizeDigits(kpp)) &&
    validateOgrn(normalizeDigits(ogrn)) &&
    legalAddress.length >= 5 &&
    signatory.length >= 3 &&
    position.length >= 2 &&
    basis.length >= 2 &&
    bankOkForLegal(user)
  )
}

export function sanitizeCabinetUserForClient(user: CabinetUser): Omit<CabinetUser, "passwordHash"> {
  const { passwordHash: _ignored, ...rest } = user
  return rest
}

/** Все поля формы профиля (клиент). */
export type ProfileFormValues = {
  counterpartyType: CounterpartyType
  lastName: string
  firstName: string
  patronymic: string
  ipFullName: string
  phone: string
  telegram: string
  registrationAddress: string
  legalAddress: string
  postalAddress: string
  artistName: string
  companyFullName: string
  companyShortName: string
  inn: string
  kpp: string
  ogrn: string
  ogrnip: string
  signatoryFullName: string
  signatoryPosition: string
  signatoryAuthorityBasis: string
  bankAccountNumber: string
  bankBic: string
  bankName: string
  bankCorrespondentAccount: string
  documentsEmail: string
  vatPayer: boolean
  taxSystem: TaxSystem | ""
  edoRequired: boolean
  edoIdentifier: string
}

export const emptyProfileFormValues = (): ProfileFormValues => ({
  counterpartyType: "individual",
  lastName: "",
  firstName: "",
  patronymic: "",
  ipFullName: "",
  phone: "",
  telegram: "",
  registrationAddress: "",
  legalAddress: "",
  postalAddress: "",
  artistName: "",
  companyFullName: "",
  companyShortName: "",
  inn: "",
  kpp: "",
  ogrn: "",
  ogrnip: "",
  signatoryFullName: "",
  signatoryPosition: "",
  signatoryAuthorityBasis: "",
  bankAccountNumber: "",
  bankBic: "",
  bankName: "",
  bankCorrespondentAccount: "",
  documentsEmail: "",
  vatPayer: false,
  taxSystem: "",
  edoRequired: false,
  edoIdentifier: "",
})

export function cabinetUserToProfileFormValues(user: Omit<CabinetUser, "passwordHash">): ProfileFormValues {
  const type: CounterpartyType =
    user.counterpartyType && COUNTERPARTY_TYPES.includes(user.counterpartyType)
      ? user.counterpartyType
      : "individual"

  return {
    ...emptyProfileFormValues(),
    counterpartyType: type,
    lastName: user.lastName ?? "",
    firstName: user.firstName ?? "",
    patronymic: user.patronymic ?? "",
    ipFullName: user.ipFullName ?? "",
    phone: user.phone ?? "",
    telegram: user.telegram ?? "",
    registrationAddress: user.registrationAddress ?? "",
    legalAddress: user.legalAddress ?? "",
    postalAddress: user.postalAddress ?? "",
    artistName: user.artistName ?? "",
    companyFullName: user.companyFullName ?? "",
    companyShortName: user.companyShortName ?? "",
    inn: user.inn ?? "",
    kpp: user.kpp ?? "",
    ogrn: user.ogrn ?? "",
    ogrnip: user.ogrnip ?? "",
    signatoryFullName: user.signatoryFullName ?? "",
    signatoryPosition: user.signatoryPosition ?? "",
    signatoryAuthorityBasis: user.signatoryAuthorityBasis ?? "",
    bankAccountNumber: user.bankAccountNumber ?? "",
    bankBic: user.bankBic ?? "",
    bankName: user.bankName ?? "",
    bankCorrespondentAccount: user.bankCorrespondentAccount ?? "",
    documentsEmail: user.documentsEmail ?? "",
    vatPayer: user.vatPayer ?? false,
    taxSystem: (user.taxSystem as TaxSystem) ?? "",
    edoRequired: user.edoRequired ?? false,
    edoIdentifier: user.edoIdentifier ?? "",
  }
}

function sharedTaxPayload(values: ProfileFormValues) {
  return {
    vatPayer: values.vatPayer,
    taxSystem: values.taxSystem || undefined,
    edoRequired: values.edoRequired,
    edoIdentifier: values.edoRequired ? values.edoIdentifier : undefined,
    documentsEmail: values.documentsEmail || undefined,
  }
}

/** Парсит тело PATCH профиля ЛК; тип контрагента всегда берётся с сервера, не из запроса. */
export function parseCabinetProfilePatchBody(
  body: unknown,
  counterpartyType: CounterpartyType
) {
  const raw =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {}
  const { counterpartyType: _ignored, ...rest } = raw
  const values: ProfileFormValues = {
    ...emptyProfileFormValues(),
    ...rest,
    counterpartyType,
  } as ProfileFormValues
  return profilePatchSchema.safeParse(profileFormValuesToPatch(values, counterpartyType))
}

export function profileFormValuesToPatch(
  values: ProfileFormValues,
  counterpartyTypeOverride?: CounterpartyType
): ProfilePatchInput {
  const type = counterpartyTypeOverride ?? values.counterpartyType
  const shared = {
    phone: values.phone,
    telegram: values.telegram || undefined,
    artistName: values.artistName || undefined,
    bankAccountNumber: values.bankAccountNumber || undefined,
    bankBic: values.bankBic || undefined,
    bankName: values.bankName || undefined,
    bankCorrespondentAccount: values.bankCorrespondentAccount || undefined,
    ...sharedTaxPayload(values),
  }

  if (type === "sole_proprietor") {
    return {
      counterpartyType: "sole_proprietor",
      ipFullName: values.ipFullName,
      patronymic: values.patronymic || undefined,
      inn: values.inn,
      ogrnip: values.ogrnip,
      registrationAddress: values.registrationAddress,
      ...shared,
    }
  }

  if (type === "legal_entity") {
    return {
      counterpartyType: "legal_entity",
      companyFullName: values.companyFullName,
      companyShortName: values.companyShortName || undefined,
      inn: values.inn,
      kpp: values.kpp,
      ogrn: values.ogrn,
      legalAddress: values.legalAddress,
      postalAddress: values.postalAddress || undefined,
      signatoryFullName: values.signatoryFullName,
      signatoryPosition: values.signatoryPosition,
      signatoryAuthorityBasis: values.signatoryAuthorityBasis,
      bankAccountNumber: values.bankAccountNumber,
      bankBic: values.bankBic,
      bankName: values.bankName,
      bankCorrespondentAccount: values.bankCorrespondentAccount || undefined,
      phone: values.phone,
      telegram: values.telegram || undefined,
      artistName: values.artistName || undefined,
      documentsEmail: values.documentsEmail || undefined,
      vatPayer: values.vatPayer,
      taxSystem: values.taxSystem || undefined,
      edoRequired: values.edoRequired,
      edoIdentifier: values.edoRequired ? values.edoIdentifier : undefined,
    }
  }

  return {
    counterpartyType: "individual",
    lastName: values.lastName,
    firstName: values.firstName,
    patronymic: values.patronymic,
    registrationAddress: values.registrationAddress,
    ...shared,
  }
}
