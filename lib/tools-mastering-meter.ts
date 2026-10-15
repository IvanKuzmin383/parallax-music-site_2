/** Live loudness / peak tap for mastering preview (approx. BS.1770 K-weight + oversamped peak). */

export type MeterReading = {
  /** Momentary-ish LUFS (short window from Analyser) */
  lufs: number
  /** Oversampled peak, dBTP-ish */
  truePeakDb: number
}

const SILENT: MeterReading = { lufs: -70, truePeakDb: -70 }
const OVERSAMPLE = 4

function createKWeightChain(ctx: BaseAudioContext): {
  input: GainNode
  output: BiquadFilterNode
} {
  const input = ctx.createGain()
  // BS.1770-ish pre-filter (high shelf) + RLB highpass
  const shelf = ctx.createBiquadFilter()
  shelf.type = "highshelf"
  shelf.frequency.value = 1500
  shelf.gain.value = 4
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 38
  hp.Q.value = 0.5
  input.connect(shelf)
  shelf.connect(hp)
  return { input, output: hp }
}

function truePeakFromBuffer(buf: Float32Array): number {
  let peak = 0
  const n = buf.length
  if (n === 0) return 0
  for (let i = 0; i < n; i++) {
    const a = Math.abs(buf[i]!)
    if (a > peak) peak = a
  }
  // 4x linear oversample between consecutive samples
  for (let i = 0; i < n - 1; i++) {
    const s0 = buf[i]!
    const s1 = buf[i + 1]!
    for (let k = 1; k < OVERSAMPLE; k++) {
      const t = k / OVERSAMPLE
      const s = s0 + (s1 - s0) * t
      const a = Math.abs(s)
      if (a > peak) peak = a
    }
  }
  return peak
}

export type MeterTap = {
  input: GainNode
  read: () => MeterReading
  dispose: () => void
}

export function createMeterTap(ctx: BaseAudioContext): MeterTap {
  const k = createKWeightChain(ctx)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 8192
  analyser.smoothingTimeConstant = 0.35
  k.output.connect(analyser)

  const timeBuf = new Float32Array(analyser.fftSize)

  const read = (): MeterReading => {
    analyser.getFloatTimeDomainData(timeBuf)
    let sum = 0
    for (let i = 0; i < timeBuf.length; i++) {
      const s = timeBuf[i]!
      sum += s * s
    }
    const ms = sum / timeBuf.length
    // ITU-R BS.1770 constant for mean-square → LUFS (mono/downmix approx.)
    const lufs = ms > 1e-12 ? -0.691 + 10 * Math.log10(ms) : -70
    const peak = truePeakFromBuffer(timeBuf)
    const truePeakDb = peak > 1e-12 ? 20 * Math.log10(peak) : -70
    return {
      lufs: Math.max(-70, Math.min(3, lufs)),
      truePeakDb: Math.max(-70, Math.min(6, truePeakDb)),
    }
  }

  const dispose = () => {
    try {
      k.input.disconnect()
      k.output.disconnect()
      analyser.disconnect()
    } catch {
      /* ignore */
    }
  }

  return { input: k.input, read, dispose }
}

export function silentMeterReading(): MeterReading {
  return { ...SILENT }
}

/** Map LUFS (−40…0) → 0…1 for bar fill. */
export function lufsBarLevel(lufs: number): number {
  const min = -40
  const max = 0
  return Math.min(1, Math.max(0, (lufs - min) / (max - min)))
}

/** Map true peak (−24…+3 dBTP) → 0…1 for bar fill. */
export function truePeakBarLevel(dbtp: number): number {
  const min = -24
  const max = 3
  return Math.min(1, Math.max(0, (dbtp - min) / (max - min)))
}

export function formatLufs(lufs: number, live: boolean): string {
  if (!live || lufs <= -69) return "—"
  return `${lufs.toFixed(1)} LUFS`
}

export function formatTruePeak(dbtp: number, live: boolean): string {
  if (!live || dbtp <= -69) return "—"
  const sign = dbtp > 0 ? "+" : ""
  return `${sign}${dbtp.toFixed(1)} dBTP`
}
