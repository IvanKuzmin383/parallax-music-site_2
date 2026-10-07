"use client"

import { cn } from "@/lib/utils"
import { RELEASE_ARTIST_FILTER_ALL } from "@/lib/cabinet/release-status-filter"
import { normalizeArtistForPolicy } from "@/lib/artist-name-normalize"

type ArtistCount = { name: string; count: number }

type Props = {
  artists: ArtistCount[]
  value: string
  onChange: (artist: string) => void
  /** Счётчик для пункта «Все». */
  allCount: number
  className?: string
  label?: string
}

export function ArtistProjectSwitcher({
  artists,
  value,
  onChange,
  allCount,
  className,
  label = "Проект",
}: Props) {
  if (artists.length <= 1) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-2 pt-0.5", className)}>
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(RELEASE_ARTIST_FILTER_ALL)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition-colors",
            value === RELEASE_ARTIST_FILTER_ALL
              ? "bg-primary/20 ring-1 ring-primary/50 text-foreground"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          Все
          <span className="ml-1.5 tabular-nums text-muted-foreground">{allCount}</span>
        </button>
        {artists.map(({ name, count }) => {
          const active =
            normalizeArtistForPolicy(value) === normalizeArtistForPolicy(name)
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-primary/20 ring-1 ring-primary/50 text-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {name}
              <span className="ml-1.5 tabular-nums text-muted-foreground">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
