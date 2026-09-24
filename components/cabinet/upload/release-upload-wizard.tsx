"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CalendarIcon,
  Check,
  ChevronLeft,
  CreditCard,
  GripVertical,
  Pause,
  Play,
  Save,
  Trash2,
  Upload,
  AlertCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { isReleaseDateWeekend } from "@/lib/release-date-validation"
import {
  getEarliestAvailableReleaseDate,
  getReleaseDateCalendarTier,
  getReleaseDateTier,
  getReleaseDateTierPriceRub,
  isReleaseDateSelectable,
  isShortReleaseDate,
  RELEASE_DATE_TIER_LABEL,
  RELEASE_DATE_TIER_PRICE_RUB,
} from "@/lib/release-date-tiers"
import {
  COVER_HEIC_ERROR,
  COVER_REQUIRED_PX,
  formatCabinetUploadFailure,
  isHeicCoverFile,
  isLikelyCoverImage,
  isLikelyWavFile,
  parseCabinetApiJson,
  validateCoverFileClient,
} from "@/lib/cabinet-upload-client"
import {
  CabinetUploadAdditionalServicesSection,
  computeSelectedUploadAddonsTotalRub,
} from "@/components/cabinet-upload-additional-services-section"
import { CabinetUploadAiCoverInfoDialog } from "@/components/cabinet-upload-ai-cover-info-dialog"
import type { Release, ReleaseKind } from "@/lib/releases"
import {
  COVER_AI_LEVEL_LABELS,
  COVER_AI_LEVELS,
  type CoverAiLevel,
} from "@/lib/cover-ai-level"
import type { Track } from "@/lib/tracks"
import {
  AI_COVER_REQUEST_PRICE_RUB,
  normalizeStreamingScope,
  type TrackStreamingScope,
} from "@/lib/track-constants"
import {
  StreamingServicesField,
  streamingScopeShortLabel,
} from "@/components/streaming-services-field"
import { validateTrackMetadata } from "@/lib/track-meta-validation"
import { ReleaseUploadStepper, WIZARD_STEP_COUNT } from "./release-upload-stepper"
import { TrackMetadataFields, type TrackDraftPatch } from "./track-metadata-fields"
import {
  TrackAiLabelingFields,
} from "./track-ai-labeling-fields"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  aiLabelingModeLabel,
  validateTrackAiLabeling,
} from "@/lib/track-ai-labeling"
import { CabinetUploadProfileGateBanner } from "@/components/cabinet-upload-profile-gate-banner"
import { uploadReleaseTrackAudio } from "@/lib/cabinet-release-audio-upload"

