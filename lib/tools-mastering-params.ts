export type LoudnessLevel = "low" | "med" | "high"
export type DensityLevel = "low" | "med" | "high"
/** Сглаживание: EQ-срезы резкости/воздуха + мягкий gate в скачивании */
export type SmoothLevel = "off" | "low" | "med" | "high"

export type MasteringParams = {
  presetId: string
  /** Интенсивность характера: 0 = нейтрально, 100 = полный пресет */
  presetAmount: number
  loudness: LoudnessLevel
  density: DensityLevel
  /** Сглаживание резкости, свиста и шипения */
  smooth: SmoothLevel
  outputGainDb: number
  magicMakeup: boolean
  hpfHz: number
  lfShelfDb: number
  /** Peaking mid around ~2 kHz */
  mfPeakDb: number
  hfShelfDb: number
  thresholdDb: number
  ratio: number
  attackMs: number
  releaseMs: number
  ceilingDb: number
  softClip: boolean
  /** Soft-clip / tape drive (0 = linear, ~2.5 default, higher = hotter) */
  saturation: number
  /** Mid/side width: 1 = normal, 0 = mono, >1 = wider */
  stereoWidth: number
  monoBass: boolean
}

export type MasteringPresetTone = Omit<
  MasteringParams,
  | "presetId"
  | "presetAmount"
  | "loudness"
  | "density"
  | "smooth"
  | "outputGainDb"
  | "magicMakeup"
>

export type MasteringPreset = {
  id: string
  label: string
  hint: string
  params: MasteringPresetTone
}

/** Id режима без готового характера: тон задаётся крутилками вручную. */
export const MANUAL_PRESET_ID = "manual"

/** Нейтраль: почти без окраски (0% интенсивности и старт "Без характера"). */
export const PRESET_NEUTRAL: MasteringPresetTone = {
  hpfHz: 20,
  lfShelfDb: 0,
  mfPeakDb: 0,
  hfShelfDb: 0,
  thresholdDb: 0,
  ratio: 1,
  attackMs: 20,
  releaseMs: 160,
  ceilingDb: -0.1,
  softClip: false,
  saturation: 0,
  stereoWidth: 1,
  monoBass: false,
}

