"use client"

import { Suspense, useMemo } from "react"
import { ArtistProjectSwitcher } from "@/components/cabinet/shared/artist-project-switcher"
import {
  buildArtistCounts,
  useArtistProjectFilter,
} from "@/lib/cabinet/hooks/use-artist-project-filter"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"

function CabinetProjectFilterInner() {
  const { releases, loading } = useCabinetReleases()
  const artistCounts = useMemo(() => buildArtistCounts(releases), [releases])
  const artistNames = useMemo(() => artistCounts.map((a) => a.name), [artistCounts])
  const { artistFilters, setArtists } = useArtistProjectFilter(artistNames)

  if (loading || artistCounts.length <= 1) return null

  return (
    <ArtistProjectSwitcher
      artists={artistCounts}
      value={artistFilters}
      onChange={setArtists}
      allCount={releases.length}
      compact
    />
  )
}

export function CabinetProjectFilter() {
  return (
    <Suspense fallback={null}>
      <CabinetProjectFilterInner />
    </Suspense>
  )
}
