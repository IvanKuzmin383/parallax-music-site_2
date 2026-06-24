"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReleaseView } from "../types"
import { mapReleaseEntityToView, mapTrackToRelease } from "../adapters/map-track-to-release"
import type { Track } from "@/lib/tracks"
import type { Release } from "@/lib/releases"

export function useCabinetReleases() {
  const [releases, setReleases] = useState<ReleaseView[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tracksRes, releasesRes] = await Promise.all([
        fetch("/api/cabinet/tracks", { credentials: "include" }),
        fetch("/api/cabinet/releases", { credentials: "include" }),
      ])

      const releaseEntities: ReleaseView[] = []
      if (releasesRes.ok) {
        const data = (await releasesRes.json()) as { releases?: Release[] }
        const active = (data.releases ?? []).filter(
          (r) => r.status === "draft" || r.status === "awaiting_payment"
        )
        releaseEntities.push(...active.map(mapReleaseEntityToView))
      }

      const activeReleaseIds = new Set(releaseEntities.map((r) => r.id))

      const trackItems: ReleaseView[] = []
      if (tracksRes.ok) {
        const data = (await tracksRes.json()) as { tracks?: Track[] }
        for (const track of data.tracks ?? []) {
          if (track.status === "draft" && track.releaseId && activeReleaseIds.has(track.releaseId)) {
            continue
          }
          if (track.status === "draft") continue
          trackItems.push(mapTrackToRelease(track))
        }
      }

      const merged = [...releaseEntities, ...trackItems].sort((a, b) => {
        const da = a.releaseDate ?? a.title
        const db = b.releaseDate ?? b.title
        return db.localeCompare(da)
      })
      setReleases(merged)
    } catch {
      setReleases([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const inProgressCount = releases.filter(
    (r) =>
      r.kind === "draft" ||
      r.status.includes("модерац") ||
      r.status.includes("Ожидает") ||
      r.status.includes("Черновик")
  ).length

  return { releases, loading, inProgressCount, reload: load }
}
