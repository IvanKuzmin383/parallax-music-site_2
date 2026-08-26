import type { Track } from "@/lib/tracks"

/** Поля трека, доступные артисту в кабинете (без внутренних идентификаторов). */
export type CabinetTrack = Omit<Track, "catalogNumber" | "isrc">

export function toCabinetTrack(track: Track): CabinetTrack {
  const { catalogNumber: _catalogNumber, isrc: _isrc, ...rest } = track
  return rest
}

export function toCabinetTracks(tracks: Track[]): CabinetTrack[] {
  return tracks.map(toCabinetTrack)
}
