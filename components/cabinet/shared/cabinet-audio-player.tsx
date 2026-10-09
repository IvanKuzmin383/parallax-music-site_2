"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

type CabinetAudioPlayerProps = {
  src: string
  title?: string
  className?: string
  /** Пауза других плееров при старте (например До/После). */
  onPlay?: (src: string) => void
  /** Регистрация DOM-элемента audio для внешней паузы. */
  audioRef?: (node: HTMLAudioElement | null) => void
}

export function CabinetAudioPlayer({
  src,
  title,
  className,
  onPlay,
  audioRef: exposeAudioRef,
}: CabinetAudioPlayerProps) {
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const seekingRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    return () => {
      const audio = audioElRef.current
      if (audio) {
        audio.pause()
        audio.src = ""
      }
    }
  }, [])

  const setNode = (node: HTMLAudioElement | null) => {
    audioElRef.current = node
    exposeAudioRef?.(node)
  }

  const toggle = () => {
    const audio = audioElRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      return
    }
    onPlay?.(src)
    void audio.play().catch(() => undefined)
  }

  const seekTo = (next: number) => {
    const audio = audioElRef.current
    if (!audio || !Number.isFinite(next)) return
    const capped =
      duration > 0 ? Math.min(Math.max(0, next), duration) : Math.max(0, next)
    try {
      audio.currentTime = capped
      setTime(capped)
    } catch {
      /* ignore */
    }
  }

  const max = Math.max(duration, time, 0.1)

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/80 bg-background/60 px-2.5 py-2",
        className,
      )}
    >
      <audio
        ref={setNode}
        src={src}
        preload="metadata"
        title={title}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setTime(0)
        }}
        onTimeUpdate={() => {
          const audio = audioElRef.current
          if (!audio || seekingRef.current) return
          setTime(audio.currentTime)
        }}
        onLoadedMetadata={() => {
          const audio = audioElRef.current
          if (!audio) return
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration)
          }
        }}
        onDurationChange={() => {
          const audio = audioElRef.current
          if (!audio) return
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration)
          }
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={toggle}
        aria-label={playing ? "Пауза" : "Слушать"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
      </Button>
      <span className="w-9 shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {formatClock(time)}
      </span>
      <Slider
        className="flex-1"
        min={0}
        max={max}
        step={0.05}
        value={[Math.min(time, max)]}
        onValueChange={(v) => {
          seekingRef.current = true
          setTime(v[0] ?? 0)
        }}
        onValueCommit={(v) => {
          seekingRef.current = false
          seekTo(v[0] ?? 0)
        }}
      />
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {formatClock(duration)}
      </span>
    </div>
  )
}
