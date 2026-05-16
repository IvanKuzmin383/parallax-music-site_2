"use client"

import { useEffect, useRef, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, useWatch, type FieldPath } from "react-hook-form"
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
import { GENRES, TRACK_MOODS, musicRightsRequiresAiService } from "@/lib/track-constants"
import { getEffectiveTrackLimit, isSubscriptionActiveForUpload } from "@/lib/subscription-plans"
import { PurchaseTracksDialog } from "@/components/purchase-tracks-dialog"
import { SubscriptionLimitDialog } from "@/components/subscription-limit-dialog"
import { ArrowLeft, Upload, CalendarIcon, Plus, Trash2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { isReleaseDateWeekend } from "@/lib/release-date-validation"
import { CabinetUploadProfileGateBanner } from "@/components/cabinet-upload-profile-gate-banner"
import { PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE } from "@/lib/cabinet-upload-profile-gate"
import { getTrackPriceRubByCreatedAt, TRACK_PRICE_RUB } from "@/lib/track-pricing"
import { checkWavFileIsStereo, parseWavFmtChunk } from "@/lib/wav-parse-stereo"
import type { UploadDraftStatus } from "@/lib/upload-drafts"
import { CabinetUploadAdditionalServicesSection } from "@/components/cabinet-upload-additional-services-section"
import { useI18n } from "@/lib/i18n-context"
import { DEFAULT_RELEASE_LABEL_NAME, hasLabelSubscription } from "@/lib/release-label"

/** Параллельная загрузка WAV; раньше файлы шли строго по одному — поздние треки ждали очередь всех предыдущих. */
const ALBUM_AUDIO_UPLOAD_CONCURRENCY = 4
const ALBUM_AUDIO_SYNC_TIMEOUT_MS = 180_000

async function fetchAlbumDraftWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
const CLIENT_WAV_PREFIX_BYTES = 512 * 1024

type AlbumAudioValidationMessages = {
  invalidSmallFile: string
  invalidHeader: string
  invalidPcm: string
  invalidParams: string
}

async function checkWavFileSampleRateAndBitDepth(
  file: File,
  messages: AlbumAudioValidationMessages
): Promise<string | null> {
  if (!file.name.toLowerCase().endsWith(".wav")) return null

  const prefixBytes = Math.min(CLIENT_WAV_PREFIX_BYTES, file.size)
  if (prefixBytes < 44) {
    return messages.invalidSmallFile
  }

  const prefixBuffer = await file.slice(0, prefixBytes).arrayBuffer()
  const parsed = parseWavFmtChunk(new Uint8Array(prefixBuffer))
  if (!parsed) {
    return messages.invalidHeader
  }

  if (parsed.audioFormat !== 1) {
    return messages.invalidPcm.replace("{code}", String(parsed.audioFormat))
  }

  const badSampleRate = parsed.sampleRate !== 44100
  const badBitDepth = parsed.bitsPerSample !== 16 && parsed.bitsPerSample !== 24
  if (!badSampleRate && !badBitDepth) return null

  const actual: string[] = []
  const expected: string[] = []
  if (badSampleRate) {
    actual.push(`частота ${parsed.sampleRate} Hz`)
    expected.push("44.1 kHz (44100 Hz)")
  }
  if (badBitDepth) {
    actual.push(`разрядность ${parsed.bitsPerSample} bit`)
    expected.push("16 или 24 bit")
  }
  return messages.invalidParams
    .replace("{actual}", actual.join(", "))
    .replace("{expected}", expected.join(", "))
}

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

const albumTrackSchema = z.object({
  tempId: z.string().min(1),
  trackName: z.string().min(2, "Минимум 2 символа").max(100, "Максимум 100 символов"),
  // Жанр может быть временно undefined в форме, но должен быть заполнен перед отправкой
  genre: z.enum([...GENRES] as [string, ...string[]]).optional(),
  mood: z.enum([...TRACK_MOODS] as [string, ...string[]], {
    required_error: "Выберите настроение трека",
  }).optional(),
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
  audio: z.any().optional(),
  audioRelPath: z.string().optional(),
  serverDraftHasAudio: z.boolean().default(false),
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
    const file = data.audio?.[0] as File | undefined
    if (!file?.name.toLowerCase().endsWith(".wav")) {
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
  if (!data.mood) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["mood"],
      message: "Выберите настроение трека",
    })
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
})

