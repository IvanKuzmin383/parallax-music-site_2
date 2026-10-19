"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getParallaxMaxUrl,
  PARALLAX_VK_URL,
  parallaxTelegramConsultHref,
} from "@/lib/parallax-contacts"
import { cn } from "@/lib/utils"

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function VkIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.847 2.462 2.253 4.624 2.836 4.624.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.154-3.574 2.154-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.203.339-.271.508 0 .847.203.271.847 1.017 1.287 1.677.847 1.186 1.49 2.186 1.662 2.677.17.491-.085.744-.576.744z" />
    </svg>
  )
}

function MaxIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.1 2 11.2c0 2.9 1.45 5.5 3.72 7.2V22l3.55-1.95c.88.24 1.8.37 2.73.37 5.52 0 10-4.1 10-9.22S17.52 2 12 2zm1.1 12.4l-2.55-2.72-4.98 2.72L12.4 7.6l2.6 2.72 4.93-2.72-6.83 7.8z" />
    </svg>
  )
}

type PromotionFreeConsultButtonProps = {
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "outline" | "secondary" | "ghost"
  /** Текст для предзаполнения в Telegram. */
  prefillMessage?: string
}

export function PromotionFreeConsultButton({
  className,
  size = "sm",
  variant = "outline",
  prefillMessage = "Здравствуйте! Нужна бесплатная консультация по продвижению.",
}: PromotionFreeConsultButtonProps) {
  const [open, setOpen] = useState(false)
  const maxUrl = getParallaxMaxUrl()
  const telegramHref = parallaxTelegramConsultHref(prefillMessage)

  const openSupport = () => {
    setOpen(false)
    openCabinetSupportChat()
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        onClick={() => setOpen(true)}
      >
        Бесплатная консультация
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Бесплатная консультация</DialogTitle>
            <DialogDescription>
              Выберите удобный канал - ответим и подскажем по продвижению.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 pt-1">
            <Button asChild size="lg" variant="outline" className="h-auto w-full justify-start gap-3 py-3.5">
              <a href={PARALLAX_VK_URL} target="_blank" rel="noopener noreferrer">
                <VkIcon size={22} />
                ВКонтакте
              </a>
            </Button>
            {maxUrl ? (
              <Button asChild size="lg" variant="outline" className="h-auto w-full justify-start gap-3 py-3.5">
                <a href={maxUrl} target="_blank" rel="noopener noreferrer">
                  <MaxIcon size={22} />
                  Макс
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-auto w-full justify-start gap-3 py-3.5"
                onClick={openSupport}
              >
                <MaxIcon size={22} />
                Макс
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="h-auto w-full justify-start gap-3 py-3.5">
              <a href={telegramHref} target="_blank" rel="noopener noreferrer">
                <TelegramIcon size={22} />
                Telegram
              </a>
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-auto w-full justify-start gap-3 py-3.5"
              onClick={openSupport}
            >
              <MessageCircle className="size-[22px] shrink-0" aria-hidden />
              Чат с поддержкой
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
