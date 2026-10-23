"use client"

import { useEffect, type ReactNode } from "react"
import { notifySmartlinkPixelClick } from "@/components/smartlink/smartlink-pixels-runtime"
import { fireSmartlinkEvent } from "@/lib/smartlink-analytics-client"

type SmartlinkTrackRootProps = {
  slug: string
  children: ReactNode
}

/**
 * Публичная аналитика: view при монтировании, click по data-атрибутам ссылок,
 * audio_unlock через CustomEvent с лендинга.
 * Ошибки сети не влияют на страницу.
 */
export function SmartlinkTrackRoot({ slug, children }: SmartlinkTrackRootProps) {
  useEffect(() => {
    if (!slug.trim()) return
    fireSmartlinkEvent(slug, "view")
  }, [slug])

  useEffect(() => {
    if (!slug.trim()) return

    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[data-sl-track]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      const key = anchor.getAttribute("data-sl-track")?.trim()
      if (!key) return
      fireSmartlinkEvent(slug, "click", {
        targetKey: key,
        targetUrl: anchor.href || undefined,
      })
      notifySmartlinkPixelClick(key)
    }

    const onAudioUnlock = () => {
      fireSmartlinkEvent(slug, "audio_unlock")
    }

    document.addEventListener("click", onClick, true)
    window.addEventListener("prllx-sl-audio-unlock", onAudioUnlock)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("prllx-sl-audio-unlock", onAudioUnlock)
    }
  }, [slug])

  return <>{children}</>
}

export function notifySmartlinkAudioUnlocked(): void {
  if (typeof window === "undefined") return
  try {
    window.dispatchEvent(new Event("prllx-sl-audio-unlock"))
  } catch {
    // ignore
  }
}
