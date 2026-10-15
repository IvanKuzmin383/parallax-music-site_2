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
 * Браузеры блокируют автоплей со звуком без жеста.
 * Поэтому сначала полноэкранный вопрос «Послушать отрывок?» -
 * клик/тач = жест пользователя, сразу play() со звуком.
 */
export function SmartlinkPreviewAudio({ src, className, light }: SmartlinkPreviewAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    el.loop = true
    el.playsInline = true
    el.preload = "auto"
    el.volume = 0.9
    // Подгружаем файл заранее, пока пользователь видит вопрос
    try {
      el.load()
    } catch {
      // ignore
    }

    const onPlaying = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => setFailed(true)

    el.addEventListener("playing", onPlaying)
    el.addEventListener("pause", onPause)
    el.addEventListener("error", onError)

    return () => {
      el.removeEventListener("playing", onPlaying)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("error", onError)
      el.pause()
    }
  }, [src])

  const startWithSound = () => {
    const el = audioRef.current
    if (!el) return

    setFailed(false)
    el.muted = false
    void el.play().then(
      () => {
        setUnlocked(true)
        setSoundOn(true)
        setPlaying(true)
      },
      () => {
        // На всякий случай - muted, всё равно закрываем оверлей
        el.muted = true
        void el.play().catch(() => setFailed(true))
        setUnlocked(true)
        setSoundOn(false)
        setPlaying(true)
      },
    )
  }

  const toggleSound = () => {
    const el = audioRef.current
    if (!el) return

    if (failed) {
      el.load()
      setFailed(false)
    }

    if (!soundOn) {
      el.muted = false
      setSoundOn(true)
      void el.play().then(
        () => setPlaying(true),
        () => {
          el.muted = true
          setSoundOn(false)
          setFailed(true)
        },
      )
      return
    }

    el.muted = true
    setSoundOn(false)
    if (el.paused) {
      void el.play().catch(() => undefined)
    }
  }

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" playsInline />

      {!unlocked ? (
        <button
          type="button"
          onClick={startWithSound}
          className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-4 bg-black/75 px-6 text-center backdrop-blur-md"
          aria-label="Послушать отрывок"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <Volume2 className="h-8 w-8" />
          </span>
          <span className="space-y-1.5">
            <span className="block text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Послушать отрывок?
            </span>
            <span className="block text-sm text-white/65">Коснитесь экрана, чтобы включить звук</span>
          </span>
        </button>
      ) : (
        <div
          className={cn(
            "pointer-events-auto absolute right-3 top-3 z-20 flex flex-col items-end gap-1 sm:right-5 sm:top-5",
            className,
          )}
        >
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "Выключить звук" : "Включить звук"}
            title={failed ? "Не удалось загрузить хук" : soundOn ? "Выключить звук" : "Включить звук"}
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
      )}
    </>
  )
}
