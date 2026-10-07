"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { ComingSoonButton } from "@/components/cabinet/shared/coming-soon-button"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { Spinner } from "@/components/ui/spinner"

export default function FinanceBalancePage() {
  const { user, loading, refresh } = useCabinetSession()
  const walletBalance = user?.walletBalance ?? 0
  const royaltyBalance = user?.streamingBalance ?? 0

  const [transferOpen, setTransferOpen] = useState(false)
  const [amountStr, setAmountStr] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const openTransfer = () => {
    setAmountStr(royaltyBalance > 0 ? String(royaltyBalance) : "")
    setTransferOpen(true)
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
    } catch {
      toast.error("Не удалось перевести")
    } finally {
      setSubmitting(false)
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
      <PageHeader title="Баланс" description="Средства кабинета и перевод роялти" />

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
              <Button variant="outline" asChild>
                <Link href="/cabinet/finance/transactions">История операций</Link>
              </Button>
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
              <Button variant="outline" asChild>
                <Link href="/cabinet/finance/royalty-withdrawal">Вывод роялти</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
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
              {submitting ? <Spinner className="h-4 w-4 mr-1" /> : null}
              Перевести
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
