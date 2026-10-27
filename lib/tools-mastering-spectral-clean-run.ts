import {
  applySpectralClean,
  assertAiCleanDurationOk,
  type SpectralCleanProgress,
  type SpectralCleanWorkerRequest,
  type SpectralCleanWorkerResponse,
} from "@/lib/tools-mastering-spectral-clean"

export type RunSpectralCleanOptions = {
  onProgress?: (p: SpectralCleanProgress) => void
  signal?: AbortSignal
}

function bufferToChannels(buffer: AudioBuffer): Float32Array[] {
  const channels: Float32Array[] = []
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    // copy - worker may transfer
    channels.push(new Float32Array(buffer.getChannelData(c)))
  }
  return channels
}

function channelsToAudioBuffer(
  channels: Float32Array[],
  sampleRate: number
): AudioBuffer {
  const length = channels[0]?.length ?? 0
  const ctx = new OfflineAudioContext(channels.length, Math.max(1, length), sampleRate)
  const buffer = ctx.createBuffer(channels.length, Math.max(1, length), sampleRate)
  for (let c = 0; c < channels.length; c++) {
    buffer.getChannelData(c).set(channels[c])
  }
  return buffer
}

/**
 * Спектральная очистка в Web Worker (fallback на main thread если Worker недоступен).
 * Не блокирует UI надолго при поддержке Worker.
 */
export async function runSpectralCleanOnBuffer(
  buffer: AudioBuffer,
  options: RunSpectralCleanOptions = {}
): Promise<AudioBuffer> {
  assertAiCleanDurationOk(buffer.length / buffer.sampleRate)

  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }

  const canWorker =
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof URL !== "undefined"

  if (!canWorker) {
    const channels = bufferToChannels(buffer)
    const result = applySpectralClean(
      { sampleRate: buffer.sampleRate, channels },
      options.onProgress
    )
    return channelsToAudioBuffer(result.channels, result.sampleRate)
  }

  return new Promise<AudioBuffer>((resolve, reject) => {
    let worker: Worker
    try {
      worker = new Worker(
        new URL("./tools-mastering-spectral-clean.worker.ts", import.meta.url)
      )
    } catch (err) {
      // webpack/dev без worker - fallback
      void (async () => {
        try {
          const channels = bufferToChannels(buffer)
          const result = applySpectralClean(
            { sampleRate: buffer.sampleRate, channels },
            options.onProgress
          )
          resolve(channelsToAudioBuffer(result.channels, result.sampleRate))
        } catch (e) {
          reject(e)
        }
      })()
      return
    }

    const onAbort = () => {
      worker.terminate()
      reject(new DOMException("Aborted", "AbortError"))
    }
    options.signal?.addEventListener("abort", onAbort, { once: true })

    worker.onmessage = (event: MessageEvent<SpectralCleanWorkerResponse>) => {
      const data = event.data
      if (data.type === "progress") {
        options.onProgress?.({ phase: data.phase, ratio: data.ratio })
        return
      }
      if (data.type === "error") {
        options.signal?.removeEventListener("abort", onAbort)
        worker.terminate()
        reject(new Error(data.message))
        return
      }
      if (data.type === "done") {
        options.signal?.removeEventListener("abort", onAbort)
        worker.terminate()
        try {
          resolve(channelsToAudioBuffer(data.channels, data.sampleRate))
        } catch (e) {
          reject(e)
        }
      }
    }

    worker.onerror = (err) => {
      options.signal?.removeEventListener("abort", onAbort)
      worker.terminate()
      reject(err.error ?? new Error(err.message || "Worker error"))
    }

    const channels = bufferToChannels(buffer)
    const req: SpectralCleanWorkerRequest = {
      type: "clean",
      sampleRate: buffer.sampleRate,
      channels,
    }
    worker.postMessage(
      req,
      channels.map((c) => c.buffer)
    )
  })
}
