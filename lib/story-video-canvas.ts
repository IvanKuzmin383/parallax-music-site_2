import type {
  StoryVideoFilter,
  StoryVideoMotion,
  StoryVideoProject,
  StoryVideoTemplate,
} from "@/lib/story-video-theme"

export type StoryVideoDrawInput = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  /** Секунды от начала ролика (0..duration). */
  timeSec: number
  project: StoryVideoProject
  cover: CanvasImageSource | null
  /** Пики 0..1 для waveform, опционально. */
  peaks?: Float32Array | null
  /** Seed для зерна (стабильный кадр при экспорте). */
  frameIndex?: number
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function coverCoverRect(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
  scale = 1
): { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number } {
  const targetW = boxW * scale
  const targetH = boxH * scale
  const scaleFactor = Math.max(targetW / imgW, targetH / imgH)
  const sw = targetW / scaleFactor
  const sh = targetH / scaleFactor
  const sx = (imgW - sw) / 2
  const sy = (imgH - sh) / 2
  const dx = (boxW - targetW) / 2
  const dy = (boxH - targetH) / 2
  return { sx, sy, sw, sh, dx, dy, dw: targetW, dh: targetH }
}

function imageSize(cover: CanvasImageSource): { w: number; h: number } {
  if (cover instanceof HTMLImageElement) return { w: cover.naturalWidth || cover.width, h: cover.naturalHeight || cover.height }
  if (cover instanceof HTMLCanvasElement) return { w: cover.width, h: cover.height }
  if (typeof ImageBitmap !== "undefined" && cover instanceof ImageBitmap) {
    return { w: cover.width, h: cover.height }
  }
  if (cover instanceof HTMLVideoElement) return { w: cover.videoWidth, h: cover.videoHeight }
  return { w: 1, h: 1 }
}

export function computeMotionScale(motion: StoryVideoMotion, timeSec: number, durationSec: number, speed: number): number {
  const speedMul = Math.max(0.7, Math.min(1.3, speed / 100))
  const t = timeSec * speedMul
  const progress = clamp01(timeSec / Math.max(0.001, durationSec))

  switch (motion) {
    case "kenBurnsIn":
      return 1 + progress * 0.14
    case "kenBurnsOut":
      return 1.14 - progress * 0.14
    case "breathe":
      return 1 + Math.sin(t * Math.PI * 0.85) * 0.028
    case "snapZoom": {
      const snaps = [0, 5, 10]
      let punch = 0
      for (const s of snaps) {
        const d = Math.abs(timeSec - s)
        if (d < 0.35) punch = Math.max(punch, (1 - d / 0.35) * 0.08)
      }
      return 1 + progress * 0.08 + punch
    }
    default:
      return 1
  }
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  cover: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number
) {
  const { w: iw, h: ih } = imageSize(cover)
  if (iw <= 0 || ih <= 0) return
  const r = coverCoverRect(iw, ih, w, h, scale)
  ctx.drawImage(cover, r.sx, r.sy, r.sw, r.sh, x + r.dx, y + r.dy, r.dw, r.dh)
}

function drawBlurredBackground(
  ctx: CanvasRenderingContext2D,
  cover: CanvasImageSource,
  width: number,
  height: number,
  scale: number
) {
  ctx.save()
  ctx.filter = "blur(28px) brightness(0.55) saturate(1.15)"
  drawImageCover(ctx, cover, -width * 0.08, -height * 0.08, width * 1.16, height * 1.16, scale)
  ctx.restore()
  ctx.fillStyle = "rgba(0,0,0,0.28)"
  ctx.fillRect(0, 0, width, height)
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawRoundedCover(
  ctx: CanvasRenderingContext2D,
  cover: CanvasImageSource,
  x: number,
  y: number,
  size: number,
  radius: number,
  scale: number,
  shadow = true
) {
  ctx.save()
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.45)"
    ctx.shadowBlur = size * 0.12
    ctx.shadowOffsetY = size * 0.04
  }
  roundRectPath(ctx, x, y, size, size, radius)
  ctx.clip()
  drawImageCover(ctx, cover, x, y, size, size, scale)
  ctx.restore()
}

function drawCircleCover(
  ctx: CanvasRenderingContext2D,
  cover: CanvasImageSource,
  cx: number,
  cy: number,
  radius: number,
  scale: number,
  rotationRad = 0
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotationRad)
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  drawImageCover(ctx, cover, -radius, -radius, radius * 2, radius * 2, scale)
  ctx.restore()

  // vinyl hole
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2)
  ctx.fillStyle = "#0a0a0a"
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.03, 0, Math.PI * 2)
  ctx.fillStyle = "#cfcfcf"
  ctx.fill()
  ctx.restore()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = words[0]
  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
    } else {
      lines.push(current)
      current = words[i]
      if (lines.length >= maxLines) break
    }
  }
  if (lines.length < maxLines) lines.push(current)
  if (lines.length > maxLines) return lines.slice(0, maxLines)
  // ellipsis last line if truncated words remain
  return lines
}

