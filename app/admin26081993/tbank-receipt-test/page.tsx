"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ReceiptTestState = {
  orderId: string | null
  paymentId: string | null
  receiptEmail: string | null
  paymentStatus: string | null
  refundStatus: string | null
  lastRefundError: string | null
  updatedAt: string
}

type StatusResponse = {
  enabled?: boolean
  error?: string
  state: ReceiptTestState | null
  amountRub?: number
  checklist?: {
    test7InitWithReceipt: boolean
    test7PaymentConfirmed: boolean
    test8RefundRequested: boolean
    test8RefundCompleted: boolean
  }
  testCard?: { pan: string; exp: string; cvc: string }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

export default function TbankReceiptTestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-4 pt-20">Загрузка…</div>}>
      <TbankReceiptTestPageInner />
    </Suspense>
  )
}

function TbankReceiptTestPageInner() {
  const searchParams = useSearchParams()
  const returnHandledRef = useRef(false)

  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"pay" | "refund" | null>(null)
  const [email, setEmail] = useState("receipt-test@parallaxmusic.ru")

  const loadStatus = useCallback(async (): Promise<StatusResponse | null> => {
    try {
      const res = await fetch("/api/payments/tbank/receipt-test", { credentials: "include" })
      const data = (await res.json().catch(() => ({}))) as StatusResponse
      if (res.status === 404) {
        const next = { error: "disabled", state: null }
        setStatus(next)
        return next
      }
      if (!res.ok) {
        const next = { error: data.error || "Unauthorized", state: null }
        setStatus(next)
        return next
      }
      setStatus(data)
      if (data.state?.receiptEmail) {
        setEmail(data.state.receiptEmail)
      }
      return data
    } catch {
      const next = { error: "network", state: null }
      setStatus(next)
      return next
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    const timer = setInterval(() => void loadStatus(), 4000)
    return () => clearInterval(timer)
  }, [loadStatus])

  useEffect(() => {
    const payment = searchParams.get("payment")
    if (payment !== "return" || returnHandledRef.current) return
    returnHandledRef.current = true

    void (async () => {
      for (let i = 0; i < 8; i++) {
        const data = await loadStatus()
        if (data?.state?.paymentStatus === "CONFIRMED") {
          toast.success("Оплата подтверждена (CONFIRMED). Можно выполнять тест №8.")
          return
        }
        await sleep(1500)
      }
      toast.message("Ожидаем webhook… Статус обновится автоматически через несколько секунд.")
    })()
  }, [searchParams, loadStatus])

  const startPayment = async () => {
    setBusy("pay")
    try {
      const res = await fetch("/api/payments/tbank/receipt-test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        paymentUrl?: string
      }
      if (!res.ok) {
        toast.error(data.error || "Не удалось создать платёж")
        return
      }
      toast.success("Платёж с Receipt создан. Карта: 4000 0000 0000 0101")
      await loadStatus()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }
    } finally {
      setBusy(null)
    }
  }

  const startRefund = async () => {
    setBusy("refund")
    try {
      const res = await fetch("/api/payments/tbank/receipt-test", {
        method: "PUT",
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        toast.error(data.error || "Cancel не выполнен")
        await loadStatus()
        return
      }
      toast.success(data.message || "Cancel отправлен")
      await loadStatus()
    } finally {
      setBusy(null)
    }
  }

  const checklist = status?.checklist
  const state = status?.state
  const card = status?.testCard

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        <AdminSectionNav active="service-fulfillments" />

        <div>
          <h1 className="text-2xl font-bold">T-Bank: тест чеков №7–8</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Init с объектом Receipt и полный Cancel для проверки в ЛК Т-Бизнес.
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Загрузка…</p>
        ) : status?.error === "disabled" ? (
          <Card>
            <CardContent className="pt-6 text-sm space-y-2">
              <p>
                Добавьте в <code className="text-xs">.env</code> секрет (любой из):
              </p>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>
                  <code className="text-xs">TBANK_LK_TEST_SECRET=...</code>
                </li>
                <li>
                  <code className="text-xs">TBANK_RECURRENT_TEST_SECRET=...</code>
                </li>
              </ul>
              <p>Затем <code className="text-xs">pnpm build</code> и <code className="text-xs">pm2 restart</code>.</p>
            </CardContent>
          </Card>
        ) : status?.error ? (
          <Card>
            <CardContent className="pt-6 text-sm">
              Войдите в{" "}
              <Link href="/admin26081993" className="underline">
                админку
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Чеклист</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{checklist?.test7InitWithReceipt ? "✅" : "⬜"} Init с Receipt</p>
                <p>{checklist?.test7PaymentConfirmed ? "✅" : "⬜"} Оплата CONFIRMED</p>
                <p>{checklist?.test8RefundRequested ? "✅" : "⬜"} Cancel запрошен</p>
                <p>{checklist?.test8RefundCompleted ? "✅" : "⬜"} Возврат REFUNDED/CANCELED</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Тест №7 - чек при оплате</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  Сумма: <strong>{status?.amountRub ?? 100} ₽</strong>. Терминал с <strong>DEMO</strong> в названии.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="receipt-email">Email для чека</Label>
                  <Input
                    id="receipt-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="receipt-test@example.com"
                  />
                </div>
                {card ? (
                  <p className="text-muted-foreground">
                    Карта: <strong>{card.pan}</strong>, {card.exp}, CVC {card.cvc}
                  </p>
                ) : null}
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Создайте платёж - Init отправит Receipt.</li>
                  <li>Оплатите тестовой картой.</li>
                  <li>Дождитесь payment_status = CONFIRMED.</li>
                  <li>В ЛК → «Проверить» для теста №7.</li>
                </ol>
                <Button type="button" disabled={busy !== null} onClick={() => void startPayment()}>
                  {busy === "pay" ? "Создание…" : "Создать платёж с чеком"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Тест №8 - чек возврата</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Сначала завершите тест №7.</li>
                  <li>Нажмите «Выполнить Cancel» - полный возврат.</li>
                  <li>Дождитесь refund_status = REFUNDED или CANCELED.</li>
                  <li>В ЛК → «Проверить» для теста №8.</li>
                </ol>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy !== null || state?.paymentStatus !== "CONFIRMED"}
                  onClick={() => void startRefund()}
                >
                  {busy === "refund" ? "Cancel…" : "Выполнить Cancel (тест №8)"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Состояние</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto bg-muted p-3 rounded-md">
                  {JSON.stringify(state, null, 2)}
                </pre>
                {state?.lastRefundError ? (
                  <p className="text-sm text-destructive mt-3">Cancel error: {state.lastRefundError}</p>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
