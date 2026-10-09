"use client"

import { ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { normalizeArtistForPolicy } from "@/lib/artist-name-normalize"
import { cn } from "@/lib/utils"

type ArtistCount = { name: string; count: number }

type Props = {
  artists: ArtistCount[]
  /** Выбранные проекты. Пустой массив = все. */
  value: string[]
  onChange: (artists: string[]) => void
  /** Счётчик для пункта «Все». */
  allCount: number
  className?: string
  /** Компактный вид для топбара. */
  compact?: boolean
}

function isSelected(value: string[], name: string): boolean {
  const norm = normalizeArtistForPolicy(name)
  return value.some((v) => normalizeArtistForPolicy(v) === norm)
}

export function ArtistProjectSwitcher({
  artists,
  value,
  onChange,
  allCount,
  className,
  compact = false,
}: Props) {
  if (artists.length <= 1) return null

  const isAll = value.length === 0
  const triggerLabel = isAll
    ? `Все проекты`
    : value.length === 1
      ? value[0]
      : `${value.length} проектов`

  const triggerCount = isAll
    ? allCount
    : artists
        .filter((a) => isSelected(value, a.name))
        .reduce((sum, a) => sum + a.count, 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 min-w-0 justify-between gap-2 border-border/70 bg-muted/30 px-3 font-normal",
            compact ? "max-w-[11rem] sm:max-w-[14rem]" : "max-w-full sm:max-w-xs",
            className,
          )}
          aria-label="Выбор проекта"
        >
          <span className="min-w-0 truncate text-sm">
            <span className="text-muted-foreground">Проект · </span>
            {triggerLabel}
            <span className="ml-1.5 tabular-nums text-muted-foreground">{triggerCount}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-1.5rem))]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Можно выбрать один, несколько или все
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={isAll}
          onCheckedChange={() => onChange([])}
          onSelect={(e) => e.preventDefault()}
        >
          Все
          <span className="ml-auto pl-3 tabular-nums text-muted-foreground">{allCount}</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {artists.map(({ name, count }) => {
          const checked = isSelected(value, name)
          return (
            <DropdownMenuCheckboxItem
              key={name}
              checked={checked}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(next) => {
                if (next === true) {
                  const nextValue = isAll ? [name] : checked ? value : [...value, name]
                  onChange(
                    nextValue.length >= artists.length ? [] : nextValue,
                  )
                  return
                }
                const nextValue = value.filter(
                  (v) => normalizeArtistForPolicy(v) !== normalizeArtistForPolicy(name),
                )
                onChange(nextValue)
              }}
            >
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="ml-auto pl-3 tabular-nums text-muted-foreground">{count}</span>
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
