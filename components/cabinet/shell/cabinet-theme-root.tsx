"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  applyCabinetTheme,
  persistCabinetTheme,
  readCabinetTheme,
  type CabinetThemeMode,
} from "@/lib/cabinet/cabinet-theme"

type CabinetThemeContextValue = {
  theme: CabinetThemeMode
  setTheme: (mode: CabinetThemeMode) => void
  toggleTheme: () => void
}

const CabinetThemeContext = createContext<CabinetThemeContextValue | null>(null)

export function useCabinetTheme(): CabinetThemeContextValue {
  const ctx = useContext(CabinetThemeContext)
  if (!ctx) {
    throw new Error("useCabinetTheme must be used within CabinetThemeRoot")
  }
  return ctx
}

/** Вешает палитру кабинета на `html` и управляет светлой/тёмной темой. */
export function CabinetThemeRoot({ children }: { children?: ReactNode }) {
  const [theme, setThemeState] = useState<CabinetThemeMode>("dark")

  useEffect(() => {
    const root = document.documentElement
    root.classList.add("cabinet-theme")
    const initial = readCabinetTheme()
    setThemeState(initial)
    applyCabinetTheme(initial)
    return () => {
      root.classList.remove("cabinet-theme")
      root.removeAttribute("data-cabinet-theme")
      // Публичный сайт остаётся в тёмной палитре
      root.classList.add("dark")
    }
  }, [])

  const setTheme = useCallback((mode: CabinetThemeMode) => {
    setThemeState(mode)
    persistCabinetTheme(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: CabinetThemeMode = prev === "dark" ? "light" : "dark"
      persistCabinetTheme(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  )

  return (
    <CabinetThemeContext.Provider value={value}>{children ?? null}</CabinetThemeContext.Provider>
  )
}
