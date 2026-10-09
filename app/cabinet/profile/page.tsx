"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Старый URL → настройки, вкладка «Профиль» (с сохранением hash). */
export default function CabinetProfileRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    router.replace(`/cabinet/settings?tab=profile${hash}`)
  }, [router])

  return null
}
