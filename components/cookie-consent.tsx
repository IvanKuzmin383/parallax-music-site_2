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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:justify-start sm:px-6 sm:pb-6">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border bg-background/95 p-3 shadow-lg shadow-black/10 backdrop-blur sm:max-w-md sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              Мы используем файлы cookie
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
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

