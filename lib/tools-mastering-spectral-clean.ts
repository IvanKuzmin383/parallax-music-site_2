/**
 * Собственная спектральная очистка для режима AI-треков в онлайн-мастеринге.
 * Реализация с нуля (STFT + linked-маска). Не зависит от сторонних репозиториев.
 */

export const AI_CLEAN_PRESET_ID = "ai_clean"

export function isAiCleanPreset(presetId: string): boolean {
  return presetId === AI_CLEAN_PRESET_ID
}

/** Лимиты, чтобы длинный трек не повесил вкладку / не убил телефон. */
export const AI_CLEAN_LIMITS = {
  /** Макс. длительность исходника для спектральной очистки. */
  maxDurationSec: 7 * 60,
  nFft: 2048,
  hop: 512,
  quietFraction: 0.12,
  /** Ниже этой частоты маска не режет (бас). */
  bassProtectHz: 350,
  /** Сила в середине (от bassProtect до midEndHz). */
  strengthMid: 0.3,
  midEndHz: 2000,
  /** К этой частоте сила доходит до 1. */
  strengthFullHz: 10_000,
  maxAttenDb: 7,
  oversubtraction: 1.2,
  /** Mono side для баса в этом режиме. */
  monoBassHz: 150,
} as const

export type SpectralCleanProgress = {
  phase: "profile" | "mask" | "rebuild"
  /** 0…1 */
  ratio: number
}

export type SpectralCleanInput = {
  sampleRate: number
  /** planar: [ch0..., ch1...] или один канал */
  channels: Float32Array[]
}

export type SpectralCleanResult = {
  channels: Float32Array[]
  sampleRate: number
}

export type SpectralCleanWorkerRequest = {
  type: "clean"
  sampleRate: number
  channels: Float32Array[]
}

export type SpectralCleanWorkerResponse =
  | { type: "progress"; phase: SpectralCleanProgress["phase"]; ratio: number }
  | { type: "done"; channels: Float32Array[]; sampleRate: number }
  | { type: "error"; message: string }

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Сила очистки по частоте: 0 ниже bassProtect, mid на 350-2k, 1 к 10 kHz. */
export function spectralCleanStrength(freqHz: number): number {
  const { bassProtectHz, strengthMid, midEndHz, strengthFullHz } = AI_CLEAN_LIMITS
  if (freqHz < bassProtectHz) return 0
  if (freqHz <= midEndHz) return strengthMid
  if (freqHz >= strengthFullHz) return 1
  const t = (freqHz - midEndHz) / (strengthFullHz - midEndHz)
  return strengthMid + (1 - strengthMid) * clamp(t, 0, 1)
}

export function assertAiCleanDurationOk(durationSec: number): void {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error("Некорректная длительность файла")
  }
  if (durationSec > AI_CLEAN_LIMITS.maxDurationSec) {
    const maxMin = Math.round(AI_CLEAN_LIMITS.maxDurationSec / 60)
    throw new Error(
      `Для режима очистки AI-треков файл длиннее ${maxMin} мин. Обрежьте трек или выберите другой характер.`
    )
  }
}

/** In-place radix-2 FFT. real/imag length = n (power of 2). */
export function fftRadix2(real: Float64Array, imag: Float64Array, inverse: boolean): void {
  const n = real.length
  if (n === 0 || (n & (n - 1)) !== 0) {
    throw new Error("FFT size must be power of 2")
  }
  // bit reverse
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = real[i]
      real[i] = real[j]
      real[j] = tr
      const ti = imag[i]
      imag[i] = imag[j]
      imag[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len
    const wlenRe = Math.cos(ang)
    const wlenIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let wRe = 1
      let wIm = 0
      for (let j = 0; j < len / 2; j++) {
        const uRe = real[i + j]
        const uIm = imag[i + j]
        const vRe = real[i + j + len / 2] * wRe - imag[i + j + len / 2] * wIm
        const vIm = real[i + j + len / 2] * wIm + imag[i + j + len / 2] * wRe
        real[i + j] = uRe + vRe
        imag[i + j] = uIm + vIm
        real[i + j + len / 2] = uRe - vRe
        imag[i + j + len / 2] = uIm - vIm
        const nwRe = wRe * wlenRe - wIm * wlenIm
        wIm = wRe * wlenIm + wIm * wlenRe
        wRe = nwRe
      }
    }
  }
  if (inverse) {
    const inv = 1 / n
    for (let i = 0; i < n; i++) {
      real[i] *= inv
      imag[i] *= inv
    }
  }
}

function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n)
  if (n === 1) {
    w[0] = 1
    return w
  }
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
  }
  return w
}

