"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { normalizeArtistForPolicy } from "@/lib/artist-name-normalize"
import {
  RELEASE_ARTIST_FILTER_ALL,
  matchesReleaseArtist,
} from "@/lib/cabinet/release-status-filter"

type Named = { artist?: string; artistName?: string }

function displayArtist(item: Named): string {
  return (item.artistName ?? item.artist ?? "").trim()
}

/** Список артистов + счётчики из любых объектов с artist / artistName. */
export function buildArtistCounts(items: Named[]): { name: string; count: number }[] {
  const byNorm = new Map<string, { name: string; count: number }>()
  for (const item of items) {
    const raw = displayArtist(item)
    if (!raw || raw === "-") continue
    const norm = normalizeArtistForPolicy(raw)
    if (!norm) continue
    const prev = byNorm.get(norm)
    if (prev) prev.count += 1
    else byNorm.set(norm, { name: raw, count: 1 })
  }
  return [...byNorm.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"))
}

export function matchesArtistName(name: string, artistFilter: string): boolean {
  if (!artistFilter || artistFilter === RELEASE_ARTIST_FILTER_ALL) return true
  return normalizeArtistForPolicy(name) === normalizeArtistForPolicy(artistFilter)
}

/**
 * Переключатель проекта через ?artist= в URL.
 */
export function useArtistProjectFilter(availableArtists: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [artistFilter, setArtistFilter] = useState<string>(RELEASE_ARTIST_FILTER_ALL)

  useEffect(() => {
    const fromUrl = searchParams.get("artist")?.trim()
    if (!fromUrl) {
      setArtistFilter(RELEASE_ARTIST_FILTER_ALL)
      return
    }
    const match = availableArtists.find(
      (a) => normalizeArtistForPolicy(a) === normalizeArtistForPolicy(fromUrl)
    )
    if (match) {
      setArtistFilter(match)
      return
    }
    if (availableArtists.length === 0) {
      setArtistFilter(fromUrl)
      return
    }
    setArtistFilter(RELEASE_ARTIST_FILTER_ALL)
  }, [searchParams, availableArtists])

  const setArtist = useCallback(
    (value: string) => {
      setArtistFilter(value)
      const params = new URLSearchParams(searchParams.toString())
      if (value === RELEASE_ARTIST_FILTER_ALL) params.delete("artist")
      else params.set("artist", value)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const filterRelease = useCallback(
    <T extends { artist: string }>(items: T[]) =>
      items.filter((r) => matchesReleaseArtist(r, artistFilter)),
    [artistFilter]
  )

  const filterByArtistName = useCallback(
    <T extends { artistName: string }>(items: T[]) =>
      items.filter((t) => matchesArtistName(t.artistName, artistFilter)),
    [artistFilter]
  )

  return useMemo(
    () => ({
      artistFilter,
      setArtist,
      isAll: artistFilter === RELEASE_ARTIST_FILTER_ALL,
      filterRelease,
      filterByArtistName,
    }),
    [artistFilter, setArtist, filterRelease, filterByArtistName]
  )
}
