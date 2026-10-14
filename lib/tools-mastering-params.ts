export type LoudnessLevel = "low" | "med" | "high"
export type DensityLevel = "low" | "med" | "high"

export type MasteringParams = {
  presetId: string
  loudness: LoudnessLevel
  density: DensityLevel
  outputGainDb: number
  magicMakeup: boolean
  hpfHz: number
  lfShelfDb: number
  hfShelfDb: number
  thresholdDb: number
  ratio: number
  attackMs: number
  releaseMs: number
  ceilingDb: number
  softClip: boolean
  monoBass: boolean
}

export type MasteringPreset = {
  id: string
  label: string
  params: Omit<MasteringParams, "presetId" | "loudness" | "density" | "outputGainDb" | "magicMakeup">
}

export const MASTERING_PRESETS: MasteringPreset[] = [
  {
    id: "universal",
    label: "Universal",
    params: {
      hpfHz: 30,
      lfShelfDb: 0.5,
      hfShelfDb: 0.8,
      thresholdDb: -18,
      ratio: 2.5,
      attackMs: 15,
      releaseMs: 120,
      ceilingDb: -0.3,
      softClip: true,
      monoBass: false,
    },
  },
  {
    id: "pop",
    label: "Pop",
    params: {
      hpfHz: 35,
      lfShelfDb: 1.2,
      hfShelfDb: 1.5,
      thresholdDb: -16,
      ratio: 3,
      attackMs: 10,
      releaseMs: 90,
      ceilingDb: -0.2,
      softClip: true,
      monoBass: true,
    },
  },
  {
    id: "hiphop",
    label: "Hip-Hop",
    params: {
      hpfHz: 28,
      lfShelfDb: 2,
      hfShelfDb: 0.5,
      thresholdDb: -14,
      ratio: 3.5,
      attackMs: 8,
      releaseMs: 140,
      ceilingDb: -0.2,
      softClip: true,
      monoBass: true,
    },
  },
  {
    id: "electronic",
    label: "Electronic",
    params: {
      hpfHz: 32,
      lfShelfDb: 1.5,
      hfShelfDb: 1.8,
      thresholdDb: -15,
      ratio: 4,
      attackMs: 5,
      releaseMs: 80,
      ceilingDb: -0.1,
      softClip: true,
      monoBass: true,
    },
  },
  {
    id: "rock",
    label: "Rock",
    params: {
      hpfHz: 40,
      lfShelfDb: 0.8,
      hfShelfDb: 1.2,
      thresholdDb: -17,
      ratio: 2.8,
      attackMs: 12,
      releaseMs: 110,
      ceilingDb: -0.3,
      softClip: true,
      monoBass: false,
    },
  },
  {
    id: "acoustic",
    label: "Acoustic",
    params: {
      hpfHz: 45,
      lfShelfDb: 0.2,
      hfShelfDb: 0.6,
      thresholdDb: -20,
      ratio: 2,
      attackMs: 20,
      releaseMs: 180,
      ceilingDb: -0.5,
      softClip: false,
      monoBass: false,
    },
  },
]

export const DEFAULT_MASTERING_PARAMS: MasteringParams = {
  presetId: "universal",
  loudness: "med",
  density: "med",
  outputGainDb: 0,
  magicMakeup: true,
  ...MASTERING_PRESETS[0].params,
}

export function applyPreset(presetId: string, current: MasteringParams): MasteringParams {
  const preset = MASTERING_PRESETS.find((p) => p.id === presetId) ?? MASTERING_PRESETS[0]
  return {
    ...current,
    presetId: preset.id,
    ...preset.params,
  }
}

/** Целевой RMS (дБ относительно full scale) для Magic Makeup. */
export function targetRmsDb(loudness: LoudnessLevel): number {
  if (loudness === "low") return -16
  if (loudness === "high") return -10
  return -12.5
}

/** Модификаторы компрессора по density. */
export function densityCompTweaks(density: DensityLevel): {
  thresholdAdd: number
  ratioMul: number
} {
  if (density === "low") return { thresholdAdd: -3, ratioMul: 0.75 }
  if (density === "high") return { thresholdAdd: 3, ratioMul: 1.35 }
  return { thresholdAdd: 0, ratioMul: 1 }
}
