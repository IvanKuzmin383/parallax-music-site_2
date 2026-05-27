"use client"

import { Fragment, Suspense, useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
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
import { format, addMonths, subMonths, differenceInMonths, differenceInDays } from "date-fns"
import { ru } from "date-fns/locale"
import { UserPlus, User, KeyRound, Trash2, Crown, Music, UserX, UserCheck, Users, Eye, Building2 } from "lucide-react"
import {
  COUNTERPARTY_TYPE_LABELS,
  COUNTERPARTY_TYPES,
  type CounterpartyType,
} from "@/lib/cabinet-counterparty"
import Link from "next/link"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { SUBSCRIPTION_PLANS, isSubscriptionPlan } from "@/lib/subscription-plans"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
}

interface CabinetArtistSubscription {
  id: string
  artistName: string | null
  subscriptionName: string
  subscriptionExpiresAt: string | null
  subscriptionTrackLimit: number | null
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

function getSlotStatus(slot: CabinetArtistSubscription): {
  sortWeight: number
  label: string
  className: string
} {
  if (slot.subscriptionName === "Fix") {
    return {
      sortWeight: 0,
      label: "Активен (Fix, без срока)",
      className: "text-emerald-600",
    }
  }
  if (!slot.subscriptionExpiresAt) {
    return {
      sortWeight: 3,
      label: "Нет даты окончания",
      className: "text-muted-foreground",
    }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expires = new Date(slot.subscriptionExpiresAt)
  expires.setHours(0, 0, 0, 0)
  const daysLeft = differenceInDays(expires, today)
  if (daysLeft < 0) {
    return { sortWeight: 2, label: "Истёк", className: "text-destructive" }
  }
  if (daysLeft <= 7) {
    return {
      sortWeight: 1,
      label: daysLeft === 0 ? "Истекает сегодня" : `Истекает через ${daysLeft} дн.`,
      className: "text-amber-600",
    }
  }
  return {
    sortWeight: 0,
    label: `Активен ещё ${daysLeft} дн.`,
    className: "text-emerald-600",
  }
}

function AdminCabinetUsersPageInner() {
  const [users, setUsers] = useState<CabinetUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newArtistName, setNewArtistName] = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<CabinetUser | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [userToUpdate, setUserToUpdate] = useState<CabinetUser | null>(null)
  const [newPasswordValue, setNewPasswordValue] = useState("")
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false)
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  const [userToUpdateSubscription, setUserToUpdateSubscription] = useState<CabinetUser | null>(null)
  const [subscriptionName, setSubscriptionName] = useState("")
  const [subscriptionMonths, setSubscriptionMonths] = useState(1)
  const [subscriptionStartDate, setSubscriptionStartDate] = useState("")
  const [subscriptionTrackLimit, setSubscriptionTrackLimit] = useState<number>(1)
  const [subscriptionUpdateLoading, setSubscriptionUpdateLoading] = useState(false)
  const [artistNameDialogOpen, setArtistNameDialogOpen] = useState(false)
  const [userToUpdateArtistName, setUserToUpdateArtistName] = useState<CabinetUser | null>(null)
  const [artistNameValue, setArtistNameValue] = useState("")
  const [artistNameUpdateLoading, setArtistNameUpdateLoading] = useState(false)
  const [counterpartyDialogOpen, setCounterpartyDialogOpen] = useState(false)
  const [userToUpdateCounterparty, setUserToUpdateCounterparty] = useState<CabinetUser | null>(null)
  const [counterpartyTypeValue, setCounterpartyTypeValue] = useState<CounterpartyType>("individual")
  const [counterpartyUpdateLoading, setCounterpartyUpdateLoading] = useState(false)
  const [disableUpdateLoadingId, setDisableUpdateLoadingId] = useState<string | null>(null)
  const [artistSlotsDialogOpen, setArtistSlotsDialogOpen] = useState(false)
  const [userToManageArtistSlots, setUserToManageArtistSlots] = useState<CabinetUser | null>(null)
  const [artistSlots, setArtistSlots] = useState<CabinetArtistSubscription[]>([])
  const [artistSlotsLoading, setArtistSlotsLoading] = useState(false)
  const [artistSlotSavingId, setArtistSlotSavingId] = useState<string | null>(null)
  const [artistSlotDeletingId, setArtistSlotDeletingId] = useState<string | null>(null)
  const [newSlotPlan, setNewSlotPlan] = useState<string>("Start")
  const [newSlotArtistName, setNewSlotArtistName] = useState("")
  const [newSlotExpiresAt, setNewSlotExpiresAt] = useState("")
  const [newSlotTrackLimit, setNewSlotTrackLimit] = useState<number>(1)
  const [newSlotCreating, setNewSlotCreating] = useState(false)
  const [userFullDialogOpen, setUserFullDialogOpen] = useState(false)
  const [userFullLoading, setUserFullLoading] = useState(false)
  const [userFullData, setUserFullData] = useState<Record<string, unknown> | null>(null)
  const [userFullTitle, setUserFullTitle] = useState("")
  const [blockedUsersExpanded, setBlockedUsersExpanded] = useState(false)
  const [billingRunDialogOpen, setBillingRunDialogOpen] = useState(false)
  const [billingRunLoading, setBillingRunLoading] = useState(false)
  const [billingRunsLoading, setBillingRunsLoading] = useState(false)
  const [billingRuns, setBillingRuns] = useState<SubscriptionBillingRunLog[]>([])
  const [billingHistoryExpanded, setBillingHistoryExpanded] = useState(false)

