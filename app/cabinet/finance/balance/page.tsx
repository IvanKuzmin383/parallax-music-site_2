"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Receipt } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { ComingSoonButton } from "@/components/cabinet/shared/coming-soon-button"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type Tx = {
  id: string
  type: string
  typeLabel: string
  amount: number
  royaltyDelta: number
  walletDelta: number
  note: string | null
  createdAt: string
}

type WithdrawalRequest = {
  id: string
  amount: number
  status: string
  createdAt: string
}

export default function FinanceBalancePage() {
  const { user, loading, refresh } = useCabinetSession()
  const walletBalance = user?.walletBalance ?? 0
  const royaltyBalance = user?.streamingBalance ?? 0

  const [transferOpen, setTransferOpen] = useState(false)
  const [amountStr, setAmountStr] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawalType, setWithdrawalType] = useState<"sbp" | "card">("sbp")
  const [phone, setPhone] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [bank, setBank] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])

  const [txLoading, setTxLoading] = useState(true)
  const [transactions, setTransactions] = useState<Tx[]>([])

  const hasPending = withdrawals.some((w) => w.status === "pending")

  const loadTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const res = await fetch("/api/cabinet/finance/transactions", {
        credentials: "include",
      })
      if (!res.ok) {
        setTransactions([])
        return
      }
      const data = (await res.json()) as { transactions?: Tx[] }
      setTransactions(data.transactions ?? [])
    } catch {
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }, [])

  const loadWithdrawals = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/withdrawals", { credentials: "include" })
      if (res.ok) {
        const data = (await res.json()) as { requests?: WithdrawalRequest[] }
        setWithdrawals(data.requests ?? [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void loadTransactions()
    void loadWithdrawals()
  }, [loadTransactions, loadWithdrawals])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get("withdraw") === "1") setWithdrawOpen(true)
    } catch {
      // ignore
    }
  }, [])

  const openTransfer = () => {
    setAmountStr(royaltyBalance > 0 ? String(royaltyBalance) : "")
    setTransferOpen(true)
  }

  const openWithdraw = () => {
    setWithdrawalType("sbp")
    setPhone("")
    setCardNumber("")
    setBank("")
    setRecipientName("")
    setWithdrawOpen(true)
  }

  const handleTransfer = async () => {
    const amount = Number(amountStr.replace(",", "."))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Укажите сумму больше 0")
      return
    }
    if (amount > royaltyBalance) {
      toast.error("Сумма больше доступных роялти")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/cabinet/finance/royalty-to-balance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; amount?: number }
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось перевести")
        return
      }
      toast.success(
        `Переведено ${(data.amount ?? amount).toLocaleString("ru-RU")} ₽ на баланс`
      )
      setTransferOpen(false)
      await refresh({ silent: true })
      void loadTransactions()
    } catch {
      toast.error("Не удалось перевести")
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async () => {
    if (!recipientName.trim()) {
      toast.error("Заполните ФИО получателя")
      return
    }
    if (withdrawalType === "sbp" && !phone.trim()) {
      toast.error("Укажите телефон для СБП")
      return
    }
    if (withdrawalType === "card" && (!cardNumber.trim() || !bank.trim())) {
      toast.error("Укажите номер карты и банк")
      return
    }
    setWithdrawSubmitting(true)
    try {
      const res = await fetch("/api/cabinet/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: royaltyBalance,
          type: withdrawalType,
          phone: withdrawalType === "sbp" ? phone : undefined,
          cardNumber: withdrawalType === "card" ? cardNumber : undefined,
          bank: withdrawalType === "card" ? bank : undefined,
          recipientName,
        }),
      })
      const result = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }
      if (res.ok && result.success) {
        toast.success("Запрос на вывод отправлен")
        setWithdrawOpen(false)
        await refresh({ silent: true })
        void loadWithdrawals()
        void loadTransactions()
      } else {
        toast.error(result.error || "Ошибка при отправке")
      }
    } catch {
      toast.error("Ошибка при отправке")
    } finally {
      setWithdrawSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Финансы" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Баланс кабинета
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-bold text-emerald-400">
              {walletBalance.toLocaleString("ru-RU")} ₽
            </p>
            <p className="text-sm text-muted-foreground">
              Можно использовать для оплаты услуг лейбла.
            </p>
            <div className="flex flex-wrap gap-2">
              <ComingSoonButton>Пополнить</ComingSoonButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Роялти</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-bold text-amber-400">
              {royaltyBalance.toLocaleString("ru-RU")} ₽
            </p>
            <p className="text-sm text-muted-foreground">
              Доступны к выводу или переводу на баланс кабинета.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={openTransfer}
                disabled={royaltyBalance <= 0}
              >
                На баланс
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={openWithdraw}
                disabled={royaltyBalance < 1000 || hasPending}
              >
                {hasPending ? "Заявка в обработке" : "Вывод роялти"}
              </Button>
            </div>
            {royaltyBalance > 0 && royaltyBalance < 1000 ? (
              <p className="text-xs text-muted-foreground">
                Минимальная сумма вывода - 1 000 ₽
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {withdrawals.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Заявки на вывод</h2>
          <div className="cabinet-scroll max-h-48 space-y-2 overflow-y-auto overscroll-contain pr-1">
            {withdrawals.map((w) => (
              <Card key={w.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <p className="font-medium">{w.amount.toLocaleString("ru-RU")} ₽</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(w.createdAt), "d MMM yyyy", { locale: ru })}
                    </p>
                  </div>
                  <StatusBadge
                    status={
                      w.status === "completed"
                        ? "completed"
                        : w.status === "pending"
                          ? "in_progress"
                          : "cancelled"
                    }
                    kind="generic"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section id="history" className="space-y-3">
        <h2 className="text-base font-semibold">История операций</h2>
        {txLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="Операций пока нет"
            description="Здесь появится история начислений, переводов и списаний"
            icon={Receipt}
          />
        ) : (
          <div className="cabinet-scroll max-h-[min(28rem,55vh)] overflow-auto overscroll-contain rounded-xl border border-border">
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Операция</th>
                  <th className="px-4 py-3 font-medium text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const signed =
                    t.walletDelta !== 0
                      ? t.walletDelta
                      : t.royaltyDelta !== 0
                        ? t.royaltyDelta
                        : t.amount
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {(() => {
                          try {
                            return format(new Date(t.createdAt), "d MMM yyyy, HH:mm", {
                              locale: ru,
                            })
                          } catch {
                            return t.createdAt
                          }
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <p>{t.typeLabel}</p>
                        {t.note ? (
                          <p className="text-xs text-muted-foreground">{t.note}</p>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono tabular-nums",
                          signed > 0
                            ? "text-emerald-400"
                            : signed < 0
                              ? "text-amber-300"
                              : ""
                        )}
                      >
                        {signed > 0 ? "+" : ""}
                        {signed.toLocaleString("ru-RU")} ₽
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Перевод роялти на баланс</DialogTitle>
            <DialogDescription>
              Средства спишутся с роялти и сразу появятся на балансе кабинета. Доступно:{" "}
              {royaltyBalance.toLocaleString("ru-RU")} ₽
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Сумма, ₽</Label>
            <Input
              id="transfer-amount"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
            />
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setAmountStr(String(royaltyBalance))}
            >
              Перевести всё
            </button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setTransferOpen(false)}
            >
              Отмена
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void handleTransfer()}>
              {submitting ? <Spinner className="mr-1 h-4 w-4" /> : null}
              Перевести
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="flex max-h-[min(92vh,44rem)] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-6 py-5 pr-12 text-left">
            <DialogTitle>Вывод роялти</DialogTitle>
            <DialogDescription>
              К выводу: {royaltyBalance.toLocaleString("ru-RU")} ₽. Выводится весь текущий
              баланс роялти. Минимум - 1 000 ₽.
            </DialogDescription>
          </DialogHeader>

          <div className="cabinet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-muted/25 px-4 py-3">
                <p className="text-xs text-muted-foreground">Сумма вывода</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {royaltyBalance.toLocaleString("ru-RU")} ₽
                </p>
              </div>

              <div className="space-y-3">
                <Label>Способ получения</Label>
                <RadioGroup
                  value={withdrawalType}
                  onValueChange={(v) => setWithdrawalType(v as "sbp" | "card")}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <label
                    htmlFor="withdraw-sbp"
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 transition-colors",
                      withdrawalType === "sbp" && "border-primary bg-primary/5"
                    )}
                  >
                    <RadioGroupItem value="sbp" id="withdraw-sbp" />
                    <span className="text-sm font-medium">СБП (телефон)</span>
                  </label>
                  <label
                    htmlFor="withdraw-card"
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 transition-colors",
                      withdrawalType === "card" && "border-primary bg-primary/5"
                    )}
                  >
                    <RadioGroupItem value="card" id="withdraw-card" />
                    <span className="text-sm font-medium">Банковская карта</span>
                  </label>
                </RadioGroup>
              </div>

              {withdrawalType === "sbp" ? (
                <div className="space-y-2">
                  <Label htmlFor="withdraw-phone">Телефон *</Label>
                  <Input
                    id="withdraw-phone"
                    placeholder="+7 (999) 123-45-67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="withdraw-card-number">Номер карты *</Label>
                    <Input
                      id="withdraw-card-number"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="withdraw-bank">Банк *</Label>
                    <Input
                      id="withdraw-bank"
                      placeholder="Название банка"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="withdraw-recipient">ФИО получателя *</Label>
                <Input
                  id="withdraw-recipient"
                  placeholder="Иванов Иван Иванович"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={withdrawSubmitting}
              onClick={() => setWithdrawOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={withdrawSubmitting || royaltyBalance < 1000 || hasPending}
              onClick={() => void handleWithdraw()}
            >
              {withdrawSubmitting ? <Spinner className="mr-1 h-4 w-4" /> : null}
              Отправить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
