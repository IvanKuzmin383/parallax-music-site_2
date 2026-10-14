import {
  densityCompTweaks,
  targetRmsDb,
  type MasteringParams,
} from "@/lib/tools-mastering-params"

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

function measureRms(buffer: AudioBuffer): number {
  const channels = buffer.numberOfChannels
  const length = buffer.length
  let sum = 0
  let count = 0
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      const s = data[i]
      sum += s * s
      count++
    }
  }
  if (count === 0) return 0
  return Math.sqrt(sum / count)
}

/** WaveShaperNode.curve expects Float32Array backed by ArrayBuffer (not SharedArrayBuffer). */
function softClipCurve(amount = 2.5): Float32Array<ArrayBuffer> {
  const n = 2048
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount)
  }
  return curve as Float32Array<ArrayBuffer>
}

export type MasteringLoadProgress = {
  phase: "reading" | "decoding" | "ready"
  percent: number
}

export type AbMode = "A" | "B"

/**
 * Live Web Audio graph for preview / A-B.
 * Soft-clip and mono-bass are approximated (full exact path is offline render for download).
 */
export class LiveMasteringEngine {
  private ctx: AudioContext | null = null
  private buffer: AudioBuffer | null = null
  private source: AudioBufferSourceNode | null = null
  private dryGain: GainNode | null = null
  private wetGain: GainNode | null = null
  private hpf: BiquadFilterNode | null = null
  private lf: BiquadFilterNode | null = null
  private hf: BiquadFilterNode | null = null
  private comp: DynamicsCompressorNode | null = null
  private makeup: GainNode | null = null
  private softClip: WaveShaperNode | null = null
  private ceiling: GainNode | null = null
  private startedAt = 0
  private offset = 0
  private playing = false
  private ab: AbMode = "B"
  private inputRmsDb = -20

  get isPlaying() {
    return this.playing
  }

  get abMode() {
    return this.ab
  }

  get duration() {
    return this.buffer?.duration ?? 0
  }

