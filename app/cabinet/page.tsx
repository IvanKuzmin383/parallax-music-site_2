"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Lock,
  Upload,
  Music,
  FileText,
  Info,
  TrendingUp,
  Wallet,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Link2,
  Copy,
  ArrowRight,
  MessageCircle,
  AlertTriangle,
  User,
  BarChart3,
  FileEdit,
  Trash2,
} from "lucide-react"
import type { Track } from "@/lib/tracks"
import type { UploadDraft, UploadDraftStatus } from "@/lib/upload-drafts"
import { AI_COVER_REQUEST_PRICE_RUB } from "@/lib/track-constants"
import type { Album } from "@/lib/albums"
import { getEffectiveTrackLimit, isSubscriptionActiveForUpload } from "@/lib/subscription-plans"
import { CABINET_ACCOUNT_BLOCKED_LOGIN_MESSAGE } from "@/lib/cabinet-account-messages"
import { isCabinetSubscriptionExpiredForNavigation } from "@/lib/cabinet-subscription-gate"
import { PurchaseTracksDialog } from "@/components/purchase-tracks-dialog"
import { SubscriptionLimitDialog } from "@/components/subscription-limit-dialog"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useI18n } from "@/lib/i18n-context"
import Image from "next/image"
import Link from "next/link"
import { Turnstile } from "@marsidev/react-turnstile"
import { CabinetAnnouncementsHost } from "@/components/cabinet-announcements-host"
import { getTrackPriceRubByCreatedAt, TRACK_PRICE_RUB } from "@/lib/track-pricing"
import { DEFAULT_RELEASE_LABEL_NAME } from "@/lib/release-label"
import { getTurnstileSiteKeyClient, isTurnstileEnabledClient } from "@/lib/turnstile-config"

const getSubscriptionLimitMessage = (limit: number) =>
  `Текущий тариф предусматривает не более ${limit} активных релизов. Чтобы загрузить больше, необходимо расширить подписку.`

const UPLOAD_DRAFT_STATUS_LABELS: Record<UploadDraftStatus, string> = {
  collecting: "Черновик",
  awaiting_payment: "Ожидает оплаты услуг",
  paid: "Оплачен - завершите отправку",
  finalized: "Отправлен",
  expired: "Истёк",
  cancelled: "Отменён",
}

function getUploadDraftContinueHref(draft: UploadDraft): string {
  if (draft.kind === "album") {
    return `/cabinet/upload/album?draftId=${encodeURIComponent(draft.id)}`
  }
  return `/cabinet/upload?draftId=${encodeURIComponent(draft.id)}`
}

function getUploadDraftDisplayTitle(draft: UploadDraft): string {
  if (draft.kind === "album") {
    const t = `${draft.payload.albumTitle ?? ""}`.trim()
    return t || "Альбом (черновик)"
  }
  const tn = `${draft.payload.trackName ?? ""}`.trim()
  const an = `${draft.payload.artistName ?? ""}`.trim()
  if (tn && an) return `${tn} - ${an}`
  if (tn) return tn
  if (an) return an
  return "Сингл (черновик)"
}

function getReleaseLabelName(labelName?: string | null): string {
  const trimmed = typeof labelName === "string" ? labelName.trim() : ""
  return trimmed || DEFAULT_RELEASE_LABEL_NAME
}

const STATUS_LABELS: Record<string, string> = {
  upload_pending: "Черновик",
  on_moderation: "На модерации",
  sent_to_platforms: "Модерация стриминг-сервисами",
  approved_by_platforms: "Одобрен площадками",
  released: "Выпущен",
  rejected: "Отклонено",
  postponed: "Отложено",
}

const SUPPORT_TELEGRAM_URL = "https://t.me/ParallaxMusic_RT"
const SUPPORT_VK_URL = "https://vk.com/parallaxmusic_releaseteam"
const PRICING_PAGE_URL = "https://parallaxmusic.ru/#pricing"
const SUBSCRIPTION_REQUIRED_REGISTER_MESSAGE =
  "Сначала оплатите тариф на сайте, указав этот email. После успешной оплаты вы сможете зарегистрироваться."

/** Иконка Telegram как на главной (контакт / футер) - «бумажный самолётик» */
function TelegramSupportIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function VkSupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.847 2.462 2.253 4.624 2.836 4.624.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.154-3.574 2.154-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.203.339-.271.508 0 .847.203.271.847 1.017 1.287 1.677.847 1.186 1.49 2.186 1.662 2.677.17.491-.085.744-.576.744z" />
    </svg>
  )
}

function CabinetTrackCoverMedia({ track, variant = "grid" }: { track: Track; variant?: "grid" | "dialog" }) {
  if (!track.coverPath?.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
        Обложка ожидается.
        {track.needsAiCover ? (
          <> Заказана ИИ-обложка ({AI_COVER_REQUEST_PRICE_RUB} руб.).</>
        ) : null}
      </div>
    )
  }
  const params =
    variant === "dialog"
      ? "w=640&q=78&f=webp"
      : "w=320&q=68&f=webp"
  return (
    <img
      src={`/api/cabinet/uploads/cover/${track.id}?${params}&v=${encodeURIComponent(track.updatedAt)}`}
      alt={track.trackName}
      className="object-cover w-full h-full"
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      style={{ objectFit: "cover" }}
    />
  )
}

interface UserSubscription {
  subscriptionName?: string
  subscriptionExpiresAt?: string
  subscriptionTrackLimit?: number
  purchasedTracksBalance?: number
}

interface StreamingReport {
  id: string
  amount: number
  fileName: string
  createdAt: string
  updatedAt: string
}

interface WithdrawalRequest {
  id: string
  amount: number
  type: "sbp" | "card"
  phone?: string
  cardNumber?: string
  bank?: string
  recipientName: string
  status: "pending" | "rejected" | "completed"
  createdAt: string
  updatedAt: string
}

