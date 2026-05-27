"use client"

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  GENRES,
  LYRICS_TEXT_UPLOAD_HINT,
  TRACK_MOODS,
  musicRightsRequiresAiService,
} from "@/lib/track-constants"
import { getEffectiveTrackLimit, isSubscriptionActiveForUpload } from "@/lib/subscription-plans"
import { PurchaseTracksDialog } from "@/components/purchase-tracks-dialog"
import { SubscriptionLimitDialog } from "@/components/subscription-limit-dialog"
import {
  ArrowLeft,
  Upload,
  CalendarIcon,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { isReleaseDateWeekend } from "@/lib/release-date-validation"
import { CabinetUploadProfileGateBanner } from "@/components/cabinet-upload-profile-gate-banner"
import { PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE } from "@/lib/cabinet-upload-profile-gate"
import { getTrackPriceRubByCreatedAt, TRACK_PRICE_RUB } from "@/lib/track-pricing"
import {
  COVER_HEIC_ERROR,
  formatCabinetUploadFailure,
  isCabinetCoverValidationMessage,
  isHeicCoverFile,
  isLikelyCoverImage,
  isLikelyWavFile,
  parseCabinetApiJson,
  validateCoverFileClient,
} from "@/lib/cabinet-upload-client"
import { checkWavFileIsStereo } from "@/lib/wav-parse-stereo"
import type { UploadDraftPayload, UploadDraftStatus } from "@/lib/upload-drafts"
import { DEFAULT_RELEASE_LABEL_NAME, hasLabelSubscription } from "@/lib/release-label"
import {
  CabinetUploadAdditionalServicesSection,
  computeSelectedUploadAddonsTotalRub,
} from "@/components/cabinet-upload-additional-services-section"

const genreKeys = [...GENRES]
const moodKeys = [...TRACK_MOODS]
const MUSIC_RIGHTS_OPTIONS = [
  "Музыка написана мной. Есть проект",
  "Сгенерирована в ИИ (платно)",
  "Сгенерирована в ИИ (бесплатно)",
  "Купил музыку. Есть договор/чек",
  "Скачал в интернете бесплатно",
] as const
const LYRICS_RIGHTS_OPTIONS = [
  "Являюсь автором текста",
  "Является общественным достоянием",
  "Текст сгенерирован ИИ",
  "Купил текст. Есть договор/чек",
  "Скачал в интернете бесплатно",
] as const
const PERFORMANCE_RIGHTS_OPTIONS = [
  "Являюсь исполнителем песни",
  "Исполнитель ИИ",
  "Исполнитель другой человек. Являюсь правообладалетелем",
] as const
const EMPTY_OPTION = "" as const

const uploadSchema = z.object({
  trackName: z.string().min(2, "Минимум 2 символа").max(100, "Максимум 100 символов"),
  artistName: z.string().min(2, "Минимум 2 символа").max(100, "Максимум 100 символов"),
  labelName: z.string().max(100, "Максимум 100 символов"),
  genre: z.enum([...GENRES] as [string, ...string[]]),
  mood: z.enum([...TRACK_MOODS] as [string, ...string[]], {
    required_error: "Выберите настроение трека",
  }),
  shortDescription: z
    .string()
    .min(2, "Краткое описание трека обязательно (минимум 2 символа)")
    .max(500, "Максимум 500 символов"),
  lyricsText: z.string().max(5000, "Максимум 5000 символов"),
  lyricsAuthor: z.string().max(100, "Максимум 100 символов"),
  musicAuthor: z
    .string()
    .min(2, "Укажите автора музыки (минимум 2 символа)")
    .max(100, "Максимум 100 символов"),
  musicRights: z.union([z.enum(MUSIC_RIGHTS_OPTIONS), z.literal(EMPTY_OPTION)]),
  musicAiService: z.string().max(500, "Максимум 500 символов").optional(),
  isInstrumental: z.boolean().default(false),
  lyricsRights: z.union([z.enum(LYRICS_RIGHTS_OPTIONS), z.literal(EMPTY_OPTION)]).optional(),
  performanceRights: z.union([z.enum(PERFORMANCE_RIGHTS_OPTIONS), z.literal(EMPTY_OPTION)]).optional(),
  releaseDate: z.date({
    required_error: "Дата публикации обязательна",
  }).refine((date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() + 8)
    return date >= minDate
  }, {
    message: "Дата публикации должна быть не ранее чем через 8 дней от сегодня",
  }).refine((date) => !isReleaseDateWeekend(date), {
    message: "Дата публикации не может приходиться на выходной день (суббота или воскресенье)",
  }),
  requestAiCover: z.boolean().default(false),
  transferFromOtherDistributor: z.boolean().default(false),
  transferUpc: z.string().max(32, "Максимум 32 символа").optional().default(""),
  transferIsrc: z.string().max(32, "Максимум 32 символа").optional().default(""),
  cover: z.any().optional(),
  audio: z.any().optional(),
  /** Аудио уже загружено в черновик на сервере */
  serverDraftHasAudio: z.boolean().default(false),
  /** Обложка уже есть в черновике на сервере */
  serverDraftHasCover: z.boolean().default(false),
  consentOfferLicense: z.boolean(),
}).superRefine((data, ctx) => {
  const hasAudioFile = Boolean(
    data.audio && typeof data.audio.length === "number" && data.audio.length === 1
  )
  if (!hasAudioFile && !data.serverDraftHasAudio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["audio"],
      message: "Аудио (WAV) обязательно",
    })
  }
  if (hasAudioFile) {
    const file = data.audio![0] as File
    if (!isLikelyWavFile(file)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["audio"],
        message: "Аудио должно быть в формате WAV",
      })
    } else if (file.size > 80 * 1024 * 1024) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["audio"],
        message: "Размер аудио не должен превышать 80 MB",
      })
    }
  }
  if (
    musicRightsRequiresAiService(data.musicRights) &&
    (!data.musicAiService || data.musicAiService.trim().length < 2)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["musicAiService"],
      message: "Укажите название или ссылку на ИИ сервис",
    })
  }
  if (!data.isInstrumental) {
    if (data.lyricsText.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lyricsText"],
        message: "Текст песни обязателен (минимум 2 символа)",
      })
    }
    if (data.lyricsAuthor.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lyricsAuthor"],
        message: "Укажите автора слов (минимум 2 символа)",
      })
    }
    if (!data.lyricsRights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lyricsRights"],
        message: "Выберите права на текст",
      })
    }
    if (!data.performanceRights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["performanceRights"],
        message: "Выберите права на исполнение",
      })
    }
  }
  if (data.transferFromOtherDistributor) {
    if (!data.transferUpc.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferUpc"],
        message: "Укажите UPC",
      })
    }
    if (!data.transferIsrc.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferIsrc"],
        message: "Укажите ISRC",
      })
    }
  }
  if (data.requestAiCover) {
    const hasFile =
      data.cover && typeof data.cover.length === "number" && data.cover.length === 1
    if (hasFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cover"],
        message:
          "Снимите галочку «AI обложка для трека» или удалите файл обложки",
      })
    }
  } else {
    const hasCoverFile = Boolean(
      data.cover && typeof data.cover.length === "number" && data.cover.length === 1
    )
    if (!hasCoverFile && !data.serverDraftHasCover) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cover"],
        message: "Обложка обязательна",
      })
    } else if (hasCoverFile) {
      const file = data.cover![0] as File
      if (isHeicCoverFile(file)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cover"],
          message: COVER_HEIC_ERROR,
        })
      } else if (!isLikelyCoverImage(file)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cover"],
          message: "Обложка должна быть в формате JPEG или PNG",
        })
      }
      if (file.size > 20 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cover"],
          message: "Размер обложки не должен превышать 20 MB",
        })
      }
    }
  }
}).refine((data) => data.consentOfferLicense === true, {
  message:
    "Подтвердите согласие и ознакомление с публичной офертой и лицензионными условиями",
  path: ["consentOfferLicense"],
})

