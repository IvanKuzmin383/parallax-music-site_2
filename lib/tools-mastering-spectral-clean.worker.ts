/// <reference lib="webworker" />

import {
  applySpectralClean,
  type SpectralCleanWorkerRequest,
  type SpectralCleanWorkerResponse,
} from "./tools-mastering-spectral-clean"

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<SpectralCleanWorkerRequest>) => {
  const msg = event.data
  if (!msg || msg.type !== "clean") return
  try {
    const result = applySpectralClean(
      { sampleRate: msg.sampleRate, channels: msg.channels },
      (p) => {
        const progress: SpectralCleanWorkerResponse = {
          type: "progress",
          phase: p.phase,
          ratio: p.ratio,
        }
        ctx.postMessage(progress)
      }
    )
    const done: SpectralCleanWorkerResponse = {
      type: "done",
      channels: result.channels,
      sampleRate: result.sampleRate,
    }
    ctx.postMessage(
      done,
      result.channels.map((c) => c.buffer) as unknown as Transferable[]
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка спектральной очистки"
    const fail: SpectralCleanWorkerResponse = { type: "error", message }
    ctx.postMessage(fail)
  }
}
