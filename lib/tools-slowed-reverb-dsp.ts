/**
 * Синтетический impulse response для ConvolverNode.
 * Длина и затухание зависят от глубины реверба (0-10).
 */
export function createReverbImpulse(
  ctx: BaseAudioContext,
  reverb: number
): AudioBuffer {
  const depth = Math.max(0, Math.min(10, reverb))
  const sampleRate = ctx.sampleRate
  const durationSec = 0.35 + (depth / 10) * 2.4
  const length = Math.max(1, Math.floor(sampleRate * durationSec))
  const channels = 2
  const buffer = ctx.createBuffer(channels, length, sampleRate)
  const decay = 2.2 + (depth / 10) * 2.8

  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      const t = i / length
      const envelope = Math.pow(1 - t, decay)
      // Лёгкий стерео-разброс
      const noise = (Math.random() * 2 - 1) * (c === 0 ? 1 : 0.92)
      data[i] = noise * envelope
    }
  }
  return buffer
}

/** Пики для отрисовки волны (нормализованные 0..1). */
export function buildWaveformPeaks(buffer: AudioBuffer, bars = 128): number[] {
  const channel = buffer.getChannelData(0)
  const len = channel.length
  if (len === 0) return Array.from({ length: bars }, () => 0)
  const block = Math.max(1, Math.floor(len / bars))
  const peaks: number[] = []
  for (let i = 0; i < bars; i++) {
    const start = i * block
    const end = Math.min(len, start + block)
    let peak = 0
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j])
      if (v > peak) peak = v
    }
    peaks.push(peak)
  }
  const max = peaks.reduce((a, b) => Math.max(a, b), 0) || 1
  return peaks.map((p) => p / max)
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

export { encodeWav }
