"use client"

import { useState } from "react"
import { Check, Copy, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n-context"

const TELEGRAM_URL = "https://t.me/parallaxmusic_rt"
const VK_URL = "https://vk.com/parallaxmusic_releaseteam"
const EMAIL = "parallaxmusiclabel@gmail.com"

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

type PromotionOrderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillMessage: string
  title?: string
  description?: string
}

export function PromotionOrderDialog({
  open,
  onOpenChange,
  prefillMessage,
  title,
  description,
}: PromotionOrderDialogProps) {
  const { t } = useI18n()
  const dialog = t.promotionLanding.orderDialog
  const [emailCopied, setEmailCopied] = useState(false)

  const telegramHref = `${TELEGRAM_URL}?text=${encodeURIComponent(prefillMessage)}`

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      toast.success(dialog.emailCopied)
      setEmailCopied(true)
      window.setTimeout(() => setEmailCopied(false), 2000)
    } catch {
      toast.error(dialog.emailCopyError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? dialog.title}</DialogTitle>
          <DialogDescription>{description ?? dialog.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button asChild size="lg" className="w-full justify-start gap-3 h-auto py-4">
            <a href={telegramHref} target="_blank" rel="noopener noreferrer">
              <TelegramIcon size={22} />
              {dialog.telegram}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full justify-start gap-3 h-auto py-4">
            <a href={VK_URL} target="_blank" rel="noopener noreferrer">
              <VkIcon size={22} />
              {dialog.vk}
            </a>
          </Button>
          <div className="rounded-lg border border-border bg-card/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Mail className="size-5 shrink-0 text-primary" aria-hidden />
              <a
                href={`mailto:${EMAIL}`}
                className="text-sm font-medium break-all hover:text-primary transition-colors"
              >
                {EMAIL}
              </a>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => void handleCopyEmail()}
            >
              {emailCopied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {emailCopied ? dialog.emailCopied : dialog.copyEmail}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
