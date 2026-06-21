"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReleaseView } from "../types"
import { mapDraftToRelease, mapTrackToRelease } from "../adapters/map-track-to-release"
import type { Track } from "@/lib/tracks"
import type { UploadDraft } from "@/lib/upload-drafts"

export function useCabinetReleases() {
  const [releases, setReleases] = useState<ReleaseView[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tracksRes, draftsRes] = await Promise.all([
        fetch("/api/cabinet/tracks", { credentials: "include" }),
        fetch("/api/cabinet/upload-drafts", { credentials: "include" }),
      ])
      const trackItems: ReleaseView[] = []
      if (tracksRes.ok) {
        const data = (await tracksRes.json()) as { tracks?: Track[] }
        trackItems.push(...(data.tracks ?? []).map(mapTrackToRelease))
      }
      const draftItems: ReleaseView[] = []
      if (draftsRes.ok) {
        const data = (await draftsRes.json()) as { drafts?: UploadDraft[] }
        draftItems.push(...(data.drafts ?? []).map(mapDraftToRelease))
      }
      const merged = [...draftItems, ...trackItems].sort((a, b) => {
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