const uploadAlbumSchema = z.object({
  albumTitle: z.string().min(2, "Минимум 2 символа").max(100, "Максимум 100 символов"),
  albumArtistName: z.string().min(2, "Минимум 2 символа").max(100, "Максимум 100 символов"),
  labelName: z.string().max(100, "Максимум 100 символов"),
  releaseDate: z
    .date({
      required_error: "Дата публикации обязательна",
    })
    .refine((date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const minDate = new Date(today)
      minDate.setDate(minDate.getDate() + 8)
      return date >= minDate
    }, {
      message: "Дата публикации должна быть не ранее чем через 8 дней от сегодня",
    })
    .refine((date) => !isReleaseDateWeekend(date), {
      message: "Дата публикации не может приходиться на выходной день (суббота или воскресенье)",
    }),
  cover: z.any().optional(),
  requestAiCover: z.boolean().default(false),
  serverDraftHasCover: z.boolean().default(false),
  tracks: z
    .array(albumTrackSchema)
    .min(2, "В альбоме должно быть минимум 2 трека"),
  consentOfferLicense: z.boolean(),
}).superRefine((data, ctx) => {
  const hasCoverFile = Boolean(
    data.cover && typeof data.cover.length === "number" && data.cover.length === 1
  )
  if (!data.requestAiCover && !data.serverDraftHasCover && !hasCoverFile) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cover"],
      message: "Обложка обязательна",
    })
  }
  if (hasCoverFile) {
    const file = data.cover?.[0] as File | undefined
    const ext = file?.name.toLowerCase().split(".").pop()
    if (!["jpg", "jpeg", "png"].includes(ext ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cover"],
        message: "Обложка должна быть JPEG или PNG",
      })
    } else if ((file?.size ?? 0) > 20 * 1024 * 1024) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cover"],
        message: "Размер обложки не должен превышать 20 MB",
      })
    }
  }
}).refine((data) => data.consentOfferLicense === true, {
  message:
    "Подтвердите согласие и ознакомление с публичной офертой и лицензионными условиями",
  path: ["consentOfferLicense"],
})

type UploadAlbumFormValues = z.infer<typeof uploadAlbumSchema>

const getSubscriptionLimitMessage = (limit: number) =>
  `Текущий тариф предусматривает не более ${limit} активных релизов. Чтобы загрузить больше, необходимо расширить подписку.`

const SUBSCRIPTION_EXPIRED_MESSAGE =
  "Срок действия подписки закончился. Продлите подписку, чтобы загружать релизы."

type AlbumDraftTrackPayload = {
  tempId?: string
  trackName?: string
  genre?: string
  mood?: string
  shortDescription?: string
  lyricsText?: string
  lyricsAuthor?: string
  musicAuthor?: string
  musicRights?: string
  musicAiService?: string
  isInstrumental?: boolean
  lyricsRights?: string
  performanceRights?: string
  backingAuthor?: string
  audioRelPath?: string
}

