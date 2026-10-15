"use client"

import { ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { CabinetKycStatusView } from "@/lib/cabinet/types"

type Props = {
  open: boolean
  status: CabinetKycStatusView
  onOpenChange: (open: boolean) => void
  onStartVerification: () => void
  onDismiss: () => void
}

export function CabinetKycRequiredDialog({
  open,
  status,
  onOpenChange,
  onStartVerification,
  onDismiss,
}: Props) {
  const pending = status === "pending"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl">
            {pending ? "Заявка на проверке" : "Нужна верификация"}
          </DialogTitle>
          <DialogDescription className="text-pretty">
            {pending
              ? "Мы уже получили ваши данные. Обычно проверка занимает 1-2 рабочих дня. После одобрения можно загружать релизы и клипы."
              : "Чтобы отправлять релизы и видеоклипы в дистрибуцию, подтвердите личность. Это защита прав, ускоряет вывод роялти и помогает решать спорные ситуации."}
          </DialogDescription>
        </DialogHeader>

        {!pending ? (
          <ul className="space-y-2 rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <li>Быстрее и проще вывод роялти</li>
            <li>Подтверждение правообладателя перед дистрибуцией</li>
            <li>Защита аккаунта при претензиях по контенту</li>
            <li>Приоритет при разборе спорных ситуаций</li>
          </ul>
        ) : null}

        <div className="flex flex-col gap-2 pt-1">
          {!pending ? (
            <Button type="button" className="w-full" onClick={onStartVerification}>
              Пройти верификацию
            </Button>
          ) : null}
          <Button type="button" variant="ghost" className="w-full" onClick={onDismiss}>
            {pending ? "Понятно" : "Назад"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
