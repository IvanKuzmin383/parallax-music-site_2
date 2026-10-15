import {
  bassBoostToDb,
  clampSpeed,
  reverbToWet,
  type SlowedReverbParams,
} from "@/lib/tools-slowed-reverb-params"
import { createReverbImpulse, encodeWav } from "@/lib/tools-slowed-reverb-dsp"

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
 * Offline-рендер: speed → bass → dry/wet reverb → WAV.
 * Работает только в браузере (OfflineAudioContext).
 */
export async function renderSlowedReverbWav(
  file: File,
  params: SlowedReverbParams
): Promise<{ blob: Blob; fileName: string }> {
  const input = await decodeAudioFile(file)
  const speed = clampSpeed(params.speed)
  const wet = reverbToWet(params.reverb)
  const dry = Math.max(0.25, 1 - wet * 0.55)

  const tailSec = params.reverb > 0.05 ? 0.4 + (params.reverb / 10) * 2.2 : 0.05
  const outLength = Math.ceil(input.length / speed) + Math.ceil(input.sampleRate * tailSec)

  const offline = new OfflineAudioContext(
    input.numberOfChannels,
    Math.max(1, outLength),
    input.sampleRate
  )

  const source = offline.createBufferSource()
  source.buffer = input
  source.playbackRate.value = speed

  const bass = offline.createBiquadFilter()
  bass.type = "lowshelf"
  bass.frequency.value = 140
  bass.gain.value = bassBoostToDb(params.bassBoost)

  const dryGain = offline.createGain()
  dryGain.gain.value = dry

  const convolver = offline.createConvolver()
  convolver.buffer = createReverbImpulse(offline, params.reverb)

  const wetGain = offline.createGain()
  wetGain.gain.value = wet

  const limiter = offline.createDynamicsCompressor()
  limiter.threshold.value = -1.5
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.05

  source.connect(bass)
  bass.connect(dryGain)
  bass.connect(convolver)
  convolver.connect(wetGain)
  dryGain.connect(limiter)
  wetGain.connect(limiter)
  limiter.connect(offline.destination)

  source.start(0)
  const rendered = await offline.startRendering()

  const baseName = file.name
    .replace(/\.(wav|mp3|m4a|aac|flac|ogg|aiff?)$/i, "")
    .replace(/[^\w\-а-яА-ЯёЁ ]+/gi, "_")
    .slice(0, 80)
  const suffix =
    params.presetId === "nightcore"
      ? "nightcore"
      : params.speed < 0.95
        ? "slowed_reverb"
        : params.speed > 1.05
          ? "speed_up"
          : "processed"

  return {
    blob: encodeWav(rendered),
    fileName: `${baseName || "track"}_${suffix}.wav`,
  }
}
