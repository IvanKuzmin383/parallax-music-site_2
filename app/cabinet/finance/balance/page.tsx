"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { ComingSoonButton } from "@/components/cabinet/shared/coming-soon-button"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { Spinner } from "@/components/ui/spinner"

export default function FinanceBalancePage() {
  const { user, loading } = useCabinetSession()
  const balance = user?.streamingBalance ?? 0

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Баланс" description="Средства от стриминга и операции по счёту" />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Текущий баланс</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-4xl font-bold">{balance.toLocaleString("ru-RU")} ₽</p>
          <div className="flex flex-wrap gap-2">
            <ComingSoonButton>Пополнить</ComingSoonButton>
            <Button variant="outline" asChild>
              <Link href="/cabinet/finance/transactions">История операций</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Можно использовать для оплаты услуг — функция появится в ближайших обновлениях. Сейчас баланс роялти доступен для вывода в разделе{" "}
            <Link href="/cabinet/finance/royalty-withdrawal" className="text-primary underline">
              Вывод роялти
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