export const MASTERING_PRESETS: MasteringPreset[] = [
  {
    id: MANUAL_PRESET_ID,
    label: "Без характера",
    hint: "Без готового стиля: почти исходный звук. Дальше доводите крутилками в тонкой настройке или уровнями выше.",
    params: { ...PRESET_NEUTRAL },
  },
  {
    id: "universal",
    label: "Универсальная",
    hint: "Ровный баланс для большинства треков - хороший старт, если не знаете, что выбрать.",
    params: {
      hpfHz: 30,
      lfShelfDb: 0.4,
      mfPeakDb: 0.2,
      hfShelfDb: 0.6,
      thresholdDb: -18,
      ratio: 2.4,
      attackMs: 15,
      releaseMs: 120,
      ceilingDb: -0.3,
      softClip: true,
      saturation: 2.2,
      stereoWidth: 1,
      monoBass: false,
    },
  },
  {
    id: "fire",
    label: "Огонь",
    hint: "Громче и плотнее, с ярким верхом - для энергичных треков, которые должны 'бить'.",
    params: {
      hpfHz: 28,
      lfShelfDb: 1.2,
      mfPeakDb: 0.8,
      hfShelfDb: 1.4,
      thresholdDb: -14,
      ratio: 3.8,
      attackMs: 6,
      releaseMs: 90,
      ceilingDb: -0.1,
      softClip: true,
      saturation: 3.2,
      stereoWidth: 1.05,
      monoBass: true,
    },
  },
  {
    id: "clarity",
    label: "Четкость",
    hint: "Больше воздуха и деталей в верхах - вокал и инструменты звучат яснее.",
    params: {
      hpfHz: 35,
      lfShelfDb: -0.3,
      mfPeakDb: 0.5,
      hfShelfDb: 2.2,
      thresholdDb: -19,
      ratio: 2.2,
      attackMs: 12,
      releaseMs: 100,
      ceilingDb: -0.3,
      softClip: true,
      saturation: 1.8,
      stereoWidth: 1.1,
      monoBass: false,
    },
  },
  {
    id: "tape",
    label: "Лента",
    hint: "Тёплый 'аналоговый' характер: плотнее низ, мягче самые верха, лёгкая насыщенность.",
    params: {
      hpfHz: 32,
      lfShelfDb: 1.8,
      mfPeakDb: 0.4,
      hfShelfDb: -1.2,
      thresholdDb: -17,
      ratio: 2.6,
      attackMs: 25,
      releaseMs: 160,
      ceilingDb: -0.4,
      softClip: true,
      saturation: 3.8,
      stereoWidth: 0.95,
      monoBass: false,
    },
  },
  {
    id: "natural",
    label: "Естественность",
    hint: "Почти без окраски - аккуратная громкость, минимум обработки.",
    params: {
      hpfHz: 40,
      lfShelfDb: 0.1,
      mfPeakDb: 0,
      hfShelfDb: 0.3,
      thresholdDb: -21,
      ratio: 1.8,
      attackMs: 22,
      releaseMs: 180,
      ceilingDb: -0.5,
      softClip: false,
      saturation: 0,
      stereoWidth: 1,
      monoBass: false,
    },
  },
  {
    id: "space",
    label: "Пространство",
    hint: "Шире стерео и больше воздуха - трек звучит объёмнее в наушниках и колонках.",
    params: {
      hpfHz: 30,
      lfShelfDb: 0.2,
      mfPeakDb: -0.2,
      hfShelfDb: 1.5,
      thresholdDb: -19,
      ratio: 2.2,
      attackMs: 18,
      releaseMs: 140,
      ceilingDb: -0.3,
      softClip: true,
      saturation: 1.6,
      stereoWidth: 1.45,
      monoBass: true,
    },
  },
  {
    id: "cinematic",
    label: "Кинематографичность",
    hint: "Глубже низ и мягкая динамика - более 'киношный', атмосферный характер.",
    params: {
      hpfHz: 28,
      lfShelfDb: 2,
      mfPeakDb: 0.3,
      hfShelfDb: 0.8,
      thresholdDb: -20,
      ratio: 2,
      attackMs: 28,
      releaseMs: 200,
      ceilingDb: -0.4,
      softClip: true,
      saturation: 2.4,
      stereoWidth: 1.2,
      monoBass: false,
    },
  },
  {
    id: "sparkle",
    label: "Изюминка",
    hint: "Яркий характер с акцентом на середине и верхах - трек заметнее в плейлисте.",
    params: {
      hpfHz: 32,
      lfShelfDb: 0.6,
      mfPeakDb: 1,
      hfShelfDb: 2,
      thresholdDb: -16,
      ratio: 3,
      attackMs: 8,
      releaseMs: 100,
      ceilingDb: -0.2,
      softClip: true,
      saturation: 2.8,
      stereoWidth: 1.15,
      monoBass: false,
    },
  },
]

export const DEFAULT_MASTERING_PARAMS: MasteringParams = {
  presetId: MANUAL_PRESET_ID,
  presetAmount: 0,
  loudness: "med",
  density: "med",
  smooth: "off",
  outputGainDb: 0,
  magicMakeup: true,
  ...PRESET_NEUTRAL,
}

export function isManualPreset(presetId: string): boolean {
  return presetId === MANUAL_PRESET_ID
}

/** Поля тона, которые задаёт характер (или ручные крутилки). */
export const MASTERING_TONE_KEYS = [
  "hpfHz",
  "lfShelfDb",
  "mfPeakDb",
  "hfShelfDb",
  "thresholdDb",
  "ratio",
  "attackMs",
  "releaseMs",
  "ceilingDb",
  "softClip",
  "saturation",
  "stereoWidth",
  "monoBass",
] as const satisfies ReadonlyArray<keyof MasteringPresetTone>

