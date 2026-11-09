"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (typeof document !== "undefined") {
      const dismissed = document.cookie.match(/(?:^|;\s*)cookie_banner_dismissed=1/)
      if (!dismissed) {
        setVisible(true)
      }
    }
    setMounted(true)
  }, [])

  if (!mounted || !visible) {
    return null
  }

  const handleClose = () => {
    if (typeof document !== "undefined") {
      const maxAge = 60 * 60 * 24 * 365 // 1 год
      document.cookie = `cookie_banner_dismissed=1; Max-Age=${maxAge}; Path=/`
    }
    setVisible(false)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-0">
      <div className="pointer-events-auto w-full border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="mb-1 text-sm font-medium text-foreground">
              Мы используем файлы cookie
            </p>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Файлы cookie помогают обеспечить работу сайта, улучшать сервис и получать статистику.
              Продолжая пользоваться сайтом, вы соглашаетесь на использование cookie в соответствии с{" "}
              <Link href="/cookies" className="underline underline-offset-4 hover:text-primary">
                Политикой cookie
              </Link>{" "}
              и{" "}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                Политикой конфиденциальности
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

