import type {
  StoryVideoBadgeId,
  StoryVideoFilter,
  StoryVideoMotion,
  StoryVideoProject,
  StoryVideoTemplate,
} from "@/lib/story-video-theme"
import { STORY_VIDEO_BADGE_META } from "@/lib/story-video-theme"

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
  /** Водяной знак превью (защита от записи экрана). В экспорт не передавать. */
  watermark?: boolean
  /** Иконки бейджей площадок (уже загруженные SVG/PNG). */
  badgeIcons?: Partial<Record<StoryVideoBadgeId, CanvasImageSource>> | null
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
      // Резкие «удары» зума на 0 / 5 / 10 сек (удобно под хук): быстрый набор + отскок
      const snaps = [0, 5, 10]
      let punch = 0
      for (const s of snaps) {
        const d = timeSec - s
        if (d < -0.05 || d > 0.55) continue
        // 0..0.12с - набор до пика, дальше спад
        const attack = d <= 0.12 ? d / 0.12 : 1 - (d - 0.12) / 0.43
        const shaped = Math.max(0, attack)
        // ease-out для заметного удара (до ~22% масштаба)
        punch = Math.max(punch, shaped * shaped * 0.22)
      }
      return 1 + progress * 0.05 + punch
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

function drawCassetteReel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotationRad: number
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotationRad)
  // спицы катушки
  const spokes = 8
  for (let i = 0; i < spokes; i++) {
    const a0 = (i / spokes) * Math.PI * 2
    const a1 = a0 + (14 * Math.PI) / 180
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, radius, a0, a1)
    ctx.closePath()
    ctx.fillStyle = i % 2 === 0 ? "#3a3a42" : "#16161a"
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.strokeStyle = "rgba(255,255,255,0.14)"
  ctx.lineWidth = 1.5
  ctx.stroke()
  // ступица
  const hub = radius * 0.28
  ctx.beginPath()
  ctx.arc(0, 0, hub, 0, Math.PI * 2)
  const hubGrad = ctx.createRadialGradient(-hub * 0.2, -hub * 0.2, 0, 0, 0, hub)
  hubGrad.addColorStop(0, "#4a4a52")
  hubGrad.addColorStop(0.55, "#1c1c22")
  hubGrad.addColorStop(1, "#0a0a0c")
  ctx.fillStyle = hubGrad
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.2)"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function drawCassetteScrew(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r)
  g.addColorStop(0, "#6a6a72")
  g.addColorStop(0.6, "#2a2a30")
  g.addColorStop(1, "#121214")
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.25)"
  ctx.lineWidth = 1
  ctx.stroke()
  // шлиц
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.45, cy)
  ctx.lineTo(cx + r * 0.45, cy)
  ctx.strokeStyle = "rgba(0,0,0,0.55)"
  ctx.lineWidth = Math.max(1, r * 0.35)
  ctx.stroke()
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

function textAnchor(project: StoryVideoProject, width: number, height: number) {
  const xPct = Math.max(4, Math.min(96, project.textX ?? 50))
  const yPct = Math.max(4, Math.min(96, project.textY ?? 50))
  return {
    x: (xPct / 100) * width,
    y: (yPct / 100) * height,
    align: project.textAlign ?? "center",
  }
}

function drawTitleArtist(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: StoryVideoProject
) {
  if (project.showText === false) return
  const { x, y, align } = textAnchor(project, width, height)
  const maxW = width * 0.78
  ctx.save()
  ctx.textAlign = align
  ctx.fillStyle = "#ffffff"
  ctx.font = `700 ${Math.round(width * 0.055)}px system-ui, sans-serif`
  const titleLines = wrapText(ctx, project.title || "Трек", maxW, 2)
  const lineH = width * 0.062
  const blockH = titleLines.length * lineH + width * 0.045
  let ty = y - blockH / 2 + lineH * 0.85
  for (const line of titleLines) {
    ctx.strokeStyle = "rgba(0,0,0,0.35)"
    ctx.lineWidth = Math.max(2, width * 0.006)
    ctx.strokeText(line, x, ty)
    ctx.fillText(line, x, ty)
    ty += lineH
  }
  ctx.fillStyle = project.accent
  ctx.font = `600 ${Math.round(width * 0.032)}px system-ui, sans-serif`
  ctx.fillText((project.artist || "Артист").slice(0, 48), x, ty + width * 0.01)
  ctx.restore()
}