function smooth1dInPlace(data: Float64Array, taps: number): void {
  if (taps < 2) return
  const n = data.length
  const tmp = new Float64Array(n)
  const half = Math.floor(taps / 2)
  for (let i = 0; i < n; i++) {
    let sum = 0
    let count = 0
    for (let k = -half; k <= half; k++) {
      const j = i + k
      if (j < 0 || j >= n) continue
      sum += data[j]
      count++
    }
    tmp[i] = count > 0 ? sum / count : data[i]
  }
  data.set(tmp)
}

function fillWindowedFrame(
  data: Float32Array,
  start: number,
  length: number,
  window: Float64Array,
  re: Float64Array,
  im: Float64Array
): void {
  const nFft = window.length
  re.fill(0)
  im.fill(0)
  for (let i = 0; i < nFft; i++) {
    const idx = start + i
    const s = idx < length ? data[idx] : 0
    re[i] = s * window[i]
  }
}

function bandEnergy(
  data: Float32Array,
  start: number,
  length: number,
  window: Float64Array,
  firstBin: number,
  bins: number,
  re: Float64Array,
  im: Float64Array
): number {
  fillWindowedFrame(data, start, length, window, re, im)
  fftRadix2(re, im, false)
  let e = 0
  for (let b = firstBin; b < bins; b++) {
    const m = Math.hypot(re[b], im[b])
    e += m * m
  }
  return e
}

/**
 * Linked stereo spectral clean. Streaming STFT (O(n) память, без хранения всех кадров).
 * Progress is best-effort (safe to call from worker).
 */
