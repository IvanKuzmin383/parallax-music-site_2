"use client"

import { useMemo, useState } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { Spinner } from "@/components/ui/spinner"

export default function ReferralsPage() {
  const { user, loading } = useCabinetSession()
  const [copied, setCopied] = useState(false)

  const referralLink = useMemo(() => {
    if (typeof window === "undefined") return ""
    const email = user?.email?.trim()
    if (!email) return `${window.location.origin}/?ref=`
    const code = encodeURIComponent(email.split("@")[0] || email)
    return `${window.location.origin}/?ref=${code}`
  }, [user?.email])

  const copyLink = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success("Ссылка скопирована")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Не удалось скопировать")
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
    <div className="w-full max-w-none space-y-5">
      <PageHeader title="Партнёрка" description="Приглашайте артистов и получайте бонус с их заказов" />

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Реферальная ссылка</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 px-4 pb-4">
          <code className="flex-1 text-sm bg-muted px-3 py-2 rounded break-all">{referralLink}</code>
          <Button variant="outline" size="sm" onClick={() => void copyLink()}>
            <Copy className="h-4 w-4 mr-2" />
            {copied ? "Скопировано" : "Скопировать"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Приглашено", value: "0" },
          { label: "Сумма заказов", value: "0 ₽" },
          { label: "Начислено", value: "0 ₽" },
          { label: "Доступно", value: "0 ₽" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="px-4 py-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-semibold tabular-nums leading-tight mt-0.5">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Рефералы</CardTitle>
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
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                Пока нет приглашённых пользователей
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
