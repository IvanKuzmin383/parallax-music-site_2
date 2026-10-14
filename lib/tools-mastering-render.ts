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

function applySoftClipAndCeiling(buffer: AudioBuffer, ceilingDb: number, softClip: boolean): void {
  const ceiling = dbToLinear(Math.min(0, ceilingDb))
  const softStart = ceiling * 0.85
  const channels = buffer.numberOfChannels
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      let s = data[i]
      if (softClip && Math.abs(s) > softStart) {
        const sign = s < 0 ? -1 : 1
        const over = Math.abs(s) - softStart
        const room = Math.max(1e-6, ceiling - softStart)
        s = sign * (softStart + room * Math.tanh(over / room))
      }
      if (s > ceiling) s = ceiling
      if (s < -ceiling) s = -ceiling
      data[i] = s
    }
  }
}

function applyMonoBass(buffer: AudioBuffer, sampleRate: number, cutoffHz = 120): void {
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

/**
 * Браузерный offline-мастеринг: EQ → компрессор → makeup → ceiling/soft-clip → WAV.
 * Работает только в браузере (Web Audio OfflineAudioContext).
 */
export async function renderMasteredWav(
  file: File,
  params: MasteringParams
): Promise<{ blob: Blob; fileName: string }> {
  const input = await decodeAudioFile(file)
  const density = densityCompTweaks(params.density)
  const thresholdDb = params.thresholdDb + density.thresholdAdd
  const ratio = Math.max(1.1, params.ratio * density.ratioMul)

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

  const hf = offline.createBiquadFilter()
  hf.type = "highshelf"
  hf.frequency.value = 8000
  hf.gain.value = params.hfShelfDb

  const comp = offline.createDynamicsCompressor()
  comp.threshold.value = Math.max(-60, Math.min(0, thresholdDb))
  comp.knee.value = 8
  comp.ratio.value = Math.min(20, ratio)
  comp.attack.value = Math.max(0.001, params.attackMs / 1000)
  comp.release.value = Math.max(0.01, params.releaseMs / 1000)

  const makeup = offline.createGain()
  makeup.gain.value = makeupGain

  source.connect(hpf)
  hpf.connect(lf)
  lf.connect(hf)
  hf.connect(comp)
  comp.connect(makeup)
  makeup.connect(offline.destination)

  source.start(0)
  const rendered = await offline.startRendering()

  if (params.monoBass) {
    applyMonoBass(rendered, rendered.sampleRate)
  }
  applySoftClipAndCeiling(rendered, params.ceilingDb, params.softClip)

  const baseName = file.name.replace(/\.wav$/i, "").replace(/[^\w\-а-яА-ЯёЁ ]+/gi, "_").slice(0, 80)
  const blob = encodeWav(rendered)
  return {
    blob,
    fileName: `${baseName || "track"}_mastered.wav`,
  }
}
