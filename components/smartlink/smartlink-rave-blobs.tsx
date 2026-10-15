"use client"

import { useEffect, useRef } from "react"

/**
 * Рейв-кляксы: CSS-float + параллакс от мыши (только desktop / fine pointer).
 */
export function SmartlinkRaveBlobs() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    if (reduceMotion.matches || !finePointer.matches) return

    let raf = 0
    let targetX = 0
    let targetY = 0
    let curX = 0
    let curY = 0
    let active = true

    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      targetX = (e.clientX / w) * 2 - 1
      targetY = (e.clientY / h) * 2 - 1
    }

    const tick = () => {
      if (!active) return
      curX += (targetX - curX) * 0.14
      curY += (targetY - curY) * 0.14
      root.style.setProperty("--sl-rave-mx", curX.toFixed(4))
      root.style.setProperty("--sl-rave-my", curY.toFixed(4))
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      active = false
      window.removeEventListener("pointermove", onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="sl-rave-blobs pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <span className="sl-rave-parallax sl-rave-parallax-a">
        <span className="sl-rave-blob sl-rave-blob-a" />
      </span>
      <span className="sl-rave-parallax sl-rave-parallax-b">
        <span className="sl-rave-blob sl-rave-blob-b" />
      </span>
      <span className="sl-rave-parallax sl-rave-parallax-c">
        <span className="sl-rave-blob sl-rave-blob-c" />
      </span>
      <span className="sl-rave-parallax sl-rave-parallax-d">
        <span className="sl-rave-blob sl-rave-blob-d" />
      </span>
    </div>
  )
}
