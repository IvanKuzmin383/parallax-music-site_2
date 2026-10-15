"use client"

import { useEffect, useRef } from "react"
import { drawStoryVideoFrame } from "@/lib/story-video-canvas"
import type { StoryVideoProject } from "@/lib/story-video-theme"
import { cn } from "@/lib/utils"

type Props = {
  project: StoryVideoProject
  cover: HTMLImageElement | null
  peaks: Float32Array | null
  timeSec: number
  className?: string
  /** Логическое разрешение canvas (превью меньше экспорта). */
  width?: number
  height?: number
}

export function StoryVideoPreview({
  project,
  cover,
  peaks,
  timeSec,
  className,
  width = 360,
  height = 640,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true })
    if (!ctx) return
    drawStoryVideoFrame({
      ctx,
      width: canvas.width,
      height: canvas.height,
      timeSec,
      project,
      cover,
      peaks,
      frameIndex: Math.floor(timeSec * 30),
    })
  }, [project, cover, peaks, timeSec, width, height])

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
        className
      )}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="h-full w-full object-cover"
        aria-label="Превью сторис-видео"
      />
      {/* Safe zone hint */}
      <div className="pointer-events-none absolute inset-x-[8%] bottom-[9%] top-[10%] rounded-lg border border-dashed border-white/15" />
    </div>
  )
}
