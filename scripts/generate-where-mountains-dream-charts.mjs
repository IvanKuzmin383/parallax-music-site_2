/**
 * One-off: generate static pie chart images for the where-mountains-dream case.
 * Run: node scripts/generate-where-mountains-dream-charts.mjs
 */
import sharp from "sharp"
import { mkdir } from "fs/promises"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, "../public/cases/where-mountains-dream")

const COLORS = [
  "#7c3aed",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#6366f1",
  "#64748b",
  "#475569",
]

const BG = "#171717"
const FG = "#fafafa"
const MUTED = "#a3a3a3"
const BORDER = "#404040"

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutSlice(cx, cy, outerR, innerR, startDeg, sweepDeg) {
  if (sweepDeg <= 0) return ""
  if (sweepDeg >= 359.999) {
    return [
      `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="CURRENT" />`,
      `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${BG}" />`,
    ].join("")
  }

  const endDeg = startDeg + sweepDeg
  const large = sweepDeg > 180 ? 1 : 0
  const o1 = polar(cx, cy, outerR, startDeg)
  const o2 = polar(cx, cy, outerR, endDeg)
  const i2 = polar(cx, cy, innerR, endDeg)
  const i1 = polar(cx, cy, innerR, startDeg)

  return `<path d="M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y} Z" fill="CURRENT" />`
}

function buildSlices(data) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  let angle = -90
  return data.map((item, index) => {
    const sweep = (item.value / total) * 360
    const slice = {
      ...item,
      color: COLORS[index % COLORS.length],
      percent: (item.value / total) * 100,
      start: angle,
      sweep,
    }
    angle += sweep
    return slice
  })
}

function formatValue(value, suffix) {
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("ru-RU")
    : value.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${formatted}${suffix}`
}

function buildSvg(title, data, { suffix = "", centerLabel = null }) {
  const slices = buildSlices(data)
  const cx = 200
  const cy = 220
  const outerR = 108
  const innerR = 62

  const paths = slices
    .map((s) => donutSlice(cx, cy, outerR, innerR, s.start, s.sweep).replace(/CURRENT/g, s.color))
    .join("\n")

  const legendX = 390
  const legendItems = slices
    .map((s, i) => {
      const y = 72 + i * 34
      return `
        <circle cx="${legendX}" cy="${y}" r="5" fill="${s.color}" />
        <text x="${legendX + 14}" y="${y + 4}" fill="${FG}" font-size="13" font-family="system-ui,Segoe UI,sans-serif">${escapeXml(s.label)}</text>
        <text x="${legendX + 14}" y="${y + 18}" fill="${MUTED}" font-size="11" font-family="system-ui,Segoe UI,sans-serif">${formatValue(s.value, suffix)} · ${s.percent.toFixed(1).replace(".", ",")}%</text>
      `
    })
    .join("")

  const center =
    centerLabel ??
    (slices[0]
      ? `<text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="${FG}" font-size="22" font-weight="700" font-family="system-ui,Segoe UI,sans-serif">${slices[0].percent.toFixed(1).replace(".", ",")}%</text>
         <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="${MUTED}" font-size="11" font-family="system-ui,Segoe UI,sans-serif">${escapeXml(slices[0].label.length > 18 ? "Топ источник" : slices[0].label)}</text>`
      : "")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400" viewBox="0 0 720 400">
  <rect width="720" height="400" rx="12" fill="${BG}" stroke="${BORDER}" stroke-width="1"/>
  <text x="24" y="36" fill="${FG}" font-size="15" font-weight="600" font-family="system-ui,Segoe UI,sans-serif">${escapeXml(title)}</text>
  ${paths}
  ${center}
  ${legendItems}
</svg>`
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

async function saveChart(filename, svg) {
  const webpPath = join(OUT_DIR, filename)
  await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(webpPath)
  console.log("Wrote", webpPath)
}

const vkMusicSources = [
  { label: "Лента новостей", value: 73.6 },
  { label: "Другое", value: 23.2 },
  { label: "Раздел Моя Музыка", value: 1.6 },
  { label: "Прочее", value: 1.6 },
]

const bandlinkServices = [
  { label: "Яндекс Музыка", value: 1177 },
  { label: "VK Музыка", value: 728 },
  { label: "Звук", value: 195 },
  { label: "МТС Музыка", value: 125 },
  { label: "Spotify", value: 75 },
  { label: "Deezer", value: 71 },
  { label: "Apple Music", value: 38 },
  { label: "Прочее", value: 34 },
]

await mkdir(OUT_DIR, { recursive: true })

await saveChart(
  "vk-music-sources.webp",
  buildSvg("Доли источников прослушиваний, %", vkMusicSources, {
    suffix: "%",
    centerLabel: `<text x="200" y="214" text-anchor="middle" fill="${FG}" font-size="22" font-weight="700" font-family="system-ui,Segoe UI,sans-serif">73,6%</text>
      <text x="200" y="236" text-anchor="middle" fill="${MUTED}" font-size="11" font-family="system-ui,Segoe UI,sans-serif">Лента новостей</text>`,
  }),
)

await saveChart(
  "bandlink-services.webp",
  buildSvg("Распределение кликов по сервисам", bandlinkServices, {
    suffix: "",
    centerLabel: `<text x="200" y="214" text-anchor="middle" fill="${FG}" font-size="22" font-weight="700" font-family="system-ui,Segoe UI,sans-serif">1 177</text>
      <text x="200" y="236" text-anchor="middle" fill="${MUTED}" font-size="11" font-family="system-ui,Segoe UI,sans-serif">Яндекс Музыка</text>`,
  }),
)