type UploadFormValues = z.infer<typeof uploadSchema>

const getSubscriptionLimitMessage = (limit: number) =>
  `Текущий тариф предусматривает не более ${limit} активных релизов. Чтобы загрузить больше, необходимо расширить подписку.`

const SUBSCRIPTION_EXPIRED_MESSAGE =
  "Срок действия подписки закончился. Продлите подписку, чтобы загружать релизы."
const TRACK_UPLOAD_TIMEOUT_MS = 180_000

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

export default function CabinetUploadPage() {
  const router = useRouter()
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [activeDraftStatus, setActiveDraftStatus] = useState<UploadDraftStatus | null>(null)
  const [isPayingDraft, setIsPayingDraft] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [hasUnsavedDraftChanges, setHasUnsavedDraftChanges] = useState(false)
  const [isSyncingAudio, setIsSyncingAudio] = useState(false)
  const [isSyncingCover, setIsSyncingCover] = useState(false)
  const audioSyncInFlight = useRef(false)
  const cabinetUploadAudioInputRef = useRef<HTMLInputElement | null>(null)
  const cabinetUploadPreviewAudioRef = useRef<HTMLAudioElement | null>(null)
  const [cabinetUploadAudioPreviewPlaying, setCabinetUploadAudioPreviewPlaying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [trackLimit, setTrackLimit] = useState<number | null>(null)
  const [currentTrackCount, setCurrentTrackCount] = useState(0)
  const [subscriptionName, setSubscriptionName] = useState<string | undefined>(undefined)
  const [subscriptionExpired, setSubscriptionExpired] = useState(false)
  const [purchaseTracksDialogOpen, setPurchaseTracksDialogOpen] = useState(false)
  const [subscriptionLimitDialogOpen, setSubscriptionLimitDialogOpen] = useState(false)
  const [audioFormatError, setAudioFormatError] = useState<string | null>(null)
  const [coverFormatError, setCoverFormatError] = useState<string | null>(null)

  const showCoverValidationError = (message: string) => {
    setCoverFormatError(message)
    form.setError("cover", { type: "manual", message })
  }
  const [profileCompleteForUpload, setProfileCompleteForUpload] = useState<boolean | null>(null)
  const [userTrackPriceRub, setUserTrackPriceRub] = useState(TRACK_PRICE_RUB)
  const [addonVerticalVideo, setAddonVerticalVideo] = useState(false)
  const [addonVerticalVideoCount, setAddonVerticalVideoCount] = useState(1)
  const [addonAiMastering, setAddonAiMastering] = useState(false)
  const [addonAiMasteringCount, setAddonAiMasteringCount] = useState(1)
  const [addonYandexVideoshot, setAddonYandexVideoshot] = useState(false)
  const [addonYandexVideoshotCreation, setAddonYandexVideoshotCreation] = useState(false)
  const [addonYandexVideoavatar, setAddonYandexVideoavatar] = useState(false)
  const [addonSpotifyVideoshot, setAddonSpotifyVideoshot] = useState(false)
  const [editingSourceTrackId, setEditingSourceTrackId] = useState<string | null>(null)

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      trackName: "",
      artistName: "",
      labelName: DEFAULT_RELEASE_LABEL_NAME,
      genre: undefined,
      mood: undefined,
      shortDescription: "",
      lyricsText: "",
      lyricsAuthor: "",
      musicAuthor: "",
      musicRights: "",
      musicAiService: "",
      isInstrumental: false,
      lyricsRights: "",
      performanceRights: "",
      releaseDate: undefined,
      requestAiCover: false,
      transferFromOtherDistributor: false,
      transferUpc: "",
      transferIsrc: "",
      consentOfferLicense: false,
      serverDraftHasAudio: false,
      serverDraftHasCover: false,
    },
  })

  const watchedAudioFiles = useWatch({ control: form.control, name: "audio" }) as FileList | undefined
  const watchedServerDraftHasAudio = useWatch({ control: form.control, name: "serverDraftHasAudio" })
  const watchedServerDraftHasCover = useWatch({ control: form.control, name: "serverDraftHasCover" })
  const isFormDirty = form.formState.isDirty

  useEffect(() => {
    const subscription = form.watch((_value, info) => {
      if (info.type === "change") {
        setHasUnsavedDraftChanges(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const pickedWavFile = useMemo(() => {
    const list = watchedAudioFiles
    if (!list || list.length !== 1) return undefined
    const f = list[0] as File
    if (!isLikelyWavFile(f)) return undefined
    return f
  }, [watchedAudioFiles])

  const hasDraftLossRisk =
    isSavingDraft ||
    isSyncingAudio ||
    isSyncingCover ||
    (Boolean(pickedWavFile) && !watchedServerDraftHasAudio) ||
    isFormDirty ||
    hasUnsavedDraftChanges

  const [pickedAudioObjectUrl, setPickedAudioObjectUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!pickedWavFile) {
      setPickedAudioObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(pickedWavFile)
    setPickedAudioObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pickedWavFile])

  const draftWavListenUrl =
    watchedServerDraftHasAudio && activeDraftId && !pickedWavFile
      ? `/api/cabinet/upload-drafts/${encodeURIComponent(activeDraftId)}/audio`
      : null

  const audioListenSrc = pickedAudioObjectUrl ?? draftWavListenUrl

  const audioFileStatusLabel = pickedWavFile?.name
    ? pickedWavFile.name
    : watchedServerDraftHasAudio
      ? "WAV сохранён в черновике"
      : "Файл не выбран"

  useEffect(() => {
    if (!audioListenSrc) {
      setCabinetUploadAudioPreviewPlaying(false)
      return
    }
    const el = cabinetUploadPreviewAudioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    setCabinetUploadAudioPreviewPlaying(false)
  }, [audioListenSrc])

  useEffect(() => {
    const el = cabinetUploadPreviewAudioRef.current
    if (!el || !audioListenSrc) return
    const sync = () => setCabinetUploadAudioPreviewPlaying(!el.paused)
    el.addEventListener("play", sync)
    el.addEventListener("pause", sync)
    el.addEventListener("ended", sync)
    sync()
    return () => {
      el.removeEventListener("play", sync)
      el.removeEventListener("pause", sync)
      el.removeEventListener("ended", sync)
    }
  }, [audioListenSrc])

  const toggleCabinetUploadAudioPreview = () => {
    const el = cabinetUploadPreviewAudioRef.current
    if (!el || !audioListenSrc) return
    if (el.paused) {
      void el.play().catch(() => {
        toast.error("Не удалось воспроизвести аудио")
      })
    } else {
      el.pause()
    }
  }

  const watchedRequestAiCover = form.watch("requestAiCover")
  const selectedAddonsTotal = computeSelectedUploadAddonsTotalRub({
    requestAiCover: watchedRequestAiCover,
    addonVerticalVideo,
    addonVerticalVideoCount,
    addonAiMastering,
    addonAiMasteringCount,
    addonYandexVideoshot,
    addonYandexVideoshotCreation,
    addonYandexVideoavatar,
    addonSpotifyVideoshot,
  })

  const rememberDraftIdInUrl = (draftId: string) => {
    if (typeof window === "undefined") return
    const u = new URL(window.location.href)
    u.searchParams.set("draftId", draftId)
    const payment = u.searchParams.get("payment")
    if (payment !== "success" && payment !== "return") {
      u.searchParams.delete("payment")
    }
    window.history.replaceState({}, "", u.toString())
  }

  const handlePayDraftServices = async () => {
    if (!activeDraftId) return
    setIsPayingDraft(true)
    try {
      const paymentRes = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(activeDraftId)}/payment/create`, {
        method: "POST",
        credentials: "include",
      })
      const paymentData = await paymentRes.json().catch(() => ({}))
      if (!paymentRes.ok) {
        toast.error(paymentData.error || "Не удалось создать оплату")
        return
      }
      if (typeof paymentData.paymentUrl === "string" && paymentData.paymentUrl.trim()) {
        window.location.href = paymentData.paymentUrl
        return
      }
      if (paymentData.skippedPayment) {
        setActiveDraftStatus("paid")
        toast.success("Оплата не требуется. Продолжайте отправку")
        return
      }
      toast.error("Не удалось создать оплату")
    } catch {
      toast.error("Не удалось создать оплату")
    } finally {
      setIsPayingDraft(false)
    }
  }

  const buildUploadDraftJsonPayload = (): UploadDraftPayload => {
    const v = form.getValues()
    const trackTitle = v.trackName?.trim() || "Трек"
    return {
      sourceTrackId: editingSourceTrackId ?? undefined,
      trackName: v.trackName,
      artistName: v.artistName,
      labelName: v.labelName?.trim() || DEFAULT_RELEASE_LABEL_NAME,
      genre: v.genre,
      mood: v.mood,
      shortDescription: v.shortDescription ?? "",
      lyricsText: v.lyricsText ?? "",
      lyricsAuthor: v.lyricsAuthor ?? "",
      musicAuthor: v.musicAuthor ?? "",
      musicRights: v.musicRights,
      musicAiService: v.musicAiService?.trim() ?? "",
      isInstrumental: v.isInstrumental,
      lyricsRights: v.lyricsRights ?? "",
      performanceRights: v.performanceRights ?? "",
      releaseDate: v.releaseDate ? format(v.releaseDate, "yyyy-MM-dd") : undefined,
      requestAiCover: v.requestAiCover,
      transferFromOtherDistributor: v.transferFromOtherDistributor,
      transferUpc: v.transferFromOtherDistributor ? v.transferUpc.trim() : "",
      transferIsrc: v.transferFromOtherDistributor ? v.transferIsrc.trim() : "",
      addons: {
        trackCover: { enabled: false, trackTitle },
        verticalVideo: {
          enabled: addonVerticalVideo,
          videosCount: addonVerticalVideoCount,
          trackTitle,
        },
        aiMastering: {
          enabled: addonAiMastering,
          tracksCount: addonAiMasteringCount,
          trackTitles: [trackTitle],
        },
        yandexVideoshot: { enabled: addonYandexVideoshot, trackTitle },
        yandexVideoshotCreation: { enabled: addonYandexVideoshotCreation, trackTitle },
        yandexVideoavatar: { enabled: addonYandexVideoavatar, trackTitle },
        spotifyVideoshot: { enabled: addonSpotifyVideoshot, trackTitle },
      },
    }
  }

  const persistDraftToServer = async (showToast = true): Promise<boolean> => {
    if (profileCompleteForUpload === false) {
      toast.error("Заполните профиль: ФИО, адрес регистрации и телефон")
      return false
    }
    if (isSavingDraft || isSubmitting || isSyncingAudio || isSyncingCover) return false
    setIsSavingDraft(true)
    try {
      const payload = buildUploadDraftJsonPayload()
      const values = form.getValues()
      const localAudio = values.audio?.[0]
      const localCover = !values.requestAiCover ? values.cover?.[0] : undefined
      const hasLocalMedia = Boolean(localAudio || localCover)

      const response = await (async () => {
        if (!activeDraftId) {
          if (!`${payload.artistName ?? ""}`.trim() && !localAudio) {
            toast.error("Чтобы сохранить черновик без WAV, укажите исполнителя")
            return null
          }
          const formData = new FormData()
          formData.append("kind", "single")
          formData.append("payload", JSON.stringify(payload))
          if (localAudio) formData.append("audio", localAudio)
          if (localCover) formData.append("cover", localCover)
          return fetchWithTimeout(
            "/api/cabinet/upload-drafts",
            { method: "POST", body: formData, credentials: "include" },
            TRACK_UPLOAD_TIMEOUT_MS
          )
        }

        if (hasLocalMedia) {
          const formData = new FormData()
          formData.append("payload", JSON.stringify(payload))
          if (localAudio) formData.append("audio", localAudio)
          if (localCover) formData.append("cover", localCover)
          return fetchWithTimeout(
            `/api/cabinet/upload-drafts/${encodeURIComponent(activeDraftId)}`,
            { method: "PATCH", body: formData, credentials: "include" },
            TRACK_UPLOAD_TIMEOUT_MS
          )
        }

        return fetchWithTimeout(
          `/api/cabinet/upload-drafts/${encodeURIComponent(activeDraftId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ payload }),
          },
          TRACK_UPLOAD_TIMEOUT_MS
        )
      })()

      if (!response) return false
      const data = await parseCabinetApiJson<{
        error?: string
        draft?: { id?: string; status?: UploadDraftStatus; audioRelPath?: string; coverRelPath?: string }
      }>(response)
      if (!response.ok || !data.draft?.id) {
        const errMsg = data.error || "Не удалось сохранить черновик"
        if (isCabinetCoverValidationMessage(errMsg)) {
          showCoverValidationError(errMsg)
        } else {
          toast.error(errMsg)
        }
        return false
      }

      setActiveDraftId(data.draft.id)
      if (data.draft.status) setActiveDraftStatus(data.draft.status)
      if (data.draft.audioRelPath) form.setValue("serverDraftHasAudio", true)
      if (data.draft.coverRelPath) form.setValue("serverDraftHasCover", true)
      rememberDraftIdInUrl(data.draft.id)
      setHasUnsavedDraftChanges(false)
      form.reset(undefined, { keepValues: true, keepErrors: true })
      if (showToast) toast.success("Черновик сохранён")
      return true
    } catch (error) {
      console.error("draft save failed:", error)
      toast.error(formatCabinetUploadFailure(error, "Ошибка при сохранении черновика"))
      return false
    } finally {
      setIsSavingDraft(false)
    }
  }

  const askSaveDraftBeforeLeave = async (): Promise<boolean> => {
    if (!hasDraftLossRisk) return true
    const saveBeforeLeave = window.confirm(
      "Сохранить черновик перед выходом?\nНажмите «ОК» для сохранения или «Отмена», чтобы выбрать другой вариант."
    )
    if (saveBeforeLeave) {
      const saved = await persistDraftToServer(true)
      if (!saved) return false
      return true
    }
    return window.confirm("Выйти без сохранения черновика?")
  }

  const applyDraftToForm = (draft: {
    payload: UploadDraftPayload
    audioRelPath?: string
    coverRelPath?: string
  }) => {
    const p = draft.payload
    const sourceTrackId = typeof p.sourceTrackId === "string" && p.sourceTrackId.trim() ? p.sourceTrackId.trim() : null
    setEditingSourceTrackId(sourceTrackId)
    const releaseDate =
      typeof p.releaseDate === "string" && p.releaseDate.trim()
        ? new Date(`${p.releaseDate}T12:00:00`)
        : undefined
    form.reset({
      trackName: `${p.trackName ?? ""}`,
      artistName: `${p.artistName ?? ""}`,
      labelName: `${p.labelName ?? DEFAULT_RELEASE_LABEL_NAME}`,
      genre: (p.genre as UploadFormValues["genre"]) ?? undefined,
      mood: (p.mood as UploadFormValues["mood"]) ?? undefined,
      shortDescription: `${p.shortDescription ?? ""}`,
      lyricsText: `${p.lyricsText ?? ""}`,
      lyricsAuthor: `${p.lyricsAuthor ?? ""}`,
      musicAuthor: `${p.musicAuthor ?? ""}`,
      musicRights: (p.musicRights as UploadFormValues["musicRights"]) ?? "",
      musicAiService: `${p.musicAiService ?? ""}`,
      isInstrumental: Boolean(p.isInstrumental),
      lyricsRights: (p.lyricsRights as UploadFormValues["lyricsRights"]) ?? "",
      performanceRights: (p.performanceRights as UploadFormValues["performanceRights"]) ?? "",
      releaseDate,
      requestAiCover: Boolean(p.requestAiCover),
      transferFromOtherDistributor: Boolean(p.transferFromOtherDistributor),
      transferUpc: `${p.transferUpc ?? ""}`,
      transferIsrc: `${p.transferIsrc ?? ""}`,
      consentOfferLicense: false,
      serverDraftHasAudio: Boolean(draft.audioRelPath),
      serverDraftHasCover: Boolean(draft.coverRelPath),
      audio: undefined,
      cover: undefined,
    })
    const a = p.addons
    if (a?.verticalVideo) {
      setAddonVerticalVideo(Boolean(a.verticalVideo.enabled))
      setAddonVerticalVideoCount(Math.max(1, Number(a.verticalVideo.videosCount ?? 1)))
    }
    if (a?.aiMastering) {
      setAddonAiMastering(Boolean(a.aiMastering.enabled))
      setAddonAiMasteringCount(Math.max(1, Number(a.aiMastering.tracksCount ?? 1)))
    }
    if (a?.yandexVideoshot) setAddonYandexVideoshot(Boolean(a.yandexVideoshot.enabled))
    if (a?.yandexVideoshotCreation) setAddonYandexVideoshotCreation(Boolean(a.yandexVideoshotCreation.enabled))
    if (a?.yandexVideoavatar) setAddonYandexVideoavatar(Boolean(a.yandexVideoavatar.enabled))
    if (a?.spotifyVideoshot) setAddonSpotifyVideoshot(Boolean(a.spotifyVideoshot.enabled))
  }

  const syncAudioFileToDraftServer = async (file: File) => {
    if (profileCompleteForUpload === false) {
      toast.error("Заполните профиль: ФИО, адрес регистрации и телефон")
      return
    }
    if (audioSyncInFlight.current) return
    audioSyncInFlight.current = true
    setIsSyncingAudio(true)
    try {
      const payload = buildUploadDraftJsonPayload()
      const fd = new FormData()
      if (!activeDraftId) {
        fd.append("kind", "single")
      }
      fd.append("payload", JSON.stringify(payload))
      fd.append("audio", file)
      const v = form.getValues()
      if (!v.requestAiCover && v.cover?.[0]) {
        fd.append("cover", v.cover[0])
      }
      const url = activeDraftId
        ? `/api/cabinet/upload-drafts/${encodeURIComponent(activeDraftId)}`
        : "/api/cabinet/upload-drafts"
      const method = activeDraftId ? "PATCH" : "POST"
      const res = await fetchWithTimeout(
        url,
        { method, body: fd, credentials: "include" },
        TRACK_UPLOAD_TIMEOUT_MS
      )
      const resBody = await parseCabinetApiJson<{
        error?: string
        draft?: { id: string; status?: UploadDraftStatus; audioRelPath?: string; coverRelPath?: string }
      }>(res)
      if (!res.ok) {
        toast.error(resBody.error || "Не удалось сохранить аудио в черновик")
        return
      }
      const draft = resBody.draft
      if (!draft?.id) {
        toast.error("Черновик не создан")
        return
      }
      setActiveDraftId(draft.id)
      if (draft.status) setActiveDraftStatus(draft.status)
      form.setValue("serverDraftHasAudio", true)
      if (draft.coverRelPath) {
        form.setValue("serverDraftHasCover", true)
      }
      rememberDraftIdInUrl(draft.id)
      toast.success("Аудио сохранено в черновик на сервере")
    } catch (e) {
      console.error(e)
      toast.error(formatCabinetUploadFailure(e, "Ошибка при сохранении аудио"))
    } finally {
      audioSyncInFlight.current = false
      setIsSyncingAudio(false)
    }
  }

  const syncCoverFileToDraftServer = async (file: File) => {
    if (!activeDraftId) {
      toast.info("Сначала выберите WAV: черновик на сервере создаётся вместе с аудио")
      return
    }
    if (profileCompleteForUpload === false) return
    setIsSyncingCover(true)
    try {
      const clientErr = await validateCoverFileClient(file)
      if (clientErr) {
        showCoverValidationError(clientErr)
        return
      }
      const fd = new FormData()
      fd.append("payload", JSON.stringify(buildUploadDraftJsonPayload()))
      fd.append("cover", file)
      const res = await fetchWithTimeout(
        `/api/cabinet/upload-drafts/${encodeURIComponent(activeDraftId)}`,
        { method: "PATCH", body: fd, credentials: "include" },
        TRACK_UPLOAD_TIMEOUT_MS
      )
      const resBody = await parseCabinetApiJson<{ error?: string }>(res)
      if (!res.ok) {
        const msg = resBody.error || "Не удалось сохранить обложку"
        if (isCabinetCoverValidationMessage(msg)) {
          showCoverValidationError(msg)
        } else {
          toast.error(msg)
        }
        return
      }
      form.setValue("serverDraftHasCover", true)
      form.clearErrors("cover")
      toast.success("Обложка сохранена в черновик")
    } catch (e) {
      console.error(e)
      const msg = formatCabinetUploadFailure(e, "Ошибка при сохранении обложки", "cover")
      if (isCabinetCoverValidationMessage(msg)) {
        showCoverValidationError(msg)
      } else {
        toast.error(msg)
      }
    } finally {
      setIsSyncingCover(false)
    }
  }

  const draftHydratedRef = useRef(false)
  useEffect(() => {
    if (draftHydratedRef.current) return
    draftHydratedRef.current = true
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const payment = params.get("payment")
        if (payment === "success" || payment === "return") return
        const fromUrl = params.get("draftId")
        if (fromUrl) {
          const res = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(fromUrl)}`, {
            credentials: "include",
          })
          if (!res.ok) return
          const data = (await res.json()) as { draft?: { id: string; status: string; payload: UploadDraftPayload; audioRelPath?: string; coverRelPath?: string } }
          const d = data.draft
          if (!d || !["collecting", "awaiting_payment", "paid"].includes(d.status)) return
          applyDraftToForm(d)
          setActiveDraftId(d.id)
          setActiveDraftStatus(d.status as UploadDraftStatus)
          return
        }
        const listRes = await fetch("/api/cabinet/upload-drafts", { credentials: "include" })
        if (!listRes.ok) return
        const listData = (await listRes.json()) as {
          drafts?: { id: string; kind: string; status: string; updatedAt: string; audioRelPath?: string }[]
        }
        const openSingles = (listData.drafts ?? []).filter(
          (x) => x.kind === "single" && ["collecting", "awaiting_payment", "paid"].includes(x.status)
        )
        if (openSingles.length !== 1 || !openSingles[0].audioRelPath) return
        const onlyId = openSingles[0].id
        const res = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(onlyId)}`, {
          credentials: "include",
        })
        if (!res.ok) return
        const data = (await res.json()) as { draft: { id: string; status: string; payload: UploadDraftPayload; audioRelPath?: string; coverRelPath?: string } }
        if (!data.draft?.audioRelPath) return
        applyDraftToForm(data.draft)
        setActiveDraftId(data.draft.id)
        setActiveDraftStatus(data.draft.status as UploadDraftStatus)
        rememberDraftIdInUrl(data.draft.id)
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- гидратация один раз при открытии страницы
  }, [])

  useEffect(() => {
    Promise.all([
      fetch("/api/cabinet/user", { credentials: "include" }),
      fetch("/api/cabinet/tracks", { credentials: "include" }),
    ]).then(([userRes, tracksRes]) => {
      if (userRes.status === 401 || tracksRes.status === 401) {
        router.replace("/cabinet")
        return
      }
      if (userRes.ok && tracksRes.ok) {
        userRes.json().then((userData: { user?: { createdAt?: string; subscriptionName?: string; subscriptionExpiresAt?: string; subscriptionTrackLimit?: number; purchasedTracksBalance?: number; profileCompleteForUpload?: boolean } }) => {
          const u = userData.user
          setProfileCompleteForUpload(u?.profileCompleteForUpload ?? false)
          setUserTrackPriceRub(getTrackPriceRubByCreatedAt(u?.createdAt))
          const isFixPlan = u?.subscriptionName === "Fix"
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const hasActive =
            isFixPlan || (u?.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt) >= today)
          const expired =
            u != null &&
            u.subscriptionName != null &&
            u.subscriptionName !== "Fix" &&
            !isSubscriptionActiveForUpload({
              subscriptionName: u.subscriptionName,
              subscriptionExpiresAt: u.subscriptionExpiresAt,
            })
          setSubscriptionExpired(expired)
          const limit = hasActive && u
            ? getEffectiveTrackLimit({
                subscriptionName: u.subscriptionName,
                subscriptionTrackLimit: u.subscriptionTrackLimit,
                purchasedTracksBalance: u.purchasedTracksBalance,
              })
            : 0
          setTrackLimit(limit === 0 ? 0 : limit)
          setSubscriptionName(u?.subscriptionName)
        })
        tracksRes.json().then((tracksData: { tracks?: unknown[] }) => {
          setCurrentTrackCount(tracksData.tracks?.length ?? 0)
        })
      }
    })
  }, [router])

  const canEditLabelName = hasLabelSubscription(subscriptionName)

  useEffect(() => {
    if (canEditLabelName) return
    const currentValue = form.getValues("labelName")
    if (currentValue !== DEFAULT_RELEASE_LABEL_NAME) {
      form.setValue("labelName", DEFAULT_RELEASE_LABEL_NAME, { shouldDirty: false })
    }
  }, [canEditLabelName, form])

  useEffect(() => {
    if (!hasDraftLossRisk) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [hasDraftLossRisk])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/upload-drafts", { credentials: "include" })
        if (!res.ok) return
        const data = await res.json()
        const drafts = (data.drafts ?? []) as { expiresAt?: string; status?: string }[]
        const soon = drafts.find((d) => {
          if (!d.expiresAt || d.status === "finalized" || d.status === "expired") return false
          const diff = new Date(d.expiresAt).getTime() - Date.now()
          return diff > 0 && diff <= 24 * 60 * 60 * 1000
        })
        if (soon?.expiresAt) {
          toast.warning(`Есть черновики, которые будут удалены в течение 24 часов (${new Date(soon.expiresAt).toLocaleString("ru-RU")})`)
        }
      } catch {
        // ignore
      }
    })()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get("payment")
    const draftId = params.get("draftId")
    if (!draftId || (payment !== "success" && payment !== "return")) return
    void (async () => {
      try {
        const res = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draftId)}/finalize`, {
          method: "POST",
          credentials: "include",
        })
        if (res.ok) {
          toast.success("Оплата подтверждена. Трек отправлен на модерацию")
          router.replace("/cabinet")
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          if (res.status === 400 && data.error === "Сначала оплатите выбранные услуги") {
            setActiveDraftStatus("awaiting_payment")
            toast.info("Оплата не подтверждена или была отменена")
          } else {
            toast.error(data.error || "Не удалось завершить отправку")
          }
        }
      } catch {
        toast.error("Не удалось проверить статус оплаты")
      }
    })()
  }, [router])

  const formDisabled =
    isSubmitting || isSavingDraft || profileCompleteForUpload === false || isSyncingAudio || isSyncingCover

  const onSubmit = async (data: UploadFormValues) => {
    if (profileCompleteForUpload === false) {
      toast.error("Заполните профиль: ФИО, адрес регистрации и телефон")
      return
    }
    if (trackLimit !== null && currentTrackCount >= trackLimit) {
      if (subscriptionName === "Fix") {
        setPurchaseTracksDialogOpen(true)
      } else {
        setSubscriptionLimitDialogOpen(true)
      }
      return
    }
    const hasLocalAudio = Boolean(data.audio && data.audio[0])
    if (hasLocalAudio) {
      try {
        const stereoErr = await checkWavFileIsStereo(data.audio![0] as File)
        if (stereoErr) {
          form.setError("audio", { type: "manual", message: stereoErr })
          toast.error(stereoErr)
          return
        }
      } catch (e) {
        const msg = formatCabinetUploadFailure(e, "Не удалось проверить аудиофайл")
        form.setError("audio", { type: "manual", message: msg })
        toast.error(msg)
        return
      }
    }
    if (!data.requestAiCover && data.cover?.[0]) {
      try {
        const coverErr = await validateCoverFileClient(data.cover[0] as File)
        if (coverErr) {
          showCoverValidationError(coverErr)
          return
        }
      } catch (e) {
        const msg = formatCabinetUploadFailure(e, "Не удалось проверить обложку", "cover")
        showCoverValidationError(msg)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload = buildUploadDraftJsonPayload()
      const formData = new FormData()
      if (!activeDraftId) {
        formData.append("kind", "single")
      }
      formData.append("payload", JSON.stringify(payload))
      if (hasLocalAudio) {
        formData.append("audio", data.audio![0] as File)
      }
      if (!data.requestAiCover && data.cover?.[0]) {
        formData.append("cover", data.cover[0])
      }

      const url = activeDraftId
        ? `/api/cabinet/upload-drafts/${encodeURIComponent(activeDraftId)}`
        : "/api/cabinet/upload-drafts"
      const method = activeDraftId ? "PATCH" : "POST"

      const response = await fetchWithTimeout(
        url,
        {
          method,
          body: formData,
          credentials: "include",
        },
        TRACK_UPLOAD_TIMEOUT_MS
      )

      if (response.ok) {
        const created = await parseCabinetApiJson<{
          error?: string
          draft?: { id?: string; status?: UploadDraftStatus }
          requiresPayment?: boolean
        }>(response)
        const draftId = created?.draft?.id ?? activeDraftId ?? undefined
        if (!draftId) {
          toast.error("Черновик не создан")
          return
        }
        if (created?.draft?.status) {
          setActiveDraftStatus(created.draft.status as UploadDraftStatus)
        }
        if (!activeDraftId && created?.draft?.id) {
          setActiveDraftId(created.draft.id as string)
          rememberDraftIdInUrl(created.draft.id as string)
        }
        const draftStatusAfterSave = created?.draft?.status
        const requiresPayment =
          draftStatusAfterSave !== "paid" &&
          (selectedAddonsTotal > 0 ||
            (typeof created?.requiresPayment === "boolean" && created.requiresPayment))
        if (requiresPayment) {
          const paymentRes = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draftId)}/payment/create`, {
            method: "POST",
            credentials: "include",
          })
          const paymentData = await parseCabinetApiJson<{ error?: string; paymentUrl?: string; skippedPayment?: boolean }>(
            paymentRes
          )
          if (!paymentRes.ok) {
            toast.error(paymentData.error || "Не удалось создать оплату")
            return
          }
          if (typeof paymentData.paymentUrl === "string" && paymentData.paymentUrl.trim()) {
            window.location.href = paymentData.paymentUrl as string
            return
          }
          if (paymentData.skippedPayment) {
            const finalizeRes = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draftId)}/finalize`, {
              method: "POST",
              credentials: "include",
            })
            if (!finalizeRes.ok) {
              const finalizeData = await parseCabinetApiJson<{ error?: string }>(finalizeRes)
              toast.error(finalizeData.error || "Не удалось завершить отправку")
              return
            }
            toast.success("Трек успешно загружен")
            router.push("/cabinet")
            return
          }
          toast.error("Не удалось создать оплату")
          return
        }
        const finalizeRes = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draftId)}/finalize`, {
          method: "POST",
          credentials: "include",
        })
        if (!finalizeRes.ok) {
          const finalizeData = await parseCabinetApiJson<{ error?: string }>(finalizeRes)
          toast.error(finalizeData.error || "Не удалось завершить отправку")
          return
        }
        toast.success("Трек успешно загружен")
        router.push("/cabinet")
      } else if (response.status === 401) {
        router.replace("/cabinet")
      } else if (response.status === 403) {
        const err = await parseCabinetApiJson<{ error?: string; errorCode?: string }>(response)
        if (err.errorCode === PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE) {
          setProfileCompleteForUpload(false)
          toast.error(err.error || "Заполните профиль")
        } else {
          toast.error(
            err.error ||
              (subscriptionExpired
                ? SUBSCRIPTION_EXPIRED_MESSAGE
                : getSubscriptionLimitMessage(trackLimit ?? 0))
          )
        }
      } else {
        const err = await parseCabinetApiJson<{ error?: string }>(response)
        const message = err.error || "Не удалось загрузить трек"
        const isWavValidationMessage =
          typeof message === "string" &&
          (message.includes("Параметры файла не подходят") ||
            message.includes("В файле нет корректного заголовка") ||
            message.includes("В файле не PCM") ||
            message.includes("Не удалось определить параметры WAV") ||
            message.startsWith("Некорректный WAV-файл") ||
            message.includes("Файл должен быть несжатым WAV") ||
            message.includes("Аудиофайл должен быть в формате WAV") ||
            message.includes("монофонический") ||
            message.includes("mono") ||
            message.toLowerCase().includes("wav 16 или 24 bit") ||
            message.toLowerCase().includes("44.1 khz"))
        if (isWavValidationMessage) {
          setAudioFormatError(message)
        } else if (typeof message === "string" && isCabinetCoverValidationMessage(message)) {
          showCoverValidationError(message)
        } else {
          toast.error(message)
        }
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(formatCabinetUploadFailure(error, "Ошибка при загрузке"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const canLeave = await askSaveDraftBeforeLeave()
    if (!canLeave) return
    router.push("/cabinet")
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              void (async () => {
                const canLeave = await askSaveDraftBeforeLeave()
                if (canLeave) router.push("/cabinet")
              })()
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Загрузить трек</h1>
            <p className="text-muted-foreground text-sm">WAV до 80 MB; обложка JPEG/PNG 3000×3000 до 20 MB</p>
          </div>
          {profileCompleteForUpload !== false ? (
            <Button
              type="button"
              variant="outline"
              className="ml-auto"
              disabled={formDisabled}
              onClick={() => void persistDraftToServer(true)}
            >
              {isSavingDraft ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Сохранение...
                </>
              ) : (
                "Сохранить черновик"
              )}
            </Button>
          ) : null}
        </div>

        {profileCompleteForUpload === false ? <CabinetUploadProfileGateBanner /> : null}

        {profileCompleteForUpload !== false && activeDraftId ? (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Черновик создан. Нажмите «Сохранить черновик» перед выходом, чтобы не потерять изменения.
          </div>
        ) : null}
        {profileCompleteForUpload !== false && activeDraftId && activeDraftStatus === "awaiting_payment" ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-amber-200">
                Черновик ожидает оплату дополнительных услуг. После оплаты отправьте трек на модерацию.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPayingDraft || isSubmitting}
                onClick={() => void handlePayDraftServices()}
              >
                {isPayingDraft ? "Переход к оплате..." : "Оплатить услуги"}
              </Button>
            </div>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="trackName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название трека *</FormLabel>
                  <FormControl>
                    <Input placeholder="Название трека" disabled={formDisabled} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="artistName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Исполнитель *</FormLabel>
                  <FormControl>
                    <Input placeholder="Исполнитель" disabled={formDisabled} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Жанр *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={formDisabled}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите жанр" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genreKeys.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Настроение трека *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={formDisabled}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите настроение" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {moodKeys.map((mood) => (
                        <SelectItem key={mood} value={mood}>
                          {mood}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="releaseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Дата публикации на площадки *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            disabled={formDisabled}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ru })
                            ) : (
                              <span>Выберите дату</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const minDate = new Date(today)
                            minDate.setDate(minDate.getDate() + 8)
                            return date < minDate || isReleaseDateWeekend(date)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isInstrumental"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Это инструментал *</FormLabel>
                    <Select
                      value={field.value ? "yes" : "no"}
                      onValueChange={(value) => {
                        const isInstrumental = value === "yes"
                        field.onChange(isInstrumental)
                        if (isInstrumental) {
                          form.setValue("lyricsText", "")
                          form.setValue("lyricsAuthor", "")
                          form.setValue("lyricsRights", "")
                          form.setValue("performanceRights", "")
                        }
                      }}
                      disabled={formDisabled}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите вариант" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no">Нет</SelectItem>
                        <SelectItem value="yes">Да</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="shortDescription"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Краткое описание трека *</FormLabel>
                  <FormControl>
                    <Input placeholder="Кратко опишите трек (до 500 символов)" disabled={formDisabled} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!form.watch("isInstrumental") && (
              <>
                <div className="md:col-span-2 flex gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-destructive">
                      В соответствии с требованиями законов РФ (в том числе на упоминания запрещённых веществ) необходимо ОБЯЗАТЕЛЬНО указывать текст песни.
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      <li>Если в треке есть вокал - добавляйте полный текст композиции, текст песни должен соответствовать финальной версии трека.</li>
                      <li>Без добавленного текста релиз может быть отправлен на дополнительную проверку, выпуск может задержаться.</li>
                    </ul>
                    <p className="text-muted-foreground">
                      Это поможет быстрее проходить модерацию и избегать проблем с размещением на площадках.
                    </p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="lyricsText"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Текст песни *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Вставьте полный текст песни (до 5000 символов)"
                          disabled={formDisabled}
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>{LYRICS_TEXT_UPLOAD_HINT}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <div className="md:col-span-2 flex flex-col gap-4">
              {!form.watch("isInstrumental") ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start [&>*]:min-w-0">
                  <FormField
                    control={form.control}
                    name="lyricsAuthor"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Автор слов *</FormLabel>
                        <FormControl>
                          <Input placeholder="Полное ФИО (без сокращений)" disabled={formDisabled} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="musicAuthor"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Автор музыки *</FormLabel>
                        <FormControl>
                          <Input placeholder="Полное ФИО (без сокращений)" disabled={formDisabled} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="musicAuthor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Автор музыки *</FormLabel>
                      <FormControl>
                        <Input placeholder="Полное ФИО (без сокращений)" disabled={formDisabled} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!form.watch("isInstrumental") ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start [&>*]:min-w-0">
                  <FormField
                    control={form.control}
                    name="musicRights"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Права на музыку *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value)
                            if (!musicRightsRequiresAiService(value)) {
                              form.setValue("musicAiService", "")
                            }
                          }}
                          disabled={formDisabled}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MUSIC_RIGHTS_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lyricsRights"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel>Права на текст *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={formDisabled}>
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Выберите вариант" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LYRICS_RIGHTS_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="musicRights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Права на музыку *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          if (!musicRightsRequiresAiService(value)) {
                            form.setValue("musicAiService", "")
                          }
                        }}
                        disabled={formDisabled}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MUSIC_RIGHTS_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {musicRightsRequiresAiService(form.watch("musicRights")) && (
                <FormField
                  control={form.control}
                  name="musicAiService"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название/ссылка на ИИ сервис *</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: Suno, Udio, ссылка на сервис" disabled={formDisabled} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!form.watch("isInstrumental") ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start [&>*]:min-w-0">
                  <FormField
                    control={form.control}
                    name="performanceRights"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className="min-h-11 leading-snug md:min-h-12">
                          Права на исполнение *
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={formDisabled}>
                          <FormControl>
                            <SelectTrigger className="w-full min-w-0">
                              <SelectValue placeholder="Выберите вариант" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PERFORMANCE_RIGHTS_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="labelName"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className="min-h-11 leading-snug md:min-h-12">
                          Свое название лейбла
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Название лейбла"
                            disabled={formDisabled || !canEditLabelName}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Доступно в тарифе Label</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="labelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Свое название лейбла</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Название лейбла"
                          disabled={formDisabled || !canEditLabelName}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Доступно в тарифе Label</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="transferFromOtherDistributor"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <div className="flex flex-wrap items-start gap-3 rounded-md border border-border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(c) => {
                            const on = c === true
                            field.onChange(on)
                            if (!on) {
                              form.setValue("transferUpc", "")
                              form.setValue("transferIsrc", "")
                              form.clearErrors(["transferUpc", "transferIsrc"])
                            }
                          }}
                          disabled={formDisabled}
                          id="cabinet-upload-transfer-distributor"
                        />
                      </FormControl>
                      <div className="min-w-0 flex-1 space-y-1">
                        <FormLabel htmlFor="cabinet-upload-transfer-distributor" className="cursor-pointer font-normal">
                          Перенос от другого дистрибьютора
                        </FormLabel>
                        <FormDescription>
                          Укажите существующие UPC и ISRC релиза при переносе с другой дистрибуции
                        </FormDescription>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("transferFromOtherDistributor") ? (
                <div className="md:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="transferUpc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UPC *</FormLabel>
                        <FormControl>
                          <Input
                            className="font-mono"
                            placeholder="UPC"
                            disabled={formDisabled}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="transferIsrc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ISRC *</FormLabel>
                        <FormControl>
                          <Input
                            className="font-mono"
                            placeholder="ISRC"
                            disabled={formDisabled}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}
            </div>
            <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
              <FormField
                control={form.control}
                name="cover"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem className="flex h-full min-h-0 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                      <FormLabel>
                        Обложка (JPEG/PNG, 3000×3000, до 20 MB)
                        {!form.watch("requestAiCover") ? " *" : ""}
                      </FormLabel>
                      <FormDescription className={form.watch("requestAiCover") ? "" : "hidden"}>
                        Не требуется при заказе ИИ-обложки.
                      </FormDescription>
                    </div>
                    <FormControl className="mt-auto w-full shrink-0">
                      <Input
                        key={form.watch("requestAiCover") ? "cover-off" : "cover-on"}
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        disabled={formDisabled || form.watch("requestAiCover")}
                        onChange={async (e) => {
                          const files = e.target.files
                          onChange(files)
                          form.clearErrors("cover")
                          setCoverFormatError(null)
                          const f = files?.[0]
                          if (!f || form.watch("requestAiCover")) return
                          try {
                            const coverErr = await validateCoverFileClient(f)
                            if (coverErr) {
                              showCoverValidationError(coverErr)
                              return
                            }
                          } catch (err) {
                            showCoverValidationError(
                              formatCabinetUploadFailure(err, "Не удалось проверить обложку", "cover")
                            )
                            return
                          }
                          if (activeDraftId) {
                            void syncCoverFileToDraftServer(f)
                          }
                        }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audio"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem className="flex h-full min-h-0 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                      <FormLabel>Аудио (WAV, до 80 MB) *</FormLabel>
                    </div>
                    <div
                      className={cn(
                        "mt-auto flex h-auto min-h-9 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs",
                        "dark:bg-input/30",
                        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                      )}
                    >
                      <FormControl>
                        <input
                          type="file"
                          accept=".wav,audio/wav,audio/wave,audio/x-wav,audio/vnd.wave"
                          disabled={formDisabled}
                          className="sr-only"
                          onChange={async (e) => {
                            const files = e.target.files
                            onChange(files)
                            form.clearErrors("audio")
                            const f = files?.[0]
                            if (!f) return
                            if (!isLikelyWavFile(f)) {
                              form.setError("audio", {
                                type: "manual",
                                message: "Аудио должно быть в формате WAV",
                              })
                              toast.error("Аудио должно быть в формате WAV")
                              return
                            }
                            try {
                              const stereoError = await checkWavFileIsStereo(f)
                              if (stereoError) {
                                form.setError("audio", { type: "manual", message: stereoError })
                                return
                              }
                            } catch (err) {
                              const msg = formatCabinetUploadFailure(err, "Не удалось проверить аудиофайл")
                              form.setError("audio", { type: "manual", message: msg })
                              toast.error(msg)
                              return
                            }
                            void syncAudioFileToDraftServer(f)
                          }}
                          {...field}
                          ref={(el) => {
                            field.ref(el)
                            cabinetUploadAudioInputRef.current = el
                          }}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                        disabled={formDisabled}
                        onClick={() => cabinetUploadAudioInputRef.current?.click()}
                      >
                        Выберите файл
                      </Button>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm",
                          pickedWavFile || watchedServerDraftHasAudio
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                        title={audioFileStatusLabel}
                      >
                        {audioFileStatusLabel}
                      </span>
                      {audioListenSrc ? (
                        <>
                          <audio
                            key={audioListenSrc}
                            ref={cabinetUploadPreviewAudioRef}
                            className="hidden"
                            src={audioListenSrc}
                            preload="metadata"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                            disabled={formDisabled}
                            onClick={toggleCabinetUploadAudioPreview}
                            aria-label={cabinetUploadAudioPreviewPlaying ? "Пауза" : "Прослушать"}
                          >
                            {cabinetUploadAudioPreviewPlaying ? (
                              <Pause className="size-4" aria-hidden />
                            ) : (
                              <Play className="size-4" aria-hidden />
                            )}
                          </Button>
                        </>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <CabinetUploadAdditionalServicesSection
              formDisabled={formDisabled}
              sectionClassName="md:col-span-2"
              afterPaymentSubject="трек"
              requestAiCover={watchedRequestAiCover}
              addonVerticalVideo={addonVerticalVideo}
              setAddonVerticalVideo={setAddonVerticalVideo}
              addonVerticalVideoCount={addonVerticalVideoCount}
              setAddonVerticalVideoCount={(n) => setAddonVerticalVideoCount(n)}
              addonAiMastering={addonAiMastering}
              setAddonAiMastering={setAddonAiMastering}
              addonAiMasteringCount={addonAiMasteringCount}
              setAddonAiMasteringCount={(n) => setAddonAiMasteringCount(n)}
              addonYandexVideoshot={addonYandexVideoshot}
              setAddonYandexVideoshot={setAddonYandexVideoshot}
              addonYandexVideoshotCreation={addonYandexVideoshotCreation}
              setAddonYandexVideoshotCreation={setAddonYandexVideoshotCreation}
              addonYandexVideoavatar={addonYandexVideoavatar}
              setAddonYandexVideoavatar={setAddonYandexVideoavatar}
              addonSpotifyVideoshot={addonSpotifyVideoshot}
              setAddonSpotifyVideoshot={setAddonSpotifyVideoshot}
              renderAiCoverRow={(openAddonInfo) => (
                <FormField
                  control={form.control}
                  name="requestAiCover"
                  render={({ field }) => (
                    <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
                      <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                        <Checkbox
                          id="cabinet-upload-ai-cover"
                          className="mt-0.5 shrink-0"
                          checked={field.value}
                          onCheckedChange={(c) => {
                            const on = c === true
                            field.onChange(on)
                            if (on) {
                              form.setValue("cover", undefined)
                              form.clearErrors("cover")
                              form.setValue("serverDraftHasCover", false)
                              if (activeDraftId) {
                                const payload = { ...buildUploadDraftJsonPayload(), requestAiCover: true }
                                void fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(activeDraftId)}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ payload }),
                                }).catch(() => {})
                              }
                            }
                          }}
                          disabled={formDisabled}
                        />
                        <span>AI обложка для трека</span>
                      </label>
                      <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                        <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                          500 руб. / шт.
                        </span>
                        <Button type="button" variant="outline" size="sm" onClick={() => openAddonInfo("aiCover")}>
                          Подробнее
                        </Button>
                      </div>
                    </div>
                  )}
                />
              )}
            />
            <FormField
              control={form.control}
              name="consentOfferLicense"
              render={({ field }) => (
                <FormItem className="md:col-span-2 flex flex-row items-start gap-3 space-y-0 rounded-md border border-border p-4">
                  <FormControl>
                    <Checkbox
                      id="cabinet-upload-consent-offer"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                      disabled={formDisabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-snug">
                    <FormLabel
                      htmlFor="cabinet-upload-consent-offer"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Я ознакомился(ась) и согласен(сна) с{" "}
                      <Link
                        href="/offer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        публичной офертой и лицензионными условиями
                      </Link>{" "}
                      *
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <div className="md:col-span-2 flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={formDisabled}>
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Отправка...
                  </>
                ) : isSyncingAudio ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Сохранение аудио...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {activeDraftId ? "Отправить на модерацию" : "Загрузить трек"}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting || isSavingDraft} onClick={(event) => void handleCancelClick(event)}>
                Отмена
              </Button>
            </div>
          </form>
        </Form>
        <PurchaseTracksDialog
          open={purchaseTracksDialogOpen}
          onOpenChange={setPurchaseTracksDialogOpen}
          unitPriceRub={userTrackPriceRub}
        />
        <SubscriptionLimitDialog
          open={subscriptionLimitDialogOpen}
          onOpenChange={setSubscriptionLimitDialogOpen}
          limit={trackLimit}
          reason={subscriptionExpired ? "expired" : "limit"}
        />
        <Dialog open={!!coverFormatError} onOpenChange={(open) => !open && setCoverFormatError(null)}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Обложка не соответствует требованиям</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {coverFormatError ??
                "Нужна обложка JPEG или PNG, строго 3000×3000 пикселей, до 20 MB."}
            </p>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                onClick={() => setCoverFormatError(null)}
                className="ml-auto"
              >
                ОК
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={!!audioFormatError} onOpenChange={(open) => !open && setAudioFormatError(null)}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Неверный формат аудиофайла</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {audioFormatError ??
                "Несжатый WAV (PCM), 44.1 kHz (44100 Hz), 16 или 24 bit."}
            </p>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                onClick={() => setAudioFormatError(null)}
                className="ml-auto"
              >
                ОК
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {isSubmitting || isSyncingAudio ? (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm">
            <div className="flex h-full w-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-lg">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Spinner className="h-6 w-6 text-primary" />
                </div>
                <p className="text-base font-semibold">Загружаем трек</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Пожалуйста, не закрывайте страницу до завершения отправки.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
