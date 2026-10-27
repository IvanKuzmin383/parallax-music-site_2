"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react"
import { Pause, Play, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const DEMO_AUDIO_SRC = "/audio/lyrics-sync-demo.mp3"
/** Fallback, пока metadata ещё не загрузилась (~15.96 сек у файла). */
const DEMO_DURATION_FALLBACK_SEC = 15.96

const DEMO_LINES = [
  { start: 0.0, text: "Ах, глазки" },
  { start: 1.0, text: "что со мной?" },
  { start: 4.0, text: "Пленили вы меня." },
  { start: 8.0, text: "Ах, глазки" },
  { start: 9.0, text: "что со мной?" },
  { start: 12.0, text: "Красавица моя." },
] as const

export type LyricsDemoMode = "sync" | "plain"

export type LyricsSyncDemoHandle = {
  play: () => void
  pause: () => void
  toggle: () => void
  isPlaying: () => boolean
  isEnded: () => boolean
}

function activeLineIndex(timeSec: number): number {
  let idx = 0
  for (let i = 0; i < DEMO_LINES.length; i++) {
    if (timeSec >= DEMO_LINES[i].start) idx = i
  }
  return idx
}

function formatClock(sec: number, durationSec: number): string {
  const clamped = Math.max(0, Math.min(durationSec, sec))
  const whole = Math.floor(clamped + 1e-6)
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function scrollToLyricsDemo(phoneRef: RefObject<HTMLElement | null>) {
  const el = phoneRef.current
  if (!el) return
  const rect = el.getBoundingClientRect()
  const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
  if (fullyVisible) return
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "nearest",
  })
}

type LyricsSyncDemoProps = {
  phoneRef?: RefObject<HTMLDivElement | null>
  onPlayingChange?: (playing: boolean, ended: boolean) => void
  className?: string
}

