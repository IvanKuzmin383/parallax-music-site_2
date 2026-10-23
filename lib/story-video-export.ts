import { loadStoryVideoBadgeIcons } from "@/lib/story-video-badge-icon"
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

/** Ждём кадр композитинга - иначе captureStream на скрытом canvas залипает на 1-м кадре. */
function waitAnimationFrame(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame((t) => resolve(t))
  })
}

/**
 * Canvas должен участвовать в paint (не opacity:0 / 1×1 / -9999px),
 * иначе Chrome часто отдаёт в MediaRecorder один статичный кадр.
 */
function mountExportCanvas(canvas: HTMLCanvasElement): void {
  canvas.setAttribute("aria-hidden", "true")
  // Canvas должен реально участвовать в paint. Слишком низкая opacity / offscreen
  // в Chrome даёт captureStream из одного статичного кадра.
  canvas.style.cssText = [
    "position:fixed",
    "left:0",
    "bottom:0",
    `width:${Math.round(STORY_VIDEO_WIDTH / 4)}px`,
    `height:${Math.round(STORY_VIDEO_HEIGHT / 4)}px`,
    "opacity:0.04",
    "pointer-events:none",
    "z-index:0",
    "transform:translateZ(0)",
    "image-rendering:auto",
  ].join(";")
  document.body.appendChild(canvas)
}

type CanvasCaptureTrack = MediaStreamTrack & { requestFrame?: () => void }

function requestCanvasFrame(track: MediaStreamTrack | null | undefined): void {
  const t = track as CanvasCaptureTrack | null | undefined
  if (!t || typeof t.requestFrame !== "function") return
  try {
    t.requestFrame()
  } catch {
    // ignore
  }
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

async function loadAudioRaw(
  audioUrl: string,
  audioData?: ArrayBuffer | Blob | null
): Promise<ArrayBuffer> {
  if (audioData instanceof ArrayBuffer && audioData.byteLength > 0) {
    return audioData.slice(0)
  }
  if (typeof Blob !== "undefined" && audioData instanceof Blob) {
    return audioData.arrayBuffer()
  }
  // blob:/data: не требуют credentials; кабинетные URL - с cookie
  const needsCreds = !/^(blob:|data:)/i.test(audioUrl)
  const res = await fetch(audioUrl, needsCreds ? { credentials: "include" } : undefined)
  if (!res.ok) throw new Error("Не удалось загрузить аудио")
  return res.arrayBuffer()
}

async function decodeAudio(
  audioUrl: string,
  startSec: number,
  durationSec: number,
  audioData?: ArrayBuffer | Blob | null
): Promise<{
  context: AudioContext
  buffer: AudioBuffer
  peaks: Float32Array
}> {
  let raw: ArrayBuffer
  try {
    raw = await loadAudioRaw(audioUrl, audioData)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      throw new Error("Не удалось загрузить аудио (сеть или CSP). Попробуйте другой файл.")
    }
    throw err instanceof Error ? err : new Error("Не удалось загрузить аудио")
  }
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
  /** Уже загруженный файл/буфер - без повторного fetch (blob + CSP). */
  audioData?: ArrayBuffer | Blob | null
  onProgress?: (p: StoryVideoExportProgress) => void
  signal?: AbortSignal
}): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const { project, coverUrl, audioUrl, audioData, onProgress, signal } = params
  const report = (p: StoryVideoExportProgress) => onProgress?.(p)

  if (typeof MediaRecorder === "undefined") {
    throw new Error("Запись видео не поддерживается в этом браузере")
  }

  report({ phase: "prepare", progress: 0.05, message: "Готовим обложку и аудио…" })
  if (signal?.aborted) throw new Error("Отменено")

  const [cover, badgeIcons] = await Promise.all([
    loadImage(coverUrl),
    loadStoryVideoBadgeIcons(project.badges ?? []),
  ])
  const { context, buffer, peaks } = await decodeAudio(
    audioUrl,
    project.startSec,
    project.durationSec || STORY_VIDEO_DURATION_SEC,
    audioData
  )
  const canvas = document.createElement("canvas")
  canvas.width = STORY_VIDEO_WIDTH
  canvas.height = STORY_VIDEO_HEIGHT
  mountExportCanvas(canvas)

  let videoStream: MediaStream | null = null
  let dest: MediaStreamAudioDestinationNode | null = null

  const cleanup = async () => {
    canvas.remove()
    videoStream?.getTracks().forEach((t) => t.stop())
    dest?.stream.getAudioTracks().forEach((t) => t.stop())
    await context.close().catch(() => undefined)
  }

  try {
    // Без willReadFrequently: CPU-путь в Chrome часто залипал captureStream на 1-м кадре
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) throw new Error("Canvas недоступен")

    const fps = STORY_VIDEO_FPS
    const durationSec = project.durationSec || STORY_VIDEO_DURATION_SEC
    const totalFrames = Math.round(durationSec * fps)
    const frameDurationMs = 1000 / fps

    drawStoryVideoFrame({
      ctx,
      width: canvas.width,
      height: canvas.height,
      timeSec: 0,
      project,
      cover,
      peaks,
      frameIndex: 0,
      badgeIcons,
    })
    // Даем браузеру paint до старта записи
    await waitAnimationFrame()
    await waitAnimationFrame()

    // Явный fps + requestFrame после каждой отрисовки - иначе Chrome часто пишет одну картинку
    videoStream = canvas.captureStream(fps)
    const videoTrack = videoStream.getVideoTracks()[0] ?? null
    requestCanvasFrame(videoTrack)

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
    recorder.start(100)
    source.start(0)

    const startedAt = performance.now()
    let frame = 0

    while (frame < totalFrames) {
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

      await waitAnimationFrame()

      const elapsedMs = performance.now() - startedAt
      const targetFrame = Math.min(totalFrames - 1, Math.floor(elapsedMs / frameDurationMs))
      // Если rAF отстал - догоняем кадры отрисовкой (время ролика = wall-clock ≈ аудио)
      const drawFrame = Math.max(frame, targetFrame)
      const timeSec = drawFrame / fps

      drawStoryVideoFrame({
        ctx,
        width: canvas.width,
        height: canvas.height,
        timeSec,
        project,
        cover,
        peaks,
        frameIndex: drawFrame,
        badgeIcons,
      })
      requestCanvasFrame(videoTrack)

      frame = drawFrame + 1

      if (drawFrame % 8 === 0 || frame >= totalFrames) {
        report({
          phase: "recording",
          progress: 0.1 + 0.85 * (Math.min(frame, totalFrames) / totalFrames),
          message: `Кадр ${Math.min(frame, totalFrames)} из ${totalFrames}`,
        })
      }

      // Не убегаем вперёд аудио: если нарисовали рано - ждём слот
      const slotEnd = startedAt + frame * frameDurationMs
      const pause = slotEnd - performance.now()
      if (pause > 2) await wait(pause)
    }

    await waitAnimationFrame()
    requestCanvasFrame(videoTrack)
    await wait(frameDurationMs * 3)
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
