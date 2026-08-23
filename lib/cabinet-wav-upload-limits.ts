/** Максимальный размер WAV при загрузке в кабинет (и AI-мастеринг). */
export const MAX_CABINET_WAV_MB = 120

export const MAX_CABINET_WAV_BYTES = MAX_CABINET_WAV_MB * 1024 * 1024

export function cabinetWavMaxSizeError(subject = "Размер аудиофайла"): string {
  return `${subject} не должен превышать ${MAX_CABINET_WAV_MB} MB`
}
