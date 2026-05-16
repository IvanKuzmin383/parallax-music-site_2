import { parseWavFmtChunk } from "@/lib/wav-parse-stereo"
import { validateWavFormat } from "@/lib/wav-validation"
import { readFilePrefix } from "@/lib/node-streaming-multipart"

const DEFAULT_PREFIX_STEPS = [512 * 1024, 2 * 1024 * 1024, 8 * 1024 * 1024] as const

const INVALID_WAV_ERROR =
  "В файле нет корректного заголовка RIFF/WAVE — это не WAV или файл повреждён. Нужен несжатый WAV (PCM), 44.1 kHz (44100 Hz), 16 или 24 bit."

function hasRiffWaveHeader(buf: Buffer): boolean {
  if (buf.length < 12) return false
  return (
    String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) === "RIFF" &&
    String.fromCharCode(buf[8], buf[9], buf[10], buf[11]) === "WAVE"
  )
}

/**
 * Пошаговая валидация WAV без чтения всего файла в память.
 * Сначала ищем fmt chunk в префиксе 512KB, затем 2MB, затем 8MB.
 */
export async function validateWavFormatFromFilePath(
  filePath: string,
  prefixSteps: readonly number[] = DEFAULT_PREFIX_STEPS
): Promise<string | null> {
  let sawRiffWave = false

  for (const maxBytes of prefixSteps) {
    const prefix = await readFilePrefix(filePath, maxBytes)
    if (prefix.length < 44) {
      continue
    }

    if (!hasRiffWaveHeader(prefix)) {
      return INVALID_WAV_ERROR
    }
    sawRiffWave = true

    const parsed = parseWavFmtChunk(new Uint8Array(prefix.buffer, prefix.byteOffset, prefix.byteLength))
    if (!parsed) {
      continue
    }

    return validateWavFormat(prefix)
  }

  if (sawRiffWave) {
    return "В WAV не найден блок fmt в первых 8 MB. Пересохраните файл как стандартный PCM WAV (44.1 kHz, 16/24 bit)."
  }
  return INVALID_WAV_ERROR
}