  const subscriptionExpiresAt = (() => {
    if (!subscriptionStartDate) return ""
    const start = new Date(subscriptionStartDate)
    if (isNaN(start.getTime())) return ""
    const end = addMonths(start, subscriptionMonths)
    return format(end, "yyyy-MM-dd")
  })()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const blockedUsers = useMemo(
    () => filteredUsers.filter((user) => Boolean(user.isDisabled)).sort(sortByRegistrationDate),
    [filteredUsers, sortByRegistrationDate]
  )
  const activeUsers = useMemo(
    () => filteredUsers.filter((user) => !user.isDisabled).sort(sortByRegistrationDate),
    [filteredUsers, sortByRegistrationDate]
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

      const usersConsidered =
        typeof data.usersConsidered === "number" ? data.usersConsidered : 0
      const remindersSent =
        typeof data.remindersSent === "number" ? data.remindersSent : 0
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

      if (response.ok) {
        toast.success("Пользователь создан")
        setNewEmail("")
        setNewPassword("")
        setNewArtistName("")
        loadUsers()
      } else {
        const err = await response.json()
        toast.error(err.error || "Не удалось создать пользователя")
      }
    } catch (error) {
      console.error("Add user error:", error)
      toast.error("Ошибка при создании")
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    try {
      const response = await fetch(`/api/admin/cabinet-users/${userToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (response.ok) {
        toast.success("Пользователь удалён")
        loadUsers()
        setDeleteDialogOpen(false)
        setUserToDelete(null)
      } else {
        toast.error("Не удалось удалить")
      }
    } catch (error) {
      toast.error("Ошибка при удалении")
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userToUpdate || newPasswordValue.length < 10) {
      toast.error("Пароль должен быть не менее 10 символов")
      return
    }
    setPasswordUpdateLoading(true)
    try {
      const response = await fetch(`/api/admin/cabinet-users/${userToUpdate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPasswordValue }),
        credentials: "include",
      })
      if (response.ok) {
        toast.success("Пароль обновлён")
        setPasswordDialogOpen(false)
        setUserToUpdate(null)
        setNewPasswordValue("")
        loadUsers()
      } else {
        const err = await response.json()
        toast.error(err.error || "Не удалось обновить пароль")
      }
    } catch (error) {
      toast.error("Ошибка при обновлении")
    } finally {
      setPasswordUpdateLoading(false)
    }
  }

  const handleSubscriptionUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userToUpdateSubscription) return
    const plan = subscriptionName === "__none__" ? "" : subscriptionName.trim()
    const isFixPlan = plan === "Fix"
    
    if (plan && !isFixPlan) {
      if (!subscriptionStartDate) {
        toast.error("Укажите дату начала подписки")
        return
      }
      if (subscriptionMonths < 1) {
        toast.error("Количество месяцев должно быть не менее 1")
        return
      }
    }
    
    if (isFixPlan && (!subscriptionTrackLimit || subscriptionTrackLimit < 1)) {
      toast.error("Укажите количество треков (не менее 1)")
      return
    }
    
    setSubscriptionUpdateLoading(true)
    try {
      const response = await fetch(`/api/admin/cabinet-users/${userToUpdateSubscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionName: plan || null,
          subscriptionExpiresAt: isFixPlan ? null : (plan ? subscriptionExpiresAt || null : null),
          subscriptionTrackLimit: isFixPlan ? subscriptionTrackLimit : null,
        }),
        credentials: "include",
      })
      if (response.ok) {
        // Сохраняем количество месяцев в localStorage для этого пользователя
        if (userToUpdateSubscription) {
          const savedMonthsKey = `subscription_months_${userToUpdateSubscription.id}`
          localStorage.setItem(savedMonthsKey, subscriptionMonths.toString())
        }
        
        toast.success("Подписка обновлена")
        setSubscriptionDialogOpen(false)
        setUserToUpdateSubscription(null)
        setSubscriptionName("__none__")
        setSubscriptionMonths(1)
        setSubscriptionStartDate("")
        setSubscriptionTrackLimit(1)
        loadUsers()
      } else {
        const err = await response.json()
        toast.error(err.error || "Не удалось обновить подписку")
      }
    } catch (error) {
      toast.error("Ошибка при обновлении")
    } finally {
      setSubscriptionUpdateLoading(false)
    }
  }

  const handleCounterpartyTypeUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userToUpdateCounterparty) return
    setCounterpartyUpdateLoading(true)
    try {
      const response = await fetch(`/api/admin/cabinet-users/${userToUpdateCounterparty.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterpartyType: counterpartyTypeValue }),
        credentials: "include",
      })
      if (response.ok) {
        toast.success("Тип контрагента обновлён")
        setCounterpartyDialogOpen(false)
        setUserToUpdateCounterparty(null)
        loadUsers()
      } else {
        const err = await response.json()
        toast.error(err.error || "Не удалось обновить")
      }
    } catch {
      toast.error("Ошибка при обновлении")
    } finally {
      setCounterpartyUpdateLoading(false)
    }
  }

  const handleArtistNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userToUpdateArtistName) return
    setArtistNameUpdateLoading(true)
    try {
      const response = await fetch(`/api/admin/cabinet-users/${userToUpdateArtistName.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistName: artistNameValue.trim() || null }),
        credentials: "include",
      })
      if (response.ok) {
        toast.success("Имя артиста обновлено")
        setArtistNameDialogOpen(false)
        setUserToUpdateArtistName(null)
        setArtistNameValue("")
        loadUsers()
      } else {
        const err = await response.json()
        toast.error(err.error || "Не удалось обновить")
      }
    } catch {
      toast.error("Ошибка при обновлении")
    } finally {
      setArtistNameUpdateLoading(false)
    }
  }

  const handleToggleDisabled = async (user: CabinetUser) => {
    setDisableUpdateLoadingId(user.id)
    try {
      const response = await fetch(`/api/admin/cabinet-users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDisabled: !user.isDisabled }),
        credentials: "include",
      })
      if (response.ok) {
        toast.success(user.isDisabled ? "Аккаунт разблокирован" : "Аккаунт заблокирован")
        loadUsers()
      } else {
        const err = await response.json()
        toast.error(err.error || "Не удалось обновить статус аккаунта")
      }
    } catch {
      toast.error("Ошибка при обновлении статуса аккаунта")
    } finally {
      setDisableUpdateLoadingId(null)
    }
  }

  const loadArtistSlots = async (userId: string) => {
    setArtistSlotsLoading(true)
    try {
      const res = await fetch(`/api/admin/cabinet-users/${userId}/artist-subscriptions`, {
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Не удалось загрузить слоты артистов")
        return
      }
      const data = await res.json()
      setArtistSlots(data.slots || [])
    } finally {
      setArtistSlotsLoading(false)
    }
  }

  const openArtistSlotsDialog = async (user: CabinetUser) => {
    setUserToManageArtistSlots(user)
    setArtistSlotsDialogOpen(true)
    await loadArtistSlots(user.id)
  }

  const patchArtistSlotLocal = (slotId: string, patch: Partial<CabinetArtistSubscription>) => {
    setArtistSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, ...patch } : s)))
  }

  const saveArtistSlot = async (slot: CabinetArtistSubscription) => {
    if (!userToManageArtistSlots) return
    setArtistSlotSavingId(slot.id)
    try {
      const res = await fetch(
        `/api/admin/cabinet-users/${userToManageArtistSlots.id}/artist-subscriptions/${slot.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            artistName: slot.artistName?.trim() || null,
            subscriptionName: slot.subscriptionName,
            subscriptionExpiresAt: slot.subscriptionName === "Fix" ? null : slot.subscriptionExpiresAt || null,
            subscriptionTrackLimit:
              slot.subscriptionName === "Fix"
                ? Math.max(1, Number(slot.subscriptionTrackLimit || 1))
                : null,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Не удалось сохранить слот")
        return
      }
      toast.success("Слот сохранён")
      await loadArtistSlots(userToManageArtistSlots.id)
    } finally {
      setArtistSlotSavingId(null)
    }
  }

  const deleteArtistSlot = async (slotId: string) => {
    if (!userToManageArtistSlots) return
    setArtistSlotDeletingId(slotId)
    try {
      const res = await fetch(
        `/api/admin/cabinet-users/${userToManageArtistSlots.id}/artist-subscriptions/${slotId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Не удалось удалить слот")
        return
      }
      toast.success("Слот удалён")
      await loadArtistSlots(userToManageArtistSlots.id)
    } finally {
      setArtistSlotDeletingId(null)
    }
  }

  const createArtistSlot = async () => {
    if (!userToManageArtistSlots) return
    setNewSlotCreating(true)
    try {
      const res = await fetch(
        `/api/admin/cabinet-users/${userToManageArtistSlots.id}/artist-subscriptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            artistName: newSlotArtistName.trim() || null,
            subscriptionName: newSlotPlan,
            subscriptionExpiresAt: newSlotPlan === "Fix" ? null : (newSlotExpiresAt || null),
            subscriptionTrackLimit: newSlotPlan === "Fix" ? Math.max(1, Number(newSlotTrackLimit || 1)) : null,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Не удалось добавить слот")
        return
      }
      toast.success("Слот добавлен")
      setNewSlotArtistName("")
      setNewSlotExpiresAt("")
      setNewSlotTrackLimit(1)
      await loadArtistSlots(userToManageArtistSlots.id)
    } finally {
      setNewSlotCreating(false)
    }
  }

  const openUserFullDialog = async (user: CabinetUser) => {
    setUserFullDialogOpen(true)
    setUserFullLoading(true)
    setUserFullTitle(user.email)
    setUserFullData(null)
    try {
      const res = await fetch(`/api/admin/cabinet-users/${user.id}/full`, {
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error || "Не удалось загрузить полные данные пользователя")
        return
      }
      const data = (await res.json()) as Record<string, unknown>
      setUserFullData(data)
    } catch {
      toast.error("Ошибка при загрузке данных пользователя")
    } finally {
      setUserFullLoading(false)
    }
  }

  const userFullSections = useMemo(() => {
    const payload = userFullData as {
      user?: Record<string, unknown>
      summary?: Record<string, unknown>
      related?: Record<string, unknown>
    } | null
    const related = payload?.related ?? {}
    return {
      profile: payload?.user ?? {},
      summary: payload?.summary ?? {},
      subscriptions: {
        artistSubscriptions: related.artistSubscriptions ?? [],
        pendingAutopay: related.pendingAutopay ?? null,
        autopayDisableTokens: related.autopayDisableTokens ?? [],
      },
      content: {
        tracks: related.tracks ?? [],
        albums: related.albums ?? [],
        uploadDrafts: related.uploadDrafts ?? [],
      },
      finance: {
        orders: related.orders ?? [],
        withdrawalRequests: related.withdrawalRequests ?? [],
        streamingReports: related.streamingReports ?? [],
      },
      legalAndSecurity: {
        legalAcceptanceEvents: related.legalAcceptanceEvents ?? [],
        passwordResetTokens: related.passwordResetTokens ?? [],
        deletedHistory: related.deletedHistory ?? [],
      },
      interactions: {
        announcementDismissals: related.announcementDismissals ?? [],
      },
      raw: payload ?? {},
    }
  }, [userFullData])

  const toRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const toRows = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? (value as Record<string, unknown>[]) : []
  const renderValue = (value: unknown) => {
    if (value == null || value === "") return "-"
    if (typeof value === "boolean") return value ? "Да" : "Нет"
    if (typeof value === "number") return value.toLocaleString("ru-RU")
    if (typeof value === "string") return value
    return String(value)
  }

  const renderUserRow = (user: CabinetUser) => {
    const fixBaseLimit = user.subscriptionTrackLimit ?? 0
    const fixPurchasedTracks = user.purchasedTracksBalance ?? 0
    const fixEffectiveLimit = fixBaseLimit + fixPurchasedTracks
    const subscriptionStatus = (() => {
      if (!user.subscriptionName) return null
      if (user.subscriptionName === "Fix") {
        return {
          label: "Без ограничения по времени",
          className: "text-muted-foreground",
        }
      }
      if (!user.subscriptionExpiresAt) return null

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expires = new Date(user.subscriptionExpiresAt)
      expires.setHours(0, 0, 0, 0)
      const daysLeft = differenceInDays(expires, today)

      if (daysLeft < 0) {
        return {
          label: "Подписка истекла",
          className: "text-red-600 font-semibold",
        }
      }
      if (daysLeft === 0) {
        return {
          label: "Заканчивается сегодня",
          className: "text-orange-600 font-semibold",
        }
      }
      if (daysLeft <= 7) {
        return {
          label: `Заканчивается через ${daysLeft} дн.`,
          className: "text-orange-600",
        }
      }

      return {
        label: `Активна ещё ${daysLeft} дн.`,
        className: "text-muted-foreground",
      }
    })()

    return (
      <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{user.email}</p>
            {user.isDisabled && (
              <span className="text-sm px-2 py-0.5 rounded bg-destructive/10 text-destructive">
                Заблокирован
              </span>
            )}
            {user.artistName && (
              <span className="text-sm px-2 py-0.5 rounded bg-primary/10 text-primary">
                {user.artistName}
              </span>
            )}
            <span className="text-sm px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {COUNTERPARTY_TYPE_LABELS[user.counterpartyType ?? "individual"]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Создан: {format(new Date(user.createdAt), "d MMM yyyy", { locale: ru })}
          </p>
          {user.subscriptionName && (
            <p className="text-sm mt-1">
              <span className="text-muted-foreground">
                Подписка: <span className="font-medium">{user.subscriptionName}</span>
                {user.subscriptionName === "Fix" && (
                  <span className="ml-2">
                    (лимит: {fixEffectiveLimit} = {fixBaseLimit} база + {fixPurchasedTracks} докуплено)
                  </span>
                )}
                {user.subscriptionName !== "Fix" && user.subscriptionExpiresAt && (
                  <span className="ml-2">
                    (до {format(new Date(user.subscriptionExpiresAt), "d MMM yyyy", { locale: ru })})
                  </span>
                )}
              </span>
              {subscriptionStatus && <span className={`ml-2 ${subscriptionStatus.className}`}>{subscriptionStatus.label}</span>}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Стриминг-баланс:{" "}
            <span className="font-medium text-green-600">{(user.streamingBalance || 0).toLocaleString("ru-RU")} ₽</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin26081993/tracks?userId=${encodeURIComponent(user.email)}&label=${encodeURIComponent(user.email)}`}>
              <Music className="h-4 w-4 mr-1" />
              Треки
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void openUserFullDialog(user)}>
            <Eye className="h-4 w-4 mr-1" />
            Полная инфо
          </Button>
          <Button variant="outline" size="sm" onClick={() => void openArtistSlotsDialog(user)}>
            <Users className="h-4 w-4 mr-1" />
            Слоты артистов
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUserToUpdateArtistName(user)
              setArtistNameValue(user.artistName || "")
              setArtistNameDialogOpen(true)
            }}
          >
            <User className="h-4 w-4 mr-1" />
            Имя артиста
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUserToUpdateCounterparty(user)
              setCounterpartyTypeValue(user.counterpartyType ?? "individual")
              setCounterpartyDialogOpen(true)
            }}
          >
            <Building2 className="h-4 w-4 mr-1" />
            Тип контрагента
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUserToUpdateSubscription(user)
              setSubscriptionName(
                user.subscriptionName && isSubscriptionPlan(user.subscriptionName)
                  ? user.subscriptionName
                  : "__none__"
              )
              if (user.subscriptionName === "Fix") {
                setSubscriptionTrackLimit(user.subscriptionTrackLimit ?? 1)
                setSubscriptionStartDate("")
                setSubscriptionMonths(1)
              } else {
                const savedMonthsKey = `subscription_months_${user.id}`
                const savedMonths = localStorage.getItem(savedMonthsKey)
                if (user.subscriptionExpiresAt) {
                  const end = new Date(user.subscriptionExpiresAt)
                  const now = new Date()
                  let calculatedMonths = 1
                  if (end > now) calculatedMonths = Math.max(1, differenceInMonths(end, now) + 1)
                  const monthsToUse = savedMonths ? parseInt(savedMonths, 10) : calculatedMonths
                  setSubscriptionMonths(Math.max(1, monthsToUse))
                  setSubscriptionStartDate(format(subMonths(end, monthsToUse), "yyyy-MM-dd"))
                } else {
                  const monthsToUse = savedMonths ? parseInt(savedMonths, 10) : 1
                  setSubscriptionMonths(Math.max(1, monthsToUse))
                  setSubscriptionStartDate("")
                }
                setSubscriptionTrackLimit(1)
              }
              setSubscriptionDialogOpen(true)
            }}
          >
            <Crown className="h-4 w-4 mr-1" />
            Подписка
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUserToUpdate(user)
              setNewPasswordValue("")
              setPasswordDialogOpen(true)
            }}
          >
            <KeyRound className="h-4 w-4 mr-1" />
            Пароль
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disableUpdateLoadingId === user.id}
            onClick={() => handleToggleDisabled(user)}
          >
            {user.isDisabled ? (
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
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.replace("/admin26081993")
    return null
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="cabinet-users" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Пользователи личного кабинета</h1>
            <p className="text-muted-foreground text-sm">
              Добавляйте пользователей и выдавайте им пароли для входа в ЛК
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Фильтр по пользователю</span>
              {filterUserLabel ? (
                <>
                  {": "}
                  <span className="text-foreground">{filterUserLabel}</span>
                </>
              ) : null}
              <span className="block sm:inline sm:ml-1 mt-1 sm:mt-0 font-mono text-xs text-muted-foreground">
                {filterUserLabel ? "· " : ""}
                {userIdFilterRaw}
              </span>
              <span className="block sm:inline text-foreground sm:ml-2">
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

        <div className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Добавить пользователя</h2>
          <form onSubmit={handleAddUser} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={addLoading}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Имя артиста</label>
              <Input
                type="text"
                placeholder="Название артиста/группы"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                disabled={addLoading}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">
                Пароль (мин. 10 символов)
              </label>
              <Input
                type="password"
                placeholder="••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={addLoading}
              />
            </div>
            <Button type="submit" disabled={addLoading}>
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </form>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-muted/30 border-b">
            <button
              type="button"
              className="flex-1 flex items-center justify-between gap-3 text-left min-w-0"
              onClick={() => setBillingHistoryExpanded((prev) => !prev)}
            >
              <div className="min-w-0">
                <h2 className="font-semibold">История запусков автосписания</h2>
                {!billingHistoryExpanded && billingRuns.length > 0 ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Записей в истории: {billingRuns.length}
                  </p>
                ) : null}
              </div>
              <span className="text-sm text-muted-foreground shrink-0">
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
            <div className="p-4 space-y-3">
              {billingRunsLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка истории...</p>
              ) : billingRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Запусков пока нет</p>
              ) : (
                <div className="space-y-3">
                  {billingRuns.map((run) => (
                    <div key={run.id} className="rounded border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {run.source === "admin_manual" ? "Ручной запуск из админки" : run.source}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(run.startedAt), "d MMM yyyy, HH:mm:ss", { locale: ru })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        users: {run.usersConsidered} · списаний: {run.chargesInitiated} · напоминаний: {run.remindersSent} · ошибок: {run.errorsCount}
                      </p>
                      {run.errors.length > 0 ? (
                        <div className="rounded bg-destructive/5 border border-destructive/20 p-2">
                          <p className="text-sm font-medium text-destructive mb-1">Ошибки:</p>
                          <div className="space-y-1">
                            {run.errors.slice(0, 5).map((errorText, idx) => (
                              <p key={`${run.id}-err-${idx}`} className="text-xs text-destructive/90 break-words">
                                {errorText}
                              </p>
                            ))}
                            {run.errors.length > 5 ? (
                              <p className="text-xs text-muted-foreground">...и ещё {run.errors.length - 5}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-600">Ошибок нет</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="border rounded-lg divide-y">
          {users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Пользователей пока нет
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Пользователь по заданному фильтру не найден
            </div>
          ) : (
            <>
              {blockedUsersCount > 0 ? (
                <div className="p-4 bg-muted/30 border-b">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setBlockedUsersExpanded((prev) => !prev)}
                  >
                    <span className="font-medium">Заблокированные пользователи ({blockedUsersCount})</span>
                    <span className="text-sm text-muted-foreground">
                      {blockedUsersExpanded ? "Свернуть" : "Показать"}
                    </span>
                  </button>
                </div>
              ) : null}
              {blockedUsersExpanded ? blockedUsers.map((user) => <Fragment key={user.id}>{renderUserRow(user)}</Fragment>) : null}
              {activeUsers.map((user) => <Fragment key={user.id}>{renderUserRow(user)}</Fragment>)}
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Пользователь {userToDelete?.email} будет удалён. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={billingRunDialogOpen} onOpenChange={setBillingRunDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Запустить автосписание сейчас?</AlertDialogTitle>
            <AlertDialogDescription>
              Будет запущена обработка для всех пользователей, у которых автосписание запланировано на сегодня или раньше.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={billingRunLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRunSubscriptionBilling()} disabled={billingRunLoading}>
              {billingRunLoading ? "Запуск..." : "Запустить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сменить пароль</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Пользователь: {userToUpdate?.email}
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Новый пароль (мин. 10 символов)
              </label>
              <Input
                type="password"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                placeholder="••••••••••"
                disabled={passwordUpdateLoading}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={passwordUpdateLoading || newPasswordValue.length < 10}>
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Управление подпиской</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubscriptionUpdate} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Пользователь: {userToUpdateSubscription?.email}
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Тариф подписки
              </label>
              <Select
                value={subscriptionName || "__none__"}
                onValueChange={(value) => {
                  setSubscriptionName(value)
                  if (value === "Fix") {
                    setSubscriptionStartDate("")
                    setSubscriptionMonths(1)
                  } else if (value !== "__none__") {
                    setSubscriptionTrackLimit(1)
                  }
                }}
                disabled={subscriptionUpdateLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тариф" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Без подписки</SelectItem>
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <SelectItem key={plan} value={plan}>
                      {plan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {subscriptionName === "Fix" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Базовый лимит треков (Fix)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={subscriptionTrackLimit}
                    onChange={(e) => setSubscriptionTrackLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    disabled={subscriptionUpdateLoading}
                  />
                </div>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {(() => {
                    const base = subscriptionTrackLimit || 0
                    const purchased = userToUpdateSubscription?.purchasedTracksBalance ?? 0
                    const total = base + purchased
                    return (
                      <>
                        Итоговый лимит для загрузки: <span className="font-medium text-foreground">{total}</span> ={" "}
                        <span className="font-medium text-foreground">{base}</span> база +{" "}
                        <span className="font-medium text-foreground">{purchased}</span> докуплено
                      </>
                    )
                  })()}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Количество месяцев
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={subscriptionMonths}
                    onChange={(e) => setSubscriptionMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    disabled={subscriptionUpdateLoading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Дата начала подписки
                  </label>
                  <Input
                    type="date"
                    value={subscriptionStartDate}
                    onChange={(e) => setSubscriptionStartDate(e.target.value)}
                    disabled={subscriptionUpdateLoading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Дата окончания подписки
                  </label>
                  <Input
                    type="text"
                    value={subscriptionExpiresAt ? format(new Date(subscriptionExpiresAt), "d MMMM yyyy", { locale: ru }) : "-"}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSubscriptionDialogOpen(false)
                  setSubscriptionName("__none__")
                  setSubscriptionMonths(1)
                  setSubscriptionStartDate("")
                  setSubscriptionTrackLimit(1)
                }}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={
                  subscriptionUpdateLoading ||
                  (!!subscriptionName &&
                    subscriptionName !== "__none__" &&
                    subscriptionName !== "Fix" &&
                    !subscriptionStartDate) ||
                  (subscriptionName === "Fix" && (!subscriptionTrackLimit || subscriptionTrackLimit < 1))
                }
              >
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={counterpartyDialogOpen} onOpenChange={setCounterpartyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Тип контрагента</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCounterpartyTypeUpdate} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Пользователь: {userToUpdateCounterparty?.email}
            </p>
            <p className="text-xs text-muted-foreground">
              Определяет, какие поля профиля видит пользователь в личном кабинете. При регистрации всегда
              «Физлицо».
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium block">Тип контрагента</label>
              <Select
                value={counterpartyTypeValue}
                onValueChange={(v) => setCounterpartyTypeValue(v as CounterpartyType)}
                disabled={counterpartyUpdateLoading}
              >
                <SelectTrigger>
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
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCounterpartyDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={counterpartyUpdateLoading}>
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={artistNameDialogOpen} onOpenChange={setArtistNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Имя артиста</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleArtistNameUpdate} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Пользователь: {userToUpdateArtistName?.email}
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">Имя артиста / группы</label>
              <Input
                type="text"
                value={artistNameValue}
                onChange={(e) => setArtistNameValue(e.target.value)}
                placeholder="Название артиста"
                disabled={artistNameUpdateLoading}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setArtistNameDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={artistNameUpdateLoading}>
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={artistSlotsDialogOpen}
        onOpenChange={(open) => {
          setArtistSlotsDialogOpen(open)
          if (!open) {
            setUserToManageArtistSlots(null)
            setArtistSlots([])
          }
        }}
      >
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Слоты артистов и подписки</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Пользователь: {userToManageArtistSlots?.email}
          </p>

          <div className="rounded border p-3 space-y-3">
            <p className="text-sm font-medium">Добавить слот</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                placeholder="Артист (необязательно)"
                value={newSlotArtistName}
                onChange={(e) => setNewSlotArtistName(e.target.value)}
                disabled={newSlotCreating}
              />
              <Select value={newSlotPlan} onValueChange={setNewSlotPlan} disabled={newSlotCreating}>
                <SelectTrigger>
                  <SelectValue placeholder="Тариф" />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <SelectItem key={plan} value={plan}>
                      {plan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newSlotPlan === "Fix" ? (
                <Input
                  type="number"
                  min={1}
                  value={newSlotTrackLimit}
                  onChange={(e) => setNewSlotTrackLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  disabled={newSlotCreating}
                />
              ) : (
                <Input
                  type="date"
                  value={newSlotExpiresAt}
                  onChange={(e) => setNewSlotExpiresAt(e.target.value)}
                  disabled={newSlotCreating}
                />
              )}
              <Button
                type="button"
                onClick={() => void createArtistSlot()}
                disabled={
                  newSlotCreating || (newSlotPlan !== "Fix" && !newSlotExpiresAt)
                }
              >
                Добавить слот
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[55vh] overflow-auto">
            {artistSlotsLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка слотов...</p>
            ) : artistSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Слотов пока нет</p>
            ) : (
              [...artistSlots]
                .sort((a, b) => {
                  const sa = getSlotStatus(a)
                  const sb = getSlotStatus(b)
                  if (sa.sortWeight !== sb.sortWeight) return sa.sortWeight - sb.sortWeight
                  return (a.artistName ?? "").localeCompare(b.artistName ?? "", "ru")
                })
                .map((slot) => {
                  const slotStatus = getSlotStatus(slot)
                  return (
                <div key={slot.id} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${slotStatus.className}`}>{slotStatus.label}</p>
                    <p className="text-xs text-muted-foreground">ID: {slot.id.slice(0, 8)}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input
                      placeholder="Артист"
                      value={slot.artistName ?? ""}
                      onChange={(e) => patchArtistSlotLocal(slot.id, { artistName: e.target.value })}
                    />
                    <Select
                      value={slot.subscriptionName}
                      onValueChange={(value) => patchArtistSlotLocal(slot.id, { subscriptionName: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Тариф" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBSCRIPTION_PLANS.map((plan) => (
                          <SelectItem key={plan} value={plan}>
                            {plan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {slot.subscriptionName === "Fix" ? (
                      <Input
                        type="number"
                        min={1}
                        value={slot.subscriptionTrackLimit ?? 1}
                        onChange={(e) =>
                          patchArtistSlotLocal(slot.id, {
                            subscriptionTrackLimit: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                      />
                    ) : (
                      <Input
                        type="date"
                        value={slot.subscriptionExpiresAt ? format(new Date(slot.subscriptionExpiresAt), "yyyy-MM-dd") : ""}
                        onChange={(e) => patchArtistSlotLocal(slot.id, { subscriptionExpiresAt: e.target.value || null })}
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void saveArtistSlot(slot)}
                        disabled={artistSlotSavingId === slot.id}
                      >
                        Сохранить
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void deleteArtistSlot(slot.id)}
                        disabled={artistSlotDeletingId === slot.id}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                </div>
                  )
                })
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArtistSlotsDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={userFullDialogOpen}
        onOpenChange={(open) => {
          setUserFullDialogOpen(open)
          if (!open) {
            setUserFullData(null)
            setUserFullTitle("")
            setUserFullLoading(false)
          }
        }}
      >
        <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Полная информация о пользователе</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Пользователь: {userFullTitle || "-"}</p>
          {userFullLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка данных...</p>
          ) : userFullData ? (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full flex-wrap h-auto">
                <TabsTrigger value="profile">Профиль</TabsTrigger>
                <TabsTrigger value="summary">Сводка</TabsTrigger>
                <TabsTrigger value="subscriptions">Подписки</TabsTrigger>
                <TabsTrigger value="content">Контент</TabsTrigger>
                <TabsTrigger value="finance">Финансы</TabsTrigger>
                <TabsTrigger value="legal">Юр. и безопасность</TabsTrigger>
                <TabsTrigger value="interactions">Взаимодействия</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(toRecord(userFullSections.profile)).map(([key, value]) => (
                    <div key={key} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">{key}</p>
                      <p className="break-words">{renderValue(value)}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="summary" className="mt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(toRecord(userFullSections.summary)).map(([key, value]) => (
                    <div key={key} className="rounded border bg-muted/30 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{key}</p>
                      <p className="text-base font-medium">{renderValue(value)}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="subscriptions" className="mt-3">
                <div className="space-y-3">
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Автоплатеж (ожидающий)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {Object.entries(toRecord(toRecord(userFullSections.subscriptions).pendingAutopay)).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground">{key}: </span>
                          <span>{renderValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Слоты артистов</p>
                    <div className="space-y-2">
                      {toRows(toRecord(userFullSections.subscriptions).artistSubscriptions).map((slot, idx) => (
                        <div key={String(slot.id ?? idx)} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                          <p><span className="text-muted-foreground">Артист:</span> {renderValue(slot.artist_name ?? slot.artistName)}</p>
                          <p><span className="text-muted-foreground">Тариф:</span> {renderValue(slot.subscription_name ?? slot.subscriptionName)}</p>
                          <p><span className="text-muted-foreground">Истекает:</span> {renderValue(slot.subscription_expires_at ?? slot.subscriptionExpiresAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="mt-3">
                <div className="space-y-3">
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Треки ({toRows(toRecord(userFullSections.content).tracks).length})</p>
                    <div className="space-y-2">
                      {toRows(toRecord(userFullSections.content).tracks).slice(0, 30).map((track, idx) => (
                        <div key={String(track.id ?? idx)} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                          <p>{renderValue(track.artist_name ?? track.artistName)} - {renderValue(track.track_name ?? track.trackName)}</p>
                          <p className="text-muted-foreground">Статус: {renderValue(track.status)} · Дата: {renderValue(track.release_date ?? track.releaseDate)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Альбомы ({toRows(toRecord(userFullSections.content).albums).length})</p>
                    <div className="space-y-2">
                      {toRows(toRecord(userFullSections.content).albums).slice(0, 20).map((album, idx) => (
                        <div key={String(album.id ?? idx)} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                          <p>{renderValue(album.artist_name ?? album.artistName)} - {renderValue(album.title)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="finance" className="mt-3">
                <div className="space-y-3">
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Заказы ({toRows(toRecord(userFullSections.finance).orders).length})</p>
                    <div className="space-y-2">
                      {toRows(toRecord(userFullSections.finance).orders).slice(0, 30).map((order, idx) => (
                        <div key={String(order.id ?? idx)} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                          <p>ID: {renderValue(order.id)} · {renderValue(order.order_type ?? order.orderType)}</p>
                          <p className="text-muted-foreground">Статус: {renderValue(order.status)} · Сумма: {renderValue(order.total_amount ?? order.totalAmount)}</p>
                          <p className="text-muted-foreground">
                            Создан: {renderValue(order.created_at ?? order.createdAt)}
                            {order.paid_at || order.paidAt ? ` · Оплачен: ${renderValue(order.paid_at ?? order.paidAt)}` : ""}
                          </p>
                          <p className="text-muted-foreground">
                            Рекуррент: {renderValue(order.is_recurring_renewal ?? order.isRecurringRenewal)}
                            {order.payment_id || order.paymentId ? ` · Payment ID: ${renderValue(order.payment_id ?? order.paymentId)}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Выплаты ({toRows(toRecord(userFullSections.finance).withdrawalRequests).length})</p>
                    <div className="space-y-2">
                      {toRows(toRecord(userFullSections.finance).withdrawalRequests).slice(0, 20).map((w, idx) => (
                        <div key={String(w.id ?? idx)} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                          <p>Сумма: {renderValue(w.amount)} · Статус: {renderValue(w.status)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="legal" className="mt-3">
                <div className="space-y-3">
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Юридические события ({toRows(toRecord(userFullSections.legalAndSecurity).legalAcceptanceEvents).length})</p>
                    <div className="space-y-2">
                      {toRows(toRecord(userFullSections.legalAndSecurity).legalAcceptanceEvents).slice(0, 20).map((e, idx) => (
                        <div key={String(e.id ?? idx)} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                          <p>{renderValue(e.document_key)} · {renderValue(e.event_type)} · {renderValue(e.occurred_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Токены восстановления ({toRows(toRecord(userFullSections.legalAndSecurity).passwordResetTokens).length})</p>
                    <div className="space-y-2">
                      {toRows(toRecord(userFullSections.legalAndSecurity).passwordResetTokens).slice(0, 20).map((t, idx) => (
                        <div key={String(t.token ?? idx)} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                          <p>{renderValue(t.email)} · до {renderValue(t.expires_at ?? t.expiresAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="interactions" className="mt-3">
                <div className="space-y-3">
                  <div className="rounded border p-3">
                    <p className="font-medium mb-2">Скрытые объявления ({toRows(toRecord(userFullSections.interactions).announcementDismissals).length})</p>
                    <div className="space-y-2">
                      {toRows(toRecord(userFullSections.interactions).announcementDismissals).slice(0, 20).map((dismiss, idx) => (
                        <div key={String(dismiss.announcement_id ?? idx)} className="rounded border bg-muted/30 px-3 py-2 text-sm">
                          <p>{renderValue(dismiss.announcement_title)} · {renderValue(dismiss.dismissed_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">Данные не загружены.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUserFullDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminCabinetUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <p>Загрузка...</p>
        </div>
      }
    >
      <AdminCabinetUsersPageInner />
    </Suspense>
  )
}
