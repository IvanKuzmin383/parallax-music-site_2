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

const DEMO_DURATION_SEC = 18

const DEMO_LINES = [
  { start: 0, text: "Город засыпает в огнях" },
  { start: 4.5, text: "Мы ещё не спим" },
  { start: 9, text: "Этот вечер сохрани" },
  { start: 13.5, text: "В памяти двоих" },
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

function formatClock(sec: number): string {
  const clamped = Math.max(0, Math.min(DEMO_DURATION_SEC, sec))
  const whole = Math.round(clamped)
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
    const [currentTime, setCurrentTime] = useState(4.5)
    const [playing, setPlaying] = useState(false)
    const [mode, setMode] = useState<LyricsDemoMode>("sync")
    const currentTimeRef = useRef(4.5)
    const playingRef = useRef(false)
    const rafRef = useRef<number | null>(null)
    const lastTsRef = useRef<number | null>(null)

    const stopRaf = useCallback(() => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTsRef.current = null
    }, [])

    const setTime = useCallback((next: number) => {
      const clamped = Math.max(0, Math.min(DEMO_DURATION_SEC, next))
      currentTimeRef.current = clamped
      setCurrentTime(clamped)
      return clamped
    }, [])

    const notify = useCallback(
      (isPlaying: boolean, time: number) => {
        onPlayingChange?.(isPlaying, time >= DEMO_DURATION_SEC)
      },
      [onPlayingChange]
    )

    const pause = useCallback(() => {
      playingRef.current = false
      setPlaying(false)
      stopRaf()
      notify(false, currentTimeRef.current)
    }, [notify, stopRaf])

    const tick = useCallback(
      (ts: number) => {
        if (!playingRef.current) return
        if (lastTsRef.current == null) lastTsRef.current = ts
        const delta = (ts - lastTsRef.current) / 1000
        lastTsRef.current = ts
        const next = setTime(currentTimeRef.current + delta)
        if (next >= DEMO_DURATION_SEC) {
          playingRef.current = false
          setPlaying(false)
          stopRaf()
          notify(false, DEMO_DURATION_SEC)
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      },
      [notify, setTime, stopRaf]
    )

    const play = useCallback(() => {
      let start = currentTimeRef.current
      if (start >= DEMO_DURATION_SEC) {
        start = setTime(0)
      }
      playingRef.current = true
      setPlaying(true)
      notify(true, start)
      stopRaf()
      lastTsRef.current = null
      rafRef.current = requestAnimationFrame(tick)
    }, [notify, setTime, stopRaf, tick])

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
        isEnded: () => currentTimeRef.current >= DEMO_DURATION_SEC,
      }),
      [play, pause, toggle]
    )

    useEffect(() => {
      return () => {
        playingRef.current = false
        stopRaf()
      }
    }, [stopRaf])

    const ended = currentTime >= DEMO_DURATION_SEC
    const activeIdx = activeLineIndex(currentTime)

    const primaryLabel = playing ? "Пауза" : ended ? "Повторить пример" : "Запустить пример"
    const PrimaryIcon = playing ? Pause : ended ? RotateCcw : Play

    const onSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value)
      if (!Number.isFinite(value)) return
      if (playingRef.current) pause()
      setTime(Math.round(value * 10) / 10)
      notify(false, currentTimeRef.current)
    }

    return (
      <div className={cn("mx-auto w-full max-w-[300px]", className)}>
        <div
          ref={phoneRef}
          id="lyrics-sync-demo"
          className="relative mx-auto w-full max-w-[280px] scroll-mt-24"
        >
          <div
            className={cn(
              "rounded-[28px] border-[3px] border-[#3A323C] bg-[#0C0B10]",
              "p-2.5 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.85)]"
            )}
          >
            <div className="overflow-hidden rounded-[22px] border border-[#302831] bg-[#151419]">
              <div className="flex items-center justify-between px-3.5 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B8AFBD]">
                  Текст песни
                </p>
                <span className="rounded-md border border-[#F21D43]/30 bg-[#F21D43]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#FFB4C3]">
                  Визуальное демо
                </span>
              </div>

              <div className="px-3.5 pt-3">
                <div
                  className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[16px] bg-gradient-to-br from-[#2A1820] via-[#161218] to-[#0A090C]"
                  aria-hidden
                >
                  <div className="relative flex h-[72%] w-[72%] items-center justify-center rounded-full border border-[#F21D43]/25 bg-[#1A1218]">
                    <div className="absolute inset-[22%] rounded-full border border-[#F21D43]/35 bg-[#0C0A0E]" />
                    <div className="relative h-3 w-3 rounded-full bg-[#F21D43]" />
                  </div>
                </div>
                <div className="mt-3 space-y-0.5">
                  <p className="truncate text-sm font-semibold tracking-tight text-[#F7F4F6]">
                    Пример трека
                  </p>
                  <p className="truncate text-xs text-[#B8AFBD]">Parallax Music</p>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 px-3.5 pb-1" aria-live="off">
                {DEMO_LINES.map((line, i) => {
                  const isActive = mode === "sync" && i === activeIdx
                  return (
                    <p
                      key={line.text}
                      className={cn(
                        "text-[13px] leading-snug transition-colors duration-200 motion-reduce:transition-none",
                        mode === "plain" && "font-normal text-[#F7F4F6]",
                        mode === "sync" && !isActive && "font-normal text-[#B8AFBD]/75",
                        isActive && "font-semibold text-[#F21D43]"
                      )}
                    >
                      {line.text}
                    </p>
                  )
                })}
              </div>

              <div className="mt-3 space-y-2 px-3.5 pb-3.5">
                <div className="flex items-center justify-between text-[10px] tabular-nums text-[#B8AFBD]">
                  <span>{formatClock(currentTime)}</span>
                  <span>{formatClock(DEMO_DURATION_SEC)}</span>
                </div>
                <label className="sr-only" htmlFor={sliderId}>
                  Позиция визуального примера в секундах
                </label>
                <input
                  id={sliderId}
                  type="range"
                  min={0}
                  max={DEMO_DURATION_SEC}
                  step={0.1}
                  value={currentTime}
                  onChange={onSliderChange}
                  className="h-2 w-full cursor-pointer accent-[#F21D43]"
                />
                <div className="flex justify-center pt-0.5">
                  <button
                    type="button"
                    className="inline-flex h-11 min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-[#F21D43] px-4 text-sm font-semibold text-white hover:bg-[#F21D43]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43]/60"
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
          Демонстрация подсветки · без звука
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
                    : "text-muted-foreground hover:text-foreground"
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
  }
)

export { DEMO_DURATION_SEC, DEMO_LINES }
