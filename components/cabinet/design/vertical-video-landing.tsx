"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Bookmark,
  Clapperboard,
  Film,
  Heart,
  MessageCircle,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  Scissors,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import {
  formatVerticalVideoRub,
  getVerticalVideoTierForCount,
  getVerticalVideoUnitPrice,
  VERTICAL_VIDEO_MAX_COUNT,
  VERTICAL_VIDEO_MIN_COUNT,
  VERTICAL_VIDEO_PRICE_TIER_1_RUB,
  VERTICAL_VIDEO_PRICE_TIER_2_RUB,
  VERTICAL_VIDEO_PRICE_TIER_3_RUB,
  VERTICAL_VIDEO_TIERS,
} from "@/lib/vertical-video-pricing"
import { cn } from "@/lib/utils"

const EXAMPLE_VIDEO_SRC = "/videos/vertical-examples/example-2.mp4"
const EXAMPLE_ARTIST = "Имя артиста"
const EXAMPLE_TRACK = "Название трека"
const EXAMPLE_HANDLE = "your_artist"

type PlatformId = "tiktok" | "instagram" | "youtube"

const PLATFORMS: Array<{ id: PlatformId; label: string; short: string }> = [
  { id: "tiktok", label: "TikTok", short: "TikTok" },
  { id: "instagram", label: "Instagram Reels", short: "Instagram" },
  { id: "youtube", label: "YouTube Shorts", short: "YouTube" },
]

const INCLUDE_CARDS = [
  {
    icon: Film,
    title: "Подбор готовых видео",
    body: "Используем видеоматериалы из общедоступных источников в интернете под настроение вашего трека.",
  },
  {
    icon: Scissors,
    title: "Нарезка и склейка",
    body: "Выбираем фрагменты и собираем их в короткий вертикальный видеоряд под вашу музыку.",
  },
  {
    icon: Clapperboard,
    title: "Ролики для соцсетей",
    body: "Получаете готовые видео под трек, которые можно публиковать в TikTok, Reels и Shorts.",
  },
] as const

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Трек и объём",
    body: "Вы выбираете трек, количество видео и оплачиваете заказ.",
  },
  {
    num: "02",
    title: "Подбор видеоряда",
    body: "После оплаты уточняем пожелания и подбираем готовые видео из общедоступных источников.",
  },
  {
    num: "03",
    title: "Монтаж примера",
    body: "Нарезаем и склеиваем фрагменты под музыку. Первый ролик показываем для согласования.",
  },
  {
    num: "04",
    title: "Готовая серия",
    body: "Монтируем остальные ролики по согласованному шаблону монтажа.",
  },
] as const

const FAQ_ITEMS = [
  {
    q: "Из чего вы монтируете ролики?",
    a: "Из готовых общедоступных видео в интернете. Подбираем подходящие фрагменты, нарезаем и склеиваем их под ваш трек. В услугу входит монтаж готового видеоряда.",
  },
  {
    q: "Как проходит согласование?",
    a: "После оплаты уточняем пожелания к видеоряду. Монтируем первый пример из готовых фрагментов, согласуем его с вами и собираем остальные ролики по тому же шаблону монтажа.",
  },
  {
    q: "Для каких площадок подходят ролики?",
    a: "Готовые вертикальные ролики можно использовать для публикаций в TikTok, Reels и Shorts с вашим треком.",
  },
  {
    q: "Что указать в пожеланиях?",
    a: "Опишите, какой видеоряд подходит треку: например, город, природа, дорога или спокойные атмосферные кадры. Это поможет подобрать фрагменты для монтажа.",
  },
  {
    q: "От чего зависит цена за ролик?",
    a: `От количества видео: 1-10 - ${VERTICAL_VIDEO_PRICE_TIER_1_RUB} ₽ за видео, 11-50 - ${VERTICAL_VIDEO_PRICE_TIER_2_RUB} ₽, 51-500 - ${VERTICAL_VIDEO_PRICE_TIER_3_RUB} ₽. Итоговую стоимость видно при выборе количества.`,
  },
] as const

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
}

function videoWord(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return "видео"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "видео"
  return "видео"
}

