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
  Pause,
  Play,
  Save,
  Trash2,
  Upload,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { isReleaseDateWeekend } from "@/lib/release-date-validation"
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
import type { Release, ReleaseKind } from "@/lib/releases"
import type { Track } from "@/lib/tracks"
import { ReleaseUploadStepper } from "./release-upload-stepper"
import { TrackMetadataFields, type TrackDraftPatch } from "./track-metadata-fields"
import { CabinetUploadProfileGateBanner } from "@/components/cabinet-upload-profile-gate-banner"

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
  const [step, setStep] = useState(Math.min(5, Math.max(1, stepFromUrl)))
  const [maxStep, setMaxStep] = useState(step)
  const [loading, setLoading] = useState(Boolean(initialReleaseId))
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [kind, setKind] = useState<ReleaseKind>("single")
  const [title, setTitle] = useState("")
  const [artistName, setArtistName] = useState("")
  const [releaseDate, setReleaseDate] = useState<Date | undefined>()
  const [upc, setUpc] = useState("")
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [consentOffer, setConsentOffer] = useState(false)

  const [requestAiCover, setRequestAiCover] = useState(false)
  const [addonVerticalVideo, setAddonVerticalVideo] = useState(false)
  const [addonVerticalVideoCount, setAddonVerticalVideoCount] = useState(1)
  const [addonAiMastering, setAddonAiMastering] = useState(false)
  const [addonAiMasteringCount, setAddonAiMasteringCount] = useState(1)
  const [addonYandexVideoshot, setAddonYandexVideoshot] = useState(false)
  const [addonYandexVideoshotCreation, setAddonYandexVideoshotCreation] = useState(false)
  const [addonYandexVideoavatar, setAddonYandexVideoavatar] = useState(false)
  const [addonSpotifyVideoshot, setAddonSpotifyVideoshot] = useState(false)

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const paymentTotal = useMemo(
    () =>
      computeSelectedUploadAddonsTotalRub({
        requestAiCover,
        addonVerticalVideo,
        addonVerticalVideoCount,
        addonAiMastering,
        addonAiMasteringCount,
        addonYandexVideoshot,
        addonYandexVideoshotCreation,
        addonYandexVideoavatar,
        addonSpotifyVideoshot,
      }),
    [
      requestAiCover,
      addonVerticalVideo,
      addonVerticalVideoCount,
      addonAiMastering,
      addonAiMasteringCount,
      addonYandexVideoshot,
      addonYandexVideoshotCreation,
      addonYandexVideoavatar,
      addonSpotifyVideoshot,
    ]
  )

  const syncFromRelease = useCallback((r: Release, t: Track[]) => {
    setRelease(r)
    setTracks(t)
    setKind(r.kind)
    setTitle(r.title)
    setArtistName(r.artistName)
    setUpc(r.upc ?? "")
    setReleaseDate(r.releaseDate ? new Date(r.releaseDate) : undefined)
    setRequestAiCover(r.requestAiCover)
    const a = r.addons
    setAddonVerticalVideo(Boolean(a?.verticalVideo?.enabled))
    setAddonVerticalVideoCount(Number(a?.verticalVideo?.videosCount ?? 1))
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
    if (payment === "return" && releaseId && step === 5) {
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
    const s = Math.min(5, Math.max(1, stepFromUrl))
    setStep(s)
    setMaxStep((prev) => Math.max(prev, s))
  }, [stepFromUrl])

  const goToStep = (next: number) => {
    const clamped = Math.min(5, Math.max(1, next))
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
    addons: {
      verticalVideo: addonVerticalVideo
        ? { enabled: true, videosCount: addonVerticalVideoCount }
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

  const saveDraft = async (silent = false): Promise<boolean> => {
    if (!releaseId) {
      if (!silent) toast.error("Сначала загрузите обложку — черновик создастся автоматически")
      return false
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/cabinet/releases/${releaseId}`, {
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

  const handleAudioFile = async (file: File) => {
    if (!releaseId) {
      toast.error("Сначала заполните основную информацию и загрузите обложку")
      return
    }
    if (!isLikelyWavFile(file)) {
      toast.error("Аудио должно быть в формате WAV")
      return
    }
    if (file.size > 80 * 1024 * 1024) {
      toast.error("Размер аудио не должен превышать 80 MB")
      return
    }

    const fd = new FormData()
    fd.append("audio", file)
    setSaving(true)
    try {
      const res = await fetch(`/api/cabinet/releases/${releaseId}/tracks`, {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      const data = await parseCabinetApiJson<{ tracks?: Track[] }>(res)
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось загрузить аудио")
        return
      }
      setTracks(data.tracks ?? [])
      toast.success("Аудио загружено")
    } finally {
      setSaving(false)
    }
  }

  const updateTrackLocal = async (trackId: string, patch: TrackDraftPatch) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, ...patch } : t))
    )
    if (!releaseId) return
    await fetch(`/api/cabinet/releases/${releaseId}/tracks/${trackId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }

  const deleteTrack = async (trackId: string) => {
    if (!releaseId) return
    const res = await fetch(`/api/cabinet/releases/${releaseId}/tracks/${trackId}`, {
      method: "DELETE",
      credentials: "include",
    })
    if (res.ok) {
      setTracks((prev) => prev.filter((t) => t.id !== trackId))
    }
  }

  const moveTrack = async (index: number, direction: -1 | 1) => {
    const next = [...tracks]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setTracks(next)
    if (!releaseId) return
    await fetch(`/api/cabinet/releases/${releaseId}/tracks/reorder`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackIds: next.map((t) => t.id) }),
    })
  }

  const togglePlay = (trackId: string) => {
    if (playingTrackId === trackId) {
      audioRef.current?.pause()
      setPlayingTrackId(null)
      return
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(`/api/cabinet/releases/${releaseId}/audio/${trackId}`)
    audioRef.current = audio
    audio.play().catch(() => toast.error("Не удалось воспроизвести"))
    audio.onended = () => setPlayingTrackId(null)
    setPlayingTrackId(trackId)
  }

  const validateStep1 = (): string | null => {
    if (!title.trim()) return "Укажите название релиза"
    if (!artistName.trim()) return "Укажите имя артиста / название группы"
    if (!releaseDate) return "Укажите желаемую дату релиза"
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const min = new Date(today)
    min.setDate(min.getDate() + 14)
    if (releaseDate < min) {
      return "Дата публикации должна быть не ранее чем через 14 дней от сегодня"
    }
    if (isReleaseDateWeekend(releaseDate)) {
      return "Дата публикации не может приходиться на выходной"
    }
    if (!release?.coverPath && !coverPreview) return "Загрузите обложку"
    return null
  }

  const validateStep2 = (): string | null => {
    const min = kind === "album" ? 2 : 1
    if (tracks.length < min) {
      return kind === "album" ? "Загрузите минимум 2 трека" : "Загрузите аудиофайл"
    }
    return null
  }

  const handleNext = async () => {
    if (step === 1) {
      const err = validateStep1()
      if (err) {
        toast.error(err)
        return
      }
      if (!releaseId) {
        toast.error("Загрузите обложку для создания черновика")
        return
      }
      await saveDraft(true)
    }
    if (step === 2) {
      const err = validateStep2()
      if (err) {
        toast.error(err)
        return
      }
      await saveDraft(true)
    }
    if (step === 3 || step === 4) {
      await saveDraft(true)
    }
    goToStep(step + 1)
  }

  const handleSubmit = async () => {
    if (!consentOffer) {
      toast.error("Подтвердите согласие с публичной офертой")
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const reviewChecks = [
    { ok: Boolean(artistName.trim()), label: "Имя артиста / группа" },
    { ok: Boolean(title.trim()), label: "Название релиза" },
    { ok: Boolean(releaseDate), label: "Дата релиза" },
    { ok: Boolean(release?.coverPath || coverPreview), label: "Обложка загружена" },
    { ok: tracks.length >= (kind === "album" ? 2 : 1), label: `Треков: ${tracks.length}` },
    ...tracks.map((t) => ({
      ok: Boolean(t.genre && t.mood && t.shortDescription.trim().length >= 2),
      label: `Метаданные: ${t.trackName}`,
    })),
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cabinet/music/releases"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">Новый релиз</h1>
      </div>

      <CabinetUploadProfileGateBanner />

      <ReleaseUploadStepper currentStep={step} maxReachedStep={maxStep} />

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <Label>Тип релиза *</Label>
            <div className="flex gap-2 mt-1">
              {(["single", "album"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant={kind === k ? "default" : "outline"}
                  onClick={() => setKind(k)}
                >
                  {k === "single" ? "Сингл" : "Альбом"}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Название релиза *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Имя артиста / название группы *</Label>
            <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Желаемая дата релиза *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start", !releaseDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {releaseDate ? format(releaseDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={releaseDate}
                  onSelect={setReleaseDate}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const min = new Date(today)
                    min.setDate(min.getDate() + 14)
                    return date < min || isReleaseDateWeekend(date)
                  }}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">
              Идеально — не ранее 14 дней после заполнения формы при заказе питчинга. Минимально — 5 рабочих дней, если без питчинга.
            </p>
          </div>
          <div>
            <Label>Обложка *</Label>
            <div className="flex gap-4 mt-1">
              <div
                className="h-32 w-32 rounded-md border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 cursor-pointer shrink-0"
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <Image src={coverPreview} alt="" width={128} height={128} className="object-cover h-full w-full" unoptimized />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>JPEG или PNG, строго {COVER_REQUIRED_PX}×{COVER_REQUIRED_PX} px, до 20 MB.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={saving}>
                  {saving ? <Spinner className="h-4 w-4" /> : "Выбрать файл"}
                </Button>
              </div>
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
          <div>
            <Label>UPC / EAN</Label>
            <Input value={upc} onChange={(e) => setUpc(e.target.value)} maxLength={32} placeholder="Необязательно" />
            <p className="text-xs text-muted-foreground mt-1">
              Укажите UPC / EAN релиза, если переносите релиз от другого дистрибьютора
            </p>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Формат файла: *.wav · Частота дискретизации: 44 100 Гц · Стерео · до 80 MB
          </p>
          <div
            className="border border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) void handleAudioFile(f)
            }}
            onClick={() => audioInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm">Перетащите WAV сюда или нажмите для выбора</p>
          </div>
          <input
            ref={audioInputRef}
            type="file"
            accept=".wav,audio/wav"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleAudioFile(f)
              e.target.value = ""
            }}
          />
          <ul className="space-y-2">
            {tracks.map((track, index) => (
              <li key={track.id} className="flex items-center gap-2 rounded-md border border-border p-3">
                <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                <span className="flex-1 truncate text-sm">{track.trackName}</span>
                <Button type="button" size="icon" variant="ghost" onClick={() => togglePlay(track.id)}>
                  {playingTrackId === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                {kind === "album" ? (
                  <>
                    <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => void moveTrack(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" disabled={index === tracks.length - 1} onClick={() => void moveTrack(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
                <Button type="button" size="icon" variant="ghost" onClick={() => void deleteTrack(track.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-8">
          {tracks.map((track, index) => (
            <div key={track.id} className="space-y-3">
              <h3 className="font-medium">
                {kind === "album" ? `Трек ${index + 1}: ${track.trackName}` : track.trackName}
              </h3>
              <TrackMetadataFields
                track={track}
                onChange={(patch) => void updateTrackLocal(track.id, patch)}
                showTransferFields={Boolean(upc.trim())}
              />
            </div>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <CabinetUploadAdditionalServicesSection
          formDisabled={saving}
          requestAiCover={requestAiCover}
          renderAiCoverRow={(openAddonInfo) => (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={requestAiCover}
                  onCheckedChange={(c) => setRequestAiCover(c === true)}
                  disabled={saving}
                />
                <span>AI обложка для трека</span>
              </label>
              <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums">500 руб. / шт.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => openAddonInfo("aiCover")}>
                  Подробнее
                </Button>
              </div>
            </div>
          )}
          addonVerticalVideo={addonVerticalVideo}
          setAddonVerticalVideo={setAddonVerticalVideo}
          addonVerticalVideoCount={addonVerticalVideoCount}
          setAddonVerticalVideoCount={setAddonVerticalVideoCount}
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

      {step === 5 ? (
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
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            {reviewChecks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span>{c.label}</span>
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
        <Button type="button" variant="outline" disabled={step <= 1} onClick={() => goToStep(step - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Назад
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" disabled={saving || !releaseId} onClick={() => void saveDraft()}>
            {saving ? <Spinner className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Сохранить черновик
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={() => void handleNext()} disabled={saving}>
              Далее
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !consentOffer}>
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
    </div>
  )
}
