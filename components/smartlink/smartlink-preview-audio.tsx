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
 * Браузеры почти всегда блокируют автоплей со звуком без жеста.
 * Поэтому: сразу тихое воспроизведение (muted), по клику - звук.
 * src - короткий хук, не полный трек.
 */
export function SmartlinkPreviewAudio({ src, className, light }: SmartlinkPreviewAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Пользователь включил звук (после жеста). */
  const [soundOn, setSoundOn] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    let cancelled = false
    setFailed(false)
    setPlaying(false)
    setSoundOn(false)

    // Старт всегда muted - иначе Chrome/Safari режут play()
    el.muted = true
    el.defaultMuted = true
    el.volume = 0.9

    const onPlaying = () => {
      if (!cancelled) setPlaying(true)
    }
    const onPause = () => {
      if (!cancelled) setPlaying(false)
    }
    const onError = () => {
      if (!cancelled) setFailed(true)
    }

    el.addEventListener("playing", onPlaying)
    el.addEventListener("pause", onPause)
    el.addEventListener("error", onError)

    const tryMutedPlay = () => {
      if (cancelled) return
      el.muted = true
      void el.play().catch(() => {
        // Ждём жест пользователя на кнопке
        if (!cancelled) setPlaying(false)
      })
    }

    if (el.readyState >= 2) tryMutedPlay()
    else {
      el.addEventListener("canplay", tryMutedPlay, { once: true })
      el.load()
    }

    return () => {
      cancelled = true
      el.removeEventListener("playing", onPlaying)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("error", onError)
      el.pause()
    }
  }, [src])

  const toggleSound = () => {
    const el = audioRef.current
    if (!el) return

    if (failed) {
      el.load()
      setFailed(false)
    }

    if (!soundOn) {
      // Жест пользователя - можно снять mute
      el.muted = false
      setSoundOn(true)
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          el.muted = true
          setSoundOn(false)
          setFailed(true)
        })
      return
    }

    el.muted = true
    setSoundOn(false)
    if (el.paused) {
      void el.play().catch(() => undefined)
    }
  }

  return (
    <div className={cn("pointer-events-auto flex flex-col items-end gap-1", className)}>
      {/* muted={!soundOn}: старт без звука (политика браузера), после клика - со звуком */}
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="auto"
        playsInline
        muted={!soundOn}
        autoPlay
      />
      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundOn ? "Выключить звук" : "Включить звук"}
        title={
          failed
            ? "Не удалось загрузить хук"
            : soundOn
              ? "Выключить звук"
              : "Включить звук"
        }
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border px-3 backdrop-blur-md transition-transform hover:scale-105 active:scale-95",
          light
            ? "border-black/15 bg-white/85 text-[#161616] shadow-sm"
            : "border-white/25 bg-black/55 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
          failed && "border-red-400/50 text-red-200",
          !soundOn && !failed && playing && "ring-1 ring-white/40",
        )}
      >
        {failed || !soundOn ? (
          <VolumeX className="h-5 w-5 shrink-0" />
        ) : (
          <Volume2 className="h-5 w-5 shrink-0" />
        )}
        <span className="text-xs font-medium">
          {failed ? "Нет звука" : soundOn ? "Звук" : "Вкл. звук"}
        </span>
      </button>
    </div>
  )
}