export const LyricsSyncDemo = forwardRef<LyricsSyncDemoHandle, LyricsSyncDemoProps>(
  function LyricsSyncDemo({ phoneRef, onPlayingChange, className }, ref) {
    const sliderId = useId()
    const modeId = useId()
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const playingRef = useRef(false)

    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(DEMO_DURATION_FALLBACK_SEC)
    const [playing, setPlaying] = useState(false)
    const [mode, setMode] = useState<LyricsDemoMode>("sync")
    const [audioError, setAudioError] = useState(false)

    const stopRaf = useCallback(() => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }, [])

    const notify = useCallback(
      (isPlaying: boolean, time: number, dur: number) => {
        onPlayingChange?.(isPlaying, dur > 0 && time >= dur - 0.05)
      },
      [onPlayingChange],
    )

    const syncFromAudio = useCallback(() => {
      const audio = audioRef.current
      if (!audio) return
      const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
      setCurrentTime(t)
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }, [])

    const pause = useCallback(() => {
      const audio = audioRef.current
      playingRef.current = false
      setPlaying(false)
      stopRaf()
      audio?.pause()
      syncFromAudio()
      const dur =
        audio && Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : DEMO_DURATION_FALLBACK_SEC
      notify(false, audio?.currentTime ?? 0, dur)
    }, [notify, stopRaf, syncFromAudio])

    const tick = useCallback(() => {
      if (!playingRef.current) return
      syncFromAudio()
      const audio = audioRef.current
      if (audio && !audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }, [syncFromAudio])

    const play = useCallback(() => {
      const audio = audioRef.current
      if (!audio || audioError) return

      const dur =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : DEMO_DURATION_FALLBACK_SEC
      if (audio.ended || audio.currentTime >= dur - 0.05) {
        audio.currentTime = 0
        setCurrentTime(0)
      }

      playingRef.current = true
      setPlaying(true)
      notify(true, audio.currentTime, dur)
      stopRaf()
      void audio
        .play()
        .then(() => {
          rafRef.current = requestAnimationFrame(tick)
        })
        .catch(() => {
          playingRef.current = false
          setPlaying(false)
          setAudioError(true)
          notify(false, audio.currentTime, dur)
        })
    }, [audioError, notify, stopRaf, tick])

    const toggle = useCallback(() => {
      if (playingRef.current) pause()
      else play()
    }, [pause, play])

    useImperativeHandle(
      ref,
      () => ({
        play,
        pause,
        toggle,
        isPlaying: () => playingRef.current,
        isEnded: () => {
          const audio = audioRef.current
          if (!audio) return false
          const dur =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration
              : DEMO_DURATION_FALLBACK_SEC
          return audio.ended || audio.currentTime >= dur - 0.05
        },
      }),
      [play, pause, toggle],
    )

    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return

      const onLoaded = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration)
        }
        setAudioError(false)
      }
      const onEnded = () => {
        playingRef.current = false
        setPlaying(false)
        stopRaf()
        syncFromAudio()
        const dur =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : DEMO_DURATION_FALLBACK_SEC
        notify(false, dur, dur)
      }
      const onPause = () => {
        if (!playingRef.current) return
        // Пауза извне (не наша кнопка) - синхронизируем UI
        if (audio.paused && !audio.ended) {
          playingRef.current = false
          setPlaying(false)
          stopRaf()
        }
      }
      const onError = () => {
        setAudioError(true)
        playingRef.current = false
        setPlaying(false)
        stopRaf()
      }

      audio.addEventListener("loadedmetadata", onLoaded)
      audio.addEventListener("durationchange", onLoaded)
      audio.addEventListener("ended", onEnded)
      audio.addEventListener("pause", onPause)
      audio.addEventListener("error", onError)
      return () => {
        audio.removeEventListener("loadedmetadata", onLoaded)
        audio.removeEventListener("durationchange", onLoaded)
        audio.removeEventListener("ended", onEnded)
        audio.removeEventListener("pause", onPause)
        audio.removeEventListener("error", onError)
        playingRef.current = false
        audio.pause()
        stopRaf()
      }
    }, [notify, stopRaf, syncFromAudio])

    const ended = currentTime >= duration - 0.05 || (audioRef.current?.ended ?? false)
    const activeIdx = activeLineIndex(currentTime)

    const primaryLabel = playing
      ? "Пауза"
      : ended
        ? "Повторить пример"
        : audioError
          ? "Аудио недоступно"
          : "Запустить пример"
    const PrimaryIcon = playing ? Pause : ended ? RotateCcw : Play

    const onSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value)
      if (!Number.isFinite(value)) return
      const audio = audioRef.current
      if (playingRef.current) pause()
      if (audio) {
        audio.currentTime = Math.max(0, Math.min(duration, value))
      }
      setCurrentTime(Math.max(0, Math.min(duration, value)))
      notify(false, value, duration)
    }

    return (
      <div className={cn("mx-auto w-full max-w-[320px]", className)}>
        <audio ref={audioRef} src={DEMO_AUDIO_SRC} preload="metadata" playsInline />
        <div
          ref={phoneRef}
          id="lyrics-sync-demo"
          className="relative mx-auto w-full max-w-[300px] scroll-mt-24"
        >
          <div
            className={cn(
              "rounded-[28px] border-[3px] border-[#3A323C] bg-[#0C0B10]",
              "p-2 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.85)]",
            )}
          >
            <div className="overflow-hidden rounded-[22px] border border-[#302831] bg-[#151419]">
              <div className="flex items-center justify-between px-3 pt-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B8AFBD]">
                  Текст песни
                </p>
                <span className="rounded-md border border-[#F21D43]/30 bg-[#F21D43]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#FFB4C3]">
                  Визуальное демо
                </span>
              </div>

              <div className="px-3 pt-2">
                <div
                  className="mx-auto flex aspect-square w-[58%] max-w-[9.5rem] items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[#2A1820] via-[#161218] to-[#0A090C]"
                  aria-hidden
                >
                  <div
                    className={cn(
                      "lyrics-demo-vinyl relative flex h-[78%] w-[78%] items-center justify-center rounded-full",
                      "border border-[#F21D43]/30",
                      "bg-[radial-gradient(circle_at_50%_45%,#2a1a22_0%,#141018_55%,#0a090c_100%)]",
                      "shadow-[0_0_0_1px_rgba(242,29,67,0.12),inset_0_0_24px_rgba(0,0,0,0.55)]",
                      playing && "lyrics-demo-vinyl--playing",
                    )}
                  >
                    {/* Асимметрия обязательна - иначе вращение не видно */}
                    <div
                      aria-hidden
                      className="absolute inset-0 rounded-full opacity-90"
                      style={{
                        background:
                          "conic-gradient(from 210deg, transparent 0deg, rgba(242,29,67,0.22) 38deg, transparent 72deg, transparent 180deg, rgba(255,255,255,0.08) 210deg, transparent 250deg)",
                      }}
                    />
                    <div className="absolute inset-[8%] rounded-full border border-[#F21D43]/18" />
                    <div className="absolute inset-[18%] rounded-full border border-[#F21D43]/22" />
                    <div className="absolute inset-[28%] rounded-full border border-[#F21D43]/28" />
                    <div className="absolute inset-[38%] rounded-full border border-[#F21D43]/20" />
                    <div className="absolute inset-[46%] flex items-center justify-center overflow-hidden rounded-full border border-[#F21D43]/40 bg-gradient-to-br from-[#3a1824] via-[#1a1016] to-[#0C0A0E]">
                      <span className="select-none text-[9px] font-black uppercase tracking-[0.18em] text-[#FFB4C3]/90">
                        PRX
                      </span>
                    </div>
                    <div className="relative z-[1] h-2.5 w-2.5 rounded-full bg-[#F21D43] shadow-[0_0_10px_rgba(242,29,67,0.55)]" />
                  </div>
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="truncate text-sm font-semibold tracking-tight text-[#F7F4F6]">
                    Ах, глазки
                  </p>
                  <p className="truncate text-xs text-[#B8AFBD]">Пример синхронизации</p>
                </div>
              </div>

              <div className="mt-2 space-y-1.5 px-3 pb-0.5" aria-live="off">
                {DEMO_LINES.map((line, i) => {
                  const isActive = mode === "sync" && i === activeIdx
                  return (
                    <p
                      key={`${line.start}-${line.text}-${i}`}
                      className={cn(
                        "text-[12px] leading-snug transition-colors duration-200 motion-reduce:transition-none",
                        mode === "plain" && "font-normal text-[#F7F4F6]",
                        mode === "sync" && !isActive && "font-normal text-[#B8AFBD]/75",
                        isActive && "font-semibold text-[#F21D43]",
                      )}
                    >
                      {line.text}
                    </p>
                  )
                })}
              </div>

              <div className="mt-2 space-y-1.5 px-3 pb-2.5">
                <div className="flex items-center justify-between text-[10px] tabular-nums text-[#B8AFBD]">
                  <span>{formatClock(currentTime, duration)}</span>
                  <span>{formatClock(duration, duration)}</span>
                </div>
                <label className="sr-only" htmlFor={sliderId}>
                  Позиция примера в секундах
                </label>
                <input
                  id={sliderId}
                  type="range"
                  min={0}
                  max={duration || DEMO_DURATION_FALLBACK_SEC}
                  step={0.05}
                  value={Math.min(currentTime, duration || DEMO_DURATION_FALLBACK_SEC)}
                  onChange={onSliderChange}
                  className="h-1.5 w-full cursor-pointer accent-[#F21D43]"
                />
                <div className="flex justify-center pt-0.5">
                  <button
                    type="button"
                    disabled={audioError}
                    className="inline-flex h-10 min-h-10 min-w-10 items-center justify-center gap-2 rounded-full bg-[#F21D43] px-4 text-sm font-semibold text-white hover:bg-[#F21D43]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43]/60 disabled:opacity-50"
                    onClick={toggle}
                    aria-label={primaryLabel}
                  >
                    <PrimaryIcon className="h-4 w-4" aria-hidden />
                    <span>{primaryLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {audioError
            ? "Не удалось загрузить демо-аудио"
            : "Демонстрация подсветки со звуком"}
        </p>

        <div
          className="mt-3 flex rounded-[12px] border border-border/80 bg-card/60 p-1"
          role="radiogroup"
          aria-labelledby={modeId}
        >
          <span id={modeId} className="sr-only">
            Режим отображения текста
          </span>
          {(
            [
              { id: "plain", label: "Обычный текст" },
              { id: "sync", label: "Синхронный текст" },
            ] as const
          ).map((opt) => {
            const selected = mode === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn(
                  "h-10 min-h-10 flex-1 rounded-[10px] px-2 text-xs font-medium transition-colors",
                  selected
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMode(opt.id)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  },
)

export { DEMO_DURATION_FALLBACK_SEC as DEMO_DURATION_SEC, DEMO_LINES, DEMO_AUDIO_SRC }
