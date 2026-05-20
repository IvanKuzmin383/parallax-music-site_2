"use client"

import { useEffect, useRef } from "react"
import { useI18n } from "@/lib/i18n-context"

const PARTNER_LOGOS = [
  "/svg logo partners/1 (4).svg",
  "/svg logo partners/1 (11).svg",
  "/svg logo partners/1 (1).svg",
  "/svg logo partners/1 (17).svg",
  "/svg logo partners/1 (5).svg",
  "/svg logo partners/1 (19).svg",
  "/svg logo partners/1 (7).svg",
  "/svg logo partners/1 (14).svg",
  "/svg logo partners/1 (8).svg",
  "/svg logo partners/1 (6).svg",
  "/svg logo partners/1 (10).svg",
  "/svg logo partners/1 (3).svg",
  "/svg logo partners/1 (15).svg",
  "/svg logo partners/1 (13).svg",
  "/svg logo partners/1 (12).svg",
  "/svg logo partners/1 (16).svg",
  "/svg logo partners/1 (2).svg",
  "/svg logo partners/1 (18).svg",
  "/svg logo partners/1 (9).svg",
] as const

export function PartnerMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    const marquee = marqueeRef.current
    if (!marquee) return

    let animationFrameId: number
    let lastTimestamp: number | null = null
    let offset = 0

    const speed = 50
    const fullWidth = marquee.scrollWidth
    const resetWidth = fullWidth / 2

    const step = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp
      }

      const delta = timestamp - lastTimestamp
      lastTimestamp = timestamp

      offset -= (speed * delta) / 1000

      if (offset <= -resetWidth) {
        offset += resetWidth
      }

      marquee.style.transform = `translateX(${offset}px)`

      animationFrameId = requestAnimationFrame(step)
    }

    animationFrameId = requestAnimationFrame(step)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  const doubled = [...PARTNER_LOGOS, ...PARTNER_LOGOS]

  return (
    <div className="mt-20 px-2 overflow-hidden">
      <div ref={marqueeRef} className="flex items-center gap-12 md:gap-16 will-change-transform">
        {doubled.map((src, index) => (
          <div key={`${src}-${index}`} className="flex-shrink-0">
            <img
              src={src}
              alt={t.hero.partnerLogoAlt}
              width={260}
              height={120}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="h-16 md:h-20 w-auto opacity-90"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
