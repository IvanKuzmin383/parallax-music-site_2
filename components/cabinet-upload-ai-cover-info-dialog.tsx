"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CABINET_UPLOAD_ADDON_INFO } from "@/components/cabinet-upload-additional-services-section"
import { AI_COVER_REQUEST_PRICE_RUB } from "@/lib/track-constants"

type CabinetUploadAiCoverInfoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CabinetUploadAiCoverInfoDialog({ open, onOpenChange }: CabinetUploadAiCoverInfoDialogProps) {
  const info = CABINET_UPLOAD_ADDON_INFO.aiCover
  const images = info.exampleImages ?? []
  const [imageIndex, setImageIndex] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setImageIndex(0)
        onOpenChange(next)
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[98vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogDescription>{info.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Примеры работ:</p>
          {images.length ? (
            <div className="space-y-3">
              <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-md border border-border bg-muted">
                <img
                  src={images[imageIndex].src}
                  alt={images[imageIndex].alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {images.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 hover:bg-background"
                      onClick={() => setImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                      aria-label="Предыдущее изображение"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 hover:bg-background"
                      onClick={() => setImageIndex((prev) => (prev + 1) % images.length)}
                      aria-label="Следующее изображение"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {imageIndex + 1} / {images.length}
              </p>
            </div>
          ) : null}
          <div className="rounded-md bg-green-500/5 p-3">
            <p className="text-lg font-semibold">
              <span className="text-white">Стоимость: </span>
              <span className="text-red-500">{AI_COVER_REQUEST_PRICE_RUB} руб. / шт.</span>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
