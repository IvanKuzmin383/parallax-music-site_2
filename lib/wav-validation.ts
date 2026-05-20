import { parseWavFmtChunk, validateWavChannels, WAV_MONO_NOT_ALLOWED_ERROR } from "@/lib/wav-parse-stereo"

/** Допустима только частота CD: 44100 Hz */
export const ALLOWED_WAV_SAMPLE_RATES = new Set([44100])

export { WAV_MONO_NOT_ALLOWED_ERROR }

export function describeSampleRateHz(hz: number): string {
  if (hz === 44100) return "44.1 kHz (44100 Hz)"
  if (hz === 48000) return "48 kHz (48000 Hz)"
  return `${hz} Hz`
}

export function validateWavFormat(audioBuffer: Buffer): string | null {
  if (audioBuffer.length < 44) {
    return "Некорректный WAV-файл: слишком маленький размер."
  }

  const u8 = new Uint8Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength)
  const parsed = parseWavFmtChunk(u8)
  if (!parsed) {
    return "В файле нет корректного заголовка RIFF/WAVE - это не WAV или файл повреждён. Нужен несжатый WAV (PCM), 44.1 kHz (44100 Hz), 16 или 24 bit."
  }

  const { audioFormat, numChannels, sampleRate, bitsPerSample } = parsed

  if (audioFormat !== 1) {
    return `В файле не PCM, а другой формат (код ${audioFormat}, ожидается 1 - несжатый PCM). Нужен WAV PCM, 44.1 kHz (44100 Hz), 16 или 24 bit.`
  }

  const channelError = validateWavChannels(numChannels)
  if (channelError) {
    return channelError
  }

  const badRate = !ALLOWED_WAV_SAMPLE_RATES.has(sampleRate)
  const badBits = bitsPerSample !== 16 && bitsPerSample !== 24

  if (badRate || badBits) {
    const actual: string[] = []
    const needed: string[] = []
    if (badRate) {
      actual.push(`частота ${describeSampleRateHz(sampleRate)}`)
      needed.push("44.1 kHz (44100 Hz)")
    }
    if (badBits) {
      actual.push(`разрядность ${bitsPerSample} bit`)
      needed.push("16 или 24 bit")
    }
    return `Параметры файла не подходят. В файле: ${actual.join(", ")}. Нужно: ${needed.join(", ")}.`
  }

  return null
}
