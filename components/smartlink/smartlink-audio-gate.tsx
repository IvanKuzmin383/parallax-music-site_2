"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import { SmartlinkPreviewAudio } from "@/components/smartlink/smartlink-preview-audio"
import { cn } from "@/lib/utils"

type SmartlinkAudioGateProps = {
  /** Если есть src - ждём клик по оверлею, затем запускаем entrance-анимации. */
  previewAudioSrc?: string | null
  /**
   * Превью в редакторе кабинета: без полноэкранного "Послушать отрывок?",
   * только компактная кнопка звука (звук выключен по умолчанию).
   */
  preview?: boolean
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
  preview = false,
  light,
  className,
  style,
  children,
}: SmartlinkAudioGateProps) {
  const hasAudio = Boolean(previewAudioSrc?.trim())
  /** Оверлей только на публичной странице, не в кабинете. */
  const needsGate = hasAudio && !preview
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
      {hasAudio && previewAudioSrc ? (
        <SmartlinkPreviewAudio
          src={previewAudioSrc}
          light={light}
          startUnlocked={preview || !needsGate}
          onUnlocked={onUnlocked}
        />
      ) : null}
      <div key={animKey} className="contents">
        {children}
      </div>
    </div>
  )
}
