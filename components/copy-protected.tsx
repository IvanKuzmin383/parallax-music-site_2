"use client"

import type { ClipboardEvent, DragEvent, MouseEvent, ReactNode } from "react"
import { cn } from "@/lib/utils"

type CopyProtectedProps = {
  children: ReactNode
  className?: string
}

function blockInteraction(event: ClipboardEvent | MouseEvent | DragEvent) {
  event.preventDefault()
}

export function CopyProtected({ children, className }: CopyProtectedProps) {
  return (
    <div
      className={cn("select-none", className)}
      onCopy={blockInteraction}
      onCut={blockInteraction}
      onContextMenu={blockInteraction}
      onDragStart={blockInteraction}
    >
      {children}
    </div>
  )
}
