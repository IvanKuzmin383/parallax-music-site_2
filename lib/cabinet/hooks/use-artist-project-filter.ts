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

export function matchesArtistName(
  name: string,
  artistFilter: string | string[],
): boolean {
  if (Array.isArray(artistFilter)) {
    if (artistFilter.length === 0) return true
    const target = normalizeArtistForPolicy(name)
    return artistFilter.some((a) => normalizeArtistForPolicy(a) === target)
  }
  if (!artistFilter || artistFilter === RELEASE_ARTIST_FILTER_ALL) return true
  return normalizeArtistForPolicy(name) === normalizeArtistForPolicy(artistFilter)
}

function resolveFromUrl(
  rawValues: string[],
  availableArtists: string[],
): string[] {
  const cleaned = rawValues.map((v) => v.trim()).filter(Boolean)
  if (cleaned.length === 0) return []

  if (availableArtists.length === 0) return cleaned

  const resolved: string[] = []
  const seen = new Set<string>()
  for (const raw of cleaned) {
    const match = availableArtists.find(
      (a) => normalizeArtistForPolicy(a) === normalizeArtistForPolicy(raw),
    )
    if (!match) continue
    const norm = normalizeArtistForPolicy(match)
    if (seen.has(norm)) continue
    seen.add(norm)
    resolved.push(match)
  }
  return resolved
}

function writeArtistsToParams(
  params: URLSearchParams,
  artists: string[],
): void {
  params.delete("artist")
  for (const name of artists) {
    params.append("artist", name)
  }
}

/**
 * Переключатель проекта через ?artist= в URL (один или несколько).
 * Пустой список = все проекты.
 */
export function useArtistProjectFilter(availableArtists: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [artistFilters, setArtistFilters] = useState<string[]>([])

  useEffect(() => {
    const fromUrl = searchParams.getAll("artist")
    setArtistFilters(resolveFromUrl(fromUrl, availableArtists))
  }, [searchParams, availableArtists])

  const setArtists = useCallback(
    (values: string[]) => {
      const next = resolveFromUrl(values, availableArtists.length ? availableArtists : values)
      setArtistFilters(next)
      const params = new URLSearchParams(searchParams.toString())
      writeArtistsToParams(params, next)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [availableArtists, pathname, router, searchParams],
  )

  /** Совместимость: один артист или «все». */
  const setArtist = useCallback(
    (value: string) => {
      if (!value || value === RELEASE_ARTIST_FILTER_ALL) setArtists([])
      else setArtists([value])
    },
    [setArtists],
  )

  const toggleArtist = useCallback(
    (name: string) => {
      const norm = normalizeArtistForPolicy(name)
      const exists = artistFilters.some(
        (a) => normalizeArtistForPolicy(a) === norm,
      )
      if (exists) {
        setArtists(
          artistFilters.filter((a) => normalizeArtistForPolicy(a) !== norm),
        )
      } else {
        setArtists([...artistFilters, name])
      }
    },
    [artistFilters, setArtists],
  )

  const isAll = artistFilters.length === 0

  /** Первый выбранный или ALL - для мест, где нужен один проект. */
  const artistFilter = isAll
    ? RELEASE_ARTIST_FILTER_ALL
    : artistFilters[0] ?? RELEASE_ARTIST_FILTER_ALL

  const filterRelease = useCallback(
    <T extends { artist: string }>(items: T[]) =>
      items.filter((r) => matchesReleaseArtist(r, artistFilters)),
    [artistFilters],
  )

  const filterByArtistName = useCallback(
    <T extends { artistName: string }>(items: T[]) =>
      items.filter((t) => matchesArtistName(t.artistName, artistFilters)),
    [artistFilters],
  )

  return useMemo(
    () => ({
      artistFilters,
      artistFilter,
      setArtists,
      setArtist,
      toggleArtist,
      isAll,
      filterRelease,
      filterByArtistName,
    }),
    [
      artistFilters,
      artistFilter,
      setArtists,
      setArtist,
      toggleArtist,
      isAll,
      filterRelease,
      filterByArtistName,
    ],
  )
}
