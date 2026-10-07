"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Receipt } from "lucide-react"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
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

export default function FinanceTransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Tx[]>([])

  useEffect(() => {
    void (async () => {
      setLoading(true)
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
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="История операций" />
      {transactions.length === 0 ? (
        <EmptyState
          title="Операций пока нет"
          description="Здесь появится история начислений, переводов и списаний"
          icon={Receipt}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
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
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
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
                        signed > 0 ? "text-emerald-400" : signed < 0 ? "text-amber-300" : ""
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
    </div>
  )
}
