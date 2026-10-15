import { loadStoryVideoBadgeIcon } from "@/lib/story-video-badge-icon"
import {
  buildStoryVideoPeaks,
  drawStoryVideoFrame,
} from "@/lib/story-video-canvas"
import {
  STORY_VIDEO_DURATION_SEC,
  STORY_VIDEO_FPS,
  STORY_VIDEO_HEIGHT,
  STORY_VIDEO_WIDTH,
  type StoryVideoProject,
} from "@/lib/story-video-theme"

export type StoryVideoExportProgress = {
  phase: "prepare" | "recording" | "done" | "error"
  progress: number
  message: string
}

function pickRecorderMime(): { mimeType: string; ext: string } {
  const candidates: Array<{ mimeType: string; ext: string }> = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
    { mimeType: "video/mp4", ext: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mimeType: "video/webm", ext: "webm" },
  ]
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "", ext: "webm" }
  }
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c
  }
  return { mimeType: "", ext: "webm" }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // blob: и same-origin кабинетные URL - без crossOrigin, иначе cookie-сессия может не уйти
    if (/^https?:\/\//i.test(url) && typeof window !== "undefined") {
      try {
        const u = new URL(url, window.location.href)
        if (u.origin !== window.location.origin) img.crossOrigin = "anonymous"
      } catch {
        // ignore
      }
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Не удалось загрузить обложку"))
    img.src = url
  })
}

async function decodeAudio(audioUrl: string, startSec: number, durationSec: number): Promise<{
  context: AudioContext
  buffer: AudioBuffer
  peaks: Float32Array
}> {
  const res = await fetch(audioUrl, { credentials: "include" })
  if (!res.ok) throw new Error("Не удалось загрузить аудио")
  const raw = await res.arrayBuffer()
  const context = new AudioContext()
  const full = await context.decodeAudioData(raw.slice(0))
  const sampleRate = full.sampleRate
  const startSample = Math.max(0, Math.floor(startSec * sampleRate))
  const length = Math.min(
    Math.floor(durationSec * sampleRate),
    Math.max(0, full.length - startSample)
  )
  const sliced = context.createBuffer(full.numberOfChannels, length || 1, sampleRate)
  for (let ch = 0; ch < full.numberOfChannels; ch++) {
    const src = full.getChannelData(ch).subarray(startSample, startSample + length)
    sliced.copyToChannel(src, ch)
  }
  const peaks = buildStoryVideoPeaks(sliced)
  return { context, buffer: sliced, peaks }
}

/**
 * Клиентский экспорт сторис: canvas.captureStream + MediaRecorder + AudioBufferSource.
 * Формат: mp4 если браузер умеет, иначе webm.
 */
export async function exportStoryVideo(params: {
  project: StoryVideoProject
  coverUrl: string
  audioUrl: string
  onProgress?: (p: StoryVideoExportProgress) => void
  signal?: AbortSignal
}): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const { project, coverUrl, audioUrl, onProgress, signal } = params
  const report = (p: StoryVideoExportProgress) => onProgress?.(p)

  if (typeof MediaRecorder === "undefined") {
    throw new Error("Запись видео не поддерживается в этом браузере")
  }

  report({ phase: "prepare", progress: 0.05, message: "Готовим обложку и аудио…" })
  if (signal?.aborted) throw new Error("Отменено")

  const [cover, badgeIcon] = await Promise.all([
    loadImage(coverUrl),
    loadStoryVideoBadgeIcon(project.badge ?? "none"),
  ])
  const { context, buffer, peaks } = await decodeAudio(
    audioUrl,
    project.startSec,
    project.durationSec || STORY_VIDEO_DURATION_SEC
  )
  const canvas = document.createElement("canvas")
  canvas.width = STORY_VIDEO_WIDTH
  canvas.height = STORY_VIDEO_HEIGHT
  canvas.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none"
  document.body.appendChild(canvas)

  let videoStream: MediaStream | null = null
  let dest: MediaStreamAudioDestinationNode | null = null

  const cleanup = async () => {
    canvas.remove()
    videoStream?.getTracks().forEach((t) => t.stop())
    dest?.stream.getAudioTracks().forEach((t) => t.stop())
    await context.close().catch(() => undefined)
  }

  try {
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true })
    if (!ctx) throw new Error("Canvas недоступен")

    const fps = STORY_VIDEO_FPS
    const durationSec = project.durationSec || STORY_VIDEO_DURATION_SEC
    const totalFrames = Math.round(durationSec * fps)

    drawStoryVideoFrame({
      ctx,
      width: canvas.width,
      height: canvas.height,
      timeSec: 0,
      project,
      cover,
      peaks,
      frameIndex: 0,
      badgeIcon,
    })

    videoStream = canvas.captureStream(fps)
    dest = context.createMediaStreamDestination()
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(dest)

    const combined = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ])
    const picked = pickRecorderMime()
    const recorder = picked.mimeType
      ? new MediaRecorder(combined, {
          mimeType: picked.mimeType,
          videoBitsPerSecond: 4_500_000,
        })
      : new MediaRecorder(combined, { videoBitsPerSecond: 4_500_000 })

    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    const stopped = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve()
      recorder.onerror = () => reject(new Error("Ошибка записи видео"))
    })

    report({ phase: "recording", progress: 0.1, message: "Рендерим видео…" })
    if (context.state === "suspended") await context.resume()
    recorder.start(250)
    source.start(0)

    const frameDurationMs = 1000 / fps
    const startedAt = performance.now()

    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        try {
          recorder.stop()
        } catch {
          // ignore
        }
        try {
          source.stop()
        } catch {
          // ignore
        }
        throw new Error("Отменено")
      }

      const timeSec = frame / fps
      drawStoryVideoFrame({
        ctx,
        width: canvas.width,
        height: canvas.height,
        timeSec,
        project,
        cover,
        peaks,
        frameIndex: frame,
        badgeIcon,
      })

      const target = startedAt + (frame + 1) * frameDurationMs
      const delay = target - performance.now()
      if (delay > 1) await wait(delay)

      if (frame % 8 === 0) {
        report({
          phase: "recording",
          progress: 0.1 + 0.85 * (frame / totalFrames),
          message: `Кадр ${frame + 1} из ${totalFrames}`,
        })
      }
    }

    await wait(frameDurationMs * 2)
    recorder.stop()
    try {
      source.stop()
    } catch {
      // already ended
    }
    await stopped

    const mimeType = recorder.mimeType || picked.mimeType || "video/webm"
    const ext = mimeType.includes("mp4") ? "mp4" : picked.ext
    const blob = new Blob(chunks, { type: mimeType })
    if (blob.size < 1024) {
      throw new Error("Файл получился пустым - попробуйте другой браузер (Chrome / Edge)")
    }

    const safeTitle =
      (project.title || "story")
        .replace(/[^\w\u0400-\u04FF\- ]+/g, "")
        .trim()
        .slice(0, 40) || "story"
    const filename = `${safeTitle}-story.${ext}`

    report({ phase: "done", progress: 1, message: "Готово" })
    return { blob, filename, mimeType }
  } finally {
    await cleanup()
  }
}
