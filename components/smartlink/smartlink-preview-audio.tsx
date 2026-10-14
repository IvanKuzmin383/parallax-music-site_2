"use client"

import { useEffect, useRef, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

type SmartlinkPreviewAudioProps = {
  src: string
  className?: string
  /** Светлая карточка - более тёмная кнопка. */
  light?: boolean
}

/**
 * Автостарт muted (политика браузеров) + кнопка звука.
 * src - короткий mp3-хук, не полный трек.
 */
export function SmartlinkPreviewAudio({ src, className, light }: SmartlinkPreviewAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.muted = true
    el.volume = 0.9
    const tryPlay = () => {
      void el.play().then(() => setReady(true)).catch(() => {
        // Автоплей заблокирован - кнопка всё равно позволит включить
        setReady(true)
      })
    }
    if (el.readyState >= 2) tryPlay()
    else el.addEventListener("canplay", tryPlay, { once: true })
    return () => {
      el.pause()
    }
  }, [src])

  const toggleMute = () => {
    const el = audioRef.current
    if (!el) return
    const next = !muted
    el.muted = next
    setMuted(next)
    if (!next) {
      void el.play().catch(() => undefined)
    }
  }

  return (
    <div className={cn("pointer-events-auto", className)}>
      <audio ref={audioRef} src={src} loop preload="auto" playsInline />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Включить звук" : "Выключить звук"}
        title={muted ? "Включить звук" : "Выключить звук"}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-transform hover:scale-105 active:scale-95",
          light
            ? "border-black/15 bg-white/80 text-[#161616] shadow-sm"
            : "border-white/25 bg-black/45 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
          !ready && "opacity-70",
        )}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </div>
  )
}