function drawTitleArtist(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  artist: string,
  accent: string
) {
  const padX = width * 0.08
  const bottom = height * 0.86
  ctx.save()
  ctx.textAlign = "left"
  ctx.fillStyle = "#ffffff"
  ctx.font = `700 ${Math.round(width * 0.055)}px system-ui, sans-serif`
  const titleLines = wrapText(ctx, title || "Трек", width - padX * 2, 2)
  let y = bottom - titleLines.length * width * 0.06 - width * 0.04
  for (const line of titleLines) {
    ctx.fillText(line, padX, y)
    y += width * 0.062
  }
  ctx.fillStyle = accent
  ctx.font = `600 ${Math.round(width * 0.032)}px system-ui, sans-serif`
  ctx.fillText((artist || "Артист").slice(0, 48), padX, y + width * 0.01)
  ctx.restore()
}

function drawBigHook(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hook: string,
  accent: string
) {
  const padX = width * 0.1
  ctx.save()
  ctx.textAlign = "center"
  ctx.fillStyle = "#ffffff"
  ctx.font = `800 ${Math.round(width * 0.08)}px system-ui, sans-serif`
  const lines = wrapText(ctx, hook || "Слушай сейчас", width - padX * 2, 3)
  const lineH = width * 0.095
  let y = height * 0.42 - ((lines.length - 1) * lineH) / 2
  for (const line of lines) {
    ctx.strokeStyle = "rgba(0,0,0,0.35)"
    ctx.lineWidth = Math.max(2, width * 0.008)
    ctx.strokeText(line, width / 2, y)
    ctx.fillText(line, width / 2, y)
    y += lineH
  }
  ctx.fillStyle = accent
  ctx.fillRect(width * 0.35, y + width * 0.02, width * 0.3, Math.max(3, width * 0.008))
  ctx.restore()
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: StoryVideoProject
) {
  if (project.textLayout === "bigHook") {
    drawBigHook(ctx, width, height, project.hookText, project.accent)
  } else {
    drawTitleArtist(ctx, width, height, project.title, project.artist, project.accent)
  }
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  peaks: Float32Array,
  timeSec: number,
  durationSec: number,
  accent: string
) {
  const barCount = Math.min(48, peaks.length || 48)
  const areaW = width * 0.78
  const areaX = (width - areaW) / 2
  const areaY = height * 0.78
  const areaH = height * 0.045
  const gap = 2
  const barW = (areaW - gap * (barCount - 1)) / barCount
  const progress = clamp01(timeSec / Math.max(0.001, durationSec))

  ctx.save()
  for (let i = 0; i < barCount; i++) {
    const peak = peaks.length ? peaks[i % peaks.length] : 0.3
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(timeSec * 6 + i * 0.35))
    const h = Math.max(areaH * 0.15, areaH * peak * pulse)
    const x = areaX + i * (barW + gap)
    const y = areaY + (areaH - h) / 2
    const active = i / barCount <= progress
    ctx.fillStyle = active ? accent : "rgba(255,255,255,0.28)"
    roundRectPath(ctx, x, y, barW, h, barW / 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Кэш маленького шума - без getImageData на каждый кадр (иначе экспорт 720p тормозит). */
const grainTileCache = new Map<number, HTMLCanvasElement>()

function getGrainTile(seedKey: number): HTMLCanvasElement {
  const key = seedKey % 8
  const cached = grainTileCache.get(key)
  if (cached) return cached
  const size = 128
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const g = c.getContext("2d")
  if (!g) return c
  const img = g.createImageData(size, size)
  let seed = (key * 1103515245 + 12345) >>> 0
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const v = seed & 255
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 40
  }
  g.putImageData(img, 0, 0)
  grainTileCache.set(key, c)
  return c
}

function applyFilterOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filter: StoryVideoFilter,
  frameIndex: number
) {
  if (filter === "clean") return

  if (filter === "warm") {
    ctx.fillStyle = "rgba(255, 140, 60, 0.12)"
    ctx.fillRect(0, 0, width, height)
    return
  }

  if (filter === "grain" || filter === "vhs") {
    const tile = getGrainTile(frameIndex)
    ctx.save()
    ctx.globalAlpha = filter === "vhs" ? 0.22 : 0.18
    ctx.globalCompositeOperation = "overlay"
    const ox = (frameIndex * 13) % 64
    const oy = (frameIndex * 7) % 64
    for (let y = -oy; y < height; y += tile.height) {
      for (let x = -ox; x < width; x += tile.width) {
        ctx.drawImage(tile, x, y)
      }
    }
    ctx.restore()

    if (filter === "vhs") {
      ctx.fillStyle = "rgba(0,0,0,0.16)"
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1)
      }
      ctx.fillStyle = "rgba(255,80,80,0.04)"
      ctx.fillRect(1, 0, width, height)
      ctx.fillStyle = "rgba(80,80,255,0.04)"
      ctx.fillRect(-1, 0, width, height)
      ctx.fillStyle = "rgba(255,255,255,0.05)"
      const bandY = (frameIndex * 7) % height
      ctx.fillRect(0, bandY, width, Math.max(2, height * 0.012))
    }
  }
}

function drawSafePlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#141414"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "rgba(255,255,255,0.55)"
  ctx.font = `600 ${Math.round(width * 0.045)}px system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.fillText("Загрузите обложку", width / 2, height / 2)
}

function drawTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: StoryVideoTemplate,
  cover: CanvasImageSource,
  scale: number,
  timeSec: number,
  accent: string,
  project: StoryVideoProject
) {
  const cx = width / 2

  switch (template) {
    case "blurPulse": {
      drawBlurredBackground(ctx, cover, width, height, scale)
      const size = width * 0.62
      drawRoundedCover(ctx, cover, (width - size) / 2, height * 0.22, size, width * 0.04, scale)
      break
    }
    case "poster": {
      drawImageCover(ctx, cover, 0, 0, width, height, scale)
      const g = ctx.createLinearGradient(0, height * 0.45, 0, height)
      g.addColorStop(0, "rgba(0,0,0,0)")
      g.addColorStop(1, "rgba(0,0,0,0.78)")
      ctx.fillStyle = g
      ctx.fillRect(0, 0, width, height)
      break
    }
    case "filmGrain": {
      ctx.fillStyle = "#050505"
      ctx.fillRect(0, 0, width, height)
      const bar = height * 0.08
      drawImageCover(ctx, cover, 0, bar, width, height - bar * 2, scale)
      ctx.fillStyle = "#050505"
      ctx.fillRect(0, 0, width, bar)
      ctx.fillRect(0, height - bar, width, bar)
      break
    }
    case "lyricCard": {
      drawBlurredBackground(ctx, cover, width, height, scale * 1.02)
      ctx.fillStyle = "rgba(0,0,0,0.35)"
      ctx.fillRect(0, 0, width, height)
      const size = width * 0.28
      drawRoundedCover(ctx, cover, width * 0.08, height * 0.12, size, width * 0.025, scale, true)
      break
    }
    case "vinyl": {
      drawBlurredBackground(ctx, cover, width, height, 1.05)
      const r = width * 0.32
      const rot = timeSec * 0.55
      // outer disc
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, height * 0.38, r * 1.08, 0, Math.PI * 2)
      ctx.fillStyle = "#111"
      ctx.fill()
      ctx.restore()
      drawCircleCover(ctx, cover, cx, height * 0.38, r, scale, rot)
      break
    }
    case "neon": {
      ctx.fillStyle = "#07070c"
      ctx.fillRect(0, 0, width, height)
      const size = width * 0.58
      const x = (width - size) / 2
      const y = height * 0.22
      ctx.save()
      ctx.shadowColor = accent
      ctx.shadowBlur = width * 0.08
      roundRectPath(ctx, x - 2, y - 2, size + 4, size + 4, width * 0.04)
      ctx.strokeStyle = accent
      ctx.lineWidth = Math.max(2, width * 0.008)
      ctx.stroke()
      ctx.restore()
      drawRoundedCover(ctx, cover, x, y, size, width * 0.035, scale, false)
      break
    }
    case "noir": {
      ctx.save()
      drawBlurredBackground(ctx, cover, width, height, scale)
      // desaturate via overlay trick
      ctx.globalCompositeOperation = "saturation"
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = "source-over"
      ctx.restore()
      ctx.fillStyle = "rgba(0,0,0,0.25)"
      ctx.fillRect(0, 0, width, height)
      const size = width * 0.55
      drawRoundedCover(ctx, cover, (width - size) / 2, height * 0.24, size, width * 0.02, scale)
      ctx.fillStyle = accent
      ctx.fillRect(width * 0.08, height * 0.72, width * 0.84, Math.max(3, height * 0.004))
      break
    }
    case "ticket": {
      ctx.fillStyle = "#1a1510"
      ctx.fillRect(0, 0, width, height)
      const cardW = width * 0.82
      const cardH = height * 0.62
      const cardX = (width - cardW) / 2
      const cardY = height * 0.16
      ctx.fillStyle = "#f3efe6"
      roundRectPath(ctx, cardX, cardY, cardW, cardH, width * 0.02)
      ctx.fill()
      // perforation
      ctx.strokeStyle = "rgba(0,0,0,0.25)"
      ctx.setLineDash([6, 8])
      ctx.beginPath()
      ctx.moveTo(cardX + cardW * 0.62, cardY + 16)
      ctx.lineTo(cardX + cardW * 0.62, cardY + cardH - 16)
      ctx.stroke()
      ctx.setLineDash([])
      const artSize = cardW * 0.48
      drawRoundedCover(
        ctx,
        cover,
        cardX + cardW * 0.07,
        cardY + cardH * 0.12,
        artSize,
        width * 0.015,
        scale,
        false
      )
      ctx.fillStyle = "#111"
      ctx.font = `800 ${Math.round(width * 0.045)}px system-ui, sans-serif`
      ctx.textAlign = "left"
      ctx.fillText("LISTEN", cardX + cardW * 0.66, cardY + cardH * 0.35)
      ctx.fillText("NOW", cardX + cardW * 0.66, cardY + cardH * 0.42)
      ctx.fillStyle = accent
      ctx.fillRect(cardX + cardW * 0.66, cardY + cardH * 0.46, cardW * 0.22, 4)
      // ticket text uses project below via overlay - mute default overlay area by drawing mini meta
      ctx.fillStyle = "#333"
      ctx.font = `600 ${Math.round(width * 0.028)}px system-ui, sans-serif`
      ctx.fillText((project.title || "Трек").slice(0, 28), cardX + cardW * 0.07, cardY + cardH * 0.82)
      ctx.font = `500 ${Math.round(width * 0.022)}px system-ui, sans-serif`
      ctx.fillText((project.artist || "").slice(0, 32), cardX + cardW * 0.07, cardY + cardH * 0.88)
      break
    }
    case "orbit": {
      drawBlurredBackground(ctx, cover, width, height, scale)
      const r = width * 0.28
      const cy = height * 0.36
      for (let i = 0; i < 3; i++) {
        const rr = r * (1.25 + i * 0.22)
        ctx.beginPath()
        ctx.arc(cx, cy, rr, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${0.18 - i * 0.04})`
        ctx.lineWidth = 1.5
        ctx.stroke()
        const a = timeSec * (0.4 + i * 0.15) + i
        const px = cx + Math.cos(a) * rr
        const py = cy + Math.sin(a) * rr
        ctx.beginPath()
        ctx.arc(px, py, width * 0.012, 0, Math.PI * 2)
        ctx.fillStyle = accent
        ctx.fill()
      }
      drawRoundedCover(ctx, cover, cx - r, cy - r, r * 2, r, scale)
      break
    }
    default:
      drawBlurredBackground(ctx, cover, width, height, scale)
  }
}

