import {
  densityCompTweaks,
  targetRmsDb,
  type MasteringParams,
} from "@/lib/tools-mastering-params"
import {
  createSmoothingChain,
  createStereoWidener,
  linearCurve,
  softClipCurve,
} from "@/lib/tools-mastering-dsp"
import {
  createMeterTap,
  silentMeterReading,
  type MeterReading,
  type MeterTap,
} from "@/lib/tools-mastering-meter"

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

export type MasteringLoadProgress = {
  phase: "reading" | "decoding" | "ready"
  percent: number
}

export type AbMode = "A" | "B"

/**
 * Live Web Audio graph for preview / A-B.
 * Soft-clip, mid EQ, stereo width; mono-bass exact path is offline render for download.
 */
export class LiveMasteringEngine {
  private ctx: AudioContext | null = null
  /** Исходник (режим A). */
  private sourceBuffer: AudioBuffer | null = null
  /** Вход цепочки мастера (режим B) - исходник или спектрально очищенный. */
  private processBuffer: AudioBuffer | null = null
  private drySource: AudioBufferSourceNode | null = null
  private wetSource: AudioBufferSourceNode | null = null
  private dryGain: GainNode | null = null
  private wetGain: GainNode | null = null
  private hpf: BiquadFilterNode | null = null
  private lf: BiquadFilterNode | null = null
  private mf: BiquadFilterNode | null = null
  private hf: BiquadFilterNode | null = null
  private smoother: ReturnType<typeof createSmoothingChain> | null = null
  private comp: DynamicsCompressorNode | null = null
  private makeup: GainNode | null = null
  private softClip: WaveShaperNode | null = null
  private widener: ReturnType<typeof createStereoWidener> | null = null
  private ceiling: GainNode | null = null
  private dryMeter: MeterTap | null = null
  private wetMeter: MeterTap | null = null
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
    return this.sourceBuffer?.duration ?? 0
  }

  /** Буфер для offline-рендера скачивания (очищенный, если задан). */
  getProcessBuffer(): AudioBuffer | null {
    return this.processBuffer
  }

  getSourceBuffer(): AudioBuffer | null {
    return this.sourceBuffer
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
    this.sourceBuffer = decoded
    this.processBuffer = decoded
    this.refreshInputRms()
    this.offset = 0
    this.playing = false
    this.buildGraph(ctx)
    onProgress?.({ phase: "ready", percent: 100 })
  }

  /**
   * Подменяет вход мастера (B). null = снова исходник.
   * Режим A всегда играет исходный буфер.
   */
  setProcessedBuffer(buffer: AudioBuffer | null): void {
    if (!this.sourceBuffer) return
    this.processBuffer = buffer ?? this.sourceBuffer
    this.refreshInputRms()
    if (this.playing) {
      void this.play()
    }
  }

  private refreshInputRms() {
    const buf = this.processBuffer ?? this.sourceBuffer
    if (!buf) {
      this.inputRmsDb = -20
      return
    }
    const rms = measureRms(buf)
    this.inputRmsDb = rms > 1e-9 ? 20 * Math.log10(rms) : -60
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
    this.mf = ctx.createBiquadFilter()
    this.mf.type = "peaking"
    this.mf.frequency.value = 2000
    this.mf.Q.value = 0.8
    this.hf = ctx.createBiquadFilter()
    this.hf.type = "highshelf"
    this.hf.frequency.value = 8000
    this.smoother = createSmoothingChain(ctx)
    this.comp = ctx.createDynamicsCompressor()
    this.comp.knee.value = 8
    this.makeup = ctx.createGain()
    this.softClip = ctx.createWaveShaper()
    this.softClip.curve = softClipCurve()
    this.softClip.oversample = "2x"
    this.widener = createStereoWidener(ctx)
    this.ceiling = ctx.createGain()
    this.dryMeter?.dispose()
    this.wetMeter?.dispose()
    this.dryMeter = createMeterTap(ctx)
    this.wetMeter = createMeterTap(ctx)

    this.hpf.connect(this.lf)
    this.lf.connect(this.mf)
    this.mf.connect(this.hf)
    this.hf.connect(this.smoother.input)
    this.smoother.output.connect(this.comp)
    this.comp.connect(this.makeup)
    this.makeup.connect(this.softClip)
    this.softClip.connect(this.widener.input)
    this.widener.output.connect(this.ceiling)
    this.ceiling.connect(this.wetGain)

    this.dryGain.connect(ctx.destination)
    this.wetGain.connect(ctx.destination)
    this.dryGain.connect(this.dryMeter.input)
    this.wetGain.connect(this.wetMeter.input)
    this.applyAbGains()
  }

  /** Live LUFS / true-peak for the active A/B path. */
  getMeterReading(): MeterReading {
    if (!this.playing) return silentMeterReading()
    const tap = this.ab === "A" ? this.dryMeter : this.wetMeter
    return tap?.read() ?? silentMeterReading()
  }

  applyParams(params: MasteringParams) {
    if (
      !this.hpf ||
      !this.lf ||
      !this.mf ||
      !this.hf ||
      !this.smoother ||
      !this.comp ||
      !this.makeup ||
      !this.ceiling ||
      !this.softClip ||
      !this.widener
    ) {
      return
    }
    const density = densityCompTweaks(params.density)
    const thresholdDb = params.thresholdDb + density.thresholdAdd
    const ratio = Math.max(1.1, params.ratio * density.ratioMul)

    this.hpf.frequency.value = Math.max(20, Math.min(200, params.hpfHz))
    this.lf.gain.value = params.lfShelfDb
    this.mf.gain.value = params.mfPeakDb
    this.hf.gain.value = params.hfShelfDb
    this.smoother.setLevel(params.smooth)
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

    if (params.softClip && params.saturation > 0.05) {
      this.softClip.curve = softClipCurve(params.saturation)
    } else {
      this.softClip.curve = linearCurve()
    }

    this.widener.setWidth(params.stereoWidth)
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
    if (!this.sourceBuffer || !this.processBuffer) return
    const ctx = await this.ensureContext()
    if (!this.dryGain || !this.hpf) this.buildGraph(ctx)
    this.stopSourceOnly()

    const dry = ctx.createBufferSource()
    const wet = ctx.createBufferSource()
    dry.buffer = this.sourceBuffer
    wet.buffer = this.processBuffer
    dry.connect(this.dryGain!)
    wet.connect(this.hpf!)

    const startAt = Math.max(
      0,
      Math.min(this.offset, this.sourceBuffer.duration - 0.05),
    )

    const onEnded = (node: AudioBufferSourceNode) => {
      if (this.drySource !== dry && this.wetSource !== wet) return
      if (node === dry) this.drySource = null
      if (node === wet) this.wetSource = null
      if (!this.drySource && !this.wetSource) {
        this.playing = false
        this.offset = 0
      }
    }
    dry.onended = () => onEnded(dry)
    wet.onended = () => onEnded(wet)

    dry.start(0, startAt)
    wet.start(0, startAt)
    this.drySource = dry
    this.wetSource = wet
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

  /** Перемотка: при воспроизведении продолжает с новой позиции. */
  async seek(seconds: number) {
    if (!this.sourceBuffer) return
    const next = Math.max(
      0,
      Math.min(seconds, Math.max(0, this.sourceBuffer.duration - 0.01)),
    )
    const wasPlaying = this.playing
    this.offset = next
    if (wasPlaying) {
      await this.play()
    }
  }

  stop() {
    this.stopSourceOnly()
    this.playing = false
    this.offset = 0
  }

  private stopSourceOnly() {
    for (const node of [this.drySource, this.wetSource]) {
      if (!node) continue
      try {
        node.onended = null
        node.stop()
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect()
      } catch {
        /* ignore */
      }
    }
    this.drySource = null
    this.wetSource = null
  }

  async dispose() {
    this.stop()
    if (this.ctx && this.ctx.state !== "closed") {
      await this.ctx.close().catch(() => undefined)
    }
    this.ctx = null
    this.sourceBuffer = null
    this.processBuffer = null
    this.dryGain = null
    this.wetGain = null
    this.hpf = null
    this.lf = null
    this.mf = null
    this.hf = null
    this.smoother = null
    this.comp = null
    this.makeup = null
    this.softClip = null
    this.widener = null
    this.ceiling = null
    this.dryMeter?.dispose()
    this.wetMeter?.dispose()
    this.dryMeter = null
    this.wetMeter = null
  }
}
