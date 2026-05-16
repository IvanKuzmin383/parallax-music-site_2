/** Mono (1 канал) не принимается; стерео и многоканальные WAV (2+) разрешены */
export const WAV_MONO_NOT_ALLOWED_ERROR =
  "Аудиофайл монофонический (mono, 1 канал). Загружайте WAV со стерео или многоканальной разводкой (от 2 каналов: стерео, 5.1 и т.д.)."

export type ParsedWavFmt = {
  audioFormat: number
  numChannels: number
  sampleRate: number
  bitsPerSample: number
}

/**
 * Ищет чанк pcm `fmt ` и читает поля. Подходит для Uint8Array (Node и браузер).
 */
export function parseWavFmtChunk(data: Uint8Array): ParsedWavFmt | null {
  if (data.length < 12) {
    return null
  }

  const riffHeader = String.fromCharCode(data[0], data[1], data[2], data[3])
  const waveHeader = String.fromCharCode(data[8], data[9], data[10], data[11])
  if (riffHeader !== "RIFF" || waveHeader !== "WAVE") {
    return null
  }

  let offset = 12
  const dvParent = new DataView(data.buffer, data.byteOffset, data.byteLength)

  while (offset + 8 <= data.length) {
    const chunkId = String.fromCharCode(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3]
    )
    const chunkSize = dvParent.getUint32(offset + 4, true)

    if (chunkId === "fmt ") {
      if (chunkSize < 16 || offset + 8 + chunkSize > data.length) {
        return null
      }
      const base = offset + 8
      const dv = new DataView(data.buffer, data.byteOffset + base, Math.min(chunkSize, 32))
      return {
        audioFormat: dv.getUint16(0, true),
        numChannels: dv.getUint16(2, true),
        sampleRate: dv.getUint32(4, true),
        bitsPerSample: dv.getUint16(14, true),
      }
    }

    offset += 8 + chunkSize
  }

  return null
}

export function validateWavChannels(numChannels: number): string | null {
  if (numChannels < 2) {
    return WAV_MONO_NOT_ALLOWED_ERROR
  }
  return null
}

/**
 * Проверка по префиксу файла (для браузера до отправки на сервер).
 * Возвращает ошибку или null, если по префиксу нельзя судить (нет fmt / не WAV PCM).
 */
export function validateWavStereoFromPrefix(data: Uint8Array): string | null {
  const parsed = parseWavFmtChunk(data)
  if (!parsed || parsed.audioFormat !== 1) {
    return null
  }
  return validateWavChannels(parsed.numChannels)
}

const DEFAULT_PREFIX_BYTES = 512 * 1024

/** Асинхронная проверка выбранного пользователем WAV (читается только начало файла). */
export async function checkWavFileIsStereo(file: File, prefixBytes = DEFAULT_PREFIX_BYTES): Promise<string | null> {
  if (!file.name.toLowerCase().endsWith(".wav")) {
    return null
  }
  const n = Math.min(prefixBytes, file.size)
  if (n < 12) {
    return null
  }
  const slice = file.slice(0, n)
  const buf = await slice.arrayBuffer()
  return validateWavStereoFromPrefix(new Uint8Array(buf))
}