/**
 * Рисует один кадр сторис-видео. Одинаковая логика для превью и экспорта.
 */
export function drawStoryVideoFrame(input: StoryVideoDrawInput): void {
  const { ctx, width, height, timeSec, project, cover, peaks, frameIndex = 0 } = input
  ctx.save()
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, width, height)

  if (!cover) {
    drawSafePlaceholder(ctx, width, height)
    ctx.restore()
    return
  }

  const scale = computeMotionScale(
    project.motion,
    timeSec,
    project.durationSec,
    project.motionSpeed
  )

  drawTemplate(ctx, width, height, project.template, cover, scale, timeSec, project.accent, project)

  // Для ticket свой текст на карточке - bigHook/title всё равно можно показать снизу для hook
  if (project.template !== "ticket") {
    drawTextOverlay(ctx, width, height, project)
  } else if (project.textLayout === "bigHook" && project.hookText.trim()) {
    ctx.save()
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.font = `700 ${Math.round(width * 0.04)}px system-ui, sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(project.hookText.slice(0, 42), width / 2, height * 0.9)
    ctx.restore()
  }

  if (project.showWaveform && peaks && peaks.length > 0) {
    drawWaveform(ctx, width, height, peaks, timeSec, project.durationSec, project.accent)
  }

  // Фильтры grain/vhs читают пиксели - после всей графики
  applyFilterOverlay(ctx, width, height, project.filter, frameIndex)

  ctx.restore()
}

/** Строит упрощённые пики 0..1 из AudioBuffer для waveform. */
export function buildStoryVideoPeaks(buffer: AudioBuffer, barCount = 48): Float32Array {
  const peaks = new Float32Array(barCount)
  const channel = buffer.getChannelData(0)
  const block = Math.floor(channel.length / barCount) || 1
  for (let i = 0; i < barCount; i++) {
    let max = 0
    const start = i * block
    const end = Math.min(channel.length, start + block)
    for (let j = start; j < end; j += 8) {
      const v = Math.abs(channel[j])
      if (v > max) max = v
    }
    peaks[i] = Math.max(0.08, Math.min(1, max * 1.6))
  }
  return peaks
}
