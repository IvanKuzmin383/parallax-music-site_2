"use client"

export type SmartlinkClientEventType = "view" | "click" | "audio_unlock"

const SESSION_KEY = "prllx_sl_sid"

function readQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null
  try {
    const v = new URLSearchParams(window.location.search).get(name)
    return v?.trim() || null
  } catch {
    return null
  }
}

export function getSmartlinkSessionId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return `s_${Date.now().toString(36)}`
  }
}

function viewDeduped(slug: string): boolean {
  try {
    const key = `prllx_sl_view_${slug}`
    if (sessionStorage.getItem(key)) return true
    sessionStorage.setItem(key, "1")
    return false
  } catch {
    return false
  }
}

/** Безопасная отправка события; ошибки глотаем - страница не должна ломаться. */
export function fireSmartlinkEvent(
  slug: string,
  eventType: SmartlinkClientEventType,
  extra?: { targetKey?: string; targetUrl?: string },
): void {
  if (!slug.trim() || typeof window === "undefined") return
  if (eventType === "view" && viewDeduped(slug)) return

  const payload = {
    type: eventType,
    sessionId: getSmartlinkSessionId(),
    targetKey: extra?.targetKey ?? null,
    targetUrl: extra?.targetUrl ?? null,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    utmSource: readQueryParam("utm_source"),
    utmMedium: readQueryParam("utm_medium"),
    utmCampaign: readQueryParam("utm_campaign"),
  }

  const url = `/api/smartlink/${encodeURIComponent(slug)}/event`
  const body = JSON.stringify(payload)

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" })
      if (navigator.sendBeacon(url, blob)) return
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    }).catch(() => {})
  } catch {
    // ignore
  }
}