  get currentTime() {
    if (!this.ctx || !this.playing) return this.offset
    return Math.min(this.duration, this.offset + (this.ctx.currentTime - this.startedAt))
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume()
    }
    return this.ctx
  }

  async loadFile(
    file: File,
    onProgress?: (p: MasteringLoadProgress) => void
  ): Promise<void> {
    onProgress?.({ phase: "reading", percent: 5 })
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onprogress = (e) => {
        if (!e.lengthComputable) return
        const pct = 5 + Math.round((e.loaded / e.total) * 45)
        onProgress?.({ phase: "reading", percent: Math.min(50, pct) })
      }
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result)
        else reject(new Error("Не удалось прочитать файл"))
      }
      reader.onerror = () => reject(new Error("Ошибка чтения файла"))
      reader.readAsArrayBuffer(file)
    })

    onProgress?.({ phase: "decoding", percent: 55 })
    const ctx = await this.ensureContext()
    this.stopSourceOnly()
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0))
    this.buffer = decoded
    const rms = measureRms(decoded)
    this.inputRmsDb = rms > 1e-9 ? 20 * Math.log10(rms) : -60
    this.offset = 0
    this.playing = false
    this.buildGraph(ctx)
    onProgress?.({ phase: "ready", percent: 100 })
  }

  private buildGraph(ctx: AudioContext) {
    this.dryGain = ctx.createGain()
    this.wetGain = ctx.createGain()
    this.hpf = ctx.createBiquadFilter()
    this.hpf.type = "highpass"
    this.hpf.Q.value = 0.707
    this.lf = ctx.createBiquadFilter()
    this.lf.type = "lowshelf"
    this.lf.frequency.value = 120
    this.hf = ctx.createBiquadFilter()
    this.hf.type = "highshelf"
    this.hf.frequency.value = 8000
    this.comp = ctx.createDynamicsCompressor()
    this.comp.knee.value = 8
    this.makeup = ctx.createGain()
    this.softClip = ctx.createWaveShaper()
    this.softClip.curve = softClipCurve()
    this.softClip.oversample = "2x"
    this.ceiling = ctx.createGain()

    this.hpf.connect(this.lf)
    this.lf.connect(this.hf)
    this.hf.connect(this.comp)
    this.comp.connect(this.makeup)
    this.makeup.connect(this.softClip)
    this.softClip.connect(this.ceiling)
    this.ceiling.connect(this.wetGain)

    this.dryGain.connect(ctx.destination)
    this.wetGain.connect(ctx.destination)
    this.applyAbGains()
  }

  applyParams(params: MasteringParams) {
    if (!this.hpf || !this.lf || !this.hf || !this.comp || !this.makeup || !this.ceiling || !this.softClip) {
      return
    }
    const density = densityCompTweaks(params.density)
    const thresholdDb = params.thresholdDb + density.thresholdAdd
    const ratio = Math.max(1.1, params.ratio * density.ratioMul)

    this.hpf.frequency.value = Math.max(20, Math.min(200, params.hpfHz))
    this.lf.gain.value = params.lfShelfDb
    this.hf.gain.value = params.hfShelfDb
    this.comp.threshold.value = Math.max(-60, Math.min(0, thresholdDb))
    this.comp.ratio.value = Math.min(20, ratio)
    this.comp.attack.value = Math.max(0.001, params.attackMs / 1000)
    this.comp.release.value = Math.max(0.01, params.releaseMs / 1000)

    let makeupGain = dbToLinear(params.outputGainDb)
    if (params.magicMakeup) {
      const target = targetRmsDb(params.loudness)
      const delta = target - this.inputRmsDb
      const clamped = Math.max(-6, Math.min(18, delta))
      makeupGain *= dbToLinear(clamped)
    }
    this.makeup.gain.value = makeupGain
    this.ceiling.gain.value = dbToLinear(Math.min(0, params.ceilingDb))
    if (params.softClip) {
      this.softClip.curve = softClipCurve()
    } else {
      const linear = new Float32Array(2) as Float32Array<ArrayBuffer>
      linear[0] = -1
      linear[1] = 1
      this.softClip.curve = linear
    }
  }

  setAbMode(mode: AbMode) {
    this.ab = mode
    this.applyAbGains()
  }

  private applyAbGains() {
    if (!this.dryGain || !this.wetGain || !this.ctx) return
    const t = this.ctx.currentTime
    const dry = this.ab === "A" ? 1 : 0
    const wet = this.ab === "B" ? 1 : 0
    this.dryGain.gain.cancelScheduledValues(t)
    this.wetGain.gain.cancelScheduledValues(t)
    this.dryGain.gain.setTargetAtTime(dry, t, 0.015)
    this.wetGain.gain.setTargetAtTime(wet, t, 0.015)
  }

  async play() {
    if (!this.buffer) return
    const ctx = await this.ensureContext()
    if (!this.dryGain || !this.hpf) this.buildGraph(ctx)
    this.stopSourceOnly()
    const source = ctx.createBufferSource()
    source.buffer = this.buffer
    source.connect(this.dryGain!)
    source.connect(this.hpf!)
    source.onended = () => {
      if (this.source === source) {
        this.playing = false
        this.offset = 0
        this.source = null
      }
    }
    const startAt = Math.max(0, Math.min(this.offset, this.buffer.duration - 0.05))
    source.start(0, startAt)
    this.source = source
    this.startedAt = ctx.currentTime
    this.offset = startAt
    this.playing = true
  }

  pause() {
    if (!this.playing) return
    this.offset = this.currentTime
    this.stopSourceOnly()
    this.playing = false
  }

  stop() {
    this.stopSourceOnly()
    this.playing = false
    this.offset = 0
  }

  private stopSourceOnly() {
    if (this.source) {
      try {
        this.source.onended = null
        this.source.stop()
      } catch {
        /* already stopped */
      }
      try {
        this.source.disconnect()
      } catch {
        /* ignore */
      }
      this.source = null
    }
  }

  async dispose() {
    this.stop()
    if (this.ctx && this.ctx.state !== "closed") {
      await this.ctx.close().catch(() => undefined)
    }
    this.ctx = null
    this.buffer = null
    this.dryGain = null
    this.wetGain = null
    this.hpf = null
    this.lf = null
    this.hf = null
    this.comp = null
    this.makeup = null
    this.softClip = null
    this.ceiling = null
  }
}
