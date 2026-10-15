import { smoothSettings, type SmoothLevel } from "@/lib/tools-mastering-params"

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

/** WaveShaperNode.curve expects Float32Array backed by ArrayBuffer (not SharedArrayBuffer). */
export function softClipCurve(amount = 2.5): Float32Array<ArrayBuffer> {
  const drive = Math.max(0.01, amount)
  const n = 2048
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive)
  }
  return curve as Float32Array<ArrayBuffer>
}

export function linearCurve(): Float32Array<ArrayBuffer> {
  const linear = new Float32Array(2) as Float32Array<ArrayBuffer>
  linear[0] = -1
  linear[1] = 1
  return linear
}

/**
 * Mid/side stereo width.
 * width = 0 → mono, 1 → untouched, >1 → wider sides.
 */
export function applyStereoWidth(buffer: AudioBuffer, width: number): void {
  if (buffer.numberOfChannels < 2) return
  const w = Math.max(0, Math.min(2.5, width))
  if (Math.abs(w - 1) < 0.001) return

  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const midGain = 1
  const sideGain = w

  for (let i = 0; i < left.length; i++) {
    const l = left[i]
    const r = right[i]
    const mid = (l + r) * 0.5
    const side = (l - r) * 0.5
    left[i] = mid * midGain + side * sideGain
    right[i] = mid * midGain - side * sideGain
  }
}

export function applyMonoBass(buffer: AudioBuffer, sampleRate: number, cutoffHz = 120): void {
  if (buffer.numberOfChannels < 2) return
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const rc = 1 / (2 * Math.PI * cutoffHz)
  const dt = 1 / sampleRate
  const alpha = dt / (rc + dt)
  let lpL = 0
  let lpR = 0
  for (let i = 0; i < left.length; i++) {
    lpL += alpha * (left[i] - lpL)
    lpR += alpha * (right[i] - lpR)
    const mono = (lpL + lpR) * 0.5
    const hpL = left[i] - lpL
    const hpR = right[i] - lpR
    left[i] = mono + hpL
    right[i] = mono + hpR
  }
}

export function applySoftClipAndCeiling(
  buffer: AudioBuffer,
  ceilingDb: number,
  softClip: boolean,
  saturation = 2.5
): void {
  const ceiling = dbToLinear(Math.min(0, ceilingDb))
  const softStart = ceiling * 0.85
  const drive = Math.max(0.5, saturation)
  const channels = buffer.numberOfChannels
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      let s = data[i]
      if (softClip && Math.abs(s) > softStart) {
        const sign = s < 0 ? -1 : 1
        const over = Math.abs(s) - softStart
        const room = Math.max(1e-6, ceiling - softStart)
        s = sign * (softStart + room * Math.tanh((over / room) * (drive / 2.5)))
      }
      if (s > ceiling) s = ceiling
      if (s < -ceiling) s = -ceiling
      data[i] = s
    }
  }
}

/**
 * Мягкий downward-expander: тише паузы и шипение ниже порога.
 * Для offline (и при желании post-process); в live - через multiband.
 */
export function applySoftNoiseGate(
  buffer: AudioBuffer,
  thresholdDb: number,
  ratio: number
): void {
  if (ratio <= 1.01) return
  const thr = dbToLinear(Math.max(-80, Math.min(-20, thresholdDb)))
  const exp = Math.max(1, ratio - 1)
  const channels = buffer.numberOfChannels
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      const s = data[i]
      const abs = Math.abs(s)
      if (abs >= thr || abs < 1e-9) continue
      const norm = abs / thr
      const gain = Math.pow(norm, exp)
      data[i] = s * gain
    }
  }
}

/**
 * Сглаживание: только срезы EQ (резкость + воздух) + мягкий LP.
 * Без split/compressor - у DynamicsCompressor в Web Audio makeup усиливал верха.
 */
export function createSmoothingChain(ctx: BaseAudioContext): {
  input: GainNode
  output: GainNode
  setLevel: (level: SmoothLevel) => void
} {
  const input = ctx.createGain()
  const output = ctx.createGain()

  const harshPeak = ctx.createBiquadFilter()
  harshPeak.type = "peaking"
  harshPeak.frequency.value = 3500
  harshPeak.Q.value = 1.2
  harshPeak.gain.value = 0

  const airShelf = ctx.createBiquadFilter()
  airShelf.type = "highshelf"
  airShelf.frequency.value = 7000
  airShelf.Q.value = 0.7
  airShelf.gain.value = 0

  const airLp = ctx.createBiquadFilter()
  airLp.type = "lowpass"
  airLp.Q.value = 0.707
  const bypassLpHz = Math.min(20000, Math.max(18000, (ctx.sampleRate || 44100) * 0.45))
  airLp.frequency.value = bypassLpHz

  input.connect(harshPeak)
  harshPeak.connect(airShelf)
  airShelf.connect(airLp)
  airLp.connect(output)

  const setLevel = (level: SmoothLevel) => {
    const s = smoothSettings(level)
    if (!s.enabled) {
      harshPeak.gain.value = 0
      airShelf.gain.value = 0
      airLp.frequency.value = bypassLpHz
      return
    }
    harshPeak.gain.value = s.harshGainDb
    airShelf.gain.value = s.airShelfDb
    airLp.frequency.value = s.airLpHz ?? bypassLpHz
  }

  setLevel("off")
  return { input, output, setLevel }
}

/**
 * Live mid/side widener: input → output.
 * width 1 ≈ bypass (still through graph for stable topology).
 */
export function createStereoWidener(ctx: BaseAudioContext): {
  input: GainNode
  output: GainNode
  setWidth: (width: number) => void
} {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const splitter = ctx.createChannelSplitter(2)
  const merger = ctx.createChannelMerger(2)

  const mid = ctx.createGain()
  const side = ctx.createGain()
  const invertR = ctx.createGain()
  invertR.gain.value = -1
  const invertSideToR = ctx.createGain()
  invertSideToR.gain.value = -1

  input.connect(splitter)

  // Mid = L + R
  splitter.connect(mid, 0)
  splitter.connect(mid, 1)

  // Side = L - R
  splitter.connect(side, 0)
  splitter.connect(invertR, 1)
  invertR.connect(side)

  // L = Mid + Side, R = Mid - Side
  mid.connect(merger, 0, 0)
  mid.connect(merger, 0, 1)
  side.connect(merger, 0, 0)
  side.connect(invertSideToR)
  invertSideToR.connect(merger, 0, 1)

  merger.connect(output)

  const setWidth = (width: number) => {
    const w = Math.max(0, Math.min(2.5, width))
    // Unity at w=1 when mid=0.5 and side=0.5
    mid.gain.value = 0.5
    side.gain.value = 0.5 * w
  }
  setWidth(1)

  return { input, output, setWidth }
}