export function patchTouchesTone(patch: Partial<MasteringParams>): boolean {
  return MASTERING_TONE_KEYS.some((key) => patch[key] !== undefined)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Смешать нейтраль и пресет. amountPct: 0…100. */
export function blendPresetTone(preset: MasteringPresetTone, amountPct: number): MasteringPresetTone {
  const t = Math.min(1, Math.max(0, amountPct / 100))
  const n = PRESET_NEUTRAL
  return {
    hpfHz: lerp(n.hpfHz, preset.hpfHz, t),
    lfShelfDb: lerp(n.lfShelfDb, preset.lfShelfDb, t),
    mfPeakDb: lerp(n.mfPeakDb, preset.mfPeakDb, t),
    hfShelfDb: lerp(n.hfShelfDb, preset.hfShelfDb, t),
    thresholdDb: lerp(n.thresholdDb, preset.thresholdDb, t),
    ratio: lerp(n.ratio, preset.ratio, t),
    attackMs: lerp(n.attackMs, preset.attackMs, t),
    releaseMs: lerp(n.releaseMs, preset.releaseMs, t),
    ceilingDb: lerp(n.ceilingDb, preset.ceilingDb, t),
    saturation: lerp(n.saturation, preset.saturation, t),
    stereoWidth: lerp(n.stereoWidth, preset.stereoWidth, t),
    softClip: t >= 0.4 ? preset.softClip : n.softClip,
    monoBass: t >= 0.55 ? preset.monoBass : n.monoBass,
  }
}

/** EQ + soft gate for "Сглаживание". Cuts only - no compressor makeup. */
export function smoothSettings(level: SmoothLevel): {
  enabled: boolean
  /** Peaking cut around presence / harshness (~3.5 kHz) */
  harshGainDb: number
  /** High-shelf cut for air / sibilance (~7 kHz) */
  airShelfDb: number
  /** Gentle lowpass; null = bypass (near Nyquist) */
  airLpHz: number | null
  gateThresholdDb: number
  gateRatio: number
} {
  if (level === "off") {
    return {
      enabled: false,
      harshGainDb: 0,
      airShelfDb: 0,
      airLpHz: null,
      gateThresholdDb: -90,
      gateRatio: 1,
    }
  }
  if (level === "low") {
    return {
      enabled: true,
      harshGainDb: -1.4,
      airShelfDb: -2.2,
      airLpHz: 14000,
      gateThresholdDb: -52,
      gateRatio: 1.35,
    }
  }
  if (level === "high") {
    return {
      enabled: true,
      harshGainDb: -3.2,
      airShelfDb: -5.5,
      airLpHz: 9000,
      gateThresholdDb: -42,
      gateRatio: 2.1,
    }
  }
  return {
    enabled: true,
    harshGainDb: -2.2,
    airShelfDb: -3.6,
    airLpHz: 11500,
    gateThresholdDb: -48,
    gateRatio: 1.65,
  }
}

export function applyPreset(
  presetId: string,
  current: MasteringParams,
  amountPct: number = current.presetAmount
): MasteringParams {
  const preset = MASTERING_PRESETS.find((p) => p.id === presetId)
  if (!preset || isManualPreset(preset.id)) {
    return {
      ...current,
      presetId: MANUAL_PRESET_ID,
      presetAmount: 0,
      ...PRESET_NEUTRAL,
    }
  }
  const amount = Math.min(100, Math.max(0, amountPct))
  return {
    ...current,
    presetId: preset.id,
    presetAmount: amount,
    ...blendPresetTone(preset.params, amount),
  }
}

/** Только крутилка интенсивности - пересчитывает тон текущего характера. */
export function applyPresetAmount(current: MasteringParams, amountPct: number): MasteringParams {
  if (isManualPreset(current.presetId)) {
    return { ...current, presetAmount: Math.min(100, Math.max(0, amountPct)) }
  }
  return applyPreset(current.presetId, current, amountPct)
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
