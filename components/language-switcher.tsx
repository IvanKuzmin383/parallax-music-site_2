"use client"

import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLocale("ru")}
        aria-pressed={locale === "ru"}
        className={cn(
          "transition-colors",
          locale === "ru" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Ru
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={cn(
          "transition-colors",
          locale === "en" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Eng
      </button>
    </div>
  )
}
