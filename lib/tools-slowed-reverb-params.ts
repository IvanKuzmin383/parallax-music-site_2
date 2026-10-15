export type SlowedReverbParams = {
  presetId: string
  /** Скорость и тон вместе (как classic nightcore / slowed). */
  speed: number
  /** Усиление басов, 0-100%. */
  bassBoost: number
  /** Глубина реверберации, 0-10. */
  reverb: number
}

export type SlowedReverbPreset = {
  id: string
  label: string
  hint: string
  params: Omit<SlowedReverbParams, "presetId">
}

export const SLOWED_REVERB_SPEED_MIN = 0.5
export const SLOWED_REVERB_SPEED_MAX = 1.6
export const SLOWED_REVERB_BASS_MIN = 0
export const SLOWED_REVERB_BASS_MAX = 100
export const SLOWED_REVERB_REVERB_MIN = 0
export const SLOWED_REVERB_REVERB_MAX = 10

export const SLOWED_REVERB_PRESETS: SlowedReverbPreset[] = [
  {
    id: "ultra_slowed",
    label: "ULTRA SLOWED",
    hint: "Очень медленно, глубокий бас и плотный реверб - атмосферный «ultra» вайб.",
    params: { speed: 0.55, bassBoost: 70, reverb: 7.5 },
  },
  {
    id: "super_slowed",
    label: "SUPER SLOWED",
    hint: "Сильно замедленный трек с тяжёлым низом и заметным эхом.",
    params: { speed: 0.65, bassBoost: 60, reverb: 6 },
  },
  {
    id: "slowed",
    label: "SLOWED",
    hint: "Классический slowed + reverb: чуть медленнее, мягкий бас и пространство.",
    params: { speed: 0.8, bassBoost: 45, reverb: 5 },
  },
  {
    id: "normal",
    label: "NORMAL",
    hint: "Исходная скорость без эффектов - удобно сравнить до/после.",
    params: { speed: 1, bassBoost: 0, reverb: 0 },
  },
  {
    id: "speed_up",
    label: "SPEED UP",
    hint: "Ускорение без nightcore-тональности: бодрее ритм, лёгкий бас.",
    params: { speed: 1.15, bassBoost: 15, reverb: 1.5 },
  },
  {
    id: "nightcore",
    label: "NIGHTCORE",
    hint: "Быстрее и выше по тону, лёгкий бас и короткий реверб.",
    params: { speed: 1.35, bassBoost: 25, reverb: 2.5 },
  },
]

export const DEFAULT_SLOWED_REVERB_PARAMS: SlowedReverbParams = {
  presetId: "slowed",
  ...SLOWED_REVERB_PRESETS.find((p) => p.id === "slowed")!.params,
}

export function applySlowedReverbPreset(
  presetId: string,
  prev: SlowedReverbParams
): SlowedReverbParams {
  const preset = SLOWED_REVERB_PRESETS.find((p) => p.id === presetId)
  if (!preset) return prev
  return { presetId: preset.id, ...preset.params }
}

/** Lowshelf gain в dB из процента 0-100. */
export function bassBoostToDb(bassBoost: number): number {
  const t = Math.max(0, Math.min(100, bassBoost)) / 100
  return t * 12
}

/** Wet/dry mix: 0 = сухо, 1 = почти полностью wet. */
export function reverbToWet(reverb: number): number {
  const t = Math.max(0, Math.min(10, reverb)) / 10
  return t * 0.72
}

export function clampSpeed(speed: number): number {
  return Math.min(SLOWED_REVERB_SPEED_MAX, Math.max(SLOWED_REVERB_SPEED_MIN, speed))
}
