"use client"

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { format, differenceInDays } from "date-fns"
import { ru } from "date-fns/locale"
import { ChevronRight, Search, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  COUNTERPARTY_TYPE_LABELS,
  type CounterpartyType,
} from "@/lib/cabinet-counterparty"

interface CabinetUser {
  id: string
  email: string
  artistName?: string
  counterpartyType?: CounterpartyType
  isDisabled?: boolean
  createdAt: string
  subscriptionName?: string
  subscriptionExpiresAt?: string
  subscriptionTrackLimit?: number
  purchasedTracksBalance?: number
  streamingBalance?: number
  walletBalance?: number
}

interface SubscriptionBillingRunLog {
  id: string
  source: string
  startedAt: string
  finishedAt?: string
  usersConsidered: number
  remindersSent: number
  chargesInitiated: number
  errorsCount: number
  errors: string[]
}

function AdminCabinetUsersPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<CabinetUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newArtistName, setNewArtistName] = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<CabinetUser | null>(null)
  const [blockedUsersExpanded, setBlockedUsersExpanded] = useState(false)
  const [billingRunDialogOpen, setBillingRunDialogOpen] = useState(false)
  const [billingRunLoading, setBillingRunLoading] = useState(false)
  const [billingRunsLoading, setBillingRunsLoading] = useState(false)
  const [billingRuns, setBillingRuns] = useState<SubscriptionBillingRunLog[]>([])
  const [billingHistoryExpanded, setBillingHistoryExpanded] = useState(false)
  const [listSearch, setListSearch] = useState("")

  const userIdFilterRaw = searchParams.get("userId")?.trim() ?? ""
  const userIdFilterNorm = userIdFilterRaw.toLowerCase()
  const filterUserLabel = searchParams.get("label")?.trim() ?? ""

  const filteredUsers = useMemo(() => {
    if (!userIdFilterNorm) return users
    return users.filter((user) => user.email.toLowerCase() === userIdFilterNorm)
  }, [users, userIdFilterNorm])

  const blockedUsersCount = useMemo(
    () => filteredUsers.filter((user) => Boolean(user.isDisabled)).length,
    [filteredUsers]
  )

  const sortByRegistrationDate = useCallback((a: CabinetUser, b: CabinetUser) => {
    const aTime = Date.parse(a.createdAt)
    const bTime = Date.parse(b.createdAt)
    const safeATime = Number.isNaN(aTime) ? 0 : aTime
    const safeBTime = Number.isNaN(bTime) ? 0 : bTime
    if (safeBTime !== safeATime) return safeBTime - safeATime
    return a.email.localeCompare(b.email, "ru")
  }, [])

  const searchedUsers = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    if (!q) return filteredUsers
    return filteredUsers.filter((user) => {
      const hay = [
        user.email,
        user.artistName ?? "",
        user.id,
        COUNTERPARTY_TYPE_LABELS[user.counterpartyType ?? "individual"],
        user.subscriptionName ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [filteredUsers, listSearch])

  const blockedUsers = useMemo(
    () => searchedUsers.filter((user) => Boolean(user.isDisabled)).sort(sortByRegistrationDate),
    [searchedUsers, sortByRegistrationDate]
  )
  const activeUsers = useMemo(
    () => searchedUsers.filter((user) => !user.isDisabled).sort(sortByRegistrationDate),
    [searchedUsers, sortByRegistrationDate]
  )

  const loadUsers = async () => {
    const response = await fetch("/api/admin/cabinet-users", { credentials: "include" })
    if (response.ok) {
      const data = await response.json()
      setUsers(data.users || [])
    } else if (response.status === 401) {
      setIsAuthenticated(false)
    }
  }

  const loadBillingRuns = async () => {
    setBillingRunsLoading(true)
    try {
      const response = await fetch("/api/admin/subscription-billing/run?limit=20", {
        credentials: "include",
      })
      if (!response.ok) {
        if (response.status !== 401) {
          toast.error("Не удалось загрузить историю запусков автосписания")
        }
        return
      }
      const data = await response.json().catch(() => ({}))
      setBillingRuns(Array.isArray(data.runs) ? (data.runs as SubscriptionBillingRunLog[]) : [])
    } finally {
      setBillingRunsLoading(false)
    }
  }

  const handleRunSubscriptionBilling = async () => {
    setBillingRunLoading(true)
    try {
      const response = await fetch("/api/admin/subscription-billing/run", {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Не удалось запустить автосписание")
        return
      }

      const usersConsidered = typeof data.usersConsidered === "number" ? data.usersConsidered : 0
      const remindersSent = typeof data.remindersSent === "number" ? data.remindersSent : 0
      const chargesInitiated =
        typeof data.chargesInitiated === "number" ? data.chargesInitiated : 0
      const errors = Array.isArray(data.errors) ? (data.errors as string[]) : []

      if (errors.length > 0) {
        const first = errors[0]
        const more = errors.length > 1 ? ` (+${errors.length - 1})` : ""
        toast.warning(
          `Автосписание: users ${usersConsidered}, списаний ${chargesInitiated}, напоминаний ${remindersSent}, ошибок ${errors.length}. ${first}${more}`
        )
      } else {
        toast.success(
          `Автосписание выполнено: users ${usersConsidered}, списаний ${chargesInitiated}, напоминаний ${remindersSent}`
        )
      }
      await loadBillingRuns()
    } catch {
      toast.error("Ошибка сети при запуске автосписания")
    } finally {
      setBillingRunLoading(false)
      setBillingRunDialogOpen(false)
    }
  }

  useEffect(() => {
    fetch("/api/admin/cabinet-users", { credentials: "include" })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true)
          return res.json()
        }
        if (res.status === 401) setIsAuthenticated(false)
        return null
      })
      .then((data) => {
        if (data?.users) setUsers(data.users)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    void loadBillingRuns()
  }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newPassword) {
      toast.error("Заполните email и пароль")
      return
    }
    if (newPassword.length < 10) {
      toast.error("Пароль должен быть не менее 10 символов")
      return
    }
    setAddLoading(true)
    try {
      const response = await fetch("/api/admin/cabinet-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          artistName: newArtistName.trim() || undefined,
        }),
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Не удалось добавить")
        return
      }
      toast.success("Пользователь добавлен")
        setNewEmail("")
        setNewPassword("")
        setNewArtistName("")
      await loadUsers()
    } catch {
      toast.error("Ошибка сети")
    } finally {
      setAddLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      const response = await fetch(`/api/admin/cabinet-users/${userToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        toast.error("Не удалось удалить")
      return
    }
      toast.success("Пользователь удалён")
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      await loadUsers()
    } catch {
      toast.error("Ошибка сети")
    }
  }

  const renderUserRow = (user: CabinetUser) => {
    const fixBaseLimit = user.subscriptionTrackLimit ?? 0
    const fixPurchasedTracks = user.purchasedTracksBalance ?? 0
    const fixEffectiveLimit = fixBaseLimit + fixPurchasedTracks
    const subscriptionStatus = (() => {
      if (!user.subscriptionName) return null
      if (user.subscriptionName === "Fix") {
        return { label: "Без ограничения по времени", className: "text-muted-foreground" }
      }
      if (!user.subscriptionExpiresAt) return null

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expires = new Date(user.subscriptionExpiresAt)
      expires.setHours(0, 0, 0, 0)
      const daysLeft = differenceInDays(expires, today)

      if (daysLeft < 0) {
        return { label: "Подписка истекла", className: "text-red-600 font-semibold" }
      }
      if (daysLeft === 0) {
        return { label: "Заканчивается сегодня", className: "text-orange-600 font-semibold" }
      }
      if (daysLeft <= 7) {
        return { label: `Заканчивается через ${daysLeft} дн.`, className: "text-orange-600" }
      }
      return { label: `Активна ещё ${daysLeft} дн.`, className: "text-muted-foreground" }
    })()

    return (
      <div
        key={user.id}
        className="flex flex-col gap-3 p-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium break-all">{user.email}</p>
            {user.isDisabled ? (
              <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                Заблокирован
              </span>
            ) : null}
            {user.artistName ? (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {user.artistName}
              </span>
            ) : null}
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {COUNTERPARTY_TYPE_LABELS[user.counterpartyType ?? "individual"]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Создан: {format(new Date(user.createdAt), "d MMM yyyy", { locale: ru })}
            {user.subscriptionName ? (
              <>
                {" · "}
                {user.subscriptionName}
                {user.subscriptionName === "Fix"
                  ? ` (лимит ${fixEffectiveLimit})`
                  : user.subscriptionExpiresAt
                    ? ` до ${format(new Date(user.subscriptionExpiresAt), "d MMM yyyy", { locale: ru })}`
                    : ""}
                {subscriptionStatus ? (
                  <span className={`ml-1 ${subscriptionStatus.className}`}>
                    {subscriptionStatus.label}
                  </span>
                ) : null}
              </>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">
            Кабинет:{" "}
            <span className="font-medium text-foreground">
              {(user.walletBalance || 0).toLocaleString("ru-RU")} ₽
                  </span>
            {" · "}
            Роялти:{" "}
            <span className="font-medium text-emerald-500">
              {(user.streamingBalance || 0).toLocaleString("ru-RU")} ₽
                  </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="default" size="sm" asChild>
            <Link href={`/admin26081993/cabinet-users/${encodeURIComponent(user.id)}`}>
              Открыть
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUserToDelete(user)
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
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

  if (!isAuthenticated) {
    router.replace("/admin26081993")
    return null
  }

  return (
    <div className="min-h-screen bg-background pt-4 pb-10">
      <div className="mx-auto w-full max-w-none px-4 space-y-6">
        <AdminSectionNav active="cabinet-users" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Пользователи личного кабинета</h1>
            <p className="text-muted-foreground text-sm">
              Откройте карточку пользователя, чтобы просмотреть и изменить все данные без SQL
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={billingRunLoading}
            onClick={() => setBillingRunDialogOpen(true)}
          >
            Запустить автосписание сейчас
          </Button>
        </div>

        {userIdFilterRaw ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Фильтр по пользователю</span>
              {filterUserLabel ? (
                <>
                  {": "}
                  <span className="text-foreground">{filterUserLabel}</span>
                </>
              ) : null}
              <span className="mt-1 block font-mono text-xs text-muted-foreground sm:ml-1 sm:mt-0 sm:inline">
                {filterUserLabel ? "· " : ""}
                {userIdFilterRaw}
              </span>
              <span className="block text-foreground sm:ml-2 sm:inline">
                - найдено: {filteredUsers.length}
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => router.push("/admin26081993/cabinet-users")}
            >
              Показать всех
            </Button>
          </div>
        ) : null}

        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="font-semibold">Добавить пользователя</h2>
          <form onSubmit={handleAddUser} className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={addLoading}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-sm font-medium">Имя артиста</label>
              <Input
                type="text"
                placeholder="Название артиста/группы"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                disabled={addLoading}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-sm font-medium">Пароль (мин. 10 символов)</label>
              <Input
                type="password"
                placeholder="••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={addLoading}
              />
            </div>
            <Button type="submit" disabled={addLoading}>
              <UserPlus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
          </form>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="flex flex-col gap-2 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
              onClick={() => setBillingHistoryExpanded((prev) => !prev)}
            >
              <div className="min-w-0">
                <h2 className="font-semibold">История запусков автосписания</h2>
                {!billingHistoryExpanded && billingRuns.length > 0 ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Записей в истории: {billingRuns.length}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {billingHistoryExpanded ? "Свернуть" : "Показать"}
              </span>
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={billingRunsLoading}
              onClick={() => void loadBillingRuns()}
            >
              Обновить
            </Button>
          </div>
          {billingHistoryExpanded ? (
            <div className="space-y-3 p-4">
              {billingRunsLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка истории...</p>
              ) : billingRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Запусков пока нет</p>
              ) : (
                billingRuns.map((run) => (
                  <div key={run.id} className="space-y-2 rounded border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {run.source === "admin_manual" ? "Ручной запуск из админки" : run.source}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(run.startedAt), "d MMM yyyy, HH:mm:ss", { locale: ru })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                      users: {run.usersConsidered} · списаний: {run.chargesInitiated} · напоминаний:{" "}
                      {run.remindersSent} · ошибок: {run.errorsCount}
                      </p>
                      {run.errors.length > 0 ? (
                      <div className="rounded border border-destructive/20 bg-destructive/5 p-2">
                        <p className="mb-1 text-sm font-medium text-destructive">Ошибки:</p>
                          <div className="space-y-1">
                            {run.errors.slice(0, 5).map((errorText, idx) => (
                            <p
                              key={`${run.id}-err-${idx}`}
                              className="break-words text-xs text-destructive/90"
                            >
                                {errorText}
                              </p>
                            ))}
                            {run.errors.length > 5 ? (
                            <p className="text-xs text-muted-foreground">
                              ...и ещё {run.errors.length - 5}
                            </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-600">Ошибок нет</p>
                      )}
                    </div>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Поиск: email, артист, тариф, id..."
            className="pl-9"
            aria-label="Поиск пользователей"
          />
            </div>

        <div className="divide-y rounded-lg border">
          {users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Пользователей пока нет</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Пользователь по заданному фильтру не найден
            </div>
          ) : searchedUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Ничего не найдено по запросу</div>
          ) : (
            <>
              {blockedUsersCount > 0 ? (
                <div className="border-b bg-muted/30 p-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => setBlockedUsersExpanded((prev) => !prev)}
                  >
                    <span className="font-medium">
                      Заблокированные пользователи ({blockedUsers.length}
                      {listSearch.trim() ? ` из ${blockedUsersCount}` : ""})
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {blockedUsersExpanded ? "Свернуть" : "Показать"}
                    </span>
                  </button>
                </div>
              ) : null}
              {blockedUsersExpanded
                ? blockedUsers.map((user) => (
                    <Fragment key={user.id}>{renderUserRow(user)}</Fragment>
                  ))
                : null}
              {activeUsers.map((user) => (
                <Fragment key={user.id}>{renderUserRow(user)}</Fragment>
              ))}
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет удалён аккаунт {userToDelete?.email}. Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteUser()}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={billingRunDialogOpen} onOpenChange={setBillingRunDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Запустить автосписание сейчас?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет выполнен ручной прогон автосписания подписок.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={billingRunLoading}
              onClick={() => void handleRunSubscriptionBilling()}
            >
              {billingRunLoading ? "Запуск..." : "Запустить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
            </div>
  )
}

export default function AdminCabinetUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center pt-4">
          <p>Загрузка...</p>
        </div>
      }
    >
      <AdminCabinetUsersPageInner />
    </Suspense>
  )
}
