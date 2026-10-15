import type { CabinetUser } from "@/lib/cabinet-users"
import { getCabinetUserKycStatus, isCabinetKycVerified, type KycStatus } from "@/lib/cabinet-kyc"

export const KYC_REQUIRED_ERROR_CODE = "kyc_required" as const

const KYC_REQUIRED_TITLE =
  "Чтобы загружать релизы и клипы, а также выводить роялти, пройдите верификацию аккаунта."

export function kycRequiredResponseBody(kycStatus: KycStatus): {
  error: string
  errorCode: typeof KYC_REQUIRED_ERROR_CODE
  kycStatus: KycStatus
} {
  return {
    error: KYC_REQUIRED_TITLE,
    errorCode: KYC_REQUIRED_ERROR_CODE,
    kycStatus,
  }
}

export function checkKycVerifiedForDistribution(
  user: CabinetUser | null | undefined
): { status: 403; body: ReturnType<typeof kycRequiredResponseBody> } | null {
  if (isCabinetKycVerified(user)) return null
  return {
    status: 403,
    body: kycRequiredResponseBody(getCabinetUserKycStatus(user)),
  }
}
