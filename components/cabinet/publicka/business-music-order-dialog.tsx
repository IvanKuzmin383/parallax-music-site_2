"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BUSINESS_MUSIC_PRICE_RUB } from "@/lib/business-music-pricing"

const PRICE_LABEL = `${BUSINESS_MUSIC_PRICE_RUB.toLocaleString("ru-RU")} ₽ / трек`

type BusinessMusicOrderDialogProps = {
  triggerVariant?: "default" | "outline"
  triggerClassName?: string
  triggerLabel?: string
  onPaidFromBalance?: () => void
}

export function BusinessMusicOrderDialog({
  triggerVariant = "default",
  triggerClassName,
  triggerLabel = "Разместить",
  onPaidFromBalance,
}: BusinessMusicOrderDialogProps) {
  const [open, setOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [trackLink, setTrackLink] = useState("")
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState<"card" | "balance" | null>(null)

  const resetForm = () => {
    setProjectName("")
    setTrackLink("")
    setComment("")
  }

  const handlePay = async (payFromBalance = false) => {
    if (!projectName.trim()) {
      toast.error("Укажите название релиза или проекта")
      return
    }
    if (!comment.trim() || comment.trim().length < 2) {
      toast.error("Заполните комментарий к заказу")
      return
    }

    setSubmitting(payFromBalance ? "balance" : "card")
    try {
      const link = trackLink.trim()
      const res = await fetch("/api/cabinet/payments/business-music/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackTitle: projectName.trim(),
          trackLink: link || undefined,
          fileUrl: link || undefined,
          comment: comment.trim(),
          contactType: "telegram",
          contactValue: "@artist",
          returnPath: "/cabinet/publicka",
          ...(payFromBalance ? { payFromBalance: true } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(
          data.error ||
            (payFromBalance ? "Не удалось оплатить с баланса" : "Не удалось создать оплату")
        )
        return
      }
      if (data.paid === true) {
        toast.success("Оплата с баланса прошла успешно. Заказ принят в работу.")
        resetForm()
        setOpen(false)
        onPaidFromBalance?.()
        return
      }
      const payUrl =
        (typeof data.paymentUrl === "string" && data.paymentUrl) ||
        (typeof data.confirmationUrl === "string" && data.confirmationUrl) ||
        ""
      if (payUrl) {
        window.location.href = payUrl
        return
      }
      toast.error(payFromBalance ? "Не удалось оплатить с баланса" : "Не удалось создать оплату")
    } catch {
      toast.error(payFromBalance ? "Ошибка при оплате с баланса" : "Ошибка при создании оплаты")
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className={triggerClassName}>
          <Send className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Размещение в «Музыка для бизнеса»</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="publicka-project">Название релиза / проекта</Label>
            <Input
              id="publicka-project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Мой сингл"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publicka-link">Ссылка на трек</Label>
            <Input
              id="publicka-link"
              value={trackLink}
              onChange={(e) => setTrackLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publicka-comment">Комментарий</Label>
            <Textarea
              id="publicka-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Пожелания к заказу"
              rows={3}
            />
          </div>
          <p className="font-semibold">Итого: {PRICE_LABEL}</p>
          <div className="flex flex-col gap-1.5 sm:flex-row">
            <Button
              onClick={() => void handlePay(false)}
              disabled={Boolean(submitting)}
              className="w-full sm:flex-1"
            >
              {submitting === "card" ? "Создание..." : "Оплатить картой"}
            </Button>
            <Button
              onClick={() => void handlePay(true)}
              disabled={Boolean(submitting)}
              className="w-full sm:flex-1"
            >
              {submitting === "balance" ? "Оплата..." : "Оплатить с баланса"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
