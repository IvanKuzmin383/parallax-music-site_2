"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import { SmartlinkPreviewAudio } from "@/components/smartlink/smartlink-preview-audio"
import { cn } from "@/lib/utils"

type SmartlinkAudioGateProps = {
  /** Если есть src - ждём клик по оверлею, затем запускаем entrance-анимации. */
  previewAudioSrc?: string | null
  light?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Пока висит "Послушать отрывок?", CSS-анимации смартлинка на паузе.
 * После клика контент перемонтируется - entrance играет с нуля, а не "уже отыграл".
 */
export function SmartlinkAudioGate({
  previewAudioSrc,
  light,
  className,
  style,
  children,
}: SmartlinkAudioGateProps) {
  const needsGate = Boolean(previewAudioSrc?.trim())
  const [unlocked, setUnlocked] = useState(!needsGate)
  const [animKey, setAnimKey] = useState(0)

  const onUnlocked = () => {
    setUnlocked(true)
    setAnimKey((k) => k + 1)
  }

  return (
    <div
      className={cn(className, needsGate && !unlocked && "sl-await-intro")}
      style={style}
    >
      {needsGate && previewAudioSrc ? (
        <SmartlinkPreviewAudio src={previewAudioSrc} light={light} onUnlocked={onUnlocked} />
      ) : null}
      <div key={animKey} className="contents">
        {children}
      </div>
    </div>
  )
}