function generateAlbumTrackTempId(): string {
  const randomId = globalThis.crypto?.randomUUID?.()
  if (randomId) return randomId
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function createEmptyAlbumTrack(): UploadAlbumFormValues["tracks"][number] {
  return {
    tempId: generateAlbumTrackTempId(),
    trackName: "",
    genre: undefined,
    mood: undefined,
    shortDescription: "",
    lyricsText: "",
    lyricsAuthor: "",
    musicAuthor: "",
    musicRights: EMPTY_OPTION,
    musicAiService: "",
    isInstrumental: false,
    lyricsRights: EMPTY_OPTION,
    performanceRights: EMPTY_OPTION,
    audio: undefined,
    audioRelPath: "",
    serverDraftHasAudio: false,
  }
}

export default function CabinetUploadAlbumPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const activeDraftIdRef = useRef<string | null>(null)
  const [activeDraftStatus, setActiveDraftStatus] = useState<UploadDraftStatus | null>(null)
  const [isPayingDraft, setIsPayingDraft] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSyncingAlbumAudio, setIsSyncingAlbumAudio] = useState(false)
  const albumAudioSyncInFlight = useRef(false)
  /** Текст этапа пошаговой загрузки (альбом отправляется частями, чтобы не упираться в лимит размера запроса) */
  const [uploadStepLabel, setUploadStepLabel] = useState<string | null>(null)
  const [trackLimit, setTrackLimit] = useState<number | null>(null)
  const [currentTrackCount, setCurrentTrackCount] = useState(0)
  const [subscriptionName, setSubscriptionName] = useState<string | undefined>(undefined)
  const [subscriptionExpired, setSubscriptionExpired] = useState(false)
  const [purchaseTracksDialogOpen, setPurchaseTracksDialogOpen] = useState(false)
  const [subscriptionLimitDialogOpen, setSubscriptionLimitDialogOpen] = useState(false)
  const [profileCompleteForUpload, setProfileCompleteForUpload] = useState<boolean | null>(null)
  const albumAudioValidationText = t.cabinet.uploadAlbum.audioValidation
  const [userTrackPriceRub, setUserTrackPriceRub] = useState(TRACK_PRICE_RUB)
  const [addonVerticalVideo, setAddonVerticalVideo] = useState(false)
  const [addonVerticalVideoCount, setAddonVerticalVideoCount] = useState(1)
  const [addonAiMastering, setAddonAiMastering] = useState(false)
  const [addonAiMasteringCount, setAddonAiMasteringCount] = useState(1)
  const [addonYandexVideoshot, setAddonYandexVideoshot] = useState(false)
  const [addonYandexVideoshotCreation, setAddonYandexVideoshotCreation] = useState(false)
  const [addonYandexVideoavatar, setAddonYandexVideoavatar] = useState(false)
  const [addonSpotifyVideoshot, setAddonSpotifyVideoshot] = useState(false)

  const form = useForm<UploadAlbumFormValues>({
    resolver: zodResolver(uploadAlbumSchema),
    defaultValues: {
      albumTitle: "",
      albumArtistName: "",
      labelName: DEFAULT_RELEASE_LABEL_NAME,
      releaseDate: undefined,
      tracks: [
        createEmptyAlbumTrack(),
        createEmptyAlbumTrack(),
      ],
      requestAiCover: false,
      serverDraftHasCover: false,
      consentOfferLicense: false,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tracks",
  })
  const watchedCoverFiles = useWatch({ control: form.control, name: "cover" }) as FileList | undefined
  const watchedRequestAiCover = useWatch({ control: form.control, name: "requestAiCover" }) ?? false
  const watchedTracks = useWatch({ control: form.control, name: "tracks" }) as UploadAlbumFormValues["tracks"]
  const isFormDirty = form.formState.isDirty
  const hasLocalUnsyncedMedia =
    Boolean(watchedCoverFiles?.[0]) ||
    watchedTracks.some((track) => {
      const hasLocalAudio = Boolean(track.audio?.[0])
      const hasDraftAudio = Boolean(track.serverDraftHasAudio)
      return hasLocalAudio && !hasDraftAudio
    })
  const hasDraftLossRisk =
    isSubmitting || isSyncingAlbumAudio || hasLocalUnsyncedMedia || (isFormDirty && !activeDraftId)

  const rememberDraftIdInUrl = (draftId: string) => {
    activeDraftIdRef.current = draftId
    if (typeof window === "undefined") return
    const u = new URL(window.location.href)
    u.searchParams.set("draftId", draftId)
    const payment = u.searchParams.get("payment")
    if (payment !== "success" && payment !== "return") {
      u.searchParams.delete("payment")
    }
    window.history.replaceState({}, "", u.toString())
  }

  useEffect(() => {
    activeDraftIdRef.current = activeDraftId
  }, [activeDraftId])

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
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const draftId = params.get("draftId")
        if (!draftId) return
        const res = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draftId)}`, {
          credentials: "include",
        })
        if (!res.ok) return
        const data = await res.json()
        const draft = data?.draft as
          | {
              id: string
              kind: string
              status: string
              coverRelPath?: string
              payload: {
                albumTitle?: string
                albumArtistName?: string
                labelName?: string
                releaseDate?: string
                addons?: {
                  trackCover?: { enabled?: boolean }
                  verticalVideo?: { enabled?: boolean; videosCount?: number }
                  aiMastering?: { enabled?: boolean; tracksCount?: number }
                  yandexVideoshot?: { enabled?: boolean }
                  yandexVideoshotCreation?: { enabled?: boolean }
                  yandexVideoavatar?: { enabled?: boolean }
                  spotifyVideoshot?: { enabled?: boolean }
                }
                albumTracks?: AlbumDraftTrackPayload[]
              }
            }
          | undefined
        if (!draft || draft.kind !== "album" || !["collecting", "awaiting_payment", "paid"].includes(draft.status)) {
          return
        }

        const draftTracks = Array.isArray(draft.payload.albumTracks) ? draft.payload.albumTracks : []
        if (draftTracks.length < 2) return
        const releaseDate =
          typeof draft.payload.releaseDate === "string" && draft.payload.releaseDate.trim()
            ? new Date(`${draft.payload.releaseDate}T12:00:00`)
            : undefined
        form.reset({
          albumTitle: `${draft.payload.albumTitle ?? ""}`,
          albumArtistName: `${draft.payload.albumArtistName ?? ""}`,
          labelName: `${draft.payload.labelName ?? DEFAULT_RELEASE_LABEL_NAME}`,
          releaseDate,
          requestAiCover: Boolean(draft.payload.addons?.trackCover?.enabled),
          serverDraftHasCover: Boolean(draft.coverRelPath),
          cover: undefined,
          tracks: draftTracks.map((track) => ({
            tempId: `${track.tempId ?? generateAlbumTrackTempId()}`,
            trackName: `${track.trackName ?? ""}`,
            genre: (track.genre as UploadAlbumFormValues["tracks"][number]["genre"]) ?? undefined,
            mood: (track.mood as UploadAlbumFormValues["tracks"][number]["mood"]) ?? undefined,
            shortDescription: `${track.shortDescription ?? ""}`,
            lyricsText: `${track.lyricsText ?? ""}`,
            lyricsAuthor: `${track.lyricsAuthor ?? ""}`,
            musicAuthor: `${track.musicAuthor ?? ""}`,
            musicRights: (track.musicRights as UploadAlbumFormValues["tracks"][number]["musicRights"]) ?? "",
            musicAiService: `${track.musicAiService ?? ""}`,
            isInstrumental: Boolean(track.isInstrumental),
            lyricsRights: (track.lyricsRights as UploadAlbumFormValues["tracks"][number]["lyricsRights"]) ?? "",
            performanceRights:
              (track.performanceRights as UploadAlbumFormValues["tracks"][number]["performanceRights"]) ?? "",
            audio: undefined,
            audioRelPath: `${track.audioRelPath ?? ""}`,
            serverDraftHasAudio: Boolean(track.audioRelPath),
          })),
          consentOfferLicense: false,
        })
        setAddonVerticalVideo(Boolean(draft.payload.addons?.verticalVideo?.enabled))
        setAddonVerticalVideoCount(Math.max(1, Number(draft.payload.addons?.verticalVideo?.videosCount ?? 1)))
        setAddonAiMastering(Boolean(draft.payload.addons?.aiMastering?.enabled))
        setAddonAiMasteringCount(Math.max(1, Number(draft.payload.addons?.aiMastering?.tracksCount ?? 1)))
        if (draft.payload.addons?.yandexVideoshot) {
          setAddonYandexVideoshot(Boolean(draft.payload.addons.yandexVideoshot.enabled))
        }
        if (draft.payload.addons?.yandexVideoshotCreation) {
          setAddonYandexVideoshotCreation(Boolean(draft.payload.addons.yandexVideoshotCreation.enabled))
        }
        if (draft.payload.addons?.yandexVideoavatar) {
          setAddonYandexVideoavatar(Boolean(draft.payload.addons.yandexVideoavatar.enabled))
        }
        if (draft.payload.addons?.spotifyVideoshot) {
          setAddonSpotifyVideoshot(Boolean(draft.payload.addons.spotifyVideoshot.enabled))
        }
        setActiveDraftId(draft.id)
        setActiveDraftStatus(draft.status as UploadDraftStatus)
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate draft only once on page open
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get("payment")
    const draftId = params.get("draftId")
    if (!draftId || (payment !== "success" && payment !== "return")) return
    if (payment === "success") {
      toast.success("Оплата пакета услуг подтверждена. Продолжите загрузку альбома.")
      return
    }
    toast.info("Оплата не подтверждена или была отменена")
  }, [])

  const formDisabled =
    isSubmitting || isSyncingAlbumAudio || profileCompleteForUpload === false

  const persistAlbumDraft = async (
    data: UploadAlbumFormValues,
    options?: { quiet?: boolean }
  ): Promise<{ draftId: string; draftStatus: UploadDraftStatus | null } | null> => {
    const quiet = options?.quiet === true
    const currentDraftId = activeDraftIdRef.current
    const fail = (message: string) => {
      toast.error(message)
    }
    const draftTracks: AlbumDraftTrackPayload[] = data.tracks.map((track) => ({
      tempId: track.tempId || generateAlbumTrackTempId(),
      trackName: track.trackName,
      genre: track.genre,
      mood: track.mood,
      shortDescription: track.shortDescription ?? "",
      lyricsText: track.lyricsText ?? "",
      lyricsAuthor: track.lyricsAuthor ?? "",
      musicAuthor: track.musicAuthor ?? "",
      musicRights: track.musicRights,
      musicAiService: track.musicAiService?.trim() ?? "",
      isInstrumental: track.isInstrumental,
      lyricsRights: track.lyricsRights,
      performanceRights: track.performanceRights,
      audioRelPath: track.audioRelPath || undefined,
    }))

    const draftPayload = {
      albumTitle: data.albumTitle,
      albumArtistName: data.albumArtistName,
      labelName: data.labelName?.trim() || DEFAULT_RELEASE_LABEL_NAME,
      releaseDate: data.releaseDate ? format(data.releaseDate, "yyyy-MM-dd") : undefined,
      albumTracks: draftTracks,
      requestAiCover: false,
      addons: {
        trackCover: { enabled: data.requestAiCover, trackTitle: data.albumTitle },
        verticalVideo: { enabled: addonVerticalVideo, videosCount: addonVerticalVideoCount, trackTitle: data.albumTitle },
        aiMastering: { enabled: addonAiMastering, tracksCount: addonAiMasteringCount, trackTitles: data.tracks.map((t) => t.trackName) },
        yandexVideoshot: { enabled: addonYandexVideoshot, trackTitle: data.albumTitle },
        yandexVideoshotCreation: { enabled: addonYandexVideoshotCreation, trackTitle: data.albumTitle },
        yandexVideoavatar: { enabled: addonYandexVideoavatar, trackTitle: data.albumTitle },
        spotifyVideoshot: { enabled: addonSpotifyVideoshot, trackTitle: data.albumTitle },
      },
    }

    if (!quiet) setUploadStepLabel("Сохранение черновика альбома…")
    const draftForm = new FormData()
    if (!currentDraftId) draftForm.append("kind", "album")
    draftForm.append("payload", JSON.stringify(draftPayload))
    if (!data.requestAiCover && data.cover?.[0]) {
      draftForm.append("cover", data.cover[0])
    }

    const draftRes = await fetchAlbumDraftWithTimeout(
      currentDraftId ? `/api/cabinet/upload-drafts/${encodeURIComponent(currentDraftId)}` : "/api/cabinet/upload-drafts",
      {
        method: currentDraftId ? "PATCH" : "POST",
        credentials: "include",
        body: draftForm,
      },
      ALBUM_AUDIO_SYNC_TIMEOUT_MS
    )

    if (draftRes.status === 401) {
      router.replace("/cabinet")
      return null
    }
    if (draftRes.status === 403) {
      const err = await draftRes.json().catch(() => ({}))
      const errObj = err as { error?: string; errorCode?: string }
      if (errObj.errorCode === PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE) {
        setProfileCompleteForUpload(false)
      }
      fail(
        errObj.errorCode === PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE
          ? errObj.error || "Заполните профиль"
          : errObj.error ||
              (subscriptionExpired
                ? SUBSCRIPTION_EXPIRED_MESSAGE
                : getSubscriptionLimitMessage(trackLimit ?? 0))
      )
      return null
    }
    if (!draftRes.ok) {
      const err = await draftRes.json().catch(() => ({}))
      fail((err as { error?: string }).error || "Не удалось сохранить черновик альбома")
      return null
    }

    const draftData = await draftRes.json()
    const draftId = (draftData?.draft?.id as string | undefined) ?? currentDraftId ?? undefined
    if (!draftId) {
      fail("Черновик альбома не создан")
      return null
    }
    if (draftData?.draft?.coverRelPath) {
      form.setValue("serverDraftHasCover", true)
      form.setValue("cover", undefined)
    }
    const draftStatus = (draftData?.draft?.status as UploadDraftStatus | undefined) ?? null
    if (draftStatus) {
      setActiveDraftStatus(draftStatus)
    }
    activeDraftIdRef.current = draftId
    if (activeDraftId !== draftId) {
      setActiveDraftId(draftId)
      rememberDraftIdInUrl(draftId)
    }

    const uploadOneTrackAudio = async (i: number) => {
      const localAudioFile = data.tracks[i]?.audio?.[0] as File | undefined
      if (!localAudioFile) return
      const tempId = draftTracks[i]?.tempId
      if (!tempId) {
        throw { kind: "missing" as const, trackIndex: i + 1 }
      }
      const audioForm = new FormData()
      audioForm.append("tempId", tempId)
      audioForm.append("audio", localAudioFile)
      const audioRes = await fetchAlbumDraftWithTimeout(
        `/api/cabinet/upload-drafts/${encodeURIComponent(draftId)}/album-audio`,
        {
          method: "POST",
          body: audioForm,
          credentials: "include",
        },
        ALBUM_AUDIO_SYNC_TIMEOUT_MS
      )
      if (audioRes.status === 401) throw { kind: "auth" as const }
      if (!audioRes.ok) {
        const err = await audioRes.json().catch(() => ({}))
        throw {
          kind: "upload" as const,
          message: (err as { error?: string }).error || `Ошибка загрузки аудио (трек ${i + 1})`,
        }
      }
      const audioJson = await audioRes.json()
      const rel = `${audioJson?.audioRelPath ?? ""}`
      form.setValue(`tracks.${i}.audio`, undefined)
      form.setValue(`tracks.${i}.serverDraftHasAudio`, true)
      form.setValue(`tracks.${i}.audioRelPath`, rel)
    }

    const total = data.tracks.length
    for (let batchStart = 0; batchStart < total; batchStart += ALBUM_AUDIO_UPLOAD_CONCURRENCY) {
      const batchEnd = Math.min(batchStart + ALBUM_AUDIO_UPLOAD_CONCURRENCY, total)
      if (!quiet) setUploadStepLabel(`Загрузка аудио: треки ${batchStart + 1}–${batchEnd} из ${total}…`)
      try {
        await Promise.all(
          Array.from({ length: batchEnd - batchStart }, (_, k) => uploadOneTrackAudio(batchStart + k))
        )
      } catch (e: unknown) {
        if (e && typeof e === "object" && "kind" in e) {
          const err = e as { kind: string; trackIndex?: number; message?: string }
          if (err.kind === "auth") {
            router.replace("/cabinet")
            return null
          }
          if (err.kind === "missing" && err.trackIndex != null) {
            fail(`Не удалось сопоставить аудио для трека ${err.trackIndex}`)
            return null
          }
          if (err.kind === "upload" && err.message) {
            fail(err.message)
            return null
          }
        }
        if (e instanceof Error && e.message.trim()) {
          if (/failed to fetch/i.test(e.message)) {
            fail(albumAudioValidationText.failedToFetch)
            return null
          }
          fail(`Ошибка при загрузке аудио: ${e.message}`)
          return null
        }
        if (typeof e === "string" && e.trim()) {
          fail(`Ошибка при загрузке аудио: ${e}`)
          return null
        }
        fail("Ошибка при загрузке аудио. Проверьте формат WAV (44.1 kHz, 16/24 bit, stereo).")
        return null
      }
    }

    return { draftId, draftStatus }
  }

  const syncAlbumTrackAudioToDraftServer = async (trackIndex: number, file: File) => {
    if (profileCompleteForUpload === false) {
      toast.error("Заполните профиль: ФИО, адрес регистрации и телефон")
      return
    }
    if (albumAudioSyncInFlight.current) return
    albumAudioSyncInFlight.current = true
    setIsSyncingAlbumAudio(true)
    const path = `tracks.${trackIndex}.audio` as FieldPath<UploadAlbumFormValues>
    const trackLabel = () =>
      `${form.getValues(`tracks.${trackIndex}.trackName`)?.trim() || `Трек ${trackIndex + 1}`}`
    try {
      const wavFormatErr = await checkWavFileSampleRateAndBitDepth(file, albumAudioValidationText)
      if (wavFormatErr) {
        form.setError(path, { type: "manual", message: wavFormatErr })
        toast.error(`${trackLabel()}: ${wavFormatErr}`)
        return
      }
      const stereoErr = await checkWavFileIsStereo(file)
      if (stereoErr) {
        form.setError(path, { type: "manual", message: stereoErr })
        toast.error(`${trackLabel()}: ${stereoErr}`)
        return
      }
      const result = await persistAlbumDraft(form.getValues(), { quiet: true })
      if (!result) return
      toast.success("Аудио сохранено в черновик на сервере")
    } catch (e) {
      console.error(e)
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.error("Сохранение аудио заняло слишком много времени. Проверьте соединение.")
      } else {
        toast.error("Ошибка при сохранении аудио")
      }
    } finally {
      albumAudioSyncInFlight.current = false
      setIsSyncingAlbumAudio(false)
    }
  }

  const onSubmit = async (data: UploadAlbumFormValues) => {
    if (profileCompleteForUpload === false) {
      toast.error("Заполните профиль: ФИО, адрес регистрации и телефон")
      return
    }
    const tracksToAdd = data.tracks.length
    if (trackLimit !== null && currentTrackCount + tracksToAdd > trackLimit) {
      if (subscriptionName === "Fix") {
        setPurchaseTracksDialogOpen(true)
      } else {
        setSubscriptionLimitDialogOpen(true)
      }
      return
    }
    for (let i = 0; i < data.tracks.length; i++) {
      const wav = data.tracks[i]?.audio?.[0] as File | undefined
      if (!wav) continue
      const wavFormatErr = await checkWavFileSampleRateAndBitDepth(wav, albumAudioValidationText)
      if (wavFormatErr) {
        const path = `tracks.${i}.audio` as FieldPath<UploadAlbumFormValues>
        form.setError(path, { type: "manual", message: wavFormatErr })
        toast.error(`${data.tracks[i].trackName}: ${wavFormatErr}`)
        return
      }
      const stereoErr = await checkWavFileIsStereo(wav)
      if (stereoErr) {
        const path = `tracks.${i}.audio` as FieldPath<UploadAlbumFormValues>
        form.setError(path, { type: "manual", message: stereoErr })
        toast.error(`${data.tracks[i].trackName}: ${stereoErr}`)
        return
      }
    }
    setIsSubmitting(true)
    setUploadStepLabel(null)
    try {
      const persisted = await persistAlbumDraft(data)
      if (!persisted) return
      const { draftId, draftStatus } = persisted
      const currentStatus = `${draftStatus ?? ""}`
      if (currentStatus === "awaiting_payment") {
        setActiveDraftStatus("awaiting_payment")
        const paymentRes = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draftId)}/payment/create`, {
          method: "POST",
          credentials: "include",
        })
        const paymentData = await paymentRes.json()
        if (!paymentRes.ok) {
          toast.error(paymentData.error || "Не удалось создать оплату")
          return
        }
        if (typeof paymentData.paymentUrl === "string" && paymentData.paymentUrl.trim()) {
          window.location.href = paymentData.paymentUrl as string
          return
        }
        if (!paymentData.skippedPayment) {
          toast.error("Не удалось создать оплату")
          return
        }
      }

      setUploadStepLabel("Проверка файлов и завершение…")
      const finalizeRes = await fetch(`/api/cabinet/upload-drafts/${encodeURIComponent(draftId)}/finalize`, {
        method: "POST",
        credentials: "include",
      })

      if (finalizeRes.status === 401) {
        router.replace("/cabinet")
        return
      }
      if (!finalizeRes.ok) {
        const err = await finalizeRes.json().catch(() => ({}))
        const errObj = err as { error?: string; errorCode?: string }
        if (finalizeRes.status === 403 && errObj.errorCode === PROFILE_INCOMPLETE_UPLOAD_ERROR_CODE) {
          setProfileCompleteForUpload(false)
        }
        toast.error(
          errObj.error ||
            "Не удалось завершить загрузку. Проверьте формат WAV (44.1 kHz, 16 или 24 bit) у всех треков."
        )
        return
      }

      toast.success("Альбом успешно загружен")
      router.push("/cabinet")
    } catch (error) {
      console.error("Upload album error:", error)
      toast.error("Ошибка при загрузке альбома")
    } finally {
      setUploadStepLabel(null)
      setIsSubmitting(false)
    }
  }

  const handleSaveDraftClick = async () => {
    if (profileCompleteForUpload === false) {
      toast.error("Заполните профиль: ФИО, адрес регистрации и телефон")
      return
    }
    setIsSavingDraft(true)
    setUploadStepLabel(null)
    try {
      const persisted = await persistAlbumDraft(form.getValues())
      if (!persisted) return
      toast.success("Черновик альбома сохранен")
    } catch (error) {
      console.error("Save album draft error:", error)
      toast.error("Не удалось сохранить черновик альбома")
    } finally {
      setUploadStepLabel(null)
      setIsSavingDraft(false)
    }
  }

  useEffect(() => {
    if (!hasDraftLossRisk) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [hasDraftLossRisk])

  const handleCancelClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!hasDraftLossRisk) return
    const confirmed = window.confirm("Есть несинхронизированные изменения. Всё равно выйти со страницы?")
    if (!confirmed) {
      event.preventDefault()
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cabinet">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Загрузить альбом</h1>
            <p className="text-muted-foreground text-sm">
              Несколько треков с одной общей обложкой. WAV до 80 MB каждый, обложка JPEG/PNG до 20 MB.
            </p>
          </div>
        </div>

        {profileCompleteForUpload === false ? <CabinetUploadProfileGateBanner /> : null}
        {profileCompleteForUpload !== false && activeDraftId ? (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Черновик. Изменения сохраняются автоматически.
          </div>
        ) : null}
        {profileCompleteForUpload !== false && activeDraftId && activeDraftStatus === "awaiting_payment" ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-amber-200">
                Черновик ожидает оплату дополнительных услуг. После оплаты отправьте альбом на модерацию.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPayingDraft || isSubmitting || isSyncingAlbumAudio}
                onClick={() => void handlePayDraftServices()}
              >
                {isPayingDraft ? "Переход к оплате..." : "Оплатить услуги"}
              </Button>
            </div>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="albumTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название альбома *</FormLabel>
                    <FormControl>
                      <Input placeholder="Название альбома" disabled={formDisabled} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="albumArtistName"
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                name="cover"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      Обложка альбома (JPEG/PNG, до 20 MB)
                      {!watchedRequestAiCover ? " *" : ""}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        disabled={formDisabled || watchedRequestAiCover}
                        onChange={(e) => {
                          onChange(e.target.files)
                          form.clearErrors("cover")
                          const hasCoverFile = Boolean(e.target.files?.[0])
                          if (hasCoverFile) {
                            form.setValue("serverDraftHasCover", false)
                          }
                        }}
                        {...field}
                      />
                    </FormControl>
                    {form.watch("serverDraftHasCover") && !watchedRequestAiCover ? (
                      <p className="text-xs text-muted-foreground">Обложка уже сохранена в черновике</p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Треки альбома</h2>

              {fields.map((fieldItem, index) => (
                <div
                  key={fieldItem.id}
                  className="rounded-lg border p-4 space-y-4 bg-card"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Трек {index + 1}
                    </span>
                    {fields.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={formDisabled}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name={`tracks.${index}.trackName`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Название трека *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Название трека"
                              disabled={formDisabled}
                              className="w-full"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.isInstrumental`}
                        render={({ field }) => (
                          <FormItem className="flex w-full flex-col">
                            <FormLabel>Это инструментал *</FormLabel>
                            <Select
                              value={field.value ? "yes" : "no"}
                              onValueChange={(value) => {
                                const isInstrumental = value === "yes"
                                field.onChange(isInstrumental)
                                if (isInstrumental) {
                                  form.setValue(`tracks.${index}.lyricsText`, "")
                                  form.setValue(`tracks.${index}.lyricsAuthor`, "")
                                  form.setValue(`tracks.${index}.performanceRights`, "")
                                  form.setValue(`tracks.${index}.lyricsRights`, "")
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
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.genre`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Жанр *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={formDisabled}
                            >
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
                        name={`tracks.${index}.mood`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Настроение трека *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={formDisabled}
                            >
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
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name={`tracks.${index}.shortDescription`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Краткое описание трека *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Кратко опишите трек (до 500 символов)"
                              disabled={formDisabled}
                              rows={2}
                              className="min-h-[2.5rem] w-full resize-y"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`tracks.${index}.audio`}
                      render={({ field: { onChange, value, ...field } }) => (
                        <FormItem className="w-full">
                          <FormLabel>
                            Аудио (WAV, до 80 MB)
                            {!form.watch(`tracks.${index}.serverDraftHasAudio`) ? " *" : ""}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".wav,audio/wav"
                              disabled={formDisabled}
                              className="w-full"
                              onChange={(e) => {
                                const files = e.target.files
                                onChange(files)
                                const path = `tracks.${index}.audio` as FieldPath<UploadAlbumFormValues>
                                form.clearErrors(path)
                                const f = files?.[0]
                                if (!f?.name.toLowerCase().endsWith(".wav")) return
                                form.setValue(`tracks.${index}.serverDraftHasAudio`, false)
                                form.setValue(`tracks.${index}.audioRelPath`, "")
                                void syncAlbumTrackAudioToDraftServer(index, f)
                              }}
                              {...field}
                            />
                          </FormControl>
                          {form.watch(`tracks.${index}.serverDraftHasAudio`) ? (
                            <p className="text-xs text-muted-foreground">WAV уже сохранён в черновике</p>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4">
                    {!form.watch(`tracks.${index}.isInstrumental`) && (
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.lyricsAuthor`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Автор слов *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Полное ФИО (без сокращений)"
                                disabled={formDisabled}
                                className="w-full"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name={`tracks.${index}.musicAuthor`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Автор музыки *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Полное ФИО (без сокращений)"
                              disabled={formDisabled}
                              className="w-full"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div
                      className={cn(
                        "grid gap-4",
                        !form.watch(`tracks.${index}.isInstrumental`) && "md:grid-cols-2"
                      )}
                    >
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.musicRights`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Права на музыку *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value)
                                if (!musicRightsRequiresAiService(value)) {
                                  form.setValue(`tracks.${index}.musicAiService`, "")
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
                      {!form.watch(`tracks.${index}.isInstrumental`) && (
                        <FormField
                          control={form.control}
                          name={`tracks.${index}.lyricsRights`}
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>Права на текст *</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange} disabled={formDisabled}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
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
                      )}
                    </div>
                    {musicRightsRequiresAiService(
                      form.watch(`tracks.${index}.musicRights`) ?? ""
                    ) && (
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.musicAiService`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Название/ссылка на ИИ сервис *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Например: Suno, Udio, ссылка на сервис"
                                disabled={formDisabled}
                                className="w-full"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {!form.watch(`tracks.${index}.isInstrumental`) && (
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.performanceRights`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel>Права на исполнение *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange} disabled={formDisabled}>
                              <FormControl>
                                <SelectTrigger className="w-full">
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
                    )}
                  </div>

                  {!form.watch(`tracks.${index}.isInstrumental`) && (
                    <>
                      <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm">
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
                        name={`tracks.${index}.lyricsText`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Текст песни *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Вставьте полный текст песни (до 5000 символов)"
                                disabled={formDisabled}
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              ))}

              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (trackLimit !== null && currentTrackCount + fields.length >= trackLimit) {
                      if (subscriptionName === "Fix") {
                        setPurchaseTracksDialogOpen(true)
                      } else {
                        setSubscriptionLimitDialogOpen(true)
                      }
                      return
                    }
                    append(createEmptyAlbumTrack())
                  }}
                  disabled={formDisabled}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить трек
                </Button>
              </div>
            </div>

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
                  <p className="text-xs text-muted-foreground">Доступно в тарифе Label</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CabinetUploadAdditionalServicesSection
              formDisabled={formDisabled}
              afterPaymentSubject="альбом"
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
                          id="cabinet-album-upload-ai-cover"
                          className="mt-0.5 shrink-0"
                          checked={field.value}
                          onCheckedChange={(c) => {
                            const on = c === true
                            field.onChange(on)
                            if (on) {
                              form.setValue("cover", undefined)
                              form.clearErrors("cover")
                              form.setValue("serverDraftHasCover", false)
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
                <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border border-border p-4">
                  <FormControl>
                    <Checkbox
                      id="cabinet-album-upload-consent-offer"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                      disabled={formDisabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-snug">
                    <FormLabel
                      htmlFor="cabinet-album-upload-consent-offer"
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

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={formDisabled || isSavingDraft}
                onClick={() => void handleSaveDraftClick()}
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
              <Button type="submit" className="flex-1" disabled={formDisabled}>
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    {uploadStepLabel ?? "Загрузка…"}
                  </>
                ) : isSyncingAlbumAudio ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Сохранение аудио…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {activeDraftId ? "Отправить на модерацию" : "Загрузить альбом"}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting || isSyncingAlbumAudio} asChild>
                <Link href="/cabinet" onClick={handleCancelClick}>Отмена</Link>
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
        {isSubmitting || isSyncingAlbumAudio ? (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm">
            <div className="flex h-full w-full items-center justify-center p-4">
              <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-lg">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Spinner className="h-6 w-6 text-primary" />
                </div>
                <p className="text-base font-semibold">
                  {isSubmitting ? "Загружаем альбом" : "Сохраняем аудио в черновик"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Пожалуйста, не закрывайте страницу до завершения.
                </p>
                {isSubmitting && uploadStepLabel ? (
                  <p className="mt-3 text-xs text-muted-foreground">{uploadStepLabel}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

