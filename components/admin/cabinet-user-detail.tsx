"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, addMonths, differenceInDays } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import {
  ArrowLeft,
  KeyRound,
  Music,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  COUNTERPARTY_TYPE_LABELS,
  COUNTERPARTY_TYPES,
  type CounterpartyType,
} from "@/lib/cabinet-counterparty"
import { SUBSCRIPTION_PLANS, isSubscriptionPlan } from "@/lib/subscription-plans"
import { cn } from "@/lib/utils"

const BALANCE_TX_LABELS: Record<string, string> = {
  royalty_to_wallet: "Перевод роялти на баланс",
  royalty_credit: "Начисление роялти",
  withdrawal: "Вывод роялти",
  topup: "Пополнение",
  service_payment: "Оплата услуги",
  refund: "Возврат",
  referral_bonus: "Партнёрский бонус",
  admin_adjustment: "Корректировка админом",
}

type ArtistSlot = {
  id: string
  artistName: string | null
  subscriptionName: string
  subscriptionExpiresAt: string | null
  subscriptionTrackLimit: number | null
}

function str(v: unknown): string {
  if (v == null) return ""
  return String(v)
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function display(v: unknown): string {
  if (v == null || v === "") return "Не заполнено"
  if (typeof v === "boolean") return v ? "Да" : "Нет"
  if (typeof v === "number") return v.toLocaleString("ru-RU")
  return String(v)
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function InfoCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border bg-card/40 p-4 space-y-3", className)}>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-base font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  )
}

export function CabinetUserDetail({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(true)
  const [user, setUser] = useState<Record<string, unknown> | null>(null)
  const [summary, setSummary] = useState<Record<string, unknown>>({})
  const [related, setRelated] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState<Record<string, string>>({})
  const [streamingBalance, setStreamingBalance] = useState("0")
  const [walletBalance, setWalletBalance] = useState("0")
  const [balanceNote, setBalanceNote] = useState("")
  const [subscriptionName, setSubscriptionName] = useState("__none__")
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState("")
  const [subscriptionTrackLimit, setSubscriptionTrackLimit] = useState("1")

  const [slots, setSlots] = useState<ArtistSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [newSlotPlan, setNewSlotPlan] = useState("Start")
  const [newSlotArtist, setNewSlotArtist] = useState("")
  const [newSlotExpires, setNewSlotExpires] = useState("")
  const [newSlotLimit, setNewSlotLimit] = useState("1")

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordValue, setPasswordValue] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)

  const email = str(user?.email)
  const artistName = str(user?.artist_name ?? user?.artistName)
  const counterpartyType = (str(user?.counterparty_type || "individual") ||
    "individual") as CounterpartyType
  const isDisabled = Boolean(user?.is_disabled ?? user?.isDisabled)

  const syncFromUser = useCallback((u: Record<string, unknown>) => {
    setProfile({
      artistName: str(u.artist_name),
      phone: str(u.phone),
      telegram: str(u.telegram),
      lastName: str(u.last_name),
      firstName: str(u.first_name),
      patronymic: str(u.patronymic),
      registrationAddress: str(u.registration_address),
      counterpartyType: str(u.counterparty_type || "individual"),
      ipFullName: str(u.ip_full_name),
      companyFullName: str(u.company_full_name),
      companyShortName: str(u.company_short_name),
      inn: str(u.inn),
      kpp: str(u.kpp),
      ogrn: str(u.ogrn),
      ogrnip: str(u.ogrnip),
      legalAddress: str(u.legal_address),
      postalAddress: str(u.postal_address),
      signatoryFullName: str(u.signatory_full_name),
      signatoryPosition: str(u.signatory_position),
      signatoryAuthorityBasis: str(u.signatory_authority_basis),
      bankAccountNumber: str(u.bank_account_number),
      bankBic: str(u.bank_bic),
      bankName: str(u.bank_name),
      bankCorrespondentAccount: str(u.bank_correspondent_account),
      documentsEmail: str(u.documents_email),
      taxSystem: str(u.tax_system),
      edoIdentifier: str(u.edo_identifier),
      vatPayer: u.vat_payer ? "true" : "false",
      edoRequired: u.edo_required ? "true" : "false",
    })
    setStreamingBalance(String(num(u.streaming_balance)))
    setWalletBalance(String(num(u.wallet_balance)))
    const plan = str(u.subscription_name)
    setSubscriptionName(plan && isSubscriptionPlan(plan) ? plan : "__none__")
    const exp = str(u.subscription_expires_at)
    setSubscriptionExpiresAt(exp ? exp.slice(0, 10) : "")
    setSubscriptionTrackLimit(String(num(u.subscription_track_limit) || 1))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/cabinet-users/${encodeURIComponent(userId)}/full`, {
        credentials: "include",
      })
      if (res.status === 401) {
        setAuthed(false)
        return
      }
      if (!res.ok) {
        toast.error("Не удалось загрузить пользователя")
        return
      }
      const data = (await res.json()) as {
        user?: Record<string, unknown>
        summary?: Record<string, unknown>
        related?: Record<string, unknown>
      }
      if (!data.user) {
        toast.error("Пользователь не найден")
        return
      }
      setUser(data.user)
      setSummary(data.summary ?? {})
      setRelated(data.related ?? {})
      syncFromUser(data.user)
    } finally {
      setLoading(false)
    }
  }, [syncFromUser, userId])

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true)
    try {
      const res = await fetch(
        `/api/admin/cabinet-users/${encodeURIComponent(userId)}/artist-subscriptions`,
        { credentials: "include" }
      )
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      const rows = Array.isArray(data.subscriptions) ? data.subscriptions : []
      setSlots(
        rows.map((s: Record<string, unknown>) => ({
          id: str(s.id),
          artistName: (s.artistName ?? s.artist_name ?? null) as string | null,
          subscriptionName: str(s.subscriptionName ?? s.subscription_name),
          subscriptionExpiresAt: (s.subscriptionExpiresAt ??
            s.subscription_expires_at ??
            null) as string | null,
          subscriptionTrackLimit: (s.subscriptionTrackLimit ??
            s.subscription_track_limit ??
            null) as number | null,
        }))
      )
    } finally {
      setSlotsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
    void loadSlots()
  }, [load, loadSlots])

  const subscriptionStatus = useMemo(() => {
    const plan = str(user?.subscription_name)
    if (!plan) return null
    if (plan === "Fix") return { label: "Без срока", className: "text-muted-foreground" }
    const exp = str(user?.subscription_expires_at)
    if (!exp) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expires = new Date(exp)
    expires.setHours(0, 0, 0, 0)
    const daysLeft = differenceInDays(expires, today)
    if (daysLeft < 0) return { label: "Истекла", className: "text-destructive font-semibold" }
    if (daysLeft <= 7)
      return {
        label: daysLeft === 0 ? "Сегодня" : `Ещё ${daysLeft} дн.`,
        className: "text-amber-500",
      }
    return { label: `Ещё ${daysLeft} дн.`, className: "text-emerald-500" }
  }, [user])

  const patch = async (body: Record<string, unknown>, okMsg: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cabinet-users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Не удалось сохранить")
        return false
      }
      toast.success(okMsg)
      await load()
      return true
    } catch {
      toast.error("Ошибка сети")
      return false
    } finally {
      setSaving(false)
    }
  }

  const setProfileField = (key: string, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const saveProfile = async () => {
    const payload: Record<string, string | boolean | null> = {
      artistName: profile.artistName || null,
      phone: profile.phone || null,
      telegram: profile.telegram || null,
      lastName: profile.lastName || null,
      firstName: profile.firstName || null,
      patronymic: profile.patronymic || null,
      registrationAddress: profile.registrationAddress || null,
      counterpartyType: profile.counterpartyType || "individual",
      ipFullName: profile.ipFullName || null,
      companyFullName: profile.companyFullName || null,
      companyShortName: profile.companyShortName || null,
      inn: profile.inn || null,
      kpp: profile.kpp || null,
      ogrn: profile.ogrn || null,
      ogrnip: profile.ogrnip || null,
      legalAddress: profile.legalAddress || null,
      postalAddress: profile.postalAddress || null,
      signatoryFullName: profile.signatoryFullName || null,
      signatoryPosition: profile.signatoryPosition || null,
      signatoryAuthorityBasis: profile.signatoryAuthorityBasis || null,
      bankAccountNumber: profile.bankAccountNumber || null,
      bankBic: profile.bankBic || null,
      bankName: profile.bankName || null,
      bankCorrespondentAccount: profile.bankCorrespondentAccount || null,
      documentsEmail: profile.documentsEmail || null,
      taxSystem: profile.taxSystem || null,
      edoIdentifier: profile.edoIdentifier || null,
      vatPayer: profile.vatPayer === "true",
      edoRequired: profile.edoRequired === "true",
    }
    await patch({ profile: payload }, "Профиль сохранён")
  }

  const saveBalances = async () => {
    if (balanceNote.trim().length < 3) {
      toast.error("Укажите причину корректировки баланса")
      return
    }
    const ok = await patch(
      {
        streamingBalance: Number(streamingBalance) || 0,
        walletBalance: Number(walletBalance) || 0,
        balanceNote: balanceNote.trim(),
      },
      "Балансы обновлены, запись добавлена в журнал"
    )
    if (ok) setBalanceNote("")
  }

  const saveSubscription = async () => {
    const plan = subscriptionName === "__none__" ? null : subscriptionName
    await patch(
      {
        subscriptionName: plan,
        subscriptionExpiresAt: plan && plan !== "Fix" ? subscriptionExpiresAt || null : null,
        subscriptionTrackLimit:
          plan === "Fix" ? Math.max(1, Number(subscriptionTrackLimit) || 1) : null,
      },
      "Подписка обновлена"
    )
  }

  const toggleDisabled = async () => {
    await patch({ isDisabled: !isDisabled }, isDisabled ? "Пользователь разблокирован" : "Пользователь заблокирован")
  }

  const savePassword = async () => {
    if (passwordValue.length < 10) {
      toast.error("Пароль не менее 10 символов")
      return
    }
    const ok = await patch({ password: passwordValue }, "Пароль обновлён")
    if (ok) {
      setPasswordOpen(false)
      setPasswordValue("")
    }
  }

  const deleteUser = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cabinet-users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        toast.error("Не удалось удалить")
        return
      }
      toast.success("Пользователь удалён")
      router.push("/admin26081993/cabinet-users")
    } finally {
      setSaving(false)
      setDeleteOpen(false)
    }
  }

  const createSlot = async () => {
    setSaving(true)
    try {
      const res = await fetch(
        `/api/admin/cabinet-users/${encodeURIComponent(userId)}/artist-subscriptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            artistName: newSlotArtist.trim() || null,
            subscriptionName: newSlotPlan,
            subscriptionExpiresAt:
              newSlotPlan === "Fix" ? null : newSlotExpires || format(addMonths(new Date(), 1), "yyyy-MM-dd"),
            subscriptionTrackLimit:
              newSlotPlan === "Fix" ? Math.max(1, Number(newSlotLimit) || 1) : null,
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(typeof data.error === "string" ? data.error : "Не удалось создать слот")
        return
      }
      toast.success("Слот создан")
      setNewSlotArtist("")
      await loadSlots()
    } finally {
      setSaving(false)
    }
  }

  const deleteSlot = async (slotId: string) => {
    setSaving(true)
    try {
      const res = await fetch(
        `/api/admin/cabinet-users/${encodeURIComponent(userId)}/artist-subscriptions/${encodeURIComponent(slotId)}`,
        { method: "DELETE", credentials: "include" }
      )
      if (!res.ok) {
        toast.error("Не удалось удалить слот")
        return
      }
      toast.success("Слот удалён")
      await loadSlots()
    } finally {
      setSaving(false)
    }
  }

  const tracks = Array.isArray(related.tracks) ? (related.tracks as Record<string, unknown>[]) : []
  const albums = Array.isArray(related.albums) ? (related.albums as Record<string, unknown>[]) : []
  const orders = Array.isArray(related.orders) ? (related.orders as Record<string, unknown>[]) : []
  const withdrawals = Array.isArray(related.withdrawalRequests)
    ? (related.withdrawalRequests as Record<string, unknown>[])
    : []
  const reports = Array.isArray(related.streamingReports)
    ? (related.streamingReports as Record<string, unknown>[])
    : []
  const drafts = Array.isArray(related.uploadDrafts)
    ? (related.uploadDrafts as Record<string, unknown>[])
    : []
  const balanceTx = Array.isArray(related.balanceTransactions)
    ? (related.balanceTransactions as Array<Record<string, unknown>>)
    : []

  if (!authed) {
    router.replace("/admin26081993")
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-4 flex items-center justify-center text-muted-foreground">
        Загрузка карточки пользователя...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-4 px-4 space-y-4">
        <AdminSectionNav active="cabinet-users" />
        <p>Пользователь не найден.</p>
        <Button asChild variant="outline">
          <Link href="/admin26081993/cabinet-users">К списку</Link>
        </Button>
      </div>
    )
  }

  const type = (profile.counterpartyType || "individual") as CounterpartyType

  return (
    <div className="min-h-screen bg-background pt-4 pb-10">
      <div className="mx-auto w-full max-w-6xl px-4 space-y-6">
        <AdminSectionNav active="cabinet-users" />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin26081993/cabinet-users">
              <ArrowLeft className="h-4 w-4 mr-1" />
              К списку
            </Link>
          </Button>
        </div>

        <header className="rounded-xl border bg-card/50 p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight break-all">{email}</h1>
                {isDisabled ? (
                  <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                    Заблокирован
                  </span>
                ) : (
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    Активен
                  </span>
                )}
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {COUNTERPARTY_TYPE_LABELS[counterpartyType] ?? counterpartyType}
                </span>
                {artistName ? (
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {artistName}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Создан:{" "}
                {user.created_at
                  ? format(new Date(String(user.created_at)), "d MMMM yyyy, HH:mm", { locale: ru })
                  : "-"}
                {" · "}ID: <span className="font-mono text-xs">{userId}</span>
              </p>
              {str(user.subscription_name) ? (
                <p className="text-sm">
                  Подписка: <span className="font-medium">{str(user.subscription_name)}</span>
                  {str(user.subscription_expires_at)
                    ? ` до ${format(new Date(str(user.subscription_expires_at)), "d MMM yyyy", { locale: ru })}`
                    : ""}
                  {subscriptionStatus ? (
                    <span className={cn("ml-2", subscriptionStatus.className)}>
                      {subscriptionStatus.label}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Подписка не назначена</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin26081993/tracks?userId=${encodeURIComponent(email)}&label=${encodeURIComponent(email)}`}
                >
                  <Music className="h-4 w-4 mr-1" />
                  Треки
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                <KeyRound className="h-4 w-4 mr-1" />
                Пароль
              </Button>
              <Button variant="outline" size="sm" disabled={saving} onClick={() => void toggleDisabled()}>
                {isDisabled ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-1" />
                    Разблокировать
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-1" />
                    Блокировать
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Баланс кабинета"
              value={`${num(user.wallet_balance).toLocaleString("ru-RU")} ₽`}
            />
            <Stat
              label="Роялти"
              value={`${num(user.streaming_balance).toLocaleString("ru-RU")} ₽`}
              tone="text-emerald-400"
            />
            <Stat label="Треков" value={String(summary.tracksCount ?? tracks.length)} />
            <Stat label="Заказов" value={String(summary.ordersCount ?? orders.length)} />
          </div>
        </header>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="subscription">Подписки</TabsTrigger>
            <TabsTrigger value="finance">Финансы</TabsTrigger>
            <TabsTrigger value="content">Контент</TabsTrigger>
            <TabsTrigger value="security">Безопасность</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <InfoCard title="Контакты и артист">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Имя артиста">
                  <Input
                    value={profile.artistName}
                    onChange={(e) => setProfileField("artistName", e.target.value)}
                  />
                </Field>
                <Field label="Тип контрагента">
                  <Select
                    value={type}
                    onValueChange={(v) => setProfileField("counterpartyType", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTERPARTY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {COUNTERPARTY_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Телефон">
                  <Input value={profile.phone} onChange={(e) => setProfileField("phone", e.target.value)} />
                </Field>
                <Field label="Telegram">
                  <Input
                    value={profile.telegram}
                    onChange={(e) => setProfileField("telegram", e.target.value)}
                  />
                </Field>
                <Field label="Email для документов">
                  <Input
                    value={profile.documentsEmail}
                    onChange={(e) => setProfileField("documentsEmail", e.target.value)}
                  />
                </Field>
              </div>
            </InfoCard>

            {type === "individual" ? (
              <InfoCard title="Физлицо">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Фамилия">
                    <Input
                      value={profile.lastName}
                      onChange={(e) => setProfileField("lastName", e.target.value)}
                    />
                  </Field>
                  <Field label="Имя">
                    <Input
                      value={profile.firstName}
                      onChange={(e) => setProfileField("firstName", e.target.value)}
                    />
                  </Field>
                  <Field label="Отчество">
                    <Input
                      value={profile.patronymic}
                      onChange={(e) => setProfileField("patronymic", e.target.value)}
                    />
                  </Field>
                  <Field label="Адрес регистрации">
                    <Input
                      value={profile.registrationAddress}
                      onChange={(e) => setProfileField("registrationAddress", e.target.value)}
                    />
                  </Field>
                </div>
              </InfoCard>
            ) : null}

            {type === "sole_proprietor" ? (
              <InfoCard title="ИП">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="ФИО ИП">
                    <Input
                      value={profile.ipFullName}
                      onChange={(e) => setProfileField("ipFullName", e.target.value)}
                    />
                  </Field>
                  <Field label="ИНН">
                    <Input value={profile.inn} onChange={(e) => setProfileField("inn", e.target.value)} />
                  </Field>
                  <Field label="ОГРНИП">
                    <Input
                      value={profile.ogrnip}
                      onChange={(e) => setProfileField("ogrnip", e.target.value)}
                    />
                  </Field>
                  <Field label="Адрес регистрации">
                    <Input
                      value={profile.registrationAddress}
                      onChange={(e) => setProfileField("registrationAddress", e.target.value)}
                    />
                  </Field>
                </div>
              </InfoCard>
            ) : null}

            {type === "legal_entity" ? (
              <InfoCard title="Юридическое лицо">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Полное наименование">
                    <Input
                      value={profile.companyFullName}
                      onChange={(e) => setProfileField("companyFullName", e.target.value)}
                    />
                  </Field>
                  <Field label="Краткое наименование">
                    <Input
                      value={profile.companyShortName}
                      onChange={(e) => setProfileField("companyShortName", e.target.value)}
                    />
                  </Field>
                  <Field label="ИНН">
                    <Input value={profile.inn} onChange={(e) => setProfileField("inn", e.target.value)} />
                  </Field>
                  <Field label="КПП">
                    <Input value={profile.kpp} onChange={(e) => setProfileField("kpp", e.target.value)} />
                  </Field>
                  <Field label="ОГРН">
                    <Input value={profile.ogrn} onChange={(e) => setProfileField("ogrn", e.target.value)} />
                  </Field>
                  <Field label="Юридический адрес">
                    <Input
                      value={profile.legalAddress}
                      onChange={(e) => setProfileField("legalAddress", e.target.value)}
                    />
                  </Field>
                  <Field label="Почтовый адрес">
                    <Input
                      value={profile.postalAddress}
                      onChange={(e) => setProfileField("postalAddress", e.target.value)}
                    />
                  </Field>
                  <Field label="Подписант">
                    <Input
                      value={profile.signatoryFullName}
                      onChange={(e) => setProfileField("signatoryFullName", e.target.value)}
                    />
                  </Field>
                  <Field label="Должность">
                    <Input
                      value={profile.signatoryPosition}
                      onChange={(e) => setProfileField("signatoryPosition", e.target.value)}
                    />
                  </Field>
                  <Field label="Основание полномочий">
                    <Input
                      value={profile.signatoryAuthorityBasis}
                      onChange={(e) => setProfileField("signatoryAuthorityBasis", e.target.value)}
                    />
                  </Field>
                </div>
              </InfoCard>
            ) : null}

            <InfoCard title="Банковские реквизиты">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Расчётный счёт">
                  <Input
                    value={profile.bankAccountNumber}
                    onChange={(e) => setProfileField("bankAccountNumber", e.target.value)}
                  />
                </Field>
                <Field label="БИК">
                  <Input
                    value={profile.bankBic}
                    onChange={(e) => setProfileField("bankBic", e.target.value)}
                  />
                </Field>
                <Field label="Банк">
                  <Input
                    value={profile.bankName}
                    onChange={(e) => setProfileField("bankName", e.target.value)}
                  />
                </Field>
                <Field label="Корр. счёт">
                  <Input
                    value={profile.bankCorrespondentAccount}
                    onChange={(e) => setProfileField("bankCorrespondentAccount", e.target.value)}
                  />
                </Field>
              </div>
            </InfoCard>

            <Button disabled={saving} onClick={() => void saveProfile()}>
              {saving ? "Сохранение..." : "Сохранить профиль"}
            </Button>
          </TabsContent>

          <TabsContent value="subscription" className="mt-4 space-y-4">
            <InfoCard title="Подписка аккаунта">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Тариф">
                  <Select value={subscriptionName} onValueChange={setSubscriptionName}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Без подписки</SelectItem>
                      {SUBSCRIPTION_PLANS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {subscriptionName !== "__none__" && subscriptionName !== "Fix" ? (
                  <Field label="Действует до">
                    <Input
                      type="date"
                      value={subscriptionExpiresAt}
                      onChange={(e) => setSubscriptionExpiresAt(e.target.value)}
                    />
                  </Field>
                ) : null}
                {subscriptionName === "Fix" ? (
                  <Field label="Лимит треков">
                    <Input
                      type="number"
                      min={1}
                      value={subscriptionTrackLimit}
                      onChange={(e) => setSubscriptionTrackLimit(e.target.value)}
                    />
                  </Field>
                ) : null}
              </div>
              <Button className="mt-3" disabled={saving} onClick={() => void saveSubscription()}>
                Сохранить подписку
              </Button>
            </InfoCard>

            <InfoCard title="Слоты артистов">
              {slotsLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка слотов...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Слотов пока нет</p>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{slot.artistName || "Без имени артиста"}</p>
                        <p className="text-muted-foreground">
                          {slot.subscriptionName}
                          {slot.subscriptionExpiresAt
                            ? ` · до ${format(new Date(slot.subscriptionExpiresAt), "d MMM yyyy", { locale: ru })}`
                            : ""}
                          {slot.subscriptionTrackLimit != null
                            ? ` · лимит ${slot.subscriptionTrackLimit}`
                            : ""}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => void deleteSlot(slot.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Артист">
                  <Input value={newSlotArtist} onChange={(e) => setNewSlotArtist(e.target.value)} />
                </Field>
                <Field label="Тариф">
                  <Select value={newSlotPlan} onValueChange={setNewSlotPlan}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_PLANS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {newSlotPlan === "Fix" ? (
                  <Field label="Лимит">
                    <Input
                      type="number"
                      min={1}
                      value={newSlotLimit}
                      onChange={(e) => setNewSlotLimit(e.target.value)}
                    />
                  </Field>
                ) : (
                  <Field label="До">
                    <Input
                      type="date"
                      value={newSlotExpires}
                      onChange={(e) => setNewSlotExpires(e.target.value)}
                    />
                  </Field>
                )}
                <div className="flex items-end">
                  <Button className="w-full" disabled={saving} onClick={() => void createSlot()}>
                    Добавить слот
                  </Button>
                </div>
              </div>
            </InfoCard>
          </TabsContent>

          <TabsContent value="finance" className="mt-4 space-y-4">
            <InfoCard title="Балансы">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Баланс кабинета, ₽">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={walletBalance}
                    onChange={(e) => setWalletBalance(e.target.value)}
                  />
                </Field>
                <Field label="Роялти (стриминг), ₽">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={streamingBalance}
                    onChange={(e) => setStreamingBalance(e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Причина корректировки *">
                    <Input
                      value={balanceNote}
                      onChange={(e) => setBalanceNote(e.target.value)}
                      placeholder="Например: корректировка после отчёта / возврат / ошибка начисления"
                    />
                  </Field>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Без причины сохранить нельзя. Каждая правка попадает в журнал операций ниже.
              </p>
              <Button disabled={saving} onClick={() => void saveBalances()}>
                Сохранить балансы
              </Button>
            </InfoCard>

            <InfoCard title={`Журнал операций (${balanceTx.length})`}>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {balanceTx.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Операций пока нет</p>
                ) : (
                  balanceTx.map((tx, i) => {
                    const type = str(tx.type)
                    const label = BALANCE_TX_LABELS[type] || type
                    const created = str(tx.createdAt ?? tx.created_at)
                    const royaltyDelta = num(tx.royaltyDelta ?? tx.royalty_delta)
                    const walletDelta = num(tx.walletDelta ?? tx.wallet_delta)
                    return (
                      <div
                        key={str(tx.id ?? i)}
                        className="rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {created
                              ? format(new Date(created), "d MMM yyyy, HH:mm", { locale: ru })
                              : "-"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {walletDelta !== 0
                            ? `кабинет ${walletDelta > 0 ? "+" : ""}${walletDelta.toLocaleString("ru-RU")} ₽`
                            : null}
                          {walletDelta !== 0 && royaltyDelta !== 0 ? " · " : null}
                          {royaltyDelta !== 0
                            ? `роялти ${royaltyDelta > 0 ? "+" : ""}${royaltyDelta.toLocaleString("ru-RU")} ₽`
                            : null}
                          {walletDelta === 0 && royaltyDelta === 0
                            ? `сумма ${num(tx.amount).toLocaleString("ru-RU")} ₽`
                            : null}
                        </p>
                        {tx.note ? (
                          <p className="mt-1 text-sm text-foreground/90">{display(tx.note)}</p>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </InfoCard>

            <InfoCard title={`Заказы (${orders.length})`}>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {orders.slice(0, 40).map((o, i) => (
                  <div key={str(o.id ?? i)} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <p>
                      {display(o.order_type ?? o.orderType)} · {display(o.status)} ·{" "}
                      {display(o.total_amount ?? o.totalAmount)} ₽
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {display(o.created_at ?? o.createdAt)} · id {display(o.id)}
                    </p>
                  </div>
                ))}
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Заказов нет</p>
                ) : null}
              </div>
            </InfoCard>

            <InfoCard title={`Выплаты (${withdrawals.length})`}>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {withdrawals.slice(0, 20).map((w, i) => (
                  <div key={str(w.id ?? i)} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <p>
                      {display(w.amount)} ₽ · {display(w.status)}
                    </p>
                    <p className="text-xs text-muted-foreground">{display(w.created_at ?? w.createdAt)}</p>
                  </div>
                ))}
                {withdrawals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Заявок на выплату нет</p>
                ) : null}
              </div>
            </InfoCard>

            <InfoCard title={`Стриминг-отчёты (${reports.length})`}>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reports.slice(0, 20).map((r, i) => (
                  <div key={str(r.id ?? i)} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <p>
                      {display(r.period ?? r.title)} · {display(r.amount ?? r.total_amount)} ₽
                    </p>
                    <p className="text-xs text-muted-foreground">{display(r.created_at ?? r.createdAt)}</p>
                  </div>
                ))}
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Отчётов нет</p>
                ) : null}
              </div>
            </InfoCard>
          </TabsContent>

          <TabsContent value="content" className="mt-4 space-y-4">
            <InfoCard title={`Треки (${tracks.length})`}>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tracks.slice(0, 50).map((t, i) => (
                  <div key={str(t.id ?? i)} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <p>
                      {display(t.artist_name ?? t.artistName)} - {display(t.track_name ?? t.trackName)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {display(t.status)} · {display(t.release_date ?? t.releaseDate)}
                    </p>
                  </div>
                ))}
                {tracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Треков нет</p>
                ) : null}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin26081993/tracks?userId=${encodeURIComponent(email)}&label=${encodeURIComponent(email)}`}
                >
                  Открыть в разделе треков
                </Link>
              </Button>
            </InfoCard>

            <InfoCard title={`Альбомы (${albums.length})`}>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {albums.slice(0, 30).map((a, i) => (
                  <div key={str(a.id ?? i)} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <p>
                      {display(a.artist_name ?? a.artistName)} - {display(a.title)}
                    </p>
                  </div>
                ))}
                {albums.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Альбомов нет</p>
                ) : null}
              </div>
            </InfoCard>

            <InfoCard title={`Черновики загрузки (${drafts.length})`}>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {drafts.slice(0, 20).map((d, i) => (
                  <div key={str(d.id ?? i)} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                    <p>
                      {display(d.id)} · шаг {display(d.wizard_step ?? d.wizardStep)}
                    </p>
                    <p className="text-xs text-muted-foreground">{display(d.updated_at ?? d.created_at)}</p>
                  </div>
                ))}
                {drafts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Черновиков нет</p>
                ) : null}
              </div>
            </InfoCard>
          </TabsContent>

          <TabsContent value="security" className="mt-4 space-y-4">
            <InfoCard title="Безопасность">
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <p>
                  <span className="text-muted-foreground">2FA: </span>
                  {user.totp_enabled ? "Включена" : "Выключена"}
                </p>
                <p>
                  <span className="text-muted-foreground">Автоплатёж: </span>
                  {user.autopay_enabled ? "Включён" : "Выключен"}
                </p>
                <p>
                  <span className="text-muted-foreground">План автоплатежа: </span>
                  {display(user.autopay_plan_id)}
                </p>
                <p>
                  <span className="text-muted-foreground">Следующее списание: </span>
                  {display(user.autopay_next_charge_at)}
                </p>
                <p>
                  <span className="text-muted-foreground">T-Bank RebillId: </span>
                  {user.tbank_rebill_id ? "Есть" : "Нет"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => setPasswordOpen(true)}>
                  Сменить пароль
                </Button>
                <Button variant="outline" disabled={saving} onClick={() => void toggleDisabled()}>
                  {isDisabled ? "Разблокировать" : "Заблокировать"}
                </Button>
              </div>
            </InfoCard>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пароль</DialogTitle>
          </DialogHeader>
          <Field label="Пароль (не менее 10 символов)">
            <Input
              type="text"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              Отмена
            </Button>
            <Button disabled={saving} onClick={() => void savePassword()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет удалён аккаунт {email}. Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteUser()}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
