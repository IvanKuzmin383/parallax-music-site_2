"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { Spinner } from "@/components/ui/spinner"
import type { ReferralStats } from "@/lib/cabinet-referrals"
import { GAMIFICATION_ECONOMY } from "@/lib/cabinet/achievements-catalog"

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/referrals", { credentials: "include" })
      if (!res.ok) {
        setStats(null)
        return
      }
      const data = (await res.json()) as { stats?: ReferralStats }
      setStats(data.stats ?? null)
    } catch {
      setStats(null)
    }
  }, [])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const copyLink = async () => {
    if (!stats?.referralLink) return
    try {
      await navigator.clipboard.writeText(stats.referralLink)
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

  const link = stats?.referralLink ?? ""

  return (
    <div className="w-full max-w-none space-y-4">
      <PageHeader
        title="Партнёрка"
        description={`Приглашайте артистов: ${GAMIFICATION_ECONOMY.referralPaymentPercent}% с подписок, тарифов и инструментов (до ${GAMIFICATION_ECONOMY.referralPerInviteeCapRub.toLocaleString("ru-RU")} ₽ на человека). Продвижение не учитывается.`}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <p className="shrink-0 whitespace-nowrap text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Реферальная ссылка
        </p>
        <code className="min-w-0 w-full max-w-md truncate rounded-md bg-muted/50 px-3 py-1.5 text-sm sm:w-auto sm:max-w-sm md:max-w-md">
          {link || "—"}
        </code>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={!link}
          onClick={() => void copyLink()}
        >
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Скопировано" : "Скопировать"}
        </Button>
      </div>

      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
        {[
          { label: "Приглашено", value: String(stats?.invitedCount ?? 0) },
          { label: "Оплатили", value: String(stats?.paidReferrals ?? 0) },
          {
            label: "Начислено",
            value: `${(stats?.earnedRub ?? 0).toLocaleString("ru-RU")} ₽`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-baseline justify-between gap-2 py-1 sm:flex-col sm:items-start sm:gap-0.5"
          >
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
              <TableHead className="h-8">Бонус</TableHead>
              <TableHead className="h-8">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!stats?.rows.length ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-3 text-center text-sm text-muted-foreground">
                  Пока нет приглашённых пользователей
                </TableCell>
              </TableRow>
            ) : (
              stats.rows.map((row) => (
                <TableRow key={row.userId} className="hover:bg-transparent">
                  <TableCell className="text-sm">
                    {row.artistName || row.emailMasked}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(row.registeredAt).toLocaleDateString("ru-RU")}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {row.rewardedRub != null
                      ? `${row.rewardedRub.toLocaleString("ru-RU")} ₽`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.rewardedRub != null ? "Оплатил" : "Зарегистрирован"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
