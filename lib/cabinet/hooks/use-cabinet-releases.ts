"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReleaseView } from "../types"
import {
  mapAlbumTracksToRelease,
  mapReleaseEntityToView,
  mapTrackToRelease,
} from "../adapters/map-track-to-release"
import type { Track } from "@/lib/tracks"
import type { Release } from "@/lib/releases"
import type { Album } from "@/lib/albums"

export function useCabinetReleases() {
  const [releases, setReleases] = useState<ReleaseView[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tracksRes, releasesRes, albumsRes] = await Promise.all([
        fetch("/api/cabinet/tracks", { credentials: "include" }),
        fetch("/api/cabinet/releases", { credentials: "include" }),
        fetch("/api/cabinet/albums", { credentials: "include" }),
      ])

      const allTracks: Track[] = tracksRes.ok
        ? (((await tracksRes.json()) as { tracks?: Track[] }).tracks ?? [])
        : []

      const allReleases: Release[] = releasesRes.ok
        ? (((await releasesRes.json()) as { releases?: Release[] }).releases ?? [])
        : []

      const albumsById = new Map<string, Album>()
      if (albumsRes.ok) {
        const data = (await albumsRes.json()) as { albums?: Album[] }
        for (const album of data.albums ?? []) {
          albumsById.set(album.id, album)
        }
      }

      const tracksByReleaseId = new Map<string, Track[]>()
      const tracksByAlbumId = new Map<string, Track[]>()
      for (const track of allTracks) {
        if (track.releaseId) {
          const list = tracksByReleaseId.get(track.releaseId) ?? []
          list.push(track)
          tracksByReleaseId.set(track.releaseId, list)
        }
        if (track.albumId) {
          const list = tracksByAlbumId.get(track.albumId) ?? []
          list.push(track)
          tracksByAlbumId.set(track.albumId, list)
        }
      }

      /** Одна карточка на сущность релиза (сингл или альбом). */
      const releaseViews: ReleaseView[] = allReleases.map((r) =>
        mapReleaseEntityToView(r, tracksByReleaseId.get(r.id) ?? [])
      )

      const coveredReleaseIds = new Set(releaseViews.map((r) => r.id))
      const coveredAlbumIds = new Set(
        allReleases.map((r) => r.albumId).filter((id): id is string => Boolean(id))
      )

      /** Альбомы без строки в releases (старые загрузки). */
      const albumViews: ReleaseView[] = []
      for (const [albumId, albumTracks] of tracksByAlbumId) {
        if (coveredAlbumIds.has(albumId)) continue
        const visible = albumTracks.filter(
          (t) => !(t.releaseId && coveredReleaseIds.has(t.releaseId)) && t.status !== "draft"
        )
        if (visible.length === 0) continue
        coveredAlbumIds.add(albumId)
        albumViews.push(mapAlbumTracksToRelease(albumId, visible, albumsById.get(albumId)))
      }

      /** Синглы-треки без release/album — legacy. */
      const singleViews: ReleaseView[] = []
      for (const track of allTracks) {
        if (track.status === "draft") continue
        if (track.releaseId && coveredReleaseIds.has(track.releaseId)) continue
        if (track.albumId && coveredAlbumIds.has(track.albumId)) continue
        singleViews.push(mapTrackToRelease(track, 1))
      }

      const merged = [...releaseViews, ...albumViews, ...singleViews].sort((a, b) => {
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
