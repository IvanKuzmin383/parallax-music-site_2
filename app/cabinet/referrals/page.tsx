"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Copy, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { MOCK_REFERRALS, MOCK_REFERRAL_STATS } from "@/lib/cabinet/mock"

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_REFERRAL_STATS.referralLink)
      setCopied(true)
      toast.success("Ссылка скопирована")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Не удалось скопировать")
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title="Партнёрка" description="Приглашайте артистов и получайте бонус с их заказов" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Реферальная ссылка</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <code className="flex-1 text-sm bg-muted px-3 py-2 rounded break-all">{MOCK_REFERRAL_STATS.referralLink}</code>
          <Button variant="outline" onClick={() => void copyLink()}>
            <Copy className="h-4 w-4 mr-2" />
            {copied ? "Скопировано" : "Скопировать"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Приглашено", value: MOCK_REFERRAL_STATS.invitedCount },
          { label: "Сумма заказов", value: `${MOCK_REFERRAL_STATS.ordersTotal.toLocaleString("ru-RU")} ₽` },
          { label: "Начислено", value: `${MOCK_REFERRAL_STATS.bonusEarned.toLocaleString("ru-RU")} ₽` },
          { label: "Доступно", value: `${MOCK_REFERRAL_STATS.availableBonus.toLocaleString("ru-RU")} ₽` },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Рефералы</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Регистрация</TableHead>
              <TableHead>Заказы</TableHead>
              <TableHead>Начисление</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_REFERRALS.map((ref) => (
              <TableRow key={ref.id}>
                <TableCell>{ref.userName}</TableCell>
                <TableCell>{format(new Date(ref.registeredAt), "d MMM yyyy", { locale: ru })}</TableCell>
                <TableCell>{ref.ordersTotal.toLocaleString("ru-RU")} ₽</TableCell>
                <TableCell>{ref.bonus.toLocaleString("ru-RU")} ₽</TableCell>
                <TableCell>
                  <StatusBadge status={ref.status === "active" ? "completed" : "awaiting_payment"} kind="generic" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground">Демо-данные. Реферальная программа будет подключена к API позже.</p>
    </div>
  )
}
