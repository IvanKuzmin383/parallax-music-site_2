"use client"

import { useMemo, useState } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
    <div className="w-full max-w-none space-y-4">
      <PageHeader title="Партнёрка" description="Приглашайте артистов и получайте бонус с их заказов" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <p className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
          Реферальная ссылка
        </p>
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted/50 px-3 py-1.5 text-sm">
          {referralLink}
        </code>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => void copyLink()}>
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Скопировано" : "Скопировать"}
        </Button>
      </div>

      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Приглашено", value: "0" },
          { label: "Сумма заказов", value: "0 ₽" },
          { label: "Начислено", value: "0 ₽" },
          { label: "Доступно", value: "0 ₽" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-baseline justify-between gap-2 py-1 sm:flex-col sm:items-start sm:gap-0.5">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-base font-semibold tabular-nums leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Рефералы</p>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="h-8">Пользователь</TableHead>
              <TableHead className="h-8">Регистрация</TableHead>
              <TableHead className="h-8">Заказы</TableHead>
              <TableHead className="h-8">Начисление</TableHead>
              <TableHead className="h-8">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-3 text-center text-sm text-muted-foreground">
                Пока нет приглашённых пользователей
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