function PlatformChrome({ platform }: { platform: PlatformId }) {
  if (platform === "tiktok") {
    return (
      <>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 to-transparent px-3 pb-8 pt-2.5">
          <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-white/80">
            <span>Подписки</span>
            <span className="border-b border-white pb-0.5 font-semibold text-white">Для вас</span>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-14 right-2.5 z-20 flex flex-col items-center gap-3.5 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-card">
            <span className="text-[10px] font-bold">{EXAMPLE_HANDLE.slice(0, 1).toUpperCase()}</span>
          </div>
          <Heart className="h-6 w-6 fill-white/10" aria-hidden />
          <MessageCircle className="h-6 w-6" aria-hidden />
          <Bookmark className="h-6 w-6" aria-hidden />
          <Share2 className="h-6 w-6" aria-hidden />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3.5 pt-10">
          <p className="truncate text-[12px] font-semibold text-white">@{EXAMPLE_HANDLE}</p>
          <p className="mt-0.5 truncate text-[11px] text-white/90">{EXAMPLE_TRACK}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/85">
            <Music2 className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">
              {EXAMPLE_ARTIST} - {EXAMPLE_TRACK}
            </span>
          </div>
        </div>
      </>
    )
  }

  if (platform === "instagram") {
    return (
      <>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-3 pb-8 pt-2.5">
          <span className="text-[12px] font-semibold text-white">Reels</span>
          <span className="text-[10px] text-white/70">Камера</span>
        </div>
        <div className="pointer-events-none absolute bottom-14 right-2.5 z-20 flex flex-col items-center gap-3.5 text-white">
          <Heart className="h-6 w-6" aria-hidden />
          <MessageCircle className="h-6 w-6" aria-hidden />
          <Share2 className="h-6 w-6" aria-hidden />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3.5 pt-10">
          <p className="truncate text-[12px] font-semibold text-white">{EXAMPLE_HANDLE}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-white/90">
            {EXAMPLE_TRACK} - готовый вертикальный ролик
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/85">
            <Music2 className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">
              {EXAMPLE_ARTIST} · {EXAMPLE_TRACK}
            </span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 to-transparent px-3 pb-8 pt-2.5">
        <span className="text-[12px] font-semibold text-white">Shorts</span>
      </div>
      <div className="pointer-events-none absolute bottom-14 right-2.5 z-20 flex flex-col items-center gap-3.5 text-white">
        <Heart className="h-6 w-6" aria-hidden />
        <MessageCircle className="h-6 w-6" aria-hidden />
        <Share2 className="h-6 w-6" aria-hidden />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3.5 pt-10">
        <p className="truncate text-[12px] font-semibold text-white">{EXAMPLE_HANDLE}</p>
        <p className="mt-0.5 truncate text-[11px] text-white/90">{EXAMPLE_TRACK}</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/85">
          <Music2 className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">Звук · {EXAMPLE_TRACK}</span>
        </div>
      </div>
    </>
  )
}

function PhoneShell({
  platform,
  size,
  tilt,
  children,
}: {
  platform: PlatformId
  size: "side" | "center" | "mobile"
  tilt?: "left" | "right"
  children: ReactNode
}) {
  const isCenter = size === "center"
  const isMobile = size === "mobile"
  const label = PLATFORMS.find((p) => p.id === platform)?.label ?? platform

  return (
    <div
      className={cn(
        "relative shrink-0",
        isMobile
          ? "mx-auto w-[min(100%,17.5rem)]"
          : isCenter
            ? "z-10 w-[42%] max-w-[11.5rem]"
            : "z-0 w-[30%] max-w-[8.25rem] opacity-95",
        !isMobile && tilt === "left" && "origin-bottom -rotate-[7deg] translate-y-3",
        !isMobile && tilt === "right" && "origin-bottom rotate-[7deg] translate-y-3",
      )}
    >
      <p
        className={cn(
          "mb-2 text-center font-medium text-muted-foreground",
          isMobile || isCenter ? "text-[11px]" : "text-[10px]",
        )}
      >
        {label}
      </p>
      <div
        className={cn(
          "relative overflow-hidden border-[6px] border-[#1A181E]",
          "bg-[#0B0A0E] shadow-[0_22px_48px_-22px_rgba(0,0,0,0.85),inset_0_0_0_1px_rgba(255,255,255,0.06)]",
          "before:pointer-events-none before:absolute before:inset-0 before:z-30 before:rounded-[inherit]",
          "before:bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,transparent_28%,transparent_72%,rgba(255,255,255,0.04)_100%)]",
          isMobile
            ? "rounded-[34px]"
            : isCenter
              ? "rounded-[32px]"
              : "rounded-[30px]",
        )}
      >
        <div
          className={cn(
            "absolute left-1/2 top-[7px] z-40 h-[18px] -translate-x-1/2 rounded-full bg-[#050506]",
            isCenter || isMobile ? "w-16" : "w-12",
          )}
          aria-hidden
        />
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            isMobile ? "rounded-[28px]" : isCenter ? "rounded-[26px]" : "rounded-[24px]",
          )}
        >
          <div className="relative aspect-[9/16] w-full">
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3.5 pt-2.5 text-[10px] font-medium text-white/90">
              <span>9:41</span>
              <span className="flex gap-1" aria-hidden>
                <span className="h-1.5 w-3 rounded-sm bg-white/80" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              </span>
            </div>
            {children}
            <PlatformChrome platform={platform} />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-1.5 z-30 flex justify-center"
              aria-hidden
            >
              <span className="h-1 w-20 rounded-full bg-white/55" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExampleVideoPlayer({
  className,
  label,
}: {
  className?: string
  label: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video || failed) return
    if (video.paused) {
      void video.play().then(() => setPlaying(true)).catch(() => setFailed(true))
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [failed])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video || failed) return
    video.muted = !video.muted
    setMuted(video.muted)
  }, [failed])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onEnded = () => setPlaying(false)
    const onPause = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    video.addEventListener("ended", onEnded)
    video.addEventListener("pause", onPause)
    video.addEventListener("play", onPlay)
    return () => {
      video.removeEventListener("ended", onEnded)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("play", onPlay)
    }
  }, [])

  if (failed) {
    return (
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[linear-gradient(165deg,#1a1216_0%,#141418_45%,#0c0b0e_100%)] px-4",
          className,
        )}
      >
        <Film className="h-8 w-8 text-[#FFB4C5]/80" aria-hidden />
        <p className="text-center text-[11px] leading-snug text-muted-foreground">
          Пример временно недоступен. Показан заменяемый постер монтажа.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("absolute inset-0", className)}>
      <video
        ref={videoRef}
        src={EXAMPLE_VIDEO_SRC}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted={muted}
        preload="metadata"
        loop
        onError={() => setFailed(true)}
        aria-label={label}
      />
      <div className="absolute bottom-[5.25rem] left-2.5 z-40 flex gap-1.5">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-black/55 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm"
          aria-label={playing ? "Пауза примера" : "Смотреть пример"}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{playing ? "Пауза" : "Смотреть"}</span>
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/25 bg-black/55 px-2 text-white backdrop-blur-sm"
          aria-label={muted ? "Включить звук" : "Выключить звук"}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

function PhonesComposition({
  platform,
  onPlatformChange,
}: {
  platform: PlatformId
  onPlatformChange: (id: PlatformId) => void
}) {
  return (
    <div className="w-full min-w-0">
      <p className="mb-4 text-center text-sm font-medium text-foreground">
        Ваш ролик в TikTok, Reels и Shorts
      </p>

      {/* Desktop / tablet: three phones */}
      <div className="hidden max-w-full items-end justify-center gap-1 overflow-x-clip px-2 md:flex lg:gap-2">
        <PhoneShell platform="tiktok" size="side" tilt="left">
          <ExampleVideoPlayer label="Пример монтажа в TikTok" />
        </PhoneShell>
        <PhoneShell platform="instagram" size="center">
          <ExampleVideoPlayer label="Пример монтажа в Instagram Reels" />
        </PhoneShell>
        <PhoneShell platform="youtube" size="side" tilt="right">
          <ExampleVideoPlayer label="Пример монтажа в YouTube Shorts" />
        </PhoneShell>
      </div>

      {/* Mobile: one phone + switcher */}
      <div className="md:hidden">
        <div
          className="mb-4 flex rounded-xl border border-border bg-card p-1"
          role="tablist"
          aria-label="Площадка примера"
        >
          {PLATFORMS.map((p) => {
            const selected = platform === p.id
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  "min-h-11 flex-1 rounded-lg px-2 text-[12px] font-medium transition-colors",
                  selected
                    ? "bg-[#F21D43] text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onPlatformChange(p.id)}
              >
                {p.short}
              </button>
            )
          })}
        </div>
        <PhoneShell platform={platform} size="mobile">
          <ExampleVideoPlayer label={`Пример монтажа в ${PLATFORMS.find((p) => p.id === platform)?.label}`} />
        </PhoneShell>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">Пример отображения на площадках</p>
    </div>
  )
}

function VerticalVideoLandingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const totalLiveId = useId()

  const [platform, setPlatform] = useState<PlatformId>("instagram")
  const [tracks, setTracks] = useState<Array<{ id: string; trackName: string }>>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false)
  const [videosCount, setVideosCount] = useState(1)
  const [countInput, setCountInput] = useState("1")
  const [trackTitle, setTrackTitle] = useState("")
  const [comment, setComment] = useState("")
  const [contactType, setContactType] = useState<"telegram" | "vk" | "max">("telegram")
  const [contactValue, setContactValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const paymentSuccessHandledRef = useRef(false)
  const initialTrackPickedRef = useRef(false)

  useEffect(() => {
    fetch("/api/cabinet/tracks", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/cabinet")
          return
        }
        const data = (await res.json().catch(() => ({}))) as {
          tracks?: Array<{ id: string; trackName?: string }>
        }
        const nextTracks = Array.isArray(data.tracks)
          ? data.tracks
              .map((track) => ({
                id: String(track.id),
                trackName: String(track.trackName ?? "").trim(),
              }))
              .filter((track) => track.trackName.length > 0)
          : []
        setTracks(nextTracks)
        if (!initialTrackPickedRef.current && nextTracks.length > 0) {
          initialTrackPickedRef.current = true
          setTrackTitle(nextTracks[0].trackName)
        }
      })
      .finally(() => setTracksLoading(false))
  }, [router])

  useEffect(() => {
    const paymentState = searchParams.get("payment")
    const orderId = searchParams.get("orderId")
    if (paymentState !== "return" || !orderId || paymentSuccessHandledRef.current) return
    paymentSuccessHandledRef.current = true
    void (async () => {
      try {
        const res = await fetch(
          `/api/cabinet/payments/order-status?orderId=${encodeURIComponent(orderId)}`,
          { credentials: "include" },
        )
        const data = (await res.json().catch(() => ({}))) as { paid?: boolean }
        if (res.ok && data.paid) {
          setPaymentSuccessOpen(true)
        } else {
          toast.error("Оплата не завершена, заказ не оформлен")
        }
      } finally {
        router.replace("/cabinet/promotion/vertical-video", { scroll: false })
      }
    })()
  }, [searchParams, router])

  const unitPrice = useMemo(() => getVerticalVideoUnitPrice(videosCount || 0), [videosCount])
  const total = videosCount * unitPrice
  const activeTier = useMemo(() => getVerticalVideoTierForCount(videosCount || 1), [videosCount])
  const validCount =
    Number.isInteger(videosCount) &&
    videosCount >= VERTICAL_VIDEO_MIN_COUNT &&
    videosCount <= VERTICAL_VIDEO_MAX_COUNT
  const hasTracks = tracks.length > 0
  const validTrackTitle = trackTitle.trim().length > 0
  const validContact = contactValue.trim().length >= 2

  const syncCount = useCallback((next: number) => {
    const clamped = Math.min(
      VERTICAL_VIDEO_MAX_COUNT,
      Math.max(VERTICAL_VIDEO_MIN_COUNT, Math.trunc(next)),
    )
    setVideosCount(clamped)
    setCountInput(String(clamped))
  }, [])

  const applyCountInput = useCallback((raw: string) => {
    setCountInput(raw)
    if (raw.trim() === "") {
      setVideosCount(0)
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      setVideosCount(0)
      return
    }
    setVideosCount(n)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validCount || !validTrackTitle || !validContact || !hasTracks || loading) {
      if (!validCount) {
        setError(`Количество видео должно быть от ${VERTICAL_VIDEO_MIN_COUNT} до ${VERTICAL_VIDEO_MAX_COUNT}`)
      } else if (!validTrackTitle) {
        setError("Укажите название трека")
      } else if (!hasTracks) {
        setError("Сначала загрузите хотя бы один трек в кабинет")
      } else if (!validContact) {
        setError("Укажите контакт для связи")
      }
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/payments/vertical-video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          videosCount,
          trackTitle: trackTitle.trim(),
          comment: comment.trim(),
          contactType,
          contactValue: contactValue.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        paid?: boolean
        error?: string
      }
      if (!res.ok) {
        setError(data.error || "Не удалось оплатить с баланса")
        return
      }
      if (data.paid) {
        toast.success("Оплата с баланса прошла успешно. Заказ принят в работу.")
        setComment("")
        setContactValue("")
        return
      }
      setError("Не удалось оплатить с баланса")
    } catch {
      setError("Ошибка сети, попробуйте позже")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1120px] space-y-10 pb-10 md:space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => openCabinetSupportChat()}>
          Задать вопрос
        </Button>
      </div>

      {/* Hero */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Монтаж вертикальных видео
          </p>
          <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.5rem]">
            <span className="block text-foreground">Видеонарезки</span>
            <span className="block text-[#F21D43]">под ваш трек.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Подберём общедоступные видео из интернета, нарежем и склеим их фрагменты под вашу музыку.
            Вы получите готовые вертикальные ролики для TikTok, Reels и Shorts.
          </p>
          <div className="flex flex-wrap gap-2">
            {["TikTok", "Reels", "Shorts"].map((name) => (
              <span
                key={name}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-[#F21D43] sm:text-3xl">
              {VERTICAL_VIDEO_PRICE_TIER_3_RUB}-{VERTICAL_VIDEO_PRICE_TIER_1_RUB} ₽ за видео
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Цена зависит от количества. Одно видео - {formatVerticalVideoRub(VERTICAL_VIDEO_PRICE_TIER_1_RUB)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="h-11 min-h-11 bg-[#F21D43] px-5 text-white hover:bg-[#F21D43]/90"
              onClick={() => scrollToId("vv-pricing")}
            >
              Рассчитать серию
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 border-border bg-transparent"
              onClick={() => scrollToId("vv-process")}
            >
              Как это работает
            </Button>
          </div>
        </div>

        <PhonesComposition platform={platform} onPlatformChange={setPlatform} />
      </section>

      {/* Include */}
      <section id="vv-include" className="scroll-mt-20 space-y-5">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
            Готовый видеоряд. Монтаж под музыку.
          </h2>
          <p className="text-[15px] text-muted-foreground">
            Подбор фрагментов, нарезка и склейка в вертикальные ролики.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {INCLUDE_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-[14px] border border-border bg-card px-4 py-4"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F21D43]/12 text-[#F21D43]">
                <card.icon className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section id="vv-process" className="scroll-mt-20 space-y-5">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
          От трека до готовых нарезок.
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PROCESS_STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-[14px] border border-border bg-card px-4 py-4"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-[#F21D43]">{step.num}</p>
              <h3 className="mt-2 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing + order */}
      <section id="vv-pricing" className="scroll-mt-20 space-y-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
            Выберите объём серии
          </h2>
          <p className="text-[15px] text-muted-foreground">
            От 1 до 500 видео. Стоимость за ролик зависит от количества в заказе.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {VERTICAL_VIDEO_TIERS.map((tier) => {
            const active =
              validCount && videosCount >= tier.min && videosCount <= tier.max
            return (
              <button
                key={`${tier.min}-${tier.max}`}
                type="button"
                aria-pressed={active}
                className={cn(
                  "rounded-[14px] border px-4 py-4 text-left transition-colors",
                  active
                    ? "border-[#F21D43] bg-[#F21D43]/10"
                    : "border-border bg-card hover:border-[#F21D43]/40",
                )}
                onClick={() => {
                  syncCount(tier.preset)
                  scrollToId("vv-order")
                }}
              >
                <span className="block text-xs text-muted-foreground">
                  {tier.min}-{tier.max} · {formatVerticalVideoRub(tier.unitPrice)} за видео
                </span>
                <span className="mt-2 block text-lg font-bold text-foreground">
                  {formatVerticalVideoRub(tier.unitPrice)}
                </span>
                <span className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-[#F21D43]">
                  Рассчитать {tier.preset} видео
                </span>
              </button>
            )
          })}
        </div>

        <div
          id="vv-order"
          className="scroll-mt-20 grid gap-6 rounded-[16px] border border-border bg-card p-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-8 md:p-6"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Ваша серия
              </p>
              <h3 className="mt-1 text-xl font-bold text-foreground">Ваш трек. Готовый видеоряд.</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Укажите количество видео и выберите трек. После оплаты уточним пожелания к подбору и
                монтажу видеоряда в переписке.
              </p>
            </div>

            <div
              id={totalLiveId}
              aria-live="polite"
              className="rounded-[14px] border border-border bg-muted p-4"
            >
              {validCount ? (
                <>
                  <p className="text-3xl font-bold tracking-tight text-[#F21D43]">
                    {formatVerticalVideoRub(total)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {videosCount} {videoWord(videosCount)} × {formatVerticalVideoRub(unitPrice)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Тариф для {activeTier.min}-{activeTier.max} видео
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#F21D43]">
                  Укажите целое число от {VERTICAL_VIDEO_MIN_COUNT} до {VERTICAL_VIDEO_MAX_COUNT}
                </p>
              )}
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-[#F21D43]" aria-hidden>
                  ·
                </span>
                Подбор готовых видео.
              </li>
              <li className="flex gap-2">
                <span className="text-[#F21D43]" aria-hidden>
                  ·
                </span>
                Нарезка и склейка фрагментов.
              </li>
              <li className="flex gap-2">
                <span className="text-[#F21D43]" aria-hidden>
                  ·
                </span>
                Монтаж под выбранный трек.
              </li>
            </ul>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Услуга включает монтаж роликов из готового видеоряда для публикации в ваших соцсетях.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">Оформление заказа</h3>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-count">Количество видео</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 border-border"
                  disabled={loading || videosCount <= VERTICAL_VIDEO_MIN_COUNT}
                  aria-label="Уменьшить количество"
                  onClick={() => syncCount((videosCount || 1) - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="vertical-video-count"
                  type="number"
                  inputMode="numeric"
                  min={VERTICAL_VIDEO_MIN_COUNT}
                  max={VERTICAL_VIDEO_MAX_COUNT}
                  value={countInput}
                  onChange={(e) => applyCountInput(e.target.value)}
                  onBlur={() => {
                    if (validCount) setCountInput(String(videosCount))
                  }}
                  disabled={loading}
                  className="h-11 text-center text-base md:text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 border-border"
                  disabled={loading || videosCount >= VERTICAL_VIDEO_MAX_COUNT}
                  aria-label="Увеличить количество"
                  onClick={() => syncCount((videosCount || 0) + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Целое число от {VERTICAL_VIDEO_MIN_COUNT} до {VERTICAL_VIDEO_MAX_COUNT}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-track-title">Трек для видео</Label>
              <select
                id="vertical-video-track-title"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                disabled={loading || tracksLoading || !hasTracks}
              >
                {tracksLoading ? (
                  <option value="">Загрузка треков...</option>
                ) : hasTracks ? (
                  tracks.map((track) => (
                    <option key={track.id} value={track.trackName}>
                      {track.trackName}
                    </option>
                  ))
                ) : (
                  <option value="">Нет загруженных треков</option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-comment">Пожелания к видеоряду</Label>
              <Textarea
                id="vertical-video-comment"
                placeholder="Например: город, природа, дорога, спокойное настроение"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                disabled={loading}
                className="text-base md:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-contact-type">Способ связи</Label>
              <select
                id="vertical-video-contact-type"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                value={contactType}
                onChange={(e) => setContactType(e.target.value as "telegram" | "vk" | "max")}
                disabled={loading}
              >
                <option value="telegram">Telegram</option>
                <option value="vk">VK</option>
                <option value="max">Max</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vertical-video-contact-value">Контакт</Label>
              <Input
                id="vertical-video-contact-value"
                type="text"
                placeholder="@username, ссылка или номер"
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                disabled={loading}
                className="h-11 text-base md:text-sm"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              className="h-11 min-h-11 w-full bg-[#F21D43] text-white hover:bg-[#F21D43]/90"
              disabled={!validCount || !validTrackTitle || !validContact || !hasTracks || loading}
            >
              {loading
                ? "Оплата…"
                : validCount
                  ? `Оплатить ${formatVerticalVideoRub(total)} с баланса`
                  : "Оплатить с баланса"}
            </Button>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section id="vv-faq" className="scroll-mt-20 max-w-3xl space-y-5">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
          Перед заказом
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`vv-faq-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <Dialog
        open={paymentSuccessOpen}
        onOpenChange={(open) => {
          if (open) setPaymentSuccessOpen(true)
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle>Заказ оформлен</DialogTitle>
            <DialogDescription className="pt-2 text-base text-foreground">
              Ваш заказ оформлен, ожидайте, в ближайшее время с вами свяжется наш менеджер.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button type="button" className="min-w-[120px]" onClick={() => setPaymentSuccessOpen(false)}>
              ОК
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VerticalVideoLanding() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-background p-4" />}>
      <VerticalVideoLandingInner />
    </Suspense>
  )
}
