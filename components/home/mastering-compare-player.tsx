"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"

type Mode = "before" | "after"

const SOURCES: Record<Mode, string> = {
  before: "/aimastering/before.mp3",
  after: "/aimastering/after.mp3",
}

export function MasteringComparePlayer({ beforeLabel, afterLabel }: { beforeLabel: string; afterLabel: string }) {
  const audioRefs = useRef<Record<Mode, HTMLAudioElement | null>>({ before: null, after: null })
  const [mode, setMode] = useState<Mode>("after")
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const audios = audioRefs.current
    return () => {
      audios.before?.pause()
      audios.after?.pause()
    }
  }, [])

  const switchMode = (next: Mode) => {
    if (next === mode) return
    const current = audioRefs.current[mode]
    const target = audioRefs.current[next]
    if (current && target) {
      target.currentTime = current.currentTime
      current.pause()
      if (playing) void target.play()
    }
    setMode(next)
  }

  const togglePlay = () => {
    const audio = audioRefs.current[mode]
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-2.5">
      {(Object.keys(SOURCES) as Mode[]).map((key) => (
        <audio
          key={key}
          ref={(el) => {
            audioRefs.current[key] = el
          }}
          src={SOURCES[key]}
          preload="none"
          onTimeUpdate={(e) => {
            if (key !== mode) return
            const el = e.currentTarget
            setProgress(el.duration ? el.currentTime / el.duration : 0)
          }}
          onEnded={() => {
            if (key === mode) setPlaying(false)
          }}
        />
      ))}

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90"
      >
        {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="ml-0.5 h-4 w-4" aria-hidden />}
      </button>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="inline-flex rounded-lg border border-border/50 bg-background/50 p-0.5 text-xs font-medium">
          {(["before", "after"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => switchMode(key)}
              aria-pressed={mode === key}
              className={cn(
                "rounded-md px-3 py-1 transition",
                mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "before" ? beforeLabel : afterLabel}
            </button>
          ))}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
