"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { CabinetKycStatusView } from "@/lib/cabinet/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: CabinetKycStatusView
  rejectionReason: string | null
  canSubmit: boolean
  onSubmitted: () => void
}

function formatPassportInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)} ${digits.slice(4)}`
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  let d = digits
  if (d.startsWith("8")) d = `7${d.slice(1)}`
  if (!d.startsWith("7") && d.length > 0) d = `7${d}`
  const rest = d.slice(1)
  const p1 = rest.slice(0, 3)
  const p2 = rest.slice(3, 6)
  const p3 = rest.slice(6, 8)
  const p4 = rest.slice(8, 10)
  let out = "+7"
  if (p1) out += ` (${p1}`
  if (p1.length === 3) out += ")"
  if (p2) out += ` ${p2}`
  if (p3) out += `-${p3}`
  if (p4) out += `-${p4}`
  return out
}

export function CabinetKycFormDialog({
  open,
  onOpenChange,
  status,
  rejectionReason,
  canSubmit,
  onSubmitted,
}: Props) {
  const [lastName, setLastName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [patronymic, setPatronymic] = useState("")
  const [phone, setPhone] = useState("")
  const [passportNumber, setPassportNumber] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [prefillDone, setPrefillDone] = useState(false)

  useEffect(() => {
    if (!open || prefillDone) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/profile", { credentials: "include" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          user?: {
            lastName?: string
            firstName?: string
            patronymic?: string
            phone?: string
          }
        }
        const u = data.user
        if (!u) return
        setLastName(u.lastName ?? "")
        setFirstName(u.firstName ?? "")
        setPatronymic(u.patronymic ?? "")
        if (u.phone) setPhone(formatPhoneInput(u.phone))
        setPrefillDone(true)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, prefillDone])

  useEffect(() => {
    if (!open) {
      setFile(null)
      setConsent(false)
      setSubmitting(false)
      setPrefillDone(false)
    }
  }, [open])

  const locked = !canSubmit || status === "pending" || status === "verified"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (locked) return
    if (!consent) {
      toast.error("Нужно согласие на обработку паспортных данных")
      return
    }
    if (!file) {
      toast.error("Прикрепите скан документа")
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("lastName", lastName.trim())
      fd.append("firstName", firstName.trim())
      fd.append("patronymic", patronymic.trim())
      fd.append("phone", phone.trim())
      fd.append("passportNumber", passportNumber.trim())
      fd.append("birthDate", birthDate)
      fd.append("consentKyc", "true")
      fd.append("document", file)

      const res = await fetch("/api/cabinet/kyc", {
        method: "POST",
        body: fd,
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data.error || "Не удалось отправить заявку")
        return
      }
      toast.success("Заявка отправлена на проверку")
      onSubmitted()
    } catch {
      toast.error("Ошибка сети при отправке заявки")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Верификация аккаунта</DialogTitle>
          <DialogDescription>
            Подайте заявку на верификацию, чтобы пользоваться дистрибуцией и выводом роялти
          </DialogDescription>
        </DialogHeader>

        {status === "pending" ? (
          <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-950 ring-1 ring-inset ring-amber-600/35 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30">
            Заявка уже на проверке. Обычно это занимает 1-2 рабочих дня
          </p>
        ) : null}

        {status === "rejected" && rejectionReason ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive ring-1 ring-inset ring-destructive/30">
            Отклонено: {rejectionReason}
          </p>
        ) : null}

        {status === "verified" ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-950 ring-1 ring-inset ring-emerald-600/35 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-500/30">
              Аккаунт верифицирован
            </p>
            <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
          </div>
        ) : null}

        {status === "verified" ? null : (
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kyc-lastName">Фамилия *</Label>
              <Input
                id="kyc-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={locked || submitting}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kyc-firstName">Имя *</Label>
              <Input
                id="kyc-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={locked || submitting}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kyc-patronymic">Отчество</Label>
            <Input
              id="kyc-patronymic"
              value={patronymic}
              onChange={(e) => setPatronymic(e.target.value)}
              disabled={locked || submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kyc-phone">Номер телефона</Label>
            <Input
              id="kyc-phone"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder="+7 (xxx) xxx-xx-xx"
              disabled={locked || submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kyc-passport">Номер документа *</Label>
            <Input
              id="kyc-passport"
              value={passportNumber}
              onChange={(e) => setPassportNumber(formatPassportInput(e.target.value))}
              placeholder="xxxx xxxxxx"
              inputMode="numeric"
              disabled={locked || submitting}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kyc-birth">Дата рождения *</Label>
            <Input
              id="kyc-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={locked || submitting}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kyc-doc">Скан документа *</Label>
            <Input
              id="kyc-doc"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              disabled={locked || submitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">JPG, PNG, PDF до 10 МБ</p>
          </div>

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              disabled={locked || submitting}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Соглашаюсь на обработку персональных данных
            </span>
          </label>

          {!locked ? (
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Отправка...
                </>
              ) : (
                "Подать заявку"
              )}
            </Button>
          ) : null}
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
