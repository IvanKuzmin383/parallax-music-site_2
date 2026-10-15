"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { ShieldCheck, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminSectionNav } from "@/components/admin-section-nav"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

export default function AdminKycPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [apps, setApps] = useState<KycApp[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
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
      toast.success(action === "approve" ? "Заявка принята" : "Заявка отклонена")
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
      <div className="min-h-screen pt-4 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-4">
      <div className="mx-auto w-full max-w-none px-4 space-y-6">
        <AdminSectionNav active="kyc" />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-8 w-8" />
              Верификация (KYC)
            </h1>
            <p className="text-muted-foreground mt-1">
              Заявки на проверку личности. После решения скан документа удаляется.
            </p>
          </div>
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">На проверке</SelectItem>
                <SelectItem value="approved">Приняты</SelectItem>
                <SelectItem value="rejected">Отклонены</SelectItem>
                <SelectItem value="all">Все</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {apps.length === 0 ? (
          <p className="text-muted-foreground">Заявок нет</p>
        ) : (
          <div className="space-y-4">
            {apps.map((app) => {
              const statusIcon =
                app.status === "pending"
                  ? Clock
                  : app.status === "approved"
                    ? CheckCircle
                    : XCircle
              const StatusIcon = statusIcon
              const fio = [app.lastName, app.firstName, app.patronymic].filter(Boolean).join(" ")
              const passport =
                app.passportSeries && app.passportNumber
                  ? `${app.passportSeries} ${app.passportNumber}`
                  : app.passportMasked || "-"

              return (
                <div
                  key={app.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-lg">{fio}</div>
                      <div className="text-sm text-muted-foreground">
                        {app.userEmail || "email неизвестен"}
                        {app.userArtistName ? ` · ${app.userArtistName}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <StatusIcon className="h-4 w-4" />
                      {app.status}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="text-muted-foreground">Паспорт</div>
                      <div className="font-medium tabular-nums">{passport}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Дата рождения</div>
                      <div className="font-medium">{app.birthDate}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Телефон</div>
                      <div className="font-medium">{app.phone || "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Подано</div>
                      <div className="font-medium">
                        {format(new Date(app.submittedAt), "d MMM yyyy HH:mm", { locale: ru })}
                      </div>
                    </div>
                  </div>

                  {app.rejectionReason ? (
                    <p className="text-sm text-destructive">Причина отказа: {app.rejectionReason}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {app.hasDocument ? (
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a
                          href={`/api/admin/kyc/${encodeURIComponent(app.id)}/document`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Открыть документ
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Документ удалён</span>
                    )}

                    {app.status === "pending" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === app.id}
                          onClick={() => void handleAction(app.id, "approve")}
                        >
                          Принять
                        </Button>
                        <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
                          <Input
                            placeholder="Причина отклонения"
                            value={rejectReasons[app.id] ?? ""}
                            onChange={(e) =>
                              setRejectReasons((prev) => ({ ...prev, [app.id]: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busyId === app.id}
                            onClick={() => void handleAction(app.id, "reject")}
                          >
                            Отклонить
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
