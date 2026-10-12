/**
 * Имя WAV при загрузке раньше попадало в track_name.
 * Такие значения в админке/UI лучше не показывать как «название трека».
 */
export function looksLikeAudioFileBaseName(
  trackName: string | null | undefined,
  artistName?: string | null
): boolean {
  const name = `${trackName ?? ""}`.trim()
  if (!name) return true
  if (name.includes("_")) return true
  if (/^мастер\b/i.test(name)) return true

  const dash = name.match(/^(.+?)\s+-\s+(.+)$/)
  if (dash) {
    const left = dash[1].trim().toLowerCase()
    const artist = `${artistName ?? ""}`.trim().toLowerCase()
    if (
      artist &&
      left &&
      left !== artist &&
      !artist.includes(left) &&
      !left.includes(artist)
    ) {
      return true
    }
  }
  return false
}

/** Название для списков: трек, иначе название релиза (если track_name похож на имя файла). */
export function resolveTrackDisplayName(params: {
  trackName: string | null | undefined
  artistName?: string | null
  releaseTitle?: string | null
  albumId?: string | null
}): string {
  const trackName = `${params.trackName ?? ""}`.trim()
  const releaseTitle = `${params.releaseTitle ?? ""}`.trim()
  const isSingle = !params.albumId

  if (
    isSingle &&
    releaseTitle &&
    looksLikeAudioFileBaseName(trackName, params.artistName)
  ) {
    return releaseTitle
  }
  return trackName || releaseTitle || "Без названия"
}
