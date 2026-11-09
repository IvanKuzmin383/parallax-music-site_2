"use client"

import { ChevronDown } from "lucide-react"
import { useI18n, type Locale } from "@/lib/i18n-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const LOCALE_OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "ru", label: "Ru" },
  { value: "en", label: "Eng" },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const current = LOCALE_OPTIONS.find((item) => item.value === locale) ?? LOCALE_OPTIONS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-background/40 px-2.5",
          "text-xs font-medium uppercase tracking-wider text-foreground outline-none",
          "transition-colors hover:border-primary/50 hover:bg-primary/10",
          "focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
        aria-label="Language"
      >
        {current.label}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[7rem]">
        {LOCALE_OPTIONS.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onSelect={() => setLocale(item.value)}
            className={cn(
              "uppercase tracking-wider",
              locale === item.value && "bg-primary/10 text-primary focus:bg-primary/15 focus:text-primary",
            )}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