export function applySpectralClean(
  input: SpectralCleanInput,
  onProgress?: (p: SpectralCleanProgress) => void
): SpectralCleanResult {
  const { sampleRate } = input
  if (!Number.isFinite(sampleRate) || sampleRate < 8000) {
    throw new Error("Некорректная частота дискретизации")
  }
  const chCount = input.channels.length
  if (chCount < 1) throw new Error("Нет аудиоканалов")

  const length = input.channels[0].length
  for (let c = 1; c < chCount; c++) {
    if (input.channels[c].length !== length) {
      throw new Error("Каналы разной длины")
    }
  }

  const durationSec = length / sampleRate
  assertAiCleanDurationOk(durationSec)

  const { nFft, hop, quietFraction, oversubtraction, maxAttenDb, bassProtectHz } = AI_CLEAN_LIMITS
  const minGain = Math.pow(10, -maxAttenDb / 20)
  const bins = nFft / 2 + 1
  const window = hannWindow(nFft)
  const frameCount =
    length <= nFft ? 1 : Math.max(1, Math.floor((length - nFft) / hop) + 1)
  const hasRight = chCount >= 2
  const left = input.channels[0]
  const right = hasRight ? input.channels[1] : null
  const firstBin = Math.min(bins - 1, Math.ceil((bassProtectHz * nFft) / sampleRate))
  const re = new Float64Array(nFft)
  const im = new Float64Array(nFft)
  const eps = 1e-12

  onProgress?.({ phase: "profile", ratio: 0.05 })

  // Pass 1: frame energies (linked mid)
  const energies = new Float64Array(frameCount)
  for (let f = 0; f < frameCount; f++) {
    const start = Math.min(f * hop, Math.max(0, length - nFft))
    const el = bandEnergy(left, start, length, window, firstBin, bins, re, im)
    const er = right
      ? bandEnergy(right, start, length, window, firstBin, bins, re, im)
      : el
    energies[f] = 0.5 * (el + er)
    if (f % 64 === 0) {
      onProgress?.({ phase: "profile", ratio: 0.05 + 0.2 * (f / frameCount) })
    }
  }

  const order = Array.from({ length: frameCount }, (_, i) => i)
  order.sort((a, b) => energies[a] - energies[b])
  const quietCount = Math.max(1, Math.floor(frameCount * quietFraction))

  // Pass 1b: noise profile from quietest frames
  const noise = new Float64Array(bins)
  const magL = new Float64Array(bins)
  const magR = new Float64Array(bins)
  for (let q = 0; q < quietCount; q++) {
    const f = order[q]
    const start = Math.min(f * hop, Math.max(0, length - nFft))
    fillWindowedFrame(left, start, length, window, re, im)
    fftRadix2(re, im, false)
    for (let b = 0; b < bins; b++) magL[b] = Math.hypot(re[b], im[b])
    if (right) {
      fillWindowedFrame(right, start, length, window, re, im)
      fftRadix2(re, im, false)
      for (let b = 0; b < bins; b++) magR[b] = Math.hypot(re[b], im[b])
    }
    for (let b = 0; b < bins; b++) {
      const mid = right ? 0.5 * (magL[b] + magR[b]) : magL[b]
      noise[b] += mid
    }
  }
  for (let b = 0; b < bins; b++) noise[b] /= quietCount

  onProgress?.({ phase: "mask", ratio: 0.3 })

  // Pass 2: streaming ISTFT with EMA time-smoothing of gains
  const outL = new Float32Array(length)
  const normL = new Float32Array(length)
  const outR = hasRight ? new Float32Array(length) : null
  const normR = hasRight ? new Float32Array(length) : null
  const gain = new Float64Array(bins)
  const gainSmooth = new Float64Array(bins)
  gainSmooth.fill(1)
  const strengthByBin = new Float64Array(bins)
  for (let b = 0; b < bins; b++) {
    strengthByBin[b] = spectralCleanStrength((b * sampleRate) / nFft)
  }
  const timeSmooth = 0.35

  const accumulateFromSpectrum = (out: Float32Array, norm: Float32Array, start: number) => {
    for (let b = 1; b < bins - 1; b++) {
      re[nFft - b] = re[b]
      im[nFft - b] = -im[b]
    }
    fftRadix2(re, im, true)
    for (let i = 0; i < nFft; i++) {
      const idx = start + i
      if (idx >= length) break
      const w = window[i]
      out[idx] += re[i] * w
      norm[idx] += w * w
    }
  }

  for (let f = 0; f < frameCount; f++) {
    const start = Math.min(f * hop, Math.max(0, length - nFft))

    fillWindowedFrame(left, start, length, window, re, im)
    fftRadix2(re, im, false)
    for (let b = 0; b < bins; b++) magL[b] = Math.hypot(re[b], im[b])

    if (right) {
      // stash left spectrum
      const leftRe = re.slice(0, bins)
      const leftIm = im.slice(0, bins)
      fillWindowedFrame(right, start, length, window, re, im)
      fftRadix2(re, im, false)
      for (let b = 0; b < bins; b++) magR[b] = Math.hypot(re[b], im[b])

      for (let b = 0; b < bins; b++) {
        const mid = 0.5 * (magL[b] + magR[b])
        const raw = 1 - (oversubtraction * noise[b]) / Math.max(mid, eps)
        const target = clamp(raw, minGain, 1)
        gain[b] = 1 + (target - 1) * strengthByBin[b]
      }
      smooth1dInPlace(gain, 5)
      for (let b = 0; b < bins; b++) {
        gainSmooth[b] = gainSmooth[b] * (1 - timeSmooth) + gain[b] * timeSmooth
      }

      for (let b = 0; b < bins; b++) {
        re[b] *= gainSmooth[b]
        im[b] *= gainSmooth[b]
      }
      accumulateFromSpectrum(outR!, normR!, start)

      re.fill(0)
      im.fill(0)
      for (let b = 0; b < bins; b++) {
        re[b] = leftRe[b] * gainSmooth[b]
        im[b] = leftIm[b] * gainSmooth[b]
      }
      accumulateFromSpectrum(outL, normL, start)
    } else {
      for (let b = 0; b < bins; b++) {
        const raw = 1 - (oversubtraction * noise[b]) / Math.max(magL[b], eps)
        const target = clamp(raw, minGain, 1)
        gain[b] = 1 + (target - 1) * strengthByBin[b]
      }
      smooth1dInPlace(gain, 5)
      for (let b = 0; b < bins; b++) {
        gainSmooth[b] = gainSmooth[b] * (1 - timeSmooth) + gain[b] * timeSmooth
        re[b] *= gainSmooth[b]
        im[b] *= gainSmooth[b]
      }
      accumulateFromSpectrum(outL, normL, start)
    }

    if (f % 32 === 0) {
      onProgress?.({
        phase: f < frameCount * 0.9 ? "mask" : "rebuild",
        ratio: 0.3 + 0.7 * (f / frameCount),
      })
    }
  }

  for (let i = 0; i < length; i++) {
    const n = normL[i]
    outL[i] = n > 1e-8 ? outL[i] / n : 0
  }
  if (outR && normR) {
    for (let i = 0; i < length; i++) {
      const n = normR[i]
      outR[i] = n > 1e-8 ? outR[i] / n : 0
    }
  }

  const outChannels: Float32Array[] = [outL]
  if (outR) outChannels.push(outR)
  for (let c = 2; c < chCount; c++) {
    outChannels.push(new Float32Array(input.channels[c]))
  }

  onProgress?.({ phase: "rebuild", ratio: 1 })
  return { channels: outChannels, sampleRate }
}

/** Короткая оценка длительности без декода всего файла (по AudioBuffer). */
export function audioBufferDurationSec(buffer: { length: number; sampleRate: number }): number {
  if (!buffer.sampleRate) return 0
  return buffer.length / buffer.sampleRate
}
