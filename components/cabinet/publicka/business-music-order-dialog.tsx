"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BUSINESS_MUSIC_PRICE_RUB } from "@/lib/business-music-pricing"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"

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
  const [releaseId, setReleaseId] = useState("")
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState<"card" | "balance" | null>(null)
  const { releases, loading: releasesLoading } = useCabinetReleases()

  const selectableReleases = useMemo(
    () => releases.filter((r) => r.kind !== "draft"),
    [releases]
  )

  const selectedRelease = useMemo(
    () => selectableReleases.find((r) => r.id === releaseId) ?? null,
    [selectableReleases, releaseId]
  )

  const resetForm = () => {
    setReleaseId("")
    setComment("")
  }

  const handlePay = async () => {
    if (!selectedRelease) {
      toast.error("Выберите релиз из загруженных в кабинете")
      return
    }
    if (!comment.trim() || comment.trim().length < 2) {
      toast.error("Заполните комментарий к заказу")
      return
    }

    setSubmitting("balance")
    try {
      const res = await fetch("/api/cabinet/payments/business-music/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          releaseId: selectedRelease.id,
          trackTitle: selectedRelease.title,
          comment: comment.trim(),
          contactType: "telegram",
          contactValue: "@artist",
          returnPath: "/cabinet/publicka",
          payFromBalance: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Не удалось оплатить с баланса")
        return
      }
      if (data.paid === true) {
        toast.success("Оплата с баланса прошла успешно. Заказ принят в работу.")
        resetForm()
        setOpen(false)
        onPaidFromBalance?.()
        return
      }
      toast.error("Не удалось оплатить с баланса")
    } catch {
      toast.error("Ошибка при оплате с баланса")
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
            <Label htmlFor="publicka-release">Релиз из кабинета</Label>
            <Select
              value={releaseId || undefined}
              onValueChange={setReleaseId}
              disabled={Boolean(submitting) || releasesLoading}
            >
              <SelectTrigger id="publicka-release" className="w-full">
                <SelectValue
                  placeholder={
                    releasesLoading ? "Загрузка релизов..." : "Выберите релиз"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {selectableReleases.map((release) => (
                  <SelectItem key={release.id} value={release.id}>
                    {release.artist ? `${release.artist} - ${release.title}` : release.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!releasesLoading && selectableReleases.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Нет загруженных релизов.{" "}
                <Link
                  href="/cabinet/upload"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Загрузить релиз
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Выберите релиз, который уже загружен в кабинет.
              </p>
            )}
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
          <Button
            onClick={() => void handlePay()}
            disabled={Boolean(submitting) || selectableReleases.length === 0}
            className="w-full"
          >
            {submitting === "balance" ? "Оплата..." : "Оплатить с баланса"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