type AudioUploadItem = {
  id: string
  fileName: string
  progress: number
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

type WizardProps = {
  releaseId?: string
}

export function ReleaseUploadWizard({ releaseId: initialReleaseId }: WizardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepFromUrl = Number(searchParams.get("step") ?? "1")
  const [releaseId, setReleaseId] = useState<string | undefined>(initialReleaseId)
  const [release, setRelease] = useState<Release | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [step, setStep] = useState(Math.min(WIZARD_STEP_COUNT, Math.max(1, stepFromUrl)))
  const [maxStep, setMaxStep] = useState(step)
  const [loading, setLoading] = useState(Boolean(initialReleaseId))
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [profileCompleteForUpload, setProfileCompleteForUpload] = useState<boolean | null>(null)
  const [uploadQueue, setUploadQueue] = useState<AudioUploadItem[]>([])

  const [kind, setKind] = useState<ReleaseKind>("single")
  const [title, setTitle] = useState("")
  const [artistName, setArtistName] = useState("")
  const [releaseDate, setReleaseDate] = useState<Date | undefined>()
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => getEarliestAvailableReleaseDate())
  const [upc, setUpc] = useState("")
  const [streamingScope, setStreamingScope] = useState<TrackStreamingScope>("all")
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [consentOffer, setConsentOffer] = useState(false)

  const [requestAiCover, setRequestAiCover] = useState(false)
  const [aiCoverComment, setAiCoverComment] = useState("")
  const [aiCoverInfoOpen, setAiCoverInfoOpen] = useState(false)
  const [coverCreatedWithAi, setCoverCreatedWithAi] = useState<CoverAiLevel | null>(null)
  const [acceptShortReleaseDate, setAcceptShortReleaseDate] = useState(false)

  const earliestAvailableDate = useMemo(() => getEarliestAvailableReleaseDate(), [])
  const selectedReleaseTier = releaseDate ? getReleaseDateTier(releaseDate) : null
  const showShortDateRisk = Boolean(releaseDate && isShortReleaseDate(releaseDate))
  const [addonVerticalVideo, setAddonVerticalVideo] = useState(false)
  const [addonVerticalVideoCount, setAddonVerticalVideoCount] = useState(1)
  const [addonVerticalVideoComment, setAddonVerticalVideoComment] = useState("")
  const [addonAiMastering, setAddonAiMastering] = useState(false)
  const [addonAiMasteringCount, setAddonAiMasteringCount] = useState(1)
  const [addonYandexVideoshot, setAddonYandexVideoshot] = useState(false)
  const [addonYandexVideoshotCreation, setAddonYandexVideoshotCreation] = useState(false)
  const [addonYandexVideoavatar, setAddonYandexVideoavatar] = useState(false)
  const [addonSpotifyVideoshot, setAddonSpotifyVideoshot] = useState(false)

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [metaAccordionOpen, setMetaAccordionOpen] = useState<string[]>([])
  const [aiLabelingAccordionOpen, setAiLabelingAccordionOpen] = useState<string[]>([])
  const [dragTrackIndex, setDragTrackIndex] = useState<number | null>(null)
  const [dragOverTrackIndex, setDragOverTrackIndex] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioSeekingRef = useRef(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const tracksRef = useRef(tracks)
  const streamingScopeRef = useRef(streamingScope)
  const trackSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const trackSaveChainsRef = useRef<Record<string, Promise<boolean>>>({})

  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  useEffect(() => {
    streamingScopeRef.current = streamingScope
  }, [streamingScope])

  const paymentTotal = useMemo(() => {
    const addonsRub = computeSelectedUploadAddonsTotalRub({
      requestAiCover,
      addonVerticalVideo,
      addonVerticalVideoCount,
      addonAiMastering,
      addonAiMasteringCount,
      addonYandexVideoshot,
      addonYandexVideoshotCreation,
      addonYandexVideoavatar,
      addonSpotifyVideoshot,
    })
    const releaseDateRub = releaseDate ? getReleaseDateTierPriceRub(releaseDate) : 0
    return addonsRub + releaseDateRub
  }, [
    requestAiCover,
    addonVerticalVideo,
    addonVerticalVideoCount,
    addonAiMastering,
    addonAiMasteringCount,
    addonYandexVideoshot,
    addonYandexVideoshotCreation,
    addonYandexVideoavatar,
    addonSpotifyVideoshot,
    releaseDate,
  ])

  const isUploadingAudio = uploadQueue.some((item) => item.status === "pending" || item.status === "uploading")
  const formDisabled = saving || submitting || isUploadingAudio || profileCompleteForUpload === false

  const trackIdsKey = tracks.map((t) => t.id).join(",")

  useEffect(() => {
    if (step !== 3) return
    const ids = trackIdsKey ? trackIdsKey.split(",") : []
    setMetaAccordionOpen((prev) => {
      const idSet = new Set(ids)
      const kept = prev.filter((id) => idSet.has(id))
      if (kept.length > 0) return kept
      return ids[0] ? [ids[0]] : []
    })
  }, [step, trackIdsKey])

  useEffect(() => {
    if (step !== 4) return
    const ids = trackIdsKey ? trackIdsKey.split(",") : []
    setAiLabelingAccordionOpen((prev) => {
      const idSet = new Set(ids)
      const kept = prev.filter((id) => idSet.has(id))
      if (kept.length > 0) return kept
      return ids[0] ? [ids[0]] : []
    })
  }, [step, trackIdsKey])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/user", { credentials: "include" })
        if (!res.ok) {
          setProfileCompleteForUpload(false)
          return
        }
        const data = (await res.json()) as { user?: { profileCompleteForUpload?: boolean } }
        setProfileCompleteForUpload(data.user?.profileCompleteForUpload === true)
      } catch {
        setProfileCompleteForUpload(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!isUploadingAudio) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isUploadingAudio])

  const syncFromRelease = useCallback((r: Release, t: Track[]) => {
    setRelease(r)
    setTracks(t)
    setKind(r.kind)
    setTitle(r.title)
    setArtistName(r.artistName)
    setUpc(r.upc ?? "")
    setStreamingScope(normalizeStreamingScope(t[0]?.streamingScope))
    const loadedDate = r.releaseDate ? new Date(r.releaseDate) : undefined
    setReleaseDate(loadedDate)
    if (loadedDate) setCalendarMonth(loadedDate)
    setRequestAiCover(r.requestAiCover)
    setCoverCreatedWithAi(r.coverCreatedWithAi ?? null)
    setAcceptShortReleaseDate(r.acceptShortReleaseDate === true)
    const a = r.addons
    setAiCoverComment(a?.trackCover?.comment ?? "")
    setAddonVerticalVideo(Boolean(a?.verticalVideo?.enabled))
    setAddonVerticalVideoCount(Number(a?.verticalVideo?.videosCount ?? 1))
    setAddonVerticalVideoComment(a?.verticalVideo?.comment ?? "")
    setAddonAiMastering(Boolean(a?.aiMastering?.enabled))
    setAddonAiMasteringCount(Number(a?.aiMastering?.tracksCount ?? 1))
    setAddonYandexVideoshot(Boolean(a?.yandexVideoshot?.enabled))
    setAddonYandexVideoshotCreation(Boolean(a?.yandexVideoshotCreation?.enabled))
    setAddonYandexVideoavatar(Boolean(a?.yandexVideoavatar?.enabled))
    setAddonSpotifyVideoshot(Boolean(a?.spotifyVideoshot?.enabled))
    if (r.coverPath && r.id) {
      setCoverPreview(`/api/cabinet/releases/${r.id}/cover?t=${Date.now()}`)
    }
    setMaxStep((prev) => Math.max(prev, r.wizardStep))
  }, [])

  const loadRelease = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cabinet/releases/${id}`, { credentials: "include" })
      const data = await parseCabinetApiJson<{ release?: Release; tracks?: Track[] }>(res)
      if (!res.ok || !data.release) {
        toast.error(data.error ?? "Релиз не найден")
        router.push("/cabinet/upload")
        return
      }
      syncFromRelease(data.release, data.tracks ?? [])
    } finally {
      setLoading(false)
    }
  }, [router, syncFromRelease])

  useEffect(() => {
    if (initialReleaseId) {
      setReleaseId(initialReleaseId)
      void loadRelease(initialReleaseId)
    }
  }, [initialReleaseId, loadRelease])

  useEffect(() => {
    const payment = searchParams.get("payment")
    if (payment === "return" && releaseId && step === 6) {
      void (async () => {
        const res = await fetch(`/api/cabinet/releases/${releaseId}/submit`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        const data = await parseCabinetApiJson(res)
        if (res.ok) {
          toast.success("Оплата получена, релиз отправлен на модерацию")
          router.push("/cabinet/music/releases")
        } else if (data.error?.includes("оплатите")) {
          toast.message("Ожидаем подтверждение оплаты…")
        }
      })()
    }
    if (payment === "fail") {
      toast.error("Оплата не завершена")
    }
  }, [searchParams, releaseId, step, router])

  useEffect(() => {
    const s = Math.min(WIZARD_STEP_COUNT, Math.max(1, stepFromUrl))
    setStep(s)
    setMaxStep((prev) => Math.max(prev, s))
  }, [stepFromUrl])

  const goToStep = (next: number) => {
    if (isUploadingAudio) {
      toast.error("Дождитесь завершения загрузки аудио")
      return
    }
    const clamped = Math.min(WIZARD_STEP_COUNT, Math.max(1, next))
    setStep(clamped)
    setMaxStep((prev) => Math.max(prev, clamped))
    const base = releaseId ? `/cabinet/upload/${releaseId}` : "/cabinet/upload"
    router.replace(`${base}?step=${clamped}`, { scroll: false })
  }

  const buildReleasePatch = () => ({
    kind,
    title,
    artistName,
    releaseDate: releaseDate ? format(releaseDate, "yyyy-MM-dd") : null,
    upc: upc || null,
    wizardStep: step,
    requestAiCover,
    coverCreatedWithAi,
    acceptShortReleaseDate: showShortDateRisk ? acceptShortReleaseDate : false,
    addons: {
      trackCover: requestAiCover
        ? {
            enabled: true,
            comment: aiCoverComment.trim() || undefined,
            trackTitle: title.trim() || undefined,
          }
        : undefined,
      verticalVideo: addonVerticalVideo
        ? {
            enabled: true,
            videosCount: addonVerticalVideoCount,
            comment: addonVerticalVideoComment.trim() || undefined,
            trackTitle: title.trim() || undefined,
          }
        : undefined,
      aiMastering: addonAiMastering
        ? { enabled: true, tracksCount: addonAiMasteringCount }
        : undefined,
      yandexVideoshot: addonYandexVideoshot ? { enabled: true } : undefined,
      yandexVideoshotCreation: addonYandexVideoshotCreation ? { enabled: true } : undefined,
      yandexVideoavatar: addonYandexVideoavatar ? { enabled: true } : undefined,
      spotifyVideoshot: addonSpotifyVideoshot ? { enabled: true } : undefined,
    },
  })

  const buildTrackMetadataPatch = (track: Track): TrackDraftPatch => ({
    trackName: track.trackName,
    trackVersion: track.trackVersion,
    genre: track.genre,
    mood: track.mood,
    shortDescription: track.shortDescription,
    lyricsText: track.lyricsText,
    lyricsLanguage: track.lyricsLanguage,
    lyricsAuthor: track.lyricsAuthor,
    musicAuthor: track.musicAuthor,
    musicRights: track.musicRights,
    musicAiService: track.musicAiService,
    lyricsRights: track.lyricsRights,
    performanceRights: track.performanceRights,
    isInstrumental: track.isInstrumental,
    hasExplicitLanguage: track.hasExplicitLanguage,
    backingAuthor: track.backingAuthor,
    isrc: track.isrc,
    transferFromOtherDistributor: track.transferFromOtherDistributor,
    previousDistributor: track.previousDistributor,
    aiLabeling: track.aiLabeling ?? null,
    streamingScope: streamingScopeRef.current,
    tiktokSoundStartSec: track.tiktokSoundStartSec ?? 0,
  })

  const persistTrackMetadata = (trackId: string): Promise<boolean> => {
    if (!releaseId) return Promise.resolve(false)

    const prev = trackSaveChainsRef.current[trackId] ?? Promise.resolve(true)
    const next = prev
      .catch(() => true)
      .then(async () => {
        const track = tracksRef.current.find((t) => t.id === trackId)
        if (!track || !releaseId) return false
        const res = await fetch(`/api/cabinet/releases/${releaseId}/tracks/${trackId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildTrackMetadataPatch(track)),
        })
        return res.ok
      })

    trackSaveChainsRef.current[trackId] = next
    return next
  }

  /** Сбрасывает отложенные автосохранения и пишет актуальные метаданные всех треков. */
  const flushTrackMetadataSaves = async (): Promise<boolean> => {
    for (const timer of Object.values(trackSaveTimersRef.current)) {
      clearTimeout(timer)
    }
    trackSaveTimersRef.current = {}
    const list = tracksRef.current
    if (!releaseId || list.length === 0) return true
    const results = await Promise.all(list.map((track) => persistTrackMetadata(track.id)))
    return results.every(Boolean)
  }

  const saveDraft = async (silent = false): Promise<boolean> => {
    let id = releaseId
    if (!id) {
      if (!requestAiCover) {
        if (!silent) toast.error("Сначала загрузите обложку — черновик создастся автоматически")
        return false
      }
      setSaving(true)
      try {
        const createdId = await createDraftWithoutCover()
        if (!createdId) return false
        id = createdId
      } finally {
        setSaving(false)
      }
    }
    setSaving(true)
    try {
      const tracksOk = await flushTrackMetadataSaves()
      if (!tracksOk) {
        toast.error("Не удалось сохранить данные треков")
        return false
      }

      const res = await fetch(`/api/cabinet/releases/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildReleasePatch()),
      })
      const data = await parseCabinetApiJson<{ release?: Release }>(res)
      if (!res.ok || !data.release) {
        toast.error(data.error ?? "Не удалось сохранить")
        return false
      }
      setRelease(data.release)
      if (!silent) toast.success("Черновик сохранён")
      return true
    } finally {
      setSaving(false)
    }
  }

  const handleCoverFile = async (file: File) => {
    if (profileCompleteForUpload === false) {
      toast.error("Заполните обязательные поля в профиле")
      return
    }
    if (isHeicCoverFile(file)) {
      toast.error(COVER_HEIC_ERROR)
      return
    }
    if (!isLikelyCoverImage(file)) {
      toast.error("Обложка должна быть JPEG или PNG")
      return
    }
    const clientErr = await validateCoverFileClient(file)
    if (clientErr) {
      toast.error(clientErr)
      return
    }

    const preview = URL.createObjectURL(file)
    setCoverPreview(preview)

    const fd = new FormData()
    fd.append("kind", kind)
    fd.append("title", title)
    fd.append("artistName", artistName)
    if (releaseDate) fd.append("releaseDate", format(releaseDate, "yyyy-MM-dd"))
    if (upc) fd.append("upc", upc)
    if (requestAiCover) fd.append("requestAiCover", "true")
    if (coverCreatedWithAi) fd.append("coverCreatedWithAi", coverCreatedWithAi)
    if (acceptShortReleaseDate) fd.append("acceptShortReleaseDate", "true")
    fd.append("cover", file)

    setSaving(true)
    try {
      const url = releaseId
        ? `/api/cabinet/releases/${releaseId}/cover`
        : "/api/cabinet/releases"
      const res = await fetch(url, { method: "POST", credentials: "include", body: fd })
      const data = await parseCabinetApiJson<{ release?: Release }>(res)
      if (!res.ok || !data.release) {
        toast.error(formatCabinetUploadFailure(data.error, "Не удалось загрузить обложку", "cover"))
        return
      }
      if (!releaseId) {
        setReleaseId(data.release.id)
        router.replace(`/cabinet/upload/${data.release.id}?step=${step}`)
      }
      setRelease(data.release)
      toast.success("Обложка сохранена, черновик создан")
    } finally {
      setSaving(false)
    }
  }

  const handleClearCover = async () => {
    if (formDisabled || !coverPreview) return

    if (coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview)
    }
    setCoverPreview(null)

    if (!releaseId || !release?.coverPath) {
      if (coverInputRef.current) coverInputRef.current.value = ""
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/cabinet/releases/${releaseId}/cover`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await parseCabinetApiJson<{ release?: Release }>(res)
      if (!res.ok || !data.release) {
        toast.error(data.error ?? "Не удалось удалить обложку")
        setCoverPreview(`/api/cabinet/releases/${releaseId}/cover?t=${Date.now()}`)
        return
      }
      setRelease(data.release)
      if (coverInputRef.current) coverInputRef.current.value = ""
      toast.success("Обложка удалена")
    } finally {
      setSaving(false)
    }
  }

  const createDraftWithoutCover = async (): Promise<string | null> => {
    if (profileCompleteForUpload === false) {
      toast.error("Заполните обязательные поля в профиле")
      return null
    }
    const fd = new FormData()
    fd.append("kind", kind)
    fd.append("title", title)
    fd.append("artistName", artistName)
    if (releaseDate) fd.append("releaseDate", format(releaseDate, "yyyy-MM-dd"))
    if (upc) fd.append("upc", upc)
    fd.append("requestAiCover", "true")
    if (coverCreatedWithAi) fd.append("coverCreatedWithAi", coverCreatedWithAi)
    if (acceptShortReleaseDate) fd.append("acceptShortReleaseDate", "true")

    const res = await fetch("/api/cabinet/releases", {
      method: "POST",
      credentials: "include",
      body: fd,
    })
    const data = await parseCabinetApiJson<{ release?: Release }>(res)
    if (!res.ok || !data.release) {
      toast.error(data.error ?? "Не удалось создать черновик")
      return null
    }
    setReleaseId(data.release.id)
    setRelease(data.release)
    setRequestAiCover(true)
    router.replace(`/cabinet/upload/${data.release.id}?step=${step}`)
    return data.release.id
  }

  const handleAudioFiles = async (fileList: FileList | File[]) => {
    if (!releaseId) {
      toast.error(
        requestAiCover
          ? "Сначала нажмите «Далее» на шаге «Основное», чтобы создать черновик"
          : "Сначала заполните основную информацию и загрузите обложку"
      )
      return
    }
    if (profileCompleteForUpload === false) {
      toast.error("Заполните обязательные поля в профиле")
      return
    }

    const wavFiles = Array.from(fileList).filter((f) => isLikelyWavFile(f))
    if (wavFiles.length === 0) {
      toast.error("Выберите файлы в формате WAV")
      return
    }

    if (kind === "single") {
      if (tracks.length >= 1) {
        toast.error("Сингл может содержать только один трек")
        return
      }
      if (wavFiles.length > 1) {
        toast.error("Для сингла можно загрузить только один файл")
        return
      }
    }

    for (const file of wavFiles) {
      if (file.size > 80 * 1024 * 1024) {
        toast.error(`«${file.name}»: размер не должен превышать 80 MB`)
        return
      }
    }

    const queueItems: AudioUploadItem[] = wavFiles.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name.replace(/\.[^.]+$/, "").trim() || file.name,
      progress: 0,
      status: "pending" as const,
    }))
    setUploadQueue((prev) => [...prev, ...queueItems])

    let latestTracks = tracks

    let successCount = 0
    for (let i = 0; i < wavFiles.length; i++) {
      const file = wavFiles[i]
      const queueId = queueItems[i].id

      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === queueId ? { ...item, status: "uploading", progress: 0 } : item
        )
      )

      try {
        const data = await uploadReleaseTrackAudio(releaseId, file, (percent) => {
          setUploadQueue((prev) =>
            prev.map((item) => (item.id === queueId ? { ...item, progress: percent } : item))
          )
        })
        if (data.tracks) {
          latestTracks = data.tracks.map((track) => ({
            ...track,
            streamingScope: streamingScopeRef.current,
          }))
          tracksRef.current = latestTracks
          setTracks(latestTracks)
        } else if (data.track) {
          latestTracks = [
            ...latestTracks,
            { ...data.track, streamingScope: streamingScopeRef.current },
          ]
          tracksRef.current = latestTracks
          setTracks(latestTracks)
        }
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueId ? { ...item, status: "done", progress: 100 } : item
          )
        )
        successCount += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось загрузить аудио"
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueId ? { ...item, status: "error", error: message } : item
          )
        )
        toast.error(message)
      }
    }

    const uploadedCount = successCount
    if (uploadedCount > 0) {
      toast.success(uploadedCount === 1 ? "Аудио загружено" : `Загружено файлов: ${uploadedCount}`)
      void flushTrackMetadataSaves()
    }
  }

  const updateTrackLocal = (trackId: string, patch: TrackDraftPatch) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, ...patch } : t))
    )
    if (!releaseId) return

    // Debounce + полный снимок трека: иначе параллельные PATCH по одному полю затирают друг друга.
    if (trackSaveTimersRef.current[trackId]) {
      clearTimeout(trackSaveTimersRef.current[trackId])
    }
    trackSaveTimersRef.current[trackId] = setTimeout(() => {
      void persistTrackMetadata(trackId).then((ok) => {
        if (!ok) toast.error("Не удалось сохранить поля трека")
      })
    }, 450)
  }

  const applyStreamingScope = (value: TrackStreamingScope) => {
    setStreamingScope(value)
    streamingScopeRef.current = value
    setTracks((prev) => {
      const next = prev.map((t) => ({ ...t, streamingScope: value }))
      tracksRef.current = next
      return next
    })
    if (!releaseId || tracksRef.current.length === 0) return
    for (const timer of Object.values(trackSaveTimersRef.current)) {
      clearTimeout(timer)
    }
    trackSaveTimersRef.current = {}
    void flushTrackMetadataSaves().then((ok) => {
      if (!ok) toast.error("Не удалось сохранить стриминг-сервисы")
    })
  }

  const deleteTrack = async (trackId: string) => {
    if (!releaseId) return
    if (playingTrackId === trackId) stopAudio()
    const res = await fetch(`/api/cabinet/releases/${releaseId}/tracks/${trackId}`, {
      method: "DELETE",
      credentials: "include",
    })
    if (res.ok) {
      setTracks((prev) => prev.filter((t) => t.id !== trackId))
    }
  }

  const persistTrackOrder = async (next: Track[]) => {
    setTracks(next)
    if (!releaseId) return
    const res = await fetch(`/api/cabinet/releases/${releaseId}/tracks/reorder`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackIds: next.map((t) => t.id) }),
    })
    if (!res.ok) {
      toast.error("Не удалось сохранить порядок треков")
      void loadRelease(releaseId)
    }
  }

  const reorderTracksByIndex = async (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= tracks.length || to >= tracks.length) return
    const next = [...tracks]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    await persistTrackOrder(next)
  }

  const moveTrack = async (index: number, direction: -1 | 1) => {
    await reorderTracksByIndex(index, index + direction)
  }

  const formatAudioClock = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return "0:00"
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, "0")}`
  }

  const readAudioDuration = (audio: HTMLAudioElement): number => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration
    try {
      if (audio.seekable.length > 0) {
        const end = audio.seekable.end(audio.seekable.length - 1)
        if (Number.isFinite(end) && end > 0) return end
      }
    } catch {
      // ignore
    }
    return 0
  }

  const syncAudioDuration = (audio: HTMLAudioElement) => {
    const next = readAudioDuration(audio)
    if (next > 0) setAudioDuration(next)
  }

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    setPlayingTrackId(null)
    setIsAudioPlaying(false)
    setAudioTime(0)
    setAudioDuration(0)
  }, [])

  const togglePlay = (trackId: string) => {
    if (!releaseId) return

    if (playingTrackId === trackId && audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause()
        setIsAudioPlaying(false)
      } else {
        void audioRef.current.play().catch(() => toast.error("Не удалось воспроизвести"))
      }
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }

    const audio = new Audio(`/api/cabinet/releases/${releaseId}/audio/${trackId}`)
    audio.preload = "auto"
    audioRef.current = audio
    audioSeekingRef.current = false
    setPlayingTrackId(trackId)
    setIsAudioPlaying(false)
    setAudioTime(0)
    setAudioDuration(0)

    audio.ontimeupdate = () => {
      if (!audioSeekingRef.current) setAudioTime(audio.currentTime)
      syncAudioDuration(audio)
    }
    audio.onloadedmetadata = () => syncAudioDuration(audio)
    audio.ondurationchange = () => syncAudioDuration(audio)
    audio.onloadeddata = () => syncAudioDuration(audio)
    audio.oncanplay = () => syncAudioDuration(audio)
    audio.onended = () => {
      setIsAudioPlaying(false)
      setAudioTime(0)
    }
    audio.onplay = () => setIsAudioPlaying(true)
    audio.onpause = () => setIsAudioPlaying(false)

    void audio.play().catch(() => {
      toast.error("Не удалось воспроизвести")
      stopAudio()
    })
  }

  const seekAudio = (nextTime: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(nextTime)) return
    const duration = readAudioDuration(audio)
    const capped =
      duration > 0
        ? Math.min(Math.max(0, nextTime), duration)
        : Math.max(0, nextTime)
    try {
      audio.currentTime = capped
      setAudioTime(capped)
    } catch {
      toast.error("Перемотка пока недоступна")
    }
  }

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stopAudio()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [stopAudio])

  useEffect(() => {
    if (step !== 2) stopAudio()
  }, [step, stopAudio])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }
    }
  }, [])

  const validateStep1 = (): string | null => {
    if (!title.trim()) return "Укажите название релиза"
    if (!artistName.trim()) return "Укажите имя артиста / название группы"
    if (!releaseDate) return "Укажите дату релиза"
    if (isReleaseDateWeekend(releaseDate)) {
      return "Дата публикации не может приходиться на выходной"
    }
    if (!isReleaseDateSelectable(releaseDate)) {
      return "Дата публикации не может быть в прошлом"
    }
    if (!release?.coverPath && !coverPreview && !requestAiCover) {
      return "Загрузите обложку или закажите AI-обложку"
    }
    if (!coverCreatedWithAi) {
      return "Укажите, создана ли обложка при помощи ИИ"
    }
    if (requestAiCover && aiCoverComment.trim().length < 2) {
      return "Укажите пожелания / комментарий для AI обложки"
    }
    if (isShortReleaseDate(releaseDate) && !acceptShortReleaseDate) {
      return "Подтвердите согласие на короткий срок релиза"
    }
    return null
  }

  const validateStep2 = (): string | null => {
    const min = kind === "album" ? 2 : 1
    if (tracks.length < min) {
      return kind === "album" ? "Загрузите минимум 2 трека" : "Загрузите аудиофайл"
    }
    return null
  }

  const validateStep3 = (): string | null => {
    if (tracks.length === 0) return "Сначала загрузите треки на шаге «Файлы»"
    for (const track of tracks) {
      const err = validateTrackMetadata(track, { requireAudio: false })
      if (err) return err
    }
    return null
  }

  const validateStep4 = (): string | null => {
    if (tracks.length === 0) return "Сначала загрузите треки на шаге «Файлы»"
    for (const track of tracks) {
      const err = validateTrackAiLabeling(track.aiLabeling)
      if (err) {
        const label = track.trackName.trim() || "Трек"
        return `${err} («${label}»)`
      }
    }
    return null
  }

  const validateStep5 = (): string | null => {
    if (requestAiCover && aiCoverComment.trim().length < 2) {
      return "Укажите пожелания / комментарий для AI обложки"
    }
    if (addonVerticalVideo && addonVerticalVideoComment.trim().length < 2) {
      return "Укажите пожелания / комментарий для видео"
    }
    return null
  }

  const handleNext = async () => {
    if (isUploadingAudio) {
      toast.error("Дождитесь завершения загрузки аудио")
      return
    }
    if (step === 1) {
      const err = validateStep1()
      if (err) {
        toast.error(err)
        return
      }
      if (!releaseId) {
        if (!requestAiCover) {
          toast.error("Загрузите обложку для создания черновика")
          return
        }
        setSaving(true)
        try {
          const createdId = await createDraftWithoutCover()
          if (!createdId) return
        } finally {
          setSaving(false)
        }
      } else {
        await saveDraft(true)
      }
    }
    if (step === 2) {
      const err = validateStep2()
      if (err) {
        toast.error(err)
        return
      }
      await saveDraft(true)
    }
    if (step === 3) {
      const err = validateStep3()
      if (err) {
        toast.error(err)
        return
      }
      await saveDraft(true)
    }
    if (step === 4) {
      const err = validateStep4()
      if (err) {
        toast.error(err)
        return
      }
      await saveDraft(true)
    }
    if (step === 5) {
      const err = validateStep5()
      if (err) {
        toast.error(err)
        return
      }
      await saveDraft(true)
    }
    goToStep(step + 1)
  }

  const handleSubmit = async () => {
    if (!consentOffer) {
      toast.error("Подтвердите согласие с публичной офертой")
      return
    }
    const aiErr = validateStep4()
    if (aiErr) {
      toast.error(aiErr)
      return
    }
    const servicesErr = validateStep5()
    if (servicesErr) {
      toast.error(servicesErr)
      return
    }
    if (!releaseId) return
    await saveDraft(true)
    setSubmitting(true)
    try {
      if (paymentTotal > 0) {
        const prep = await fetch(`/api/cabinet/releases/${releaseId}/submit`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "prepare_payment" }),
        })
        const prepData = await parseCabinetApiJson(prep)
        if (!prep.ok) {
          toast.error(prepData.error ?? "Ошибка подготовки оплаты")
          return
        }
        const payRes = await fetch(`/api/cabinet/releases/${releaseId}/payment/create`, {
          method: "POST",
          credentials: "include",
        })
        const payData = await parseCabinetApiJson<{ paymentUrl?: string }>(payRes)
        if (payRes.ok && payData.paymentUrl) {
          window.location.href = payData.paymentUrl
          return
        }
        toast.error(payData.error ?? "Не удалось создать платёж")
        return
      }

      const res = await fetch(`/api/cabinet/releases/${releaseId}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await parseCabinetApiJson(res)
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось отправить")
        return
      }
      toast.success("Релиз отправлен на модерацию")
      router.push("/cabinet/music/releases")
    } finally {
      setSubmitting(false)
    }
  }

  const reviewChecks = useMemo(() => {
    const items: { ok: boolean; label: string; value?: string }[] = [
      {
        ok: Boolean(artistName.trim()),
        label: "Артист",
        value: artistName.trim() || undefined,
      },
      {
        ok: Boolean(title.trim()),
        label: "Название релиза",
        value: title.trim() || undefined,
      },
      {
        ok: Boolean(releaseDate),
        label: "Дата релиза",
        value: releaseDate ? format(releaseDate, "dd.MM.yyyy", { locale: ru }) : undefined,
      },
      {
        ok: kind === "single" || kind === "album",
        label: "Тип",
        value: kind === "single" ? "Сингл" : "Альбом",
      },
      {
        ok: Boolean(release?.coverPath || coverPreview || requestAiCover),
        label: "Обложка",
        value:
          release?.coverPath || coverPreview
            ? "Загружена"
            : requestAiCover
              ? "Заказана AI-обложка"
              : undefined,
      },
      {
        ok: Boolean(coverCreatedWithAi),
        label: "Обложка создана при помощи ИИ",
        value: coverCreatedWithAi ? COVER_AI_LEVEL_LABELS[coverCreatedWithAi] : undefined,
      },
    ]

    if (showShortDateRisk) {
      items.push({
        ok: acceptShortReleaseDate,
        label: "Короткий срок релиза",
        value: acceptShortReleaseDate ? "Риск принят" : undefined,
      })
    }

    if (upc.trim()) {
      items.push({ ok: true, label: "UPC / EAN", value: upc.trim() })
    }

    items.push({
      ok: true,
      label: "Стриминг-сервисы",
      value: streamingScopeShortLabel(streamingScope),
    })

    const minTracks = kind === "album" ? 2 : 1
    items.push({
      ok: tracks.length >= minTracks,
      label: "Треки",
      value:
        tracks.length > 0
          ? tracks.map((t, i) => `${i + 1}. ${t.trackName}`).join("; ")
          : undefined,
    })

    for (const t of tracks) {
      const metaErr = validateTrackMetadata(t, { requireAudio: false })
      items.push({
        ok: !metaErr,
        label: `Метаданные: ${t.trackName}`,
        value: metaErr
          ? metaErr
          : [t.genre, t.mood].filter(Boolean).join(" · ") || undefined,
      })
      const aiErr = validateTrackAiLabeling(t.aiLabeling)
      items.push({
        ok: !aiErr,
        label: `AI-маркировка: ${t.trackName}`,
        value: aiErr ? aiErr : aiLabelingModeLabel(t.aiLabeling?.mode),
      })
    }

    if (requestAiCover) {
      items.push({ ok: true, label: "Услуга", value: "AI обложка для трека" })
    }
    if (selectedReleaseTier && RELEASE_DATE_TIER_PRICE_RUB[selectedReleaseTier] > 0) {
      items.push({
        ok: true,
        label: "Услуга",
        value: `${RELEASE_DATE_TIER_LABEL[selectedReleaseTier]}: ${RELEASE_DATE_TIER_PRICE_RUB[selectedReleaseTier]}₽`,
      })
    }
    if (addonVerticalVideo) {
      items.push({
        ok: true,
        label: "Услуга",
        value: `Видео для трека × ${addonVerticalVideoCount}`,
      })
    }
    if (addonAiMastering) {
      items.push({
        ok: true,
        label: "Услуга",
        value: `AI мастеринг × ${addonAiMasteringCount}`,
      })
    }
    if (addonYandexVideoshot) items.push({ ok: true, label: "Услуга", value: "Яндекс видеошот" })
    if (addonYandexVideoshotCreation) {
      items.push({ ok: true, label: "Услуга", value: "Создание видеошота Яндекс" })
    }
    if (addonYandexVideoavatar) items.push({ ok: true, label: "Услуга", value: "Яндекс видеоаватар" })
    if (addonSpotifyVideoshot) items.push({ ok: true, label: "Услуга", value: "Spotify видеошот" })
    if (paymentTotal > 0) {
      items.push({
        ok: true,
        label: "К оплате",
        value: `${paymentTotal.toLocaleString("ru-RU")} ₽`,
      })
    }

    return items
  }, [
    artistName,
    title,
    releaseDate,
    kind,
    release?.coverPath,
    coverPreview,
    upc,
    streamingScope,
    tracks,
    requestAiCover,
    coverCreatedWithAi,
    showShortDateRisk,
    acceptShortReleaseDate,
    selectedReleaseTier,
    addonVerticalVideo,
    addonVerticalVideoCount,
    addonAiMastering,
    addonAiMasteringCount,
    addonYandexVideoshot,
    addonYandexVideoshotCreation,
    addonYandexVideoavatar,
    addonSpotifyVideoshot,
    paymentTotal,
  ])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cabinet/music/releases"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="min-w-0 truncate text-xl font-semibold">
          Новый релиз
          {artistName.trim() || title.trim()
            ? ` ${[artistName.trim(), title.trim()].filter(Boolean).join(" - ")}`
            : ""}
        </h1>
      </div>

      {profileCompleteForUpload === false ? <CabinetUploadProfileGateBanner /> : null}

      <ReleaseUploadStepper
        currentStep={step}
        maxReachedStep={maxStep}
        onStepClick={(target) => {
          if (target < step) goToStep(target)
        }}
      />

      {step === 1 ? (
        <div className="space-y-6">
          <div>
            <Label>Тип релиза *</Label>
            <div className="flex gap-2 mt-1">
              {(["single", "album"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant={kind === k ? "default" : "outline"}
                  onClick={() => setKind(k)}
                  disabled={formDisabled}
                >
                  {k === "single" ? "Сингл" : "Альбом"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
            <div className="space-y-4 min-w-0">
              <div>
                <Label>Название релиза *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} disabled={formDisabled} />
              </div>
              <div>
                <Label>Имя артиста / название группы *</Label>
                <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} maxLength={100} disabled={formDisabled} />
              </div>
              <div>
                <Label>Дата релиза *</Label>
                <Popover
                  open={datePopoverOpen}
                  onOpenChange={(open) => {
                    setDatePopoverOpen(open)
                    if (open) {
                      const focusDate = releaseDate ?? earliestAvailableDate
                      setCalendarMonth(focusDate)
                      if (!releaseDate) setReleaseDate(earliestAvailableDate)
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start hover:scale-100 hover:shadow-none hover:border-border focus-visible:ring-0 focus-visible:border-border active:scale-100",
                        !releaseDate && "text-muted-foreground",
                      )}
                      disabled={formDisabled}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {releaseDate ? format(releaseDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      selected={releaseDate}
                      onSelect={(date) => {
                        setReleaseDate(date)
                        if (date && !isShortReleaseDate(date)) {
                          setAcceptShortReleaseDate(false)
                        }
                        if (date) setDatePopoverOpen(false)
                      }}
                      autoFocus
                      disabled={(date) => formDisabled || !isReleaseDateSelectable(date)}
                      modifiers={{
                        tierAccelerated: (date) => getReleaseDateCalendarTier(date) === "accelerated",
                        tierFast: (date) => getReleaseDateCalendarTier(date) === "fast",
                        tierStandard: (date) => getReleaseDateCalendarTier(date) === "standard",
                      }}
                      modifiersClassNames={{
                        tierAccelerated:
                          "[&_button]:bg-emerald-500/25 [&_button]:text-emerald-200 [&_button]:border [&_button]:border-emerald-500/70 [&_button]:rounded-md",
                        tierFast:
                          "[&_button]:bg-sky-500/25 [&_button]:text-sky-200 [&_button]:border [&_button]:border-sky-500/70 [&_button]:rounded-md",
                        tierStandard:
                          "[&_button]:bg-orange-500/20 [&_button]:text-orange-200 [&_button]:border [&_button]:border-orange-500/60 [&_button]:rounded-md",
                      }}
                      classNames={{
                        today: "bg-transparent",
                      }}
                    />
                    <div className="space-y-1.5 border-t border-border px-3 py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>
                          {RELEASE_DATE_TIER_LABEL.accelerated}: {RELEASE_DATE_TIER_PRICE_RUB.accelerated}₽
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                        <span>
                          {RELEASE_DATE_TIER_LABEL.fast}: {RELEASE_DATE_TIER_PRICE_RUB.fast}₽
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                        <span>
                          {RELEASE_DATE_TIER_LABEL.standard}: {RELEASE_DATE_TIER_PRICE_RUB.standard}₽
                        </span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">
                  Питчинг доступен только если до даты релиза осталось минимум 14 дней.
                </p>
                {selectedReleaseTier ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {RELEASE_DATE_TIER_LABEL[selectedReleaseTier]}: {RELEASE_DATE_TIER_PRICE_RUB[selectedReleaseTier]}₽
                  </p>
                ) : null}
                {showShortDateRisk ? (
                  <div className="mt-2 space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-100/90">
                      Площадки могут не успеть проверить и доставить релиз вовремя. Промо и питчинг
                      доступны минимум за 14 дней
                    </p>
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        className="mt-0.5 shrink-0"
                        checked={acceptShortReleaseDate}
                        onCheckedChange={(c) => setAcceptShortReleaseDate(c === true)}
                        disabled={formDisabled}
                      />
                      <span>Я принимаю риск короткого срока, отправить с этой датой</span>
                    </label>
                  </div>
                ) : null}
              </div>
              <div>
                <Label>UPC / EAN</Label>
                <Input value={upc} onChange={(e) => setUpc(e.target.value)} maxLength={32} placeholder="Необязательно" disabled={formDisabled} />
                <p className="text-xs text-muted-foreground mt-1">
                  Если у релиза уже есть UPC - укажите его. Если нет, мы присвоим код автоматически
                </p>
              </div>
              <StreamingServicesField
                value={streamingScope}
                onChange={applyStreamingScope}
                disabled={formDisabled}
                idPrefix="release-streaming"
              />
              <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                  <Checkbox
                    className="mt-0.5 shrink-0"
                    checked={requestAiCover}
                    onCheckedChange={(c) => setRequestAiCover(c === true)}
                    disabled={formDisabled}
                  />
                  <span>Необходимо создание AI-обложки</span>
                </label>
                <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                  <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums">
                    {AI_COVER_REQUEST_PRICE_RUB} руб. / шт.
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAiCoverInfoOpen(true)}
                    disabled={formDisabled}
                  >
                    Подробнее
                  </Button>
                </div>
              </div>
              {requestAiCover ? (
                <div className="space-y-1">
                  <Label htmlFor="ai-cover-comment-step1">Пожелания / комментарии *</Label>
                  <Textarea
                    id="ai-cover-comment-step1"
                    value={aiCoverComment}
                    onChange={(e) => setAiCoverComment(e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="Стиль, референсы, цвета, текст на обложке"
                    disabled={formDisabled}
                  />
                  <p className="text-xs text-muted-foreground">Поле обязательно для заполнения.</p>
                </div>
              ) : null}
              {requestAiCover && !coverPreview ? (
                <p className="text-xs text-muted-foreground">
                  Обложку можно не загружать — услуга будет добавлена на шаге «Услуги» и оплачена при отправке.
                </p>
              ) : null}
            </div>

            <div className="space-y-3 lg:justify-self-end w-full max-w-[20rem]">
              <Label>{requestAiCover ? "Обложка" : "Обложка *"}</Label>
              <div
                className="aspect-square w-full rounded-md border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 cursor-pointer"
                onClick={() => !formDisabled && coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <Image src={coverPreview} alt="" width={320} height={320} className="object-cover h-full w-full" unoptimized />
                ) : (
                  <Upload className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-0 flex-1"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={formDisabled}
                >
                  {saving ? <Spinner className="h-4 w-4" /> : "Выбрать файл"}
                </Button>
                {coverPreview ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => void handleClearCover()}
                    disabled={formDisabled}
                    aria-label="Удалить обложку"
                    title="Удалить обложку"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG или PNG, строго {COVER_REQUIRED_PX}×{COVER_REQUIRED_PX} px, до 20 MB.
              </p>
              <div>
                <Label>Обложка создана при помощи ИИ *</Label>
                <Select
                  value={coverCreatedWithAi ?? undefined}
                  onValueChange={(v) => setCoverCreatedWithAi(v as CoverAiLevel)}
                  disabled={formDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {COVER_AI_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {COVER_AI_LEVEL_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleCoverFile(f)
                  e.target.value = ""
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Формат файла: *.wav · Частота дискретизации: 44 100 Гц · Стерео · до 80 MB
            {kind === "album" ? " · можно выбрать или перетащить несколько файлов" : ""}
          </p>
          <div
            className={cn(
              "border border-dashed border-border rounded-lg p-8 text-center transition-colors",
              formDisabled ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-muted/30",
              isUploadingAudio && "border-primary/50 bg-primary/5"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (formDisabled) return
              void handleAudioFiles(e.dataTransfer.files)
            }}
            onClick={() => !formDisabled && audioInputRef.current?.click()}
          >
            {isUploadingAudio ? (
              <Spinner className="h-10 w-10 mx-auto text-primary mb-2" />
            ) : (
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            )}
            <p className="text-sm">
              {isUploadingAudio
                ? "Идёт загрузка — не закрывайте страницу"
                : "Перетащите WAV сюда или нажмите для выбора"}
            </p>
          </div>
          <input
            ref={audioInputRef}
            type="file"
            accept=".wav,audio/wav"
            multiple={kind === "album"}
            className="hidden"
            disabled={formDisabled}
            onChange={(e) => {
              if (e.target.files?.length) void handleAudioFiles(e.target.files)
              e.target.value = ""
            }}
          />
          {uploadQueue.some((item) => item.status !== "done") ? (
            <ul className="space-y-2">
              {uploadQueue
                .filter((item) => item.status !== "done")
                .map((item) => (
                <li key={item.id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{item.fileName}</span>
                    <span className="text-muted-foreground shrink-0">
                      {item.status === "pending" && "В очереди"}
                      {item.status === "uploading" && `${item.progress}%`}
                      {item.status === "error" && "Ошибка"}
                    </span>
                  </div>
                  {item.status === "uploading" ? <Progress value={item.progress} /> : null}
                  {item.error ? <p className="text-xs text-destructive">{item.error}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="space-y-2">
            {tracks.map((track, index) => {
              const isActive = playingTrackId === track.id
              const canReorder = kind === "album" && tracks.length > 1 && !formDisabled
              return (
              <li
                key={track.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border border-border p-3 transition-colors",
                  dragTrackIndex === index && "opacity-50",
                  dragOverTrackIndex === index && dragTrackIndex !== index && "border-primary bg-primary/5",
                )}
                onDragOver={(e) => {
                  if (!canReorder || dragTrackIndex === null) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                  if (dragOverTrackIndex !== index) setDragOverTrackIndex(index)
                }}
                onDrop={(e) => {
                  if (!canReorder || dragTrackIndex === null) return
                  e.preventDefault()
                  e.stopPropagation()
                  const from = dragTrackIndex
                  setDragTrackIndex(null)
                  setDragOverTrackIndex(null)
                  void reorderTracksByIndex(from, index)
                }}
                onDragEnd={() => {
                  setDragTrackIndex(null)
                  setDragOverTrackIndex(null)
                }}
              >
                {canReorder ? (
                  <div
                    className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                    draggable
                    role="button"
                    tabIndex={0}
                    aria-label={`Перетащить трек ${index + 1}`}
                    onDragStart={(e) => {
                      setDragTrackIndex(index)
                      e.dataTransfer.effectAllowed = "move"
                      e.dataTransfer.setData("text/plain", track.id)
                    }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                ) : null}
                <span className="text-sm text-muted-foreground w-6 shrink-0">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm sm:max-w-[40%] md:max-w-[12rem]">
                  {track.trackName.trim() || `Трек ${index + 1}`}
                </span>
                {isActive ? (
                  <div className="flex min-w-0 flex-[1.5] items-center gap-2">
                    <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {formatAudioClock(audioTime)}
                    </span>
                    <Slider
                      className="min-w-0 flex-1"
                      min={0}
                      max={Math.max(audioDuration, audioTime, 0.1)}
                      step={0.1}
                      value={[Math.min(audioTime, Math.max(audioDuration, audioTime, 0.1))]}
                      disabled={!isActive}
                      aria-label="Перемотка трека"
                      onValueChange={(vals) => {
                        audioSeekingRef.current = true
                        setAudioTime(vals[0] ?? 0)
                      }}
                      onValueCommit={(vals) => {
                        seekAudio(vals[0] ?? 0)
                        audioSeekingRef.current = false
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                    <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatAudioClock(audioDuration)}
                    </span>
                  </div>
                ) : (
                  <div className="hidden min-w-0 flex-[1.5] sm:block" />
                )}
                <Button type="button" size="icon" variant="ghost" disabled={formDisabled} onClick={() => togglePlay(track.id)}>
                  {isActive && isAudioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                {kind === "album" ? (
                  <>
                    <Button type="button" size="icon" variant="ghost" disabled={index === 0 || formDisabled} onClick={() => void moveTrack(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" disabled={index === tracks.length - 1 || formDisabled} onClick={() => void moveTrack(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
                <Button type="button" size="icon" variant="ghost" disabled={formDisabled} onClick={() => void deleteTrack(track.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {step === 3 ? (
        <Accordion
          type="multiple"
          value={metaAccordionOpen}
          onValueChange={setMetaAccordionOpen}
          className="space-y-4"
        >
          {tracks.map((track, index) => (
            <AccordionItem
              key={track.id}
              value={track.id}
              className="overflow-hidden rounded-md border border-border px-4 last:border-b"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <span className="flex min-w-0 items-center gap-3 text-left">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 truncate font-semibold">
                    {kind === "album"
                      ? `Трек ${index + 1}: ${track.trackName.trim() || "без названия"}`
                      : track.trackName.trim() || `Трек ${index + 1}`}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <TrackMetadataFields
                  track={track}
                  onChange={(patch) => void updateTrackLocal(track.id, patch)}
                  showTransferFields
                  disabled={formDisabled}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : null}

      {step === 4 ? (
        <div className="space-y-6">
          <Accordion
            type="multiple"
            value={aiLabelingAccordionOpen}
            onValueChange={setAiLabelingAccordionOpen}
            className="space-y-4"
          >
            {tracks.map((track, index) => (
              <AccordionItem
                key={track.id}
                value={track.id}
                className="overflow-hidden rounded-md border border-border px-4 last:border-b"
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <span className="flex min-w-0 items-center gap-3 text-left">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 truncate font-semibold">
                      {kind === "album"
                        ? `Трек ${index + 1}: ${track.trackName.trim() || "без названия"}`
                        : track.trackName.trim() || `Трек ${index + 1}`}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <TrackAiLabelingFields
                    value={track.aiLabeling}
                    disabled={formDisabled}
                    onChange={(next) => void updateTrackLocal(track.id, { aiLabeling: next })}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : null}

      {step === 5 ? (
        <CabinetUploadAdditionalServicesSection
          formDisabled={formDisabled}
          layout="plain"
          requestAiCover={requestAiCover}
          aiCoverComment={aiCoverComment}
          setAiCoverComment={setAiCoverComment}
          renderAiCoverRow={(openAddonInfo) => (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={requestAiCover}
                  onCheckedChange={(c) => setRequestAiCover(c === true)}
                  disabled={formDisabled}
                />
                <span>AI обложка для трека</span>
              </label>
              <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums">500 руб. / шт.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => openAddonInfo("aiCover")} disabled={formDisabled}>
                  Подробнее
                </Button>
              </div>
            </div>
          )}
          addonVerticalVideo={addonVerticalVideo}
          setAddonVerticalVideo={setAddonVerticalVideo}
          addonVerticalVideoCount={addonVerticalVideoCount}
          setAddonVerticalVideoCount={setAddonVerticalVideoCount}
          addonVerticalVideoComment={addonVerticalVideoComment}
          setAddonVerticalVideoComment={setAddonVerticalVideoComment}
          addonAiMastering={addonAiMastering}
          setAddonAiMastering={setAddonAiMastering}
          addonAiMasteringCount={addonAiMasteringCount}
          setAddonAiMasteringCount={setAddonAiMasteringCount}
          addonYandexVideoshot={addonYandexVideoshot}
          setAddonYandexVideoshot={setAddonYandexVideoshot}
          addonYandexVideoshotCreation={addonYandexVideoshotCreation}
          setAddonYandexVideoshotCreation={setAddonYandexVideoshotCreation}
          addonYandexVideoavatar={addonYandexVideoavatar}
          setAddonYandexVideoavatar={setAddonYandexVideoavatar}
          addonSpotifyVideoshot={addonSpotifyVideoshot}
          setAddonSpotifyVideoshot={setAddonSpotifyVideoshot}
          afterPaymentSubject={kind === "album" ? "альбом" : "трек"}
          sectionClassName=""
        />
      ) : null}

      {step === 6 ? (
        <div className="space-y-6">
          <div className="flex gap-4">
            {coverPreview ? (
              <div className="h-24 w-24 rounded overflow-hidden relative shrink-0">
                <Image src={coverPreview} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : null}
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-muted-foreground">{artistName}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5">{kind === "single" ? "Сингл" : "Альбом"}</span>
                {releaseDate ? (
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {format(releaseDate, "dd.MM.yyyy")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            {reviewChecks.map((c, idx) => (
              <div key={`${c.label}-${idx}`} className="flex items-start gap-2 text-sm">
                {c.ok ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <span className="text-muted-foreground">{c.label}: </span>
                  <span className={cn(!c.ok && "text-amber-200")}>{c.value ?? (c.ok ? "OK" : "Не заполнено")}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-row items-start gap-3 rounded-md border border-border p-4">
            <Checkbox
              id="consent-offer"
              checked={consentOffer}
              onCheckedChange={(c) => setConsentOffer(c === true)}
            />
            <Label htmlFor="consent-offer" className="text-sm font-normal cursor-pointer leading-snug">
              Я ознакомился(ась) и согласен(сна) с{" "}
              <Link href="/offer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                публичной офертой и лицензионными условиями
              </Link>{" "}
              *
            </Label>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" disabled={step <= 1 || formDisabled} onClick={() => goToStep(step - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Назад
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={formDisabled || (!releaseId && !requestAiCover)}
            onClick={() => void saveDraft()}
          >
            {saving ? <Spinner className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Сохранить черновик
          </Button>
          {step < WIZARD_STEP_COUNT ? (
            <Button type="button" onClick={() => void handleNext()} disabled={formDisabled}>
              Далее
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !consentOffer || formDisabled}>
              {submitting ? (
                <Spinner className="h-4 w-4 mr-1" />
              ) : paymentTotal > 0 ? (
                <CreditCard className="h-4 w-4 mr-1" />
              ) : null}
              {paymentTotal > 0 ? `Оплатить ${paymentTotal.toLocaleString("ru-RU")} ₽` : "Отправить на модерацию"}
            </Button>
          )}
        </div>
      </div>

      <CabinetUploadAiCoverInfoDialog open={aiCoverInfoOpen} onOpenChange={setAiCoverInfoOpen} />
    </div>
  )
}
