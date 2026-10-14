"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { REFERRAL_COOKIE_NAME } from "@/lib/cabinet/referral-cookie"

/** Сохраняет ?ref= в cookie на 30 дней для регистрации. */
export function ReferralCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get("ref")?.trim()
    if (!ref || ref.length > 40) return
    const maxAge = 60 * 60 * 24 * 30
    const secure = typeof window !== "undefined" && window.location.protocol === "https:"
    document.cookie = `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(ref)}; path=/; max-age=${maxAge}; samesite=lax${secure ? "; secure" : ""}`
  }, [searchParams])

  return null
}

export function readReferralCodeFromCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${REFERRAL_COOKIE_NAME}=`))
  if (!match) return null
  try {
    return decodeURIComponent(match.slice(REFERRAL_COOKIE_NAME.length + 1)).trim() || null
  } catch {
    return null
  }
}
