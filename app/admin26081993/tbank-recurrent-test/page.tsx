"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RecurrentTestState = {
  customerKey: string
  parentOrderId: string | null
  parentPaymentId: string | null
  rebillId: string | null
  parentStatus: string | null
  childOrderId: string | null
  childPaymentId: string | null
  childStatus: string | null
  lastChargeError: string | null
  updatedAt: string
}

type StatusResponse = {
  enabled?: boolean
  error?: string
  state: RecurrentTestState | null
  checklist?: {
    test5InitWithRecurrentY: boolean
    test5RebillIdSaved: boolean
    test5ParentConfirmed: boolean
    test6ChildInit: boolean
    test6ChildConfirmed: boolean
  }
}

export default function TbankRecurrentTestPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"parent" | "child" | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/tbank/recurrent-test", { credentials: "include" })
      const data = (await res.json().catch(() => ({}))) as StatusResponse
      if (res.status === 404) {
        setStatus({ error: "disabled", state: null })
        return
      }
      if (!res.ok) {
        setStatus({ error: data.error || "Unauthorized", state: null })
        return
      }
      setStatus(data)
    } catch {
      setStatus({ error: "network", state: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    const timer = setInterval(() => void loadStatus(), 4000)
    return () => clearInterval(timer)
  }, [loadStatus])

  const startParent = async () => {
    setBusy("parent")
    try {
      const res = await fetch("/api/payments/tbank/recurrent-test", {
        method: "POST",
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        paymentUrl?: string
      }
      if (!res.ok) {
        toast.error(data.error || "Не удалось создать платёж")
        return
      }
      toast.success("Родительский платёж создан. Карта: 4000 0000 0000 0333, 12/30, 111")
      await loadStatus()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }
    } finally {
      setBusy(null)
    }
  }

  const startChildCharge = async () => {
    setBusy("child")
    try {
      const res = await fetch("/api/payments/tbank/recurrent-test", {
        method: "PUT",
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        toast.error(data.error || "Charge не выполнен")
        await loadStatus()
        return
      }
      toast.success(data.message || "Charge отправлен")
      await loadStatus()
    } finally {
      setBusy(null)
    }
  }

  const checklist = status?.checklist
  const state = status?.state

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        <AdminSectionNav active="service-fulfillments" />

        <div>
          <h1 className="text-2xl font-bold">T-Bank: тест автоплатежей №5–6</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Служебная страница для прохождения проверок в ЛК Т-Бизнес. Не для клиентов.
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Загрузка…</p>
        ) : status?.error === "disabled" ? (
          <Card>
            <CardContent className="pt-6 text-sm">
              Добавьте <code className="text-xs">TBANK_RECURRENT_TEST_SECRET</code> в{" "}
              <code className="text-xs">.env</code> на сервере и перезапустите pm2.
            </CardContent>
          </Card>
        ) : status?.error ? (
          <Card>
            <CardContent className="pt-6 text-sm">
              Нужна авторизация в{" "}
              <Link href="/admin26081993" className="underline">
                админке
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
                <p>{checklist?.test5InitWithRecurrentY ? "✅" : "⬜"} Init с Recurrent=Y</p>
                <p>{checklist?.test5RebillIdSaved ? "✅" : "⬜"} RebillId сохранён (webhook)</p>
                <p>{checklist?.test5ParentConfirmed ? "✅" : "⬜"} Родительский платёж CONFIRMED</p>
                <p>{checklist?.test6ChildInit ? "✅" : "⬜"} Child Init + Charge отправлен</p>
                <p>{checklist?.test6ChildConfirmed ? "✅" : "⬜"} Дочерний платёж CONFIRMED</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Тест №5 - привязка карты</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Нажмите кнопку ниже (Init с Recurrent=Y).</li>
                  <li>Оплатите картой 4000 0000 0000 0333, срок 12/30, CVC 111.</li>
                  <li>Дождитесь RebillId в статусе (обновляется каждые 4 сек).</li>
                  <li>В ЛК Т-Бизнес → Автоплатежи → «Проверить» для теста №5.</li>
                </ol>
                <Button type="button" disabled={busy !== null} onClick={() => void startParent()}>
                  {busy === "parent" ? "Создание…" : "Создать родительский платёж"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Тест №6 - Charge по RebillId</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Сначала завершите тест №5 (RebillId должен появиться).</li>
                  <li>Нажмите кнопку - сервер выполнит Init child + Charge.</li>
                  <li>Дождитесь child_status = CONFIRMED.</li>
                  <li>В ЛК Т-Бизнес → «Проверить» для теста №6.</li>
                </ol>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy !== null || !state?.rebillId}
                  onClick={() => void startChildCharge()}
                >
                  {busy === "child" ? "Charge…" : "Выполнить Charge (тест №6)"}
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
                {state?.lastChargeError ? (
                  <p className="text-sm text-destructive mt-3">Charge error: {state.lastChargeError}</p>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
