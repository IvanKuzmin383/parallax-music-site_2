import {
  bassBoostToDb,
  clampSpeed,
  reverbToWet,
  type SlowedReverbParams,
} from "@/lib/tools-slowed-reverb-params"
import { buildWaveformPeaks, createReverbImpulse } from "@/lib/tools-slowed-reverb-dsp"

export type SlowedReverbLoadProgress = {
  phase: "reading" | "decoding" | "ready"
  percent: number
}

/**
 * Live Web Audio: speed (pitch+tempo), bass shelf, synthetic reverb.
 * Скорость меняет и тон (classic nightcore / slowed).
 */
export class LiveSlowedReverbEngine {
  private ctx: AudioContext | null = null
  private buffer: AudioBuffer | null = null
  private source: AudioBufferSourceNode | null = null
  private bass: BiquadFilterNode | null = null
  private dryGain: GainNode | null = null
  private wetGain: GainNode | null = null
  private convolver: ConvolverNode | null = null
  private startedAt = 0
  /** Позиция в buffer-секундах. */
  private bufferOffset = 0
  private playing = false
  private speed = 1
  private lastReverb = -1
  private peaks: number[] = []

  get isPlaying() {
    return this.playing
  }

  get peaksData() {
    return this.peaks
  }

  /** Длительность на выходе (с учётом скорости). */
  get duration() {
    if (!this.buffer) return 0
    return this.buffer.duration / Math.max(0.01, this.speed)
  }

  /** Текущая позиция в секундах выхода. */
  get currentTime() {
    if (!this.ctx || !this.playing) {
      return this.bufferOffset / Math.max(0.01, this.speed)
    }
    const elapsed = this.ctx.currentTime - this.startedAt
    return Math.min(this.duration, this.bufferOffset / this.speed + elapsed)
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
    onProgress?: (p: SlowedReverbLoadProgress) => void
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
    this.peaks = buildWaveformPeaks(decoded, 160)
    this.bufferOffset = 0
    this.playing = false
    this.buildGraph(ctx)
    onProgress?.({ phase: "ready", percent: 100 })
  }

  private buildGraph(ctx: AudioContext) {
    this.bass = ctx.createBiquadFilter()
    this.bass.type = "lowshelf"
    this.bass.frequency.value = 140
    this.bass.gain.value = 0

    this.dryGain = ctx.createGain()
    this.dryGain.gain.value = 1

    this.convolver = ctx.createConvolver()
    this.convolver.buffer = createReverbImpulse(ctx, 5)

    this.wetGain = ctx.createGain()
    this.wetGain.gain.value = 0

    this.bass.connect(this.dryGain)
    this.bass.connect(this.convolver)
    this.convolver.connect(this.wetGain)
    this.dryGain.connect(ctx.destination)
    this.wetGain.connect(ctx.destination)
  }

  applyParams(params: SlowedReverbParams) {
    if (!this.bass || !this.dryGain || !this.wetGain || !this.convolver || !this.ctx) return

    const nextSpeed = clampSpeed(params.speed)
    const speedChanged = Math.abs(nextSpeed - this.speed) > 0.001
    this.speed = nextSpeed

    this.bass.gain.value = bassBoostToDb(params.bassBoost)

    const wet = reverbToWet(params.reverb)
    const dry = Math.max(0.25, 1 - wet * 0.55)
    const t = this.ctx.currentTime
    this.dryGain.gain.cancelScheduledValues(t)
    this.wetGain.gain.cancelScheduledValues(t)
    this.dryGain.gain.setTargetAtTime(dry, t, 0.02)
    this.wetGain.gain.setTargetAtTime(wet, t, 0.02)

    if (Math.abs(params.reverb - this.lastReverb) >= 0.35) {
      this.convolver.buffer = createReverbImpulse(this.ctx, params.reverb)
      this.lastReverb = params.reverb
    }

    if (this.source) {
      this.source.playbackRate.value = this.speed
    }

    if (speedChanged && this.playing) {
      void this.restartFromCurrent()
    }
  }

  private async restartFromCurrent() {
    const wall = this.currentTime
    this.bufferOffset = wall * this.speed
    await this.play()
  }

  async play() {
    if (!this.buffer) return
    const ctx = await this.ensureContext()
    if (!this.bass) this.buildGraph(ctx)
    this.stopSourceOnly()

    const source = ctx.createBufferSource()
    source.buffer = this.buffer
    source.playbackRate.value = this.speed
    source.connect(this.bass!)
    source.onended = () => {
      if (this.source === source) {
        this.playing = false
        this.bufferOffset = 0
        this.source = null
      }
    }

    const maxBuffer = Math.max(0, this.buffer.duration - 0.05)
    const startAt = Math.max(0, Math.min(this.bufferOffset, maxBuffer))
    source.start(0, startAt)
    this.source = source
    this.startedAt = ctx.currentTime
    this.bufferOffset = startAt
    this.playing = true
  }

  pause() {
    if (!this.playing) return
    this.bufferOffset = this.currentTime * this.speed
    this.stopSourceOnly()
    this.playing = false
  }

  async seek(wallSeconds: number) {
    if (!this.buffer) return
    const wall = Math.max(0, Math.min(wallSeconds, Math.max(0, this.duration - 0.01)))
    const wasPlaying = this.playing
    this.bufferOffset = wall * this.speed
    if (wasPlaying) {
      await this.play()
    }
  }

  stop() {
    this.stopSourceOnly()
    this.playing = false
    this.bufferOffset = 0
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
    this.bass = null
    this.dryGain = null
    this.wetGain = null
    this.convolver = null
    this.peaks = []
  }
}
