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
 * src - короткий хук, не полный трек.
 */
export function SmartlinkPreviewAudio({ src, className, light }: SmartlinkPreviewAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    setFailed(false)
    setPlaying(false)
    setMuted(true)
    el.muted = true
    el.defaultMuted = true
    el.volume = 0.9

    const onPlaying = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => setFailed(true)

    el.addEventListener("playing", onPlaying)
    el.addEventListener("pause", onPause)
    el.addEventListener("error", onError)

    const tryPlay = () => {
      el.muted = true
      void el.play().catch(() => {
        // Ждём жест пользователя - кнопка разблокирует
      })
    }

    if (el.readyState >= 2) tryPlay()
    else {
      el.addEventListener("canplay", tryPlay, { once: true })
      el.load()
    }

    return () => {
      el.removeEventListener("playing", onPlaying)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("error", onError)
      el.pause()
    }
  }, [src])

  const toggleMute = () => {
    const el = audioRef.current
    if (!el) return
    if (failed) {
      el.load()
      setFailed(false)
    }
    const nextMuted = !muted
    el.muted = nextMuted
    setMuted(nextMuted)
    void el.play().then(() => setPlaying(true)).catch(() => setFailed(true))
  }

  return (
    <div className={cn("pointer-events-auto flex flex-col items-end gap-1", className)}>
      <audio ref={audioRef} src={src} loop preload="auto" playsInline muted />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Включить звук" : "Выключить звук"}
        title={failed ? "Не удалось загрузить хук" : muted ? "Включить звук" : "Выключить звук"}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border px-3 backdrop-blur-md transition-transform hover:scale-105 active:scale-95",
          light
            ? "border-black/15 bg-white/85 text-[#161616] shadow-sm"
            : "border-white/25 bg-black/55 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
          failed && "border-red-400/50 text-red-200",
        )}
      >
        {muted || failed ? <VolumeX className="h-5 w-5 shrink-0" /> : <Volume2 className="h-5 w-5 shrink-0" />}
        <span className="text-xs font-medium">
          {failed ? "Нет звука" : muted ? "Вкл. звук" : playing ? "Звук" : "Звук"}
        </span>
      </button>
    </div>
  )
}
