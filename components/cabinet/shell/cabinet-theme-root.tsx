"use client"

import { useEffect } from "react"

/** Вешает палитру кабинета на `html`, чтобы токены работали и в порталах (Select, Dialog). */
export function CabinetThemeRoot() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add("cabinet-theme")
    return () => {
      root.classList.remove("cabinet-theme")
    }
  }, [])

  return null
}
