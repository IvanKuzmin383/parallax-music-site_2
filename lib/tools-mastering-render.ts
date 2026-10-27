import {
  densityCompTweaks,
  isAiCleanPreset,
  smoothSettings,
  targetRmsDb,
  type MasteringParams,
} from "@/lib/tools-mastering-params"
import {
  applyLookaheadPeakLimiter,
  applyMonoBass,
  applySoftClipAndCeiling,
  applySoftNoiseGate,
  applyStereoWidth,
  createSmoothingChain,
  softClipCurve,
  linearCurve,
} from "@/lib/tools-mastering-dsp"
import { AI_CLEAN_LIMITS } from "@/lib/tools-mastering-spectral-clean"
import { runSpectralCleanOnBuffer } from "@/lib/tools-mastering-spectral-clean-run"

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

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bitsPerSample = 16
  const blockAlign = (numChannels * bitsPerSample) / 8
  const byteRate = sampleRate * blockAlign
  const dataSize = buffer.length * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c))

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i]
      sample = Math.max(-1, Math.min(1, sample))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" })
}

async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer()
  const ctx = new AudioContext()
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

export type MasterRenderProgress = {
  phase: "decode" | "spectral" | "master" | "encode"
  /** 0…1 overall */
  ratio: number
  label: string
}

export type RenderMasteredOptions = {
  onProgress?: (p: MasterRenderProgress) => void
  signal?: AbortSignal
}

/**
 * Браузерный offline-мастеринг.
 * Для режима очистки AI-трека: спектральная очистка (Worker) -> цепочка мастера -> лимитер -1 dBFS.
 */
export async function renderMasteredWav(
  file: File,
  params: MasteringParams,
  options: RenderMasteredOptions = {}
): Promise<{ blob: Blob; fileName: string }> {
  const report = (p: MasterRenderProgress) => options.onProgress?.(p)

  report({ phase: "decode", ratio: 0.02, label: "Декодирование…" })
  let input = await decodeAudioFile(file)
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError")

  if (isAiCleanPreset(params.presetId)) {
    report({ phase: "spectral", ratio: 0.05, label: "Спектральная очистка…" })
    input = await runSpectralCleanOnBuffer(input, {
      signal: options.signal,
      onProgress: (sp) => {
        report({
          phase: "spectral",
          ratio: 0.05 + sp.ratio * 0.55,
          label:
            sp.phase === "profile"
              ? "Оценка шума…"
              : sp.phase === "mask"
                ? "Построение маски…"
                : "Сборка сигнала…",
        })
      },
    })
  }

  report({ phase: "master", ratio: 0.65, label: "Мастеринг…" })
  const rendered = await renderMasterChain(input, params)
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError")

  report({ phase: "encode", ratio: 0.92, label: "Кодирование WAV…" })
  const baseName = file.name
    .replace(/\.wav$/i, "")
    .replace(/[^\w\-а-яА-ЯёЁ ]+/gi, "_")
    .slice(0, 80)
  const suffix = isAiCleanPreset(params.presetId) ? "ai_clean" : "mastered"
  const blob = encodeWav(rendered)
  report({ phase: "encode", ratio: 1, label: "Готово" })
  return {
    blob,
    fileName: `${baseName || "track"}_${suffix}.wav`,
  }
}

async function renderMasterChain(
  input: AudioBuffer,
  params: MasteringParams
): Promise<AudioBuffer> {
  const density = densityCompTweaks(params.density)
  const thresholdDb = params.thresholdDb + density.thresholdAdd
  const ratio = Math.max(1.1, params.ratio * density.ratioMul)
  const aiClean = isAiCleanPreset(params.presetId)

  let makeupGain = dbToLinear(params.outputGainDb)
  if (params.magicMakeup) {
    const rms = measureRms(input)
    const rmsDb = rms > 1e-9 ? 20 * Math.log10(rms) : -60
    const target = targetRmsDb(params.loudness)
    const delta = target - rmsDb
    const clamped = Math.max(-6, Math.min(18, delta))
    makeupGain *= dbToLinear(clamped)
  }

  const offline = new OfflineAudioContext(
    input.numberOfChannels,
    input.length,
    input.sampleRate
  )

  const source = offline.createBufferSource()
  source.buffer = input

  const hpf = offline.createBiquadFilter()
  hpf.type = "highpass"
  hpf.frequency.value = Math.max(20, Math.min(200, params.hpfHz))
  hpf.Q.value = 0.707

  const lf = offline.createBiquadFilter()
  lf.type = "lowshelf"
  lf.frequency.value = 120
  lf.gain.value = params.lfShelfDb

  const mf = offline.createBiquadFilter()
  mf.type = "peaking"
  mf.frequency.value = 2000
  mf.Q.value = 0.8
  mf.gain.value = params.mfPeakDb

  const hf = offline.createBiquadFilter()
  hf.type = "highshelf"
  hf.frequency.value = 8000
  hf.gain.value = params.hfShelfDb

  const smoother = createSmoothingChain(offline)
  smoother.setLevel(params.smooth)

  const comp = offline.createDynamicsCompressor()
  comp.threshold.value = Math.max(-60, Math.min(0, thresholdDb))
  comp.knee.value = aiClean ? 12 : 8
  comp.ratio.value = Math.min(20, ratio)
  comp.attack.value = Math.max(0.001, params.attackMs / 1000)
  comp.release.value = Math.max(0.01, params.releaseMs / 1000)

  const makeup = offline.createGain()
  makeup.gain.value = makeupGain

  const softClip = offline.createWaveShaper()
  softClip.oversample = "2x"
  if (params.softClip && params.saturation > 0.05) {
    softClip.curve = softClipCurve(params.saturation)
  } else {
    softClip.curve = linearCurve()
  }

  source.connect(hpf)
  hpf.connect(lf)
  lf.connect(mf)
  mf.connect(hf)
  hf.connect(smoother.input)
  smoother.output.connect(comp)
  comp.connect(makeup)
  makeup.connect(softClip)
  softClip.connect(offline.destination)

  source.start(0)
  const rendered = await offline.startRendering()

  applyStereoWidth(rendered, params.stereoWidth)
  if (params.monoBass) {
    applyMonoBass(
      rendered,
      rendered.sampleRate,
      aiClean ? AI_CLEAN_LIMITS.monoBassHz : 120
    )
  }
  const smooth = smoothSettings(params.smooth)
  if (smooth.enabled) {
    applySoftNoiseGate(rendered, smooth.gateThresholdDb, smooth.gateRatio)
  }

  if (aiClean) {
    applyLookaheadPeakLimiter(rendered, params.ceilingDb, 3, 55)
  } else {
    applySoftClipAndCeiling(rendered, params.ceilingDb, false, params.saturation)
  }

  return rendered
}