export default function CabinetPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  /** Незавершённые черновики загрузки (сингл / альбом), не финализированные и не истёкшие */
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("")
  const [registerArtistName, setRegisterArtistName] = useState("")
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerCaptchaToken, setRegisterCaptchaToken] = useState<string | null>(null)
  const [registerConsentPersonalData, setRegisterConsentPersonalData] = useState(false)
  const [registerConsentPrivacy, setRegisterConsentPrivacy] = useState(false)
  const [registerConsentTerms, setRegisterConsentTerms] = useState(false)
  const [authTab, setAuthTab] = useState<"login" | "register">("login")
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [artistName, setArtistName] = useState<string>("")
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [streamingBalance, setStreamingBalance] = useState<number>(0)
  const [reports, setReports] = useState<StreamingReport[]>([])
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([])
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false)
  const [withdrawalType, setWithdrawalType] = useState<"sbp" | "card">("sbp")
  const [withdrawalPhone, setWithdrawalPhone] = useState("")
  const [withdrawalCardNumber, setWithdrawalCardNumber] = useState("")
  const [withdrawalBank, setWithdrawalBank] = useState("")
  const [withdrawalRecipientName, setWithdrawalRecipientName] = useState("")
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false)
  const [purchaseTracksDialogOpen, setPurchaseTracksDialogOpen] = useState(false)
  const [subscriptionLimitDialogOpen, setSubscriptionLimitDialogOpen] = useState(false)
  const [supportChannelDialogOpen, setSupportChannelDialogOpen] = useState(false)
  const [subscriptionRequiredDialogOpen, setSubscriptionRequiredDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"releases" | "promotion" | "reports">("releases")
  const [userTrackPriceRub, setUserTrackPriceRub] = useState(TRACK_PRICE_RUB)
  const [mounted, setMounted] = useState(false)
  /** Один раз за визит показываем диалог «Подписка истекла» при входе в кабинет (не при исчерпании лимита). */
  const subscriptionExpiredEntryDialogShownRef = useRef(false)
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null)
  const [payingDraftId, setPayingDraftId] = useState<string | null>(null)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const turnstileEnabled = isTurnstileEnabledClient()
  const turnstileSiteKey = getTurnstileSiteKeyClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      subscriptionExpiredEntryDialogShownRef.current = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || loading) return
    if (subscriptionExpiredEntryDialogShownRef.current) return
    const sub = subscription
    if (!sub?.subscriptionName || sub.subscriptionName === "Fix") return
    if (
      isSubscriptionActiveForUpload({
        subscriptionName: sub.subscriptionName,
        subscriptionExpiresAt: sub.subscriptionExpiresAt,
      })
    ) {
      return
    }
    subscriptionExpiredEntryDialogShownRef.current = true
    setSubscriptionLimitDialogOpen(true)
  }, [isAuthenticated, loading, subscription])

  useEffect(() => {
    if (
      !subscription ||
      !isCabinetSubscriptionExpiredForNavigation({
        subscriptionName: subscription.subscriptionName,
        subscriptionExpiresAt: subscription.subscriptionExpiresAt,
      })
    ) {
      return
    }
    if (activeTab === "promotion" || activeTab === "reports") {
      setActiveTab("releases")
    }
  }, [subscription, activeTab])

  useEffect(() => {
    if (searchParams.get("tab") === "register") {
      setAuthTab("register")
    }
    const qEmail = searchParams.get("email")?.trim()
    if (qEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(qEmail)) {
      setRegisterEmail(qEmail)
      setEmail(qEmail)
    }
  }, [searchParams])

  const loadTracks = async () => {
    const response = await fetch("/api/cabinet/tracks", { credentials: "include" })
    if (response.ok) {
      const data = await response.json()
      setTracks(data.tracks || [])
      setIsAuthenticated(true)
    } else if (response.status === 401) {
      setIsAuthenticated(false)
    }
  }

  const loadUserInfo = async () => {
    const response = await fetch("/api/cabinet/user", { credentials: "include" })
    if (response.ok) {
      const data = await response.json()
      setArtistName(data.user?.artistName || "")
      setUserTrackPriceRub(getTrackPriceRubByCreatedAt(data.user?.createdAt))
      setSubscription({
        subscriptionName: data.user?.subscriptionName,
        subscriptionExpiresAt: data.user?.subscriptionExpiresAt,
        subscriptionTrackLimit: data.user?.subscriptionTrackLimit,
        purchasedTracksBalance: data.user?.purchasedTracksBalance,
      })
      setStreamingBalance(data.user?.streamingBalance || 0)
    }
  }

  const loadReports = async () => {
    const response = await fetch("/api/cabinet/reports", { credentials: "include" })
    if (response.ok) {
      const data = await response.json()
      setReports(data.reports || [])
    }
  }

  const loadWithdrawalRequests = async () => {
    const response = await fetch("/api/cabinet/withdrawals", { credentials: "include" })
    if (response.ok) {
      const data = await response.json()
      setWithdrawalRequests(data.requests || [])
    }
  }

  const loadAlbums = async () => {
    const response = await fetch("/api/cabinet/albums", { credentials: "include" })
    if (response.ok) {
      const data = await response.json()
      setAlbums(data.albums || [])
    }
  }

  const loadUploadDrafts = async () => {
    try {
      const response = await fetch("/api/cabinet/upload-drafts", { credentials: "include" })
      if (!response.ok) {
        if (response.status === 401) setUploadDrafts([])
        return
      }
      const data = await response.json()
      const list = (data.drafts ?? []) as UploadDraft[]
      const open = list.filter((d) => ["collecting", "awaiting_payment", "paid"].includes(d.status))
      open.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      setUploadDrafts(open)
    } catch {
      setUploadDrafts([])
    }
  }

  const canAddTrack = (() => {
    const isFixPlan = subscription?.subscriptionName === "Fix"
    // Для Fix плана не проверяем срок действия
    if (!isFixPlan) {
      if (!subscription?.subscriptionExpiresAt) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (new Date(subscription.subscriptionExpiresAt) < today) return false
    }
    const limit = subscription
      ? getEffectiveTrackLimit({
          subscriptionName: subscription.subscriptionName,
          subscriptionTrackLimit: subscription.subscriptionTrackLimit,
          purchasedTracksBalance: subscription.purchasedTracksBalance,
        })
      : 0
    if (limit === 0) return false
    if (limit === null) return true
    return tracks.length < limit
  })()

  const effectiveLimit =
    subscription &&
    getEffectiveTrackLimit({
      subscriptionName: subscription.subscriptionName,
      subscriptionTrackLimit: subscription.subscriptionTrackLimit,
      purchasedTracksBalance: subscription.purchasedTracksBalance,
    })

  const subscriptionLimitDialogReason: "limit" | "expired" =
    subscription &&
    subscription.subscriptionName &&
    subscription.subscriptionName !== "Fix" &&
    !isSubscriptionActiveForUpload({
      subscriptionName: subscription.subscriptionName,
      subscriptionExpiresAt: subscription.subscriptionExpiresAt,
    })
      ? "expired"
      : "limit"

  const handleUploadClick = () => {
    if (!canAddTrack && subscription?.subscriptionName) {
      if (subscription.subscriptionName === "Fix") {
        setPurchaseTracksDialogOpen(true)
      } else {
        setSubscriptionLimitDialogOpen(true)
      }
      return
    }
    router.push("/cabinet/upload")
  }

  const handleUploadAlbumClick = () => {
    if (!canAddTrack && subscription?.subscriptionName) {
      if (subscription.subscriptionName === "Fix") {
        setPurchaseTracksDialogOpen(true)
      } else {
        setSubscriptionLimitDialogOpen(true)
      }
      return
    }
    router.push("/cabinet/upload/album")
  }

  const handleDeleteDraft = async (draft: UploadDraft) => {
    const title = getUploadDraftDisplayTitle(draft)
    const confirmed = window.confirm(`Удалить черновик "${title}"? Аудио и обложка будут удалены с сервера без возможности восстановления.`)
    if (!confirmed) return

    setDeletingDraftId(draft.id)
    try {
      const response = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draft.id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Не удалось удалить черновик")
        return
      }
      setUploadDrafts((prev) => prev.filter((d) => d.id !== draft.id))
      toast.success("Черновик удалён")
    } catch {
      toast.error("Не удалось удалить черновик")
    } finally {
      setDeletingDraftId(null)
    }
  }

  const handlePayDraft = async (draft: UploadDraft) => {
    if (draft.status !== "awaiting_payment") return
    setPayingDraftId(draft.id)
    try {
      const response = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draft.id)}/payment/create`, {
        method: "POST",
        credentials: "include",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || "Не удалось создать оплату")
        return
      }
      if (typeof data.paymentUrl === "string" && data.paymentUrl.trim()) {
        window.location.href = data.paymentUrl
        return
      }
      if (data.skippedPayment) {
        toast.success("Оплата не требуется. Завершите отправку черновика")
        router.push(getUploadDraftContinueHref(draft))
        return
      }
      toast.error("Не удалось создать оплату")
    } catch {
      toast.error("Не удалось создать оплату")
    } finally {
      setPayingDraftId(null)
    }
  }

  const handleEditUploadPendingTrack = async (track: Track) => {
    if (track.status !== "upload_pending") return
    setEditingTrackId(track.id)
    try {
      const response = await fetch(`/api/cabinet/tracks/${encodeURIComponent(track.id)}/edit-draft`, {
        method: "POST",
        credentials: "include",
      })
      if (response.status === 401) {
        setIsAuthenticated(false)
        return
      }
      const data = (await response.json().catch(() => ({}))) as {
        continueHref?: string
        error?: string
      }
      if (!response.ok || !data.continueHref) {
        toast.error(data.error || "Не удалось открыть редактирование")
        return
      }
      router.push(data.continueHref)
    } catch {
      toast.error("Не удалось открыть редактирование")
    } finally {
      setEditingTrackId(null)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/cabinet/tracks", { credentials: "include" }),
      fetch("/api/cabinet/user", { credentials: "include" }),
      fetch("/api/cabinet/reports", { credentials: "include" }),
      fetch("/api/cabinet/withdrawals", { credentials: "include" }),
      fetch("/api/cabinet/upload-drafts", { credentials: "include" }),
    ])
      .then(([tracksRes, userRes, reportsRes, withdrawalsRes, draftsRes]) => {
        if (tracksRes.status === 401 || userRes.status === 401) {
          setIsAuthenticated(false)
          return
        }
        
        if (tracksRes.ok) {
          setIsAuthenticated(true)
          tracksRes.json().then((data) => {
            if (data?.tracks) setTracks(data.tracks)
          })
        }
        
        if (userRes.ok) {
          userRes.json().then((data) => {
            if (data?.user) {
              setArtistName(data.user.artistName || "")
              setUserTrackPriceRub(getTrackPriceRubByCreatedAt(data.user.createdAt))
              setSubscription({
                subscriptionName: data.user.subscriptionName,
                subscriptionExpiresAt: data.user.subscriptionExpiresAt,
                subscriptionTrackLimit: data.user.subscriptionTrackLimit,
                purchasedTracksBalance: data.user.purchasedTracksBalance,
              })
              setStreamingBalance(data.user.streamingBalance || 0)
            }
          })
        }
        
        if (reportsRes.ok) {
          reportsRes.json().then((data) => {
            if (data?.reports) setReports(data.reports)
          })
        }
        
        if (withdrawalsRes.ok) {
          withdrawalsRes.json().then((data) => {
            if (data?.requests) setWithdrawalRequests(data.requests)
          })
        }

        if (draftsRes.ok) {
          draftsRes.json().then((data: { drafts?: UploadDraft[] }) => {
            const list = data?.drafts ?? []
            const open = list.filter((d) => ["collecting", "awaiting_payment", "paid"].includes(d.status))
            open.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            setUploadDrafts(open)
          })
        } else if (draftsRes.status === 401) {
          setUploadDrafts([])
        }

        // Загружаем альбомы параллельно, но отдельно, чтобы не усложнять логику авторизации
        void loadAlbums()
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Введите email и пароль")
      return
    }
    setLoginLoading(true)
    try {
      const response = await fetch("/api/cabinet/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      })
      const data = await response.json().catch(() => ({} as { error?: string }))

      if (response.ok) {
        setIsAuthenticated(true)
        loadTracks()
        loadUserInfo()
        loadReports()
        loadWithdrawalRequests()
        loadAlbums()
        void loadUploadDrafts()
        toast.success("Вход выполнен успешно")
      } else if (response.status === 429) {
        toast.error(data.error || "Слишком много попыток. Попробуйте позже.")
      } else if (response.status === 403) {
        toast.error(data.error || CABINET_ACCOUNT_BLOCKED_LOGIN_MESSAGE)
      } else {
        toast.error(data.error || "Неверный email или пароль")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Ошибка аутентификации")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerEmail || !registerPassword || !registerPasswordConfirm) {
      toast.error("Введите email, пароль и подтверждение пароля")
      return
    }
    if (registerPassword !== registerPasswordConfirm) {
      toast.error("Пароли не совпадают")
      return
    }
    if (turnstileEnabled && !registerCaptchaToken) {
      toast.error("Подтвердите, что вы не робот")
      return
    }
    if (!registerConsentPersonalData) {
      toast.error("Подтвердите согласие на обработку персональных данных")
      return
    }
    if (!registerConsentPrivacy) {
      toast.error("Подтвердите ознакомление с политикой конфиденциальности")
      return
    }
    if (!registerConsentTerms) {
      toast.error("Подтвердите согласие с условиями использования сервиса")
      return
    }
    setRegisterLoading(true)
    try {
      const response = await fetch("/api/cabinet/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          artistName: registerArtistName,
          captchaToken: turnstileEnabled ? registerCaptchaToken : undefined,
          consentPersonalData: true,
          consentPrivacyPolicy: true,
          consentTermsOfUse: true,
        }),
        credentials: "include",
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setIsAuthenticated(true)
        setEmail(registerEmail)
        await Promise.all([
          loadTracks(),
          loadUserInfo(),
          loadReports(),
          loadWithdrawalRequests(),
          loadAlbums(),
          loadUploadDrafts(),
        ])
        toast.success("Регистрация выполнена успешно")
      } else if (response.status === 403 && data.code === "SUBSCRIPTION_REQUIRED") {
        setSubscriptionRequiredDialogOpen(true)
      } else {
        toast.error(data.error || "Не удалось создать аккаунт")
      }
    } catch (error) {
      console.error("Register error:", error)
      toast.error("Ошибка регистрации")
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleWithdrawalSubmit = async () => {
    if (!withdrawalRecipientName.trim()) {
      toast.error("Заполните ФИО получателя")
      return
    }

    if (withdrawalType === "sbp") {
      if (!withdrawalPhone.trim()) {
        toast.error("Заполните номер телефона")
        return
      }
    } else {
      if (!withdrawalCardNumber.trim()) {
        toast.error("Заполните номер банковской карты")
        return
      }
      if (!withdrawalBank.trim()) {
        toast.error("Заполните название банка")
        return
      }
    }

    setWithdrawalSubmitting(true)
    try {
      const response = await fetch("/api/cabinet/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: streamingBalance,
          type: withdrawalType,
          phone: withdrawalType === "sbp" ? withdrawalPhone : undefined,
          cardNumber: withdrawalType === "card" ? withdrawalCardNumber : undefined,
          bank: withdrawalType === "card" ? withdrawalBank : undefined,
          recipientName: withdrawalRecipientName,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Запрос на вывод средств отправлен")
        setWithdrawalDialogOpen(false)
        setWithdrawalPhone("")
        setWithdrawalCardNumber("")
        setWithdrawalBank("")
        setWithdrawalRecipientName("")
        setWithdrawalType("sbp")
        // Обновляем баланс и заявки
        loadUserInfo()
        loadWithdrawalRequests()
      } else {
        toast.error(result.error || "Ошибка при отправке запроса")
      }
    } catch (error) {
      console.error("Withdrawal error:", error)
      toast.error("Ошибка при отправке запроса")
    } finally {
      setWithdrawalSubmitting(false)
    }
  }

  const promotionServices = [
    {
      id: "ai-cover",
      title: t.cabinet.promotion.aiCover.title,
      description: t.cabinet.promotion.aiCover.description,
      price: t.cabinet.promotion.aiCover.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/ai-cover",
      moreDetails: t.cabinet.promotion.aiCover.moreDetails,
    },
    {
      id: "vertical-video",
      title: t.cabinet.promotion.verticalVideo.title,
      description: t.cabinet.promotion.verticalVideo.description,
      price: t.cabinet.promotion.verticalVideo.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/vertical-video",
      moreDetails: t.cabinet.promotion.verticalVideo.moreDetails,
    },
    {
      id: "yandex-videoshot",
      title: t.cabinet.promotion.yandexVideoshot.title,
      description: t.cabinet.promotion.yandexVideoshot.description,
      price: t.cabinet.promotion.yandexVideoshot.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/yandex-videoshot",
      moreDetails: t.cabinet.promotion.yandexVideoshot.moreDetails,
    },
    {
      id: "ai-mastering",
      title: t.cabinet.promotion.aiMastering.title,
      description: t.cabinet.promotion.aiMastering.description,
      price: t.cabinet.promotion.aiMastering.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/ai-mastering",
      moreDetails: t.cabinet.promotion.aiMastering.moreDetails,
    },
    {
      id: "yandex-videoshot-creation",
      title: t.cabinet.promotion.yandexVideoshotCreation.title,
      description: t.cabinet.promotion.yandexVideoshotCreation.description,
      price: t.cabinet.promotion.yandexVideoshotCreation.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/yandex-videoshot-creation",
      moreDetails: t.cabinet.promotion.yandexVideoshotCreation.moreDetails,
    },
    {
      id: "yandex-videoavatar",
      title: t.cabinet.promotion.yandexVideoavatar.title,
      description: t.cabinet.promotion.yandexVideoavatar.description,
      price: t.cabinet.promotion.yandexVideoavatar.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/yandex-videoavatar",
      moreDetails: t.cabinet.promotion.yandexVideoavatar.moreDetails,
    },
    {
      id: "spotify-videoshot",
      title: t.cabinet.promotion.spotifyVideoshot.title,
      description: t.cabinet.promotion.spotifyVideoshot.description,
      price: t.cabinet.promotion.spotifyVideoshot.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/spotify-videoshot",
      moreDetails: t.cabinet.promotion.spotifyVideoshot.moreDetails,
    },
  ]

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Личный кабинет</h1>
            {authTab === "register" ?
              <p className="text-muted-foreground">
                Регистрация доступна после оплаты тарифа - сначала{" "}
                <Link
                  href="https://parallaxmusic.ru/#pricing"
                  className="text-primary underline underline-offset-2 hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  оформите подписку
                </Link>{" "}
                на главной странице, затем создайте аккаунт на тот же email.
              </p>
            : null}
          </div>
          <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "login" | "register")}>
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginLoading}
                  className="w-full"
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginLoading}
                  className="w-full"
                  autoComplete="current-password"
                />
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? "Вход..." : "Войти"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/cabinet/forgot-password" className="underline hover:text-foreground">
                    Забыли пароль?
                  </Link>
                </p>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  disabled={registerLoading}
                  className="w-full"
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Пароль (минимум 10 символов)"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  disabled={registerLoading}
                  className="w-full"
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  placeholder="Подтверждение пароля"
                  value={registerPasswordConfirm}
                  onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                  disabled={registerLoading}
                  className="w-full"
                  autoComplete="new-password"
                />
                <Input
                  type="text"
                  placeholder="Имя артиста (опционально)"
                  value={registerArtistName}
                  onChange={(e) => setRegisterArtistName(e.target.value)}
                  disabled={registerLoading}
                  className="w-full"
                />
                <div className="space-y-3 rounded-md border border-border p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="register-consent-pd"
                      checked={registerConsentPersonalData}
                      onCheckedChange={(v) => setRegisterConsentPersonalData(v === true)}
                      disabled={registerLoading}
                      className="mt-0.5"
                    />
                    <label htmlFor="register-consent-pd" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                      Я даю согласие на обработку персональных данных в соответствии с{" "}
                      <Link
                        href="/personal-data-consent"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Согласием на обработку персональных данных
                      </Link>
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="register-consent-privacy"
                      checked={registerConsentPrivacy}
                      onCheckedChange={(v) => setRegisterConsentPrivacy(v === true)}
                      disabled={registerLoading}
                      className="mt-0.5"
                    />
                    <label htmlFor="register-consent-privacy" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                      Я ознакомился(ась) с{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Политикой конфиденциальности
                      </Link>
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="register-consent-terms"
                      checked={registerConsentTerms}
                      onCheckedChange={(v) => setRegisterConsentTerms(v === true)}
                      disabled={registerLoading}
                      className="mt-0.5"
                    />
                    <label htmlFor="register-consent-terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                      Я согласен с{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        условиями использования сервиса
                      </Link>
                    </label>
                  </div>
                </div>
                {mounted && turnstileEnabled && turnstileSiteKey ? (
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={turnstileSiteKey}
                      onSuccess={(token) => setRegisterCaptchaToken(token)}
                      onError={() => setRegisterCaptchaToken(null)}
                      onExpire={() => setRegisterCaptchaToken(null)}
                      options={{
                        theme: "dark",
                      }}
                    />
                  </div>
                ) : null}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    registerLoading ||
                    !registerConsentPersonalData ||
                    !registerConsentPrivacy ||
                    !registerConsentTerms
                  }
                >
                  {registerLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Dialog open={subscriptionRequiredDialogOpen} onOpenChange={setSubscriptionRequiredDialogOpen}>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle>Регистрация</DialogTitle>
                <DialogDescription className="text-base text-foreground leading-relaxed">
                  {SUBSCRIPTION_REQUIRED_REGISTER_MESSAGE}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="w-full" asChild>
                  <a
                    href={PRICING_PAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSubscriptionRequiredDialogOpen(false)}
                  >
                    Выбрать тариф
                  </a>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

  return (
    <div className="min-h-screen bg-background pt-20">
      <CabinetAnnouncementsHost />
      <div className="container mx-auto px-4 space-y-6">
        {/* Верхняя строка: Имя артиста | Выйти */}
        <div className="flex flex-wrap items-center gap-4">
          {artistName && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-lg">{artistName}</span>
            </div>
          )}

          {streamingBalance >= 1000 && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => setWithdrawalDialogOpen(true)}
              disabled={withdrawalRequests.some((req) => req.status === "pending")}
              title={
                withdrawalRequests.some((req) => req.status === "pending")
                  ? "У вас уже есть активная заявка на вывод средств"
                  : ""
              }
            >
              Вывести
            </Button>
          )}
        </div>

        {/* Вкладки: Профиль, Релизы, Статистика, Продвижение, Финансы */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const subExpired =
              subscription &&
              isCabinetSubscriptionExpiredForNavigation({
                subscriptionName: subscription.subscriptionName,
                subscriptionExpiresAt: subscription.subscriptionExpiresAt,
              })
            if (subExpired) {
              if (v === "releases") {
                setActiveTab("releases")
                return
              }
              setSubscriptionLimitDialogOpen(true)
              return
            }
            if (v === "stats") {
              router.push("/cabinet/music-stats")
              return
            }
            if (v === "profile") {
              router.push("/cabinet/profile")
              return
            }
            setActiveTab(v as "releases" | "promotion" | "reports")
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="releases" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Релизы
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Статистика
            </TabsTrigger>
            <TabsTrigger value="promotion" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Услуги
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Финансы</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="releases" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push("/cabinet/publishing-rules")} className="flex items-center justify-center">
                <FileText className="h-4 w-4 mr-2" />
                <span>Правила публикации</span>
              </Button>
              <Button onClick={handleUploadClick} className="flex items-center justify-center">
                <Upload className="h-4 w-4 mr-2" />
                <span>Загрузить трек</span>
              </Button>
              <Button variant="outline" onClick={handleUploadAlbumClick} className="flex items-center justify-center">
                <Upload className="h-4 w-4 mr-2" />
                <span>Загрузить альбом</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center"
                onClick={() => setSupportChannelDialogOpen(true)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                <span>Написать в поддержку</span>
              </Button>
            </div>

            {uploadDrafts.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Черновики</h2>
                <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {uploadDrafts.map((draft) => (
                    <Card
                      key={draft.id}
                      className="h-full overflow-hidden border-dashed border-muted-foreground/40"
                    >
                      <div className="aspect-square bg-muted relative flex items-center justify-center">
                        <FileEdit className="h-14 w-14 text-muted-foreground" aria-hidden />
                      </div>
                      <CardHeader className="pb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {draft.kind === "album" ? "Альбом" : "Сингл"}
                        </p>
                        <CardTitle className="text-base leading-snug line-clamp-2">
                          {getUploadDraftDisplayTitle(draft)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3 text-sm">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            Обновлён:{" "}
                            {format(new Date(draft.updatedAt), "d MMM yyyy, HH:mm", { locale: ru })}
                          </p>
                          <p>
                            Действует до:{" "}
                            {format(new Date(draft.expiresAt), "d MMM yyyy", { locale: ru })}
                          </p>
                          <p>
                            {draft.audioRelPath ? "Аудио в черновике: да" : "Аудио в черновике: нет"}
                            {draft.kind === "single" ? (draft.coverRelPath ? " · обложка: да" : " · обложка: нет") : null}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {UPLOAD_DRAFT_STATUS_LABELS[draft.status] ?? draft.status}
                          </span>
                        </div>
                        {draft.status === "awaiting_payment" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            disabled={payingDraftId !== null || deletingDraftId !== null}
                            onClick={() => void handlePayDraft(draft)}
                          >
                            {payingDraftId === draft.id ? "Переход к оплате..." : "Оплатить услуги"}
                          </Button>
                        ) : null}
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          disabled={deletingDraftId === draft.id || payingDraftId === draft.id}
                          asChild
                        >
                          <Link href={getUploadDraftContinueHref(draft)}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Продолжить
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive"
                          disabled={deletingDraftId !== null}
                          onClick={() => void handleDeleteDraft(draft)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deletingDraftId === draft.id ? "Удаление..." : "Удалить"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {tracks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="text-center py-12">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {uploadDrafts.length > 0
                        ? "Готовых релизов в списке пока нет - выше есть черновики загрузки."
                        : "Треков пока нет"}
                    </p>
                    <Button onClick={handleUploadClick}>
                      <Upload className="h-4 w-4 mr-2" />
                      Загрузить первый трек
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {(() => {
                  const albumsById: Record<string, Album> = {}
                  albums.forEach((album) => {
                    albumsById[album.id] = album
                  })

                  const tracksByAlbumId: Record<string, Track[]> = {}
                  const singleTracks: Track[] = []

                  tracks.forEach((track) => {
                    if (track.albumId) {
                      if (!tracksByAlbumId[track.albumId]) {
                        tracksByAlbumId[track.albumId] = []
                      }
                      tracksByAlbumId[track.albumId]!.push(track)
                    } else {
                      singleTracks.push(track)
                    }
                  })

                  const albumEntries = Object.entries(tracksByAlbumId).map(([albumId, albumTracks]) => ({
                    albumId,
                    album: albumsById[albumId],
                    tracks: albumTracks,
                  }))

                  return (
                    <>
                      {albumEntries.length > 0 && (
                        <div className="space-y-6">
                          {albumEntries.map(({ albumId, album, tracks: albumTracks }) => (
                            <div key={albumId} className="space-y-2">
                              <h2 className="text-lg font-semibold">
                                {album?.title ?? "Альбом"}
                                {album?.artistName ? ` • ${album.artistName}` : ""}
                              </h2>
                              <p className="text-xs text-muted-foreground">
                                Лейбл: {getReleaseLabelName(album?.labelName)}
                              </p>
                              <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                                {albumTracks.map((track) => (
                                  <Card key={track.id} className="overflow-hidden">
                                    <div className="aspect-square bg-muted relative">
                                      <CabinetTrackCoverMedia track={track} />
                                    </div>
                                    <CardHeader className="pb-2">
                                      <h2 className="font-semibold text-base truncate">{track.trackName}</h2>
                                      <p className="text-sm text-muted-foreground truncate">
                                        {track.artistName} • {track.genre}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        Лейбл: {getReleaseLabelName(track.labelName)}
                                      </p>
                                      {album && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          Альбом: {album.title}
                                        </p>
                                      )}
                                    </CardHeader>
                                    <CardContent className="pt-0 space-y-3">
                                      <div className="space-y-0.5 text-xs text-muted-foreground">
                                        <p>
                                          Дата загрузки:{" "}
                                          {format(new Date(track.createdAt), "d MMM yyyy", { locale: ru })}
                                        </p>
                                        <p>
                                          Дата публикации:{" "}
                                          {track.releaseDate
                                            ? format(new Date(track.releaseDate), "d MMM yyyy", { locale: ru })
                                            : "-"}
                                        </p>
                                        {track.upc && track.upc.trim() && (
                                          <p>UPC: {track.upc}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between text-sm">
                                        <span
                                          className={
                                            track.status === "released"
                                              ? "text-green-600"
                                              : track.status === "upload_pending"
                                                ? "text-muted-foreground"
                                              : track.status === "approved_by_platforms"
                                                ? "text-green-500"
                                                : track.status === "sent_to_platforms"
                                                  ? "text-blue-600"
                                                  : track.status === "rejected"
                                                    ? "text-destructive"
                                                    : "text-amber-600"
                                          }
                                        >
                                          {STATUS_LABELS[track.status] ?? track.status}
                                        </span>
                                      </div>
                                      {(track.status === "rejected" || track.status === "postponed") &&
                                        (track as any).moderationNote &&
                                        (track as any).moderationNote.trim() && (
                                          <div className="mt-1 flex items-start gap-2 text-xs text-destructive">
                                            {track.status === "rejected" ? (
                                              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                            ) : (
                                              <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                            )}
                                            <p className="whitespace-pre-wrap">{(track as any).moderationNote}</p>
                                          </div>
                                        )}
                                      {track.status === "released" && track.smartlinkSlug && (
                                        <p className="text-xs text-muted-foreground break-all">
                                          Смартлинк:{" "}
                                          {typeof window !== "undefined"
                                            ? `${window.location.origin}/s/${track.smartlinkSlug}`
                                            : `https://parallaxmusic.ru/s/${track.smartlinkSlug}`}
                                        </p>
                                      )}
                                      {track.status === "released" && track.smartlinkSlug && (
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                              const url =
                                                typeof window !== "undefined"
                                                  ? `${window.location.origin}/s/${track.smartlinkSlug}`
                                                  : `https://parallaxmusic.ru/s/${track.smartlinkSlug}`
                                              void navigator.clipboard
                                                .writeText(url)
                                                .then(() => toast.success("Ссылка скопирована"))
                                            }}
                                          >
                                            <Link2 className="h-4 w-4 mr-2" />
                                            Копировать ссылку
                                          </Button>
                                        </div>
                                      )}
                                      {track.status === "upload_pending" && (
                                        <Button
                                          size="sm"
                                          className="w-full"
                                          disabled={editingTrackId === track.id}
                                          onClick={() => void handleEditUploadPendingTrack(track)}
                                        >
                                          <FileEdit className="h-4 w-4 mr-2" />
                                          {editingTrackId === track.id ? "Открываем..." : "Редактировать"}
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setSelectedTrack(track)}
                                      >
                                        <Info className="h-4 w-4 mr-2" />
                                        Подробнее
                                      </Button>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {singleTracks.length > 0 && (
                        <div className="space-y-4">
                          {albumEntries.length > 0 && (
                            <h2 className="text-lg font-semibold">Синглы</h2>
                          )}
                          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {singleTracks.map((track) => (
                              <Card key={track.id} className="overflow-hidden">
                                <div className="aspect-square bg-muted relative">
                                  <CabinetTrackCoverMedia track={track} />
                                </div>
                                <CardHeader className="pb-2">
                                  <h2 className="font-semibold text-base truncate">{track.trackName}</h2>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {track.artistName} • {track.genre}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    Лейбл: {getReleaseLabelName(track.labelName)}
                                  </p>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                  <div className="space-y-0.5 text-xs text-muted-foreground">
                                    <p>
                                      Дата загрузки:{" "}
                                      {format(new Date(track.createdAt), "d MMM yyyy", { locale: ru })}
                                    </p>
                                    <p>
                                      Дата публикации:{" "}
                                      {track.releaseDate
                                        ? format(new Date(track.releaseDate), "d MMM yyyy", { locale: ru })
                                        : "-"}
                                    </p>
                                    {track.upc && track.upc.trim() && (
                                      <p>UPC: {track.upc}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span
                                      className={
                                        track.status === "released"
                                          ? "text-green-600"
                                          : track.status === "upload_pending"
                                            ? "text-muted-foreground"
                                          : track.status === "approved_by_platforms"
                                            ? "text-green-500"
                                            : track.status === "sent_to_platforms"
                                              ? "text-blue-600"
                                              : track.status === "rejected"
                                                ? "text-destructive"
                                                : "text-amber-600"
                                      }
                                    >
                                      {STATUS_LABELS[track.status] ?? track.status}
                                    </span>
                                  </div>
                                  {(track.status === "rejected" || track.status === "postponed") &&
                                    (track as any).moderationNote &&
                                    (track as any).moderationNote.trim() && (
                                      <div className="mt-1 flex items-start gap-2 text-xs text-destructive">
                                        {track.status === "rejected" ? (
                                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                        ) : (
                                          <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                        )}
                                        <p className="whitespace-pre-wrap">{(track as any).moderationNote}</p>
                                      </div>
                                    )}
                                  {track.status === "released" && track.smartlinkSlug && (
                                    <p className="text-xs text-muted-foreground break-all">
                                      Смартлинк:{" "}
                                      {typeof window !== "undefined"
                                        ? `${window.location.origin}/s/${track.smartlinkSlug}`
                                        : `https://parallaxmusic.ru/s/${track.smartlinkSlug}`}
                                    </p>
                                  )}
                                  {track.status === "released" && track.smartlinkSlug && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => {
                                          const url =
                                            typeof window !== "undefined"
                                              ? `${window.location.origin}/s/${track.smartlinkSlug}`
                                              : `https://parallaxmusic.ru/s/${track.smartlinkSlug}`
                                          void navigator.clipboard
                                            .writeText(url)
                                            .then(() => toast.success("Ссылка скопирована"))
                                        }}
                                      >
                                        <Link2 className="h-4 w-4 mr-2" />
                                        Копировать ссылку
                                      </Button>
                                    </div>
                                  )}
                                  {track.status === "upload_pending" && (
                                    <Button
                                      size="sm"
                                      className="w-full"
                                      disabled={editingTrackId === track.id}
                                      onClick={() => void handleEditUploadPendingTrack(track)}
                                    >
                                      <FileEdit className="h-4 w-4 mr-2" />
                                      {editingTrackId === track.id ? "Открываем..." : "Редактировать"}
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setSelectedTrack(track)}
                                  >
                                    <Info className="h-4 w-4 mr-2" />
                                    Подробнее
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}

                <Dialog open={!!selectedTrack} onOpenChange={(open) => !open && setSelectedTrack(null)}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Информация о треке</DialogTitle>
                      <DialogDescription>Подробная информация о загруженном треке</DialogDescription>
                    </DialogHeader>
                    {selectedTrack && (
                      <div className="space-y-6">
                        <div className="flex gap-4">
                          <div className="w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-muted">
                            <CabinetTrackCoverMedia track={selectedTrack} variant="dialog" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <h3 className="text-2xl font-bold">{selectedTrack.trackName}</h3>
                              <p className="text-muted-foreground">{selectedTrack.artistName}</p>
                            </div>
                            <div className="space-y-2">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                  selectedTrack.status === "released"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : selectedTrack.status === "upload_pending"
                                      ? "bg-muted text-muted-foreground"
                                    : selectedTrack.status === "approved_by_platforms"
                                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                      : selectedTrack.status === "sent_to_platforms"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                        : selectedTrack.status === "rejected"
                                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                }`}
                              >
                                {STATUS_LABELS[selectedTrack.status] ?? selectedTrack.status}
                              </span>
                              {selectedTrack.status === "upload_pending" ? (
                                <div>
                                  <Button
                                    size="sm"
                                    disabled={editingTrackId === selectedTrack.id}
                                    onClick={() => {
                                      void handleEditUploadPendingTrack(selectedTrack)
                                      setSelectedTrack(null)
                                    }}
                                  >
                                    <FileEdit className="h-4 w-4 mr-2" />
                                    {editingTrackId === selectedTrack.id ? "Открываем..." : "Редактировать"}
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Название трека</p>
                            <p className="text-base">{selectedTrack.trackName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Исполнитель</p>
                            <p className="text-base">{selectedTrack.artistName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Лейбл</p>
                            <p className="text-base">{getReleaseLabelName(selectedTrack.labelName)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Жанр</p>
                            <p className="text-base">{selectedTrack.genre}</p>
                          </div>
                          {selectedTrack.mood && selectedTrack.mood.trim() && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Настроение трека</p>
                              <p className="text-base">{selectedTrack.mood}</p>
                            </div>
                          )}
                          {selectedTrack.shortDescription && selectedTrack.shortDescription.trim() && (
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Краткое описание трека
                              </p>
                              <p className="text-base">{selectedTrack.shortDescription}</p>
                            </div>
                          )}
                          {selectedTrack.lyricsText && selectedTrack.lyricsText.trim() && (
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">Текст песни</p>
                              <p className="text-base whitespace-pre-wrap">{selectedTrack.lyricsText}</p>
                            </div>
                          )}
                          {selectedTrack.lyricsAuthor && selectedTrack.lyricsAuthor.trim() && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Автор слов</p>
                              <p className="text-base">{selectedTrack.lyricsAuthor}</p>
                            </div>
                          )}
                          {selectedTrack.musicAuthor && selectedTrack.musicAuthor.trim() && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Автор музыки</p>
                              <p className="text-base">{selectedTrack.musicAuthor}</p>
                            </div>
                          )}
                          {selectedTrack.musicRights && selectedTrack.musicRights.trim() && (
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">Права на музыку</p>
                              <p className="text-base">{selectedTrack.musicRights}</p>
                            </div>
                          )}
                          {selectedTrack.musicAiService && selectedTrack.musicAiService.trim() && (
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">Название/ссылка на ИИ сервис</p>
                              <p className="text-base break-all">{selectedTrack.musicAiService}</p>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Это инструментал</p>
                            <p className="text-base">{selectedTrack.isInstrumental ? "Да" : "Нет"}</p>
                          </div>
                          {!selectedTrack.isInstrumental && selectedTrack.lyricsRights && selectedTrack.lyricsRights.trim() && (
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">Права на текст</p>
                              <p className="text-base">{selectedTrack.lyricsRights}</p>
                            </div>
                          )}
                          {!selectedTrack.isInstrumental && selectedTrack.performanceRights && selectedTrack.performanceRights.trim() && (
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">Права на исполнение</p>
                              <p className="text-base">{selectedTrack.performanceRights}</p>
                            </div>
                          )}
                          {selectedTrack.backingAuthor && selectedTrack.backingAuthor.trim() && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Автор фонограммы</p>
                              <p className="text-base">{selectedTrack.backingAuthor}</p>
                            </div>
                          )}
                          {selectedTrack.releaseDate && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Дата публикации</p>
                              <p className="text-base">
                                {format(new Date(selectedTrack.releaseDate), "d MMMM yyyy", { locale: ru })}
                              </p>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Дата загрузки</p>
                            <p className="text-base">
                              {format(new Date(selectedTrack.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                            </p>
                          </div>
                          {(selectedTrack.status === "rejected" || selectedTrack.status === "postponed") &&
                            (selectedTrack as any).moderationNote &&
                            (selectedTrack as any).moderationNote.trim() && (
                              <div className="space-y-1 sm:col-span-2">
                                <p className="text-sm font-medium text-destructive flex items-center gap-2">
                                  {selectedTrack.status === "rejected" ? (
                                    <AlertTriangle className="h-4 w-4" />
                                  ) : (
                                    <Info className="h-4 w-4" />
                                  )}
                                  Комментарий модерации
                                </p>
                                <p className="text-sm text-destructive whitespace-pre-wrap">
                                  {(selectedTrack as any).moderationNote}
                                </p>
                              </div>
                            )}
                          {selectedTrack.updatedAt !== selectedTrack.createdAt && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Последнее обновление</p>
                              <p className="text-base">
                                {format(new Date(selectedTrack.updatedAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="border-t pt-4 space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">UPC</p>
                          <div className="flex items-center gap-2">
                            <Input
                              readOnly
                              value={selectedTrack.upc ?? ""}
                              placeholder="-"
                              className="font-mono text-sm flex-1"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const upc = selectedTrack.upc?.trim()
                                if (upc) {
                                  void navigator.clipboard.writeText(upc).then(() => toast.success("UPC скопирован"))
                                }
                              }}
                              disabled={!selectedTrack.upc?.trim()}
                              title="Копировать UPC"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {selectedTrack.status === "released" && selectedTrack.smartlinkSlug && (
                          <div className="border-t pt-4 space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Ссылка на трек (смартлинк)</p>
                            <div className="flex items-center gap-2">
                              <Input
                                readOnly
                                value={
                                  typeof window !== "undefined"
                                    ? `${window.location.origin}/s/${selectedTrack.smartlinkSlug}`
                                    : `https://parallaxmusic.ru/s/${selectedTrack.smartlinkSlug}`
                                }
                                className="font-mono text-sm flex-1"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const url =
                                    typeof window !== "undefined"
                                      ? `${window.location.origin}/s/${selectedTrack.smartlinkSlug}`
                                      : `https://parallaxmusic.ru/s/${selectedTrack.smartlinkSlug}`
                                  void navigator.clipboard.writeText(url).then(() => toast.success("Ссылка скопирована"))
                                }}
                                title="Копировать ссылку"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </TabsContent>

          <TabsContent value="promotion" className="mt-4">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">{t.cabinet.promotion.title}</h2>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/cabinet/my-services">{t.cabinet.myServices.myOrdersLink}</Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t.cabinet.promotion.description}
                </p>
              </div>

              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
                {promotionServices.map((service) => (
                  <Card key={service.id} className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative shrink-0 bg-muted">
                      <Image
                        src={service.imageUrl}
                        alt={service.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <CardHeader className="flex flex-1 flex-col gap-2">
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                      <CardDescription className="flex-1">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">{service.price}</span>
                      </div>
                      <Button className="w-full" asChild>
                        <Link href={service.href}>
                          {service.moreDetails}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 mt-4">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Отчеты по стримингу
                  </CardTitle>
                  <CardDescription>
                    Скачайте отчеты о ваших доходах от стриминга
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reports.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Отчетов пока нет</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reports.map((report) => (
                        <div
                          key={report.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{report.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              {report.amount.toLocaleString("ru-RU")} ₽ •{" "}
                              {format(new Date(report.createdAt), "d MMM yyyy", { locale: ru })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              window.open(`/api/cabinet/reports/${report.id}/download`, "_blank")
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Скачать
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="h-5 w-5" />
                    Заявки на вывод
                  </CardTitle>
                  <CardDescription>
                    История ваших заявок на вывод средств
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {withdrawalRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Заявок на вывод пока нет</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {withdrawalRequests.map((request) => {
                        const statusConfig = {
                          pending: { label: "В процессе", icon: Clock, color: "text-amber-600" },
                          completed: { label: "Исполнено", icon: CheckCircle, color: "text-green-600" },
                          rejected: { label: "Отклонено", icon: XCircle, color: "text-destructive" },
                        }
                        const status = statusConfig[request.status]
                        const StatusIcon = status.icon

                        return (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <StatusIcon className={`h-4 w-4 shrink-0 ${status.color}`} />
                                <span className={`font-medium text-sm ${status.color}`}>{status.label}</span>
                              </div>
                              <p className="font-semibold">
                                {request.amount.toLocaleString("ru-RU")} ₽
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(request.createdAt), "d MMM yyyy", { locale: ru })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Когда поступят роялти?</CardTitle>
                <CardDescription>
                  Роялти зачисляются ежеквартально:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>1-й квартал зачисление в июне</li>
                  <li>2-й квартал в сентябре</li>
                  <li>3-й квартал в декабре</li>
                  <li>4-й квартал в марте</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={supportChannelDialogOpen} onOpenChange={setSupportChannelDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Написать в поддержку</DialogTitle>
              <DialogDescription>
                Выберите способ связи - откроется чат в новой вкладке.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-1">
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full justify-start py-3"
                onClick={() => {
                  window.open(SUPPORT_TELEGRAM_URL, "_blank")
                  setSupportChannelDialogOpen(false)
                }}
              >
                <TelegramSupportIcon className="size-5 shrink-0" />
                <span className="text-left font-medium">Telegram</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full justify-start py-3"
                onClick={() => {
                  window.open(SUPPORT_VK_URL, "_blank")
                  setSupportChannelDialogOpen(false)
                }}
              >
                <VkSupportIcon className="size-5 shrink-0" />
                <span className="text-left font-medium">ВКонтакте</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Запрос на вывод средств</DialogTitle>
              <DialogDescription>
                Заполните форму для запроса на вывод средств
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Сумма к выводу</Label>
                <div className="mt-1 text-2xl font-bold text-green-600">
                  {streamingBalance.toLocaleString("ru-RU")} ₽
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Тип вывода</Label>
                <RadioGroup value={withdrawalType} onValueChange={(value) => setWithdrawalType(value as "sbp" | "card")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sbp" id="sbp" />
                    <Label htmlFor="sbp" className="font-normal cursor-pointer">СБП</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="font-normal cursor-pointer">Банковская карта</Label>
                  </div>
                </RadioGroup>
              </div>

              {withdrawalType === "sbp" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Номер телефона <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+7 (999) 123-45-67"
                      value={withdrawalPhone}
                      onChange={(e) => setWithdrawalPhone(e.target.value)}
                      disabled={withdrawalSubmitting}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="text-sm font-medium">
                      Номер банковской карты <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cardNumber"
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      value={withdrawalCardNumber}
                      onChange={(e) => setWithdrawalCardNumber(e.target.value)}
                      disabled={withdrawalSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank" className="text-sm font-medium">
                      Банк <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bank"
                      type="text"
                      placeholder="Название банка"
                      value={withdrawalBank}
                      onChange={(e) => setWithdrawalBank(e.target.value)}
                      disabled={withdrawalSubmitting}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="recipientName" className="text-sm font-medium">
                  ФИО получателя <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recipientName"
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={withdrawalRecipientName}
                  onChange={(e) => setWithdrawalRecipientName(e.target.value)}
                  disabled={withdrawalSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setWithdrawalDialogOpen(false)}
                disabled={withdrawalSubmitting}
              >
                Отмена
              </Button>
              <Button
                onClick={handleWithdrawalSubmit}
                disabled={withdrawalSubmitting}
              >
                {withdrawalSubmitting ? "Отправка..." : "Отправить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <PurchaseTracksDialog
          open={purchaseTracksDialogOpen}
          onOpenChange={setPurchaseTracksDialogOpen}
          unitPriceRub={userTrackPriceRub}
        />
        <SubscriptionLimitDialog
          open={subscriptionLimitDialogOpen}
          onOpenChange={setSubscriptionLimitDialogOpen}
          limit={effectiveLimit ?? null}
          reason={subscriptionLimitDialogReason}
        />
      </div>
    </div>
  )
}
