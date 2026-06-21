"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { Spinner } from "@/components/ui/spinner"
import { Download } from "lucide-react"

interface WithdrawalRequest {
  id: string
  amount: number
  status: string
  createdAt: string
}

interface StreamingReport {
  id: string
  amount: number
  fileName: string
  createdAt: string
}

export default function FinanceRoyaltyWithdrawalPage() {
  const { user, loading, refresh } = useCabinetSession()
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [reports, setReports] = useState<StreamingReport[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [withdrawalType, setWithdrawalType] = useState<"sbp" | "card">("sbp")
  const [phone, setPhone] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [bank, setBank] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const balance = user?.streamingBalance ?? 0
  const hasPending = withdrawals.some((w) => w.status === "pending")

  useEffect(() => {
    void (async () => {
      const [wRes, rRes] = await Promise.all([
        fetch("/api/cabinet/withdrawals", { credentials: "include" }),
        fetch("/api/cabinet/reports", { credentials: "include" }),
      ])
      if (wRes.ok) {
        const data = await wRes.json()
        setWithdrawals(data.requests ?? [])
      }
      if (rRes.ok) {
        const data = await rRes.json()
        setReports(data.reports ?? [])
      }
    })()
  }, [])

  const handleSubmit = async () => {
    if (!recipientName.trim()) {
      toast.error("Заполните ФИО получателя")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/cabinet/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: balance,
          type: withdrawalType,
          phone: withdrawalType === "sbp" ? phone : undefined,
          cardNumber: withdrawalType === "card" ? cardNumber : undefined,
          bank: withdrawalType === "card" ? bank : undefined,
          recipientName,
        }),
      })
      const result = await res.json()
      if (res.ok && result.success) {
        toast.success("Запрос на вывод отправлен")
        setDialogOpen(false)
        void refresh()
        const wRes = await fetch("/api/cabinet/withdrawals", { credentials: "include" })
        if (wRes.ok) {
          const data = await wRes.json()
          setWithdrawals(data.requests ?? [])
        }
      } else {
        toast.error(result.error || "Ошибка при отправке")
      }
    } catch {
      toast.error("Ошибка при отправке")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  }

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Вывод роялти" description="Доступно от 1 000 ₽. Выводится весь текущий баланс роялти." />

      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Доступно к выводу</p>
            <p className="text-3xl font-bold">{balance.toLocaleString("ru-RU")} ₽</p>
          </div>
          {balance >= 1000 ? (
            <Button onClick={() => setDialogOpen(true)} disabled={hasPending}>
              {hasPending ? "Заявка в обработке" : "Вывести"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Минимальная сумма вывода — 1 000 ₽</p>
          )}
        </CardContent>
      </Card>

      {withdrawals.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-semibold">Заявки на вывод</h2>
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <Card key={w.id}>
                <CardContent className="pt-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{w.amount.toLocaleString("ru-RU")} ₽</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(w.createdAt), "d MMM yyyy", { locale: ru })}
                    </p>
                  </div>
                  <StatusBadge status={w.status === "completed" ? "completed" : w.status === "pending" ? "in_progress" : "cancelled"} kind="generic" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {reports.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-semibold">Отчёты по роялти</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4 flex justify-between items-center gap-2">
                  <div>
                    <p className="font-medium">{r.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      +{r.amount.toLocaleString("ru-RU")} ₽ · {format(new Date(r.createdAt), "d MMM yyyy", { locale: ru })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/api/cabinet/reports/${r.id}/download`} download>
                      <Download className="h-4 w-4 mr-1" /> Скачать
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Вывод {balance.toLocaleString("ru-RU")} ₽</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={withdrawalType} onValueChange={(v) => setWithdrawalType(v as "sbp" | "card")}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sbp" id="sbp" />
                <Label htmlFor="sbp">СБП (телефон)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card">Банковская карта</Label>
              </div>
            </RadioGroup>
            {withdrawalType === "sbp" ? (
              <Input placeholder="+7 (999) 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} />
            ) : (
              <>
                <Input placeholder="Номер карты" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                <Input placeholder="Банк" value={bank} onChange={(e) => setBank(e.target.value)} />
              </>
            )}
            <Input placeholder="ФИО получателя" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? "Отправка..." : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
