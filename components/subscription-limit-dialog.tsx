"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type SubscriptionLimitDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  limit?: number | null
  /** limit — исчерпан лимит релизов; expired — закончился срок подписки */
  reason?: "limit" | "expired"
}

export function SubscriptionLimitDialog({
  open,
  onOpenChange,
  limit,
  reason = "limit",
}: SubscriptionLimitDialogProps) {
  const router = useRouter()

  const isExpired = reason === "expired"

  const message = isExpired
    ? "Срок действия подписки закончился. Чтобы снова загружать релизы, продлите подписку."
    : typeof limit === "number" && limit > 0
      ? `Текущий тариф предусматривает не более ${limit} активных релизов. Чтобы загрузить больше, необходимо расширить подписку.`
      : "Текущий тариф ограничивает количество активных релизов. Чтобы загрузить больше, необходимо расширить подписку."

  const handleGoToPricing = () => {
    onOpenChange(false)
    router.push("/#pricing")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isExpired ? "Подписка истекла" : "Лимит релизов исчерпан"}</DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </Button>
          <Button type="button" onClick={handleGoToPricing}>
            {isExpired ? "Продлить подписку" : "Расширить подписку"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

