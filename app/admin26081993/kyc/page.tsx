"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { cn } from "@/lib/utils"

type KycApp = {
  id: string
  userId?: string
  status: "pending" | "approved" | "rejected" | "expired"
  lastName: string
  firstName: string
  patronymic: string | null
  phone: string | null
  passportSeries: string | null
  passportNumber: string | null
  passportMasked: string | null
  birthDate: string
  submittedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  hasDocument: boolean
  userEmail: string | null
  userArtistName: string | null
}

const FILTERS = [
  { id: "pending", label: "На проверке" },
  { id: "approved", label: "Приняты" },
  { id: "rejected", label: "Отклонены" },
  { id: "all", label: "Все" },
] as const

function statusConfig(status: KycApp["status"]) {
  switch (status) {
    case "pending":
      return {
        label: "На проверке",
        icon: Clock,
        className: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
      }
    case "approved":
      return {
        label: "Принята",
        icon: CheckCircle,
        className: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
      }
    case "rejected":
      return {
        label: "Отклонена",
        icon: XCircle,
        className: "bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30",
      }
    default:
      return {
        label: "Истекла",
        icon: Clock,
        className: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
      }
  }
}

function formatBirthDate(raw: string): string {
  if (!raw) return "-"
  try {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : raw.slice(0, 10)
    return format(parseISO(iso), "d MMMM yyyy", { locale: ru })
  } catch {
    return raw
  }
}

function formatSubmittedAt(raw: string): string {
  try {
    return format(new Date(raw), "d MMMM yyyy, HH:mm", { locale: ru })
  } catch {
    return raw
  }
}

export default function AdminKycPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [apps, setApps] = useState<KycApp[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectOpenId, setRejectOpenId] = useState<string | null>(null)
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})

  const load = async (status: string) => {
    const res = await fetch(`/api/admin/kyc?status=${encodeURIComponent(status)}`, {
      credentials: "include",
    })
    if (res.status === 401) {
      setIsAuthenticated(false)
      return
    }
    if (!res.ok) {
      toast.error("Не удалось загрузить заявки")
      return
    }
    setIsAuthenticated(true)
    const data = (await res.json()) as { applications?: KycApp[] }
    setApps(data.applications ?? [])
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await load(statusFilter)
      setLoading(false)
    })()
  }, [statusFilter])

  const handleAction = async (id: string, action: "approve" | "reject") => {
    if (action === "reject") {
      const reason = rejectReasons[id]?.trim() || ""
      if (reason.length < 3) {
        toast.error("Укажите причину отклонения (минимум 3 символа)")
        return
      }
    }

    setBusyId(id)
    try {
      const body =
        action === "reject"
          ? { action, reason: rejectReasons[id]?.trim() || "" }
          : { action }
      const res = await fetch(`/api/admin/kyc/${encodeURIComponent(id)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data.error || "Ошибка обработки заявки")
        return
      }
      toast.success(action === "approve" ? "Заявка принята, документ удалён" : "Заявка отклонена")
      setRejectOpenId(null)
      await load(statusFilter)
    } catch {
      toast.error("Ошибка сети")
    } finally {
      setBusyId(null)
    }
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen pt-4 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <p className="text-muted-foreground">Необходима авторизация</p>
          <Button onClick={() => router.push("/admin26081993")}>Перейти на страницу входа</Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-4 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Загрузка заявок...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-4">
      <div className="mx-auto w-full max-w-none px-4 space-y-6 pb-10">
        <AdminSectionNav active="kyc" />

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8" />
            Верификация
          </h1>
          <p className="text-muted-foreground mt-1">
            Проверьте паспорт и данные. После решения скан документа удаляется автоматически.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={statusFilter === f.id ? "secondary" : "outline"}
              className={cn(statusFilter === f.id && "ring-1 ring-primary/35")}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {apps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
            <p className="font-medium">Заявок в этом фильтре нет</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Новые появятся здесь, когда пользователь подаст верификацию
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map((app) => {
              const cfg = statusConfig(app.status)
              const StatusIcon = cfg.icon
              const fio = [app.lastName, app.firstName, app.patronymic].filter(Boolean).join(" ")
              const passport =
                app.passportSeries && app.passportNumber
                  ? `${app.passportSeries} ${app.passportNumber}`
                  : app.passportMasked || "-"
              const busy = busyId === app.id
              const rejectOpen = rejectOpenId === app.id

              return (
                <article
                  key={app.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h2 className="text-xl font-semibold tracking-tight">{fio}</h2>
                      <p className="text-sm text-muted-foreground break-all">
                        {app.userEmail || "email неизвестен"}
                        {app.userArtistName ? (
                          <span className="text-foreground/80"> · {app.userArtistName}</span>
                        ) : null}
                      </p>
                      {app.userId ? (
                        <Link
                          href={`/admin26081993/cabinet-users/${encodeURIComponent(app.userId)}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Карточка пользователя
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                        cfg.className
                      )}
                    >
                      <StatusIcon className="h-4 w-4" />
                      {cfg.label}
                    </span>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-lg bg-muted/30 p-4">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Паспорт</dt>
                      <dd className="mt-1 font-medium tabular-nums text-base">{passport}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        Дата рождения
                      </dt>
                      <dd className="mt-1 font-medium text-base">{formatBirthDate(app.birthDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Телефон</dt>
                      <dd className="mt-1 font-medium text-base">{app.phone?.trim() || "не указан"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Подано</dt>
                      <dd className="mt-1 font-medium text-base">
                        {formatSubmittedAt(app.submittedAt)}
                      </dd>
                    </div>
                  </dl>

                  {app.rejectionReason ? (
                    <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200 ring-1 ring-inset ring-rose-500/25">
                      <span className="font-medium">Причина отказа: </span>
                      {app.rejectionReason}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {app.hasDocument ? (
                        <Button type="button" variant="outline" asChild>
                          <a
                            href={`/api/admin/kyc/${encodeURIComponent(app.id)}/document`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="h-4 w-4" />
                            Открыть скан паспорта
                          </a>
                        </Button>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                          Скан уже удалён
                        </span>
                      )}
                    </div>

                    {app.status === "pending" ? (
                      <div className="space-y-3">
                        {!rejectOpen ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
                              disabled={busy}
                              onClick={() => void handleAction(app.id, "approve")}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                              Принять
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                              disabled={busy}
                              onClick={() => setRejectOpenId(app.id)}
                            >
                              <XCircle className="h-4 w-4" />
                              Отклонить
                            </Button>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor={`reject-${app.id}`}>Причина отклонения</Label>
                              <Input
                                id={`reject-${app.id}`}
                                placeholder="Например: нечитаемый скан, данные не совпадают"
                                value={rejectReasons[app.id] ?? ""}
                                onChange={(e) =>
                                  setRejectReasons((prev) => ({ ...prev, [app.id]: e.target.value }))
                                }
                                disabled={busy}
                                autoFocus
                              />
                              <p className="text-xs text-muted-foreground">
                                Текст увидит пользователь в кабинете
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => void handleAction(app.id, "reject")}
                              >
                                {busy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Подтвердить отклонение
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={busy}
                                onClick={() => setRejectOpenId(null)}
                              >
                                Отмена
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