function drawBigHook(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: StoryVideoProject,
  hookOverride?: string
) {
  if (project.showText === false) return
  const { x, y, align } = textAnchor(project, width, height)
  const maxW = width * 0.82
  ctx.save()
  ctx.textAlign = align
  ctx.fillStyle = "#ffffff"
  ctx.font = `800 ${Math.round(width * 0.08)}px system-ui, sans-serif`
  const lines = wrapText(ctx, hookOverride || project.hookText || "Слушай сейчас", maxW, 3)
  const lineH = width * 0.095
  let ty = y - ((lines.length - 1) * lineH) / 2
  for (const line of lines) {
    ctx.strokeStyle = "rgba(0,0,0,0.35)"
    ctx.lineWidth = Math.max(2, width * 0.008)
    ctx.strokeText(line, x, ty)
    ctx.fillText(line, x, ty)
    ty += lineH
  }
  if (project.showTextLine !== false) {
    const barW = width * 0.28
    const barX =
      align === "left" ? x : align === "right" ? x - barW : x - barW / 2
    ctx.fillStyle = project.accent
    ctx.fillRect(barX, ty + width * 0.015, barW, Math.max(3, width * 0.008))
  }
  ctx.restore()
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: StoryVideoProject
) {
  if (project.showText === false) return
  if (project.textLayout === "bigHook") {
    drawBigHook(ctx, width, height, project)
  } else {
    drawTitleArtist(ctx, width, height, project)
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
      // Идея: сторис-цитата - обложка якорь по центру сверху, хук крупно ниже (не маркер в углу)
      drawBlurredBackground(ctx, cover, width, height, scale * 1.04)
      const veil = ctx.createLinearGradient(0, 0, 0, height)
      veil.addColorStop(0, "rgba(0,0,0,0.25)")
      veil.addColorStop(0.45, "rgba(0,0,0,0.45)")
      veil.addColorStop(1, "rgba(0,0,0,0.72)")
      ctx.fillStyle = veil
      ctx.fillRect(0, 0, width, height)

      const size = width * 0.52
      const coverY = height * 0.12
      drawRoundedCover(ctx, cover, (width - size) / 2, coverY, size, width * 0.035, scale, true)

      if (project.showText !== false) {
        ctx.save()
        ctx.textAlign = "center"
        ctx.fillStyle = "rgba(255,255,255,0.72)"
        ctx.font = `600 ${Math.round(width * 0.028)}px system-ui, sans-serif`
        const meta = [project.artist, project.title].filter((s) => s.trim()).join(" · ")
        ctx.fillText((meta || "Трек").slice(0, 42), width / 2, coverY + size + width * 0.055)
        ctx.restore()
        drawBigHook(ctx, width, height, project, project.hookText || project.title || "Слушай сейчас")
      }
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
    case "cassette": {
      // Как смартлинк: корпус = обложка, окно с катушками, винты, лейбл
      drawBlurredBackground(ctx, cover, width, height, 1.06)
      const cassW = width * 0.86
      const cassH = cassW / 1.55
      const cassX = (width - cassW) / 2
      const cassY = height * 0.18
      const cassR = width * 0.025

      ctx.save()
      ctx.shadowColor = "rgba(0,0,0,0.55)"
      ctx.shadowBlur = width * 0.06
      ctx.shadowOffsetY = width * 0.02
      roundRectPath(ctx, cassX, cassY, cassW, cassH, cassR)
      ctx.clip()
      drawImageCover(ctx, cover, cassX, cassY, cassW, cassH, scale)

      // пластиковый блик поверх обложки
      const gloss = ctx.createLinearGradient(cassX, cassY, cassX, cassY + cassH)
      gloss.addColorStop(0, "rgba(255,255,255,0.22)")
      gloss.addColorStop(0.16, "transparent")
      gloss.addColorStop(0.7, "transparent")
      gloss.addColorStop(1, "rgba(0,0,0,0.38)")
      ctx.fillStyle = gloss
      ctx.fillRect(cassX, cassY, cassW, cassH)
      const sideShade = ctx.createLinearGradient(cassX, 0, cassX + cassW, 0)
      sideShade.addColorStop(0, "rgba(0,0,0,0.28)")
      sideShade.addColorStop(0.14, "transparent")
      sideShade.addColorStop(0.86, "transparent")
      sideShade.addColorStop(1, "rgba(0,0,0,0.28)")
      ctx.fillStyle = sideShade
      ctx.fillRect(cassX, cassY, cassW, cassH)
      ctx.restore()

      // рамка корпуса
      ctx.save()
      roundRectPath(ctx, cassX, cassY, cassW, cassH, cassR)
      ctx.strokeStyle = "rgba(255,255,255,0.18)"
      ctx.lineWidth = Math.max(1.5, width * 0.003)
      ctx.stroke()
      ctx.restore()

      // окно с лентой и катушками
      const winX = cassX + cassW * 0.09
      const winY = cassY + cassH * 0.3
      const winW = cassW * 0.82
      const winH = cassH * 0.4
      roundRectPath(ctx, winX, winY, winW, winH, 3)
      ctx.fillStyle = "rgba(8,8,10,0.78)"
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.lineWidth = 1
      ctx.stroke()

      // лента между катушками
      const tapeH = winH * 0.38
      const tapeY = winY + winH * 0.55 - tapeH / 2
      roundRectPath(ctx, winX + winW * 0.18, tapeY, winW * 0.64, tapeH, 2)
      const tapeGrad = ctx.createLinearGradient(0, tapeY, 0, tapeY + tapeH)
      tapeGrad.addColorStop(0, "#2a2218")
      tapeGrad.addColorStop(0.5, "#1a140e")
      tapeGrad.addColorStop(1, "#0e0a08")
      ctx.fillStyle = tapeGrad
      ctx.fill()

      const reelR = winW * 0.15
      const reelCy = winY + winH * 0.55
      const leftReelCx = winX + winW * 0.06 + reelR
      const rightReelCx = winX + winW * 0.94 - reelR
      // Play: лента L→R, вид спереди - левая CCW (−), правая CW (+)
      const reelRot = (timeSec / 3.2) * Math.PI * 2
      drawCassetteReel(ctx, leftReelCx, reelCy, reelR, -reelRot)
      drawCassetteReel(ctx, rightReelCx, reelCy, reelR, reelRot)

      // нижний лейбл (пустая плашка - текст рисуется отдельно и двигается)
      const labX = cassX + cassW * 0.1
      const labY = cassY + cassH * 0.78
      const labW = cassW * 0.8
      const labH = cassH * 0.16
      roundRectPath(ctx, labX, labY, labW, labH, 2)
      ctx.fillStyle = "rgba(0,0,0,0.32)"
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.stroke()

      // винты по углам
      const screwR = Math.max(3, width * 0.007)
      const screws: Array<[number, number]> = [
        [cassX + cassW * 0.05, cassY + cassH * 0.07],
        [cassX + cassW * 0.95, cassY + cassH * 0.07],
        [cassX + cassW * 0.05, cassY + cassH * 0.93],
        [cassX + cassW * 0.95, cassY + cassH * 0.93],
      ]
      for (const [sx, sy] of screws) {
        drawCassetteScrew(ctx, sx, sy, screwR)
      }
      break
    }
    case "neon": {
      ctx.fillStyle = "#07070c"
      ctx.fillRect(0, 0, width, height)
      const size = width * 0.58
      const x = (width - size) / 2
      const y = height * 0.22
      const frameColor = project.frameColor || accent
      if (project.showFrame !== false) {
        ctx.save()
        ctx.shadowColor = frameColor
        ctx.shadowBlur = width * 0.08
        roundRectPath(ctx, x - 2, y - 2, size + 4, size + 4, width * 0.04)
        ctx.strokeStyle = frameColor
        ctx.lineWidth = Math.max(2, width * 0.008)
        ctx.stroke()
        ctx.restore()
      }
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
      if (project.showFrame !== false) {
        ctx.fillStyle = project.frameColor || accent
        ctx.fillRect(width * 0.08, height * 0.72, width * 0.84, Math.max(3, height * 0.004))
      }
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

  // ticket / lyricCard рисуют свой текст внутри шаблона; кассета - обычный подвижный оверлей
  if (project.template === "ticket") {
    if (
      project.showText !== false &&
      project.textLayout === "bigHook" &&
      project.hookText.trim()
    ) {
      ctx.save()
      ctx.fillStyle = "rgba(255,255,255,0.9)"
      ctx.font = `700 ${Math.round(width * 0.04)}px system-ui, sans-serif`
      ctx.textAlign = "center"
      ctx.fillText(project.hookText.slice(0, 42), width / 2, height * 0.9)
      ctx.restore()
    }
  } else if (project.template !== "lyricCard") {
    drawTextOverlay(ctx, width, height, project)
  }

  if (project.showWaveform && peaks && peaks.length > 0) {
    drawWaveform(
      ctx,
      width,
      height,
      peaks,
      timeSec,
      project.durationSec,
      project.waveformColor || project.accent
    )
  }

  // Рамка кадра (у Neon своя обводка обложки; здесь - общая окантовка ролика)
  if (project.showFrame !== false && project.template !== "neon") {
    const inset = width * 0.032
    const frameColor = project.frameColor || project.accent
    ctx.save()
    roundRectPath(
      ctx,
      inset,
      inset,
      width - inset * 2,
      height - inset * 2,
      width * 0.045
    )
    ctx.strokeStyle = frameColor
    ctx.lineWidth = Math.max(2, width * 0.006)
    ctx.stroke()
    ctx.restore()
  }

  // Фильтры grain/vhs читают пиксели - после всей графики
  applyFilterOverlay(ctx, width, height, project.filter, frameIndex)

  const badges = Array.isArray(project.badges) ? project.badges : []
  if (badges.length > 0) {
    drawPlatformBadges(ctx, width, height, project, input.badgeIcons ?? null)
  }

  if (input.watermark) {
    drawPreviewWatermark(ctx, width, height)
  }

  ctx.restore()
}

function measureBadgeWidth(
  ctx: CanvasRenderingContext2D,
  badge: StoryVideoBadgeId,
  badgeH: number
): number {
  const meta = STORY_VIDEO_BADGE_META[badge]
  const padX = badgeH * 0.28
  const iconSize = badgeH * 0.62
  const gap = badgeH * 0.22
  ctx.font = `600 ${Math.round(badgeH * 0.26)}px system-ui, sans-serif`
  const line1W = ctx.measureText(meta.line1).width
  ctx.font = `800 ${Math.round(badgeH * 0.38)}px system-ui, sans-serif`
  const line2W = ctx.measureText(meta.line2).width
  return padX + iconSize + gap + Math.max(line1W, line2W) + padX * 1.15
}

function drawOnePlatformBadge(
  ctx: CanvasRenderingContext2D,
  width: number,
  badge: StoryVideoBadgeId,
  left: number,
  top: number,
  badgeW: number,
  badgeH: number,
  icon: CanvasImageSource | null | undefined
) {
  const meta = STORY_VIDEO_BADGE_META[badge]
  const padX = badgeH * 0.28
  const iconSize = badgeH * 0.62
  const gap = badgeH * 0.22
  const radius = badgeH * 0.28

  ctx.save()
  ctx.shadowColor = "rgba(0,0,0,0.45)"
  ctx.shadowBlur = width * 0.015
  ctx.shadowOffsetY = width * 0.004
  roundRectPath(ctx, left, top, badgeW, badgeH, radius)
  ctx.fillStyle = "#0a0a0a"
  ctx.fill()
  ctx.shadowColor = "transparent"

  roundRectPath(ctx, left, top, badgeW, badgeH, radius)
  ctx.strokeStyle = "rgba(255,255,255,0.35)"
  ctx.lineWidth = Math.max(1, width * 0.0025)
  ctx.stroke()

  const iconX = left + padX
  const iconY = top + (badgeH - iconSize) / 2
  if (icon) {
    if (badge === "vk") {
      roundRectPath(ctx, iconX, iconY, iconSize, iconSize, iconSize * 0.22)
      ctx.fillStyle = "#fff"
      ctx.fill()
    }
    ctx.drawImage(icon, iconX, iconY, iconSize, iconSize)
  } else {
    ctx.beginPath()
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2)
    ctx.fillStyle =
      badge === "spotify"
        ? "#1DB954"
        : badge === "vk"
          ? "#0077FF"
          : badge === "yandex"
            ? "#FED42B"
            : "#FA243C"
    ctx.fill()
  }

  const textX = iconX + iconSize + gap
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillStyle = "#fff"
  ctx.font = `600 ${Math.round(badgeH * 0.26)}px system-ui, sans-serif`
  ctx.fillText(meta.line1, textX, top + badgeH * 0.38)
  ctx.font = `800 ${Math.round(badgeH * 0.38)}px system-ui, sans-serif`
  ctx.fillText(meta.line2, textX, top + badgeH * 0.78)
  ctx.restore()
}

/** Сетка бейджей 2 в ряд вокруг якоря badgeX/badgeY - без наложений. */
function drawPlatformBadges(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: StoryVideoProject,
  icons: Partial<Record<StoryVideoBadgeId, CanvasImageSource>> | null
) {
  const badges = project.badges.filter((b) => b in STORY_VIDEO_BADGE_META)
  if (badges.length === 0) return

  const count = badges.length
  const cols = Math.min(2, count)
  const rows = Math.ceil(count / cols)

  const sideMargin = width * 0.04
  const gapX = width * 0.025
  const badgeH = Math.max(28, width * (count >= 3 ? 0.068 : 0.08))
  const gapY = badgeH * 0.28

  // Ширина ячейки: влезают 2 колонки; одиночный бейдж - не шире половины кадра
  const maxCellW =
    cols === 1
      ? Math.min(width * 0.72, width - sideMargin * 2)
      : (width - sideMargin * 2 - gapX) / 2
  const naturalW = Math.max(...badges.map((b) => measureBadgeWidth(ctx, b, badgeH)))
  const badgeW = Math.min(naturalW, maxCellW)

  const gridW = cols * badgeW + (cols - 1) * gapX
  const gridH = rows * badgeH + (rows - 1) * gapY

  const xPct = Math.max(4, Math.min(96, project.badgeX ?? 50))
  const yPct = Math.max(4, Math.min(96, project.badgeY ?? 88))
  let gridLeft = (xPct / 100) * width - gridW / 2
  let gridTop = (yPct / 100) * height - gridH / 2

  const marginX = sideMargin
  const marginY = height * 0.03
  gridLeft = Math.max(marginX, Math.min(gridLeft, width - marginX - gridW))
  gridTop = Math.max(marginY, Math.min(gridTop, height - marginY - gridH))

  for (let i = 0; i < badges.length; i++) {
    const badge = badges[i]
    const col = i % cols
    const row = Math.floor(i / cols)
    // Нечётный последний ряд (1 бейдж) - по центру сетки
    const rowCount = row === rows - 1 ? count - row * cols : cols
    const rowOffsetX =
      rowCount < cols ? (gridW - (rowCount * badgeW + (rowCount - 1) * gapX)) / 2 : 0
    const left = gridLeft + rowOffsetX + col * (badgeW + gapX)
    const top = gridTop + row * (badgeH + gapY)
    drawOnePlatformBadge(
      ctx,
      width,
      badge,
      left,
      top,
      badgeW,
      badgeH,
      icons?.[badge] ?? null
    )
  }
}

/**
 * Лёгкий watermark: превью читается, запись экрана всё ещё помечается.
 * Без затемнения кадра и без плотной сетки текста.
 */
function drawPreviewWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate((-28 * Math.PI) / 180)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${Math.round(width * 0.07)}px system-ui, sans-serif`
  ctx.fillStyle = "rgba(255,255,255,0.11)"
  ctx.strokeStyle = "rgba(0,0,0,0.08)"
  ctx.lineWidth = Math.max(1, width * 0.0025)

  // Три диагональные надписи вместо плотной сетки
  const label = "PREVIEW"
  for (const y of [-width * 0.32, 0, width * 0.32]) {
    ctx.strokeText(label, 0, y)
    ctx.fillText(label, 0, y)
  }
  ctx.restore()

  // Компактный бейдж в углу
  ctx.save()
  const badgeW = width * 0.28
  const badgeH = height * 0.036
  const bx = width * 0.06
  const by = height * 0.055
  roundRectPath(ctx, bx, by, badgeW, badgeH, badgeH / 2)
  ctx.fillStyle = "rgba(226,83,47,0.85)"
  ctx.fill()
  ctx.fillStyle = "#fff"
  ctx.font = `700 ${Math.round(width * 0.026)}px system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("ПРЕВЬЮ", bx + badgeW / 2, by + badgeH / 2)
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
