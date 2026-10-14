"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

const PAUSE_EVENT = "parallax-videoshot-pause"

type PauseDetail = { exceptId: string }

export type VideoShotPhoneProps = {
  src: string
  poster?: string
  caption?: string
  label: string
  /** Wider frame for hero; gallery uses default. */
  size?: "hero" | "gallery"
  className?: string
  /** Force loop; if omitted, loop only when duration is <= 20s. */
  loop?: boolean
}

export function VideoShotPhone({
  src,
  poster,
  caption,
  label,
  size = "gallery",
  className,
  loop: loopProp,
}: VideoShotPhoneProps) {
  const instanceId = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loopEnabled, setLoopEnabled] = useState(loopProp ?? true)

  useEffect(() => {
    const onPauseOthers = (event: Event) => {
      const detail = (event as CustomEvent<PauseDetail>).detail
      if (!detail || detail.exceptId === instanceId) return
      const video = videoRef.current
      if (!video || video.paused) return
      video.pause()
      setPlaying(false)
    }
    window.addEventListener(PAUSE_EVENT, onPauseOthers)
    return () => {
      window.removeEventListener(PAUSE_EVENT, onPauseOthers)
      const video = videoRef.current
      if (video) {
        video.pause()
        video.removeAttribute("src")
        video.load()
      }
    }
  }, [instanceId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)
    const onLoadedMeta = () => {
      if (typeof loopProp === "boolean") {
        setLoopEnabled(loopProp)
        return
      }
      const duration = video.duration
      setLoopEnabled(Number.isFinite(duration) && duration > 0 && duration <= 20)
    }
    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("ended", onEnded)
    video.addEventListener("loadedmetadata", onLoadedMeta)
    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("ended", onEnded)
      video.removeEventListener("loadedmetadata", onLoadedMeta)
    }
  }, [loopProp, src])

  const requestPlay = async () => {
    const video = videoRef.current
    if (!video || failed) return
    window.dispatchEvent(
      new CustomEvent<PauseDetail>(PAUSE_EVENT, { detail: { exceptId: instanceId } }),
    )
    video.muted = muted
    try {
      await video.play()
      setPlaying(true)
    } catch {
      setFailed(true)
      setPlaying(false)
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video || failed) return
    if (video.paused) {
      void requestPlay()
      return
    }
    video.pause()
    setPlaying(false)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video || failed) return
    const next = !video.muted
    video.muted = next
    setMuted(next)
  }

  const retry = () => {
    setFailed(false)
    const video = videoRef.current
    if (!video) return
    video.load()
  }

  const isHero = size === "hero"

  return (
    <figure className={cn("mx-auto flex w-full flex-col items-center", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden border-[6px] border-[#1A181E] bg-[#0B0A0E]",
          "shadow-[0_22px_48px_-22px_rgba(0,0,0,0.85),inset_0_0_0_1px_rgba(255,255,255,0.06)]",
          "rounded-[32px]",
          isHero ? "max-w-[15.5rem]" : "max-w-[15rem]",
        )}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-[7px] z-20 h-[18px] w-16 -translate-x-1/2 rounded-full bg-[#050506]"
          aria-hidden
        />
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[26px] bg-[#09090C]">
          {failed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-[12px] leading-snug text-[#B4ACB8]">
                Не удалось загрузить пример. Проверьте соединение и попробуйте снова.
              </p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-[#2D2730] bg-[#151419] px-3 text-[12px] font-medium text-[#F7F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Повторить
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="absolute inset-0 h-full w-full object-contain bg-black"
                playsInline
                preload="metadata"
                muted={muted}
                loop={loopEnabled}
                onError={() => setFailed(true)}
                aria-label={label}
              />
              <div className="absolute bottom-3 left-2.5 z-30 flex gap-1.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-black/55 px-3 text-[12px] font-medium text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43]"
                  aria-label={playing ? `Пауза: ${label}` : `Смотреть: ${label}`}
                >
                  {playing ? (
                    <Pause className="h-4 w-4" aria-hidden />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden />
                  )}
                  <span className="sr-only sm:not-sr-only sm:inline">
                    {playing ? "Пауза" : "Смотреть"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-white/25 bg-black/55 px-2.5 text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43]"
                  aria-label={muted ? "Включить звук" : "Выключить звук"}
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4" aria-hidden />
                  ) : (
                    <Volume2 className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {caption ? (
        <figcaption className="mt-3 max-w-[15rem] text-center text-sm text-[#B4ACB8]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
