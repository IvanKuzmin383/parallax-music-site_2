"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCabinetTheme } from "@/components/cabinet/shell/cabinet-theme-root"

export function CabinetThemeToggle() {
  const { theme, toggleTheme } = useCabinetTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 rounded-lg"
      onClick={toggleTheme}
      aria-label={
        !mounted
          ? "Переключить тему"
          : isDark
            ? "Включить светлую тему"
            : "Включить тёмную тему"
      }
      title={!mounted ? "Тема" : isDark ? "Светлая тема" : "Тёмная тема"}
    >
      {!mounted || isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
