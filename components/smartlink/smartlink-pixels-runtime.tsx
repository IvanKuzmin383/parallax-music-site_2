"use client"

import { useEffect } from "react"
import {
  hasSmartlinkPixels,
  type SmartlinkPixels,
} from "@/lib/smartlink-pixels"

type SmartlinkPixelsRuntimeProps = {
  pixels?: SmartlinkPixels | null
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    ttq?: {
      load: (id: string) => void
      page: () => void
      track: (name: string, props?: Record<string, unknown>) => void
    }
  }
}

function loadScript(src: string, id: string): void {
  if (typeof document === "undefined") return
  if (document.getElementById(id)) return
  const s = document.createElement("script")
  s.id = id
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

function initMeta(pixelId: string): void {
  if (typeof window === "undefined") return
  if (window.fbq) {
    window.fbq("init", pixelId)
    window.fbq("track", "PageView")
    return
  }
  const n = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = n as any
    fn.callMethod ? fn.callMethod(...args) : fn.queue.push(args)
  } as ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void
    queue: unknown[]
    loaded: boolean
    version: string
    push: (...args: unknown[]) => void
  }
  n.queue = []
  n.loaded = true
  n.version = "2.0"
  n.push = n
  window.fbq = n
  window._fbq = n
  loadScript("https://connect.facebook.net/en_US/fbevents.js", "prllx-meta-pixel")
  window.fbq("init", pixelId)
  window.fbq("track", "PageView")
}

function initGtag(ids: { ga?: string; ads?: string }): void {
  if (typeof window === "undefined") return
  const primary = ids.ga || ids.ads
  if (!primary) return
  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args)
    }
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primary)}`, "prllx-gtag")
    window.gtag("js", new Date())
  }
  if (ids.ga) window.gtag("config", ids.ga)
  if (ids.ads) window.gtag("config", ids.ads)
}

function initGtm(gtmId: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return
  if (document.getElementById("prllx-gtm")) return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" })
  const s = document.createElement("script")
  s.id = "prllx-gtm"
  s.async = true
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`
  document.head.appendChild(s)
}

function initTikTok(pixelId: string): void {
  if (typeof window === "undefined") return
  if (window.ttq?.page) {
    window.ttq.load(pixelId)
    window.ttq.page()
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ttq: any = (window.ttq = window.ttq || [])
  ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"]
  ttq.setAndDefer = function (t: { [k: string]: unknown }, e: string) {
    t[e] = function (...args: unknown[]) {
      t.push([e, ...args])
    }
  }
  for (const m of ttq.methods) ttq.setAndDefer(ttq, m)
  ttq.load = function (id: string) {
    loadScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`, "prllx-tiktok-pixel")
    ttq._i = ttq._i || {}
    ttq._i[id] = []
    ttq._i[id]._u = `https://analytics.tiktok.com/i18n/pixel/events.js`
    ttq._t = ttq._t || {}
    ttq._t[id] = Date.now()
    ttq._o = ttq._o || {}
    ttq._o[id] = {}
  }
  ttq.load(pixelId)
  ttq.page()
}

function fireClickPixels(pixels: SmartlinkPixels, targetKey: string): void {
  try {
    if (pixels.metaPixelId && window.fbq) {
      window.fbq("trackCustom", "SmartlinkClick", { content_name: targetKey })
    }
    if ((pixels.gaMeasurementId || pixels.googleAdsId) && window.gtag) {
      window.gtag("event", "smartlink_click", {
        event_category: "smartlink",
        event_label: targetKey,
      })
    }
    if (pixels.tiktokPixelId && window.ttq?.track) {
      window.ttq.track("ClickButton", { contents: [{ content_id: targetKey }] })
    }
  } catch {
    // ignore pixel errors
  }
}

/**
 * Подключает пиксели только на публичной странице.
 * ID уже прошли sanitize в parseSmartlinkPixels.
 */
export function SmartlinkPixelsRuntime({ pixels }: SmartlinkPixelsRuntimeProps) {
  useEffect(() => {
    if (!hasSmartlinkPixels(pixels) || !pixels) return

    try {
      if (pixels.metaPixelId) initMeta(pixels.metaPixelId)
      if (pixels.gtmId) initGtm(pixels.gtmId)
      if (pixels.gaMeasurementId || pixels.googleAdsId) {
        initGtag({ ga: pixels.gaMeasurementId, ads: pixels.googleAdsId })
      }
      if (pixels.tiktokPixelId) initTikTok(pixels.tiktokPixelId)
    } catch {
      // ignore
    }

    const onPixelClick = (event: Event) => {
      const detail = (event as CustomEvent<{ targetKey?: string }>).detail
      const key = detail?.targetKey?.trim()
      if (!key || !pixels) return
      fireClickPixels(pixels, key)
    }
    window.addEventListener("prllx-sl-pixel-click", onPixelClick)
    return () => window.removeEventListener("prllx-sl-pixel-click", onPixelClick)
  }, [pixels])

  return null
}

export function notifySmartlinkPixelClick(targetKey: string): void {
  if (typeof window === "undefined" || !targetKey.trim()) return
  try {
    window.dispatchEvent(
      new CustomEvent("prllx-sl-pixel-click", { detail: { targetKey: targetKey.trim() } }),
    )
  } catch {
    // ignore
  }
}
