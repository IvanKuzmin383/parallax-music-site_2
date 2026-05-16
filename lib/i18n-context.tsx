"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import ruMessages from "@/messages/ru.json"
import enMessages from "@/messages/en.json"

type Locale = "ru" | "en"

type Messages = typeof ruMessages

const messages: Record<Locale, Messages> = {
  ru: ruMessages,
  en: enMessages as Messages,
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Messages
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru") // Русский по умолчанию
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Загружаем сохраненный язык из localStorage
    const savedLocale = localStorage.getItem("locale") as Locale | null
    if (savedLocale && (savedLocale === "ru" || savedLocale === "en")) {
      setLocaleState(savedLocale)
      if (typeof document !== "undefined") {
        document.documentElement.lang = savedLocale
      }
    } else {
      // Устанавливаем русский по умолчанию в HTML
      if (typeof document !== "undefined") {
        document.documentElement.lang = "ru"
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", newLocale)
      // Обновляем lang атрибут HTML
      document.documentElement.lang = newLocale
    }
  }

  const value: I18nContextType = {
    locale,
    setLocale,
    t: messages[locale],
  }

  // Предотвращаем hydration mismatch, используя русский язык до монтирования
  if (!mounted) {
    return <I18nContext.Provider value={{ locale: "ru", setLocale, t: messages.ru }}>{children}</I18nContext.Provider>
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
