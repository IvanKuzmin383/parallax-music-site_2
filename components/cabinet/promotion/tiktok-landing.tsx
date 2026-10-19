"use client"

import { useCallback, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  BarChart3,
  Bookmark,
  Clapperboard,
  Heart,
  MessageCircle,
  Music2,
  Share2,
  Users,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import { cn } from "@/lib/utils"

type PlatformId = "tiktok" | "instagram" | "youtube"

const EXAMPLE_VIDEO_SRC = "/videos/vertical-examples/example-2.mp4"
const EXAMPLE_HANDLE = "your_artist"
const EXAMPLE_TRACK = "Ваш трек"
const EXAMPLE_ARTIST = "Артист"

const PLATFORM_PREVIEWS: Array<{
  id: PlatformId
  label: string
  caption: string
}> = [
  { id: "tiktok", label: "TikTok", caption: "Этот момент звучит так" },
  { id: "instagram", label: "Instagram Reels", caption: "Твой трек на повторе" },
  { id: "youtube", label: "YouTube Shorts", caption: "Поймал ритм" },
]

const BENEFITS = [
  {
    title: "Музыка в контексте",
    body: "Трек становится частью короткого видео.",
  },
  {
    title: "Знакомство с аудиторией",
    body: "Музыку могут услышать зрители блогера.",
  },
  {
    title: "Отчёт по охватам",
    body: "Доступные данные о размещении.",
  },
] as const

const FORMATS = [
  {
    id: "lifestyle",
    label: "Лайфстайл",
    title: "Трек как часть повседневного кадра",
    body: "Прогулка, образ или небольшой момент из жизни. Музыка поддерживает атмосферу и помогает передать настроение.",
    tags: "Атмосфера · Настроение",
  },
  {
    id: "motion",
    label: "Движение",
    title: "Ритм, который поддерживает движение",
    body: "Танец или динамичный короткий кадр. Подача строится вокруг ритма и подходящего фрагмента трека.",
    tags: "Ритм · Динамика",
  },
  {
    id: "story",
    label: "История",
    title: "Музыка внутри небольшой истории",
    body: "Эмоция, юмор или короткий сюжет. Фрагмент трека становится частью истории, которую рассказывает ролик.",
    tags: "Сюжет · Эмоция",
  },
] as const

type FormatId = (typeof FORMATS)[number]["id"]

const INCLUDE_CARDS = [
  {
    eyebrow: "Формат",
    icon: Clapperboard,
    title: "Подбор форматов",
    body: "Определяем, какая подача короткого видео подходит вашему треку.",
  },
  {
    eyebrow: "Размещение",
    icon: Users,
    title: "Координация с блогерами",
    body: "Обсуждаем детали размещения и координируем работу с авторами роликов.",
  },
  {
    eyebrow: "Результат",
    icon: BarChart3,
    title: "Отчёт по охватам",
    body: "Собираем доступную статистику публикаций, чтобы вы могли оценить результат.",
  },
] as const

const PROCESS_STEPS = [
  {
    title: "Передайте трек, пожелания и бюджет",
    body: "Название релиза, ссылка на музыку, комментарий к размещению и ваш бюджет.",
  },
  {
    title: "Согласуем детали",
    body: "Формат, условия размещения, итоговая стоимость и сроки под выбранный бюджет.",
  },
  {
    title: "Координируем размещение",
    body: "Работу с блогерами по согласованному формату.",
  },
  {
    title: "Соберём отчёт",
    body: "Доступные данные о публикациях и их охватах.",
  },
] as const

const FAQ_ITEMS = [
  {
    q: "Можно гарантировать просмотры и новых слушателей?",
    a: "Фиксированных гарантий просмотров и переходов в прослушивания нет. Реакция аудитории зависит от трека, ролика и конкретного размещения. Результат оценивается по доступным данным публикаций.",
  },
  {
    q: "Что нужно для старта?",
    a: "Название релиза, ссылка на трек, бюджет и пожелания к продвижению. По этим данным обсуждаются формат и условия размещения.",
  },
  {
    q: "Сколько занимает размещение?",
    a: "Сроки согласуются для выбранного формата и блогеров. Конкретный срок указывается при оформлении заказа.",
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

function PlatformChrome({
  platform,
  caption,
}: {
  platform: PlatformId
  caption: string
}) {
  if (platform === "tiktok") {
    return (
      <>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-2.5 pb-8 pt-2">
          <div className="flex items-center justify-center gap-3 text-[10px] font-medium text-white/80">
            <span>Подписки</span>
            <span className="border-b border-white pb-0.5 font-semibold text-white">Для вас</span>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-12 right-2 z-20 flex flex-col items-center gap-3 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-[#1a1a1a]">
            <span className="text-[10px] font-bold">A</span>
          </div>
          <Heart className="h-5 w-5 fill-white/15" aria-hidden />
          <MessageCircle className="h-5 w-5" aria-hidden />
          <Bookmark className="h-5 w-5" aria-hidden />
          <Share2 className="h-5 w-5" aria-hidden />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-3 pt-10">
          <p className="truncate text-[11px] font-semibold text-white">@{EXAMPLE_HANDLE}</p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-white/90">{caption}</p>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/85">
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
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-2.5 pb-8 pt-2">
          <span className="text-[11px] font-semibold text-white">Reels</span>
          <span className="text-[10px] text-white/70">Камера</span>
        </div>
        <div className="pointer-events-none absolute bottom-12 right-2 z-20 flex flex-col items-center gap-3 text-white">
          <Heart className="h-5 w-5" aria-hidden />
          <MessageCircle className="h-5 w-5" aria-hidden />
          <Share2 className="h-5 w-5" aria-hidden />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-3 pt-10">
          <p className="truncate text-[11px] font-semibold text-white">{EXAMPLE_HANDLE}</p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-white/90">{caption}</p>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/85">
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-2.5 pb-8 pt-2">
        <span className="text-[11px] font-semibold text-white">Shorts</span>
      </div>
      <div className="pointer-events-none absolute bottom-12 right-2 z-20 flex flex-col items-center gap-3 text-white">
        <Heart className="h-5 w-5" aria-hidden />
        <MessageCircle className="h-5 w-5" aria-hidden />
        <Share2 className="h-5 w-5" aria-hidden />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-3 pt-10">
        <p className="truncate text-[11px] font-semibold text-white">{EXAMPLE_HANDLE}</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] text-white/90">{caption}</p>
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/85">
          <Music2 className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">Звук · {EXAMPLE_TRACK}</span>
        </div>
      </div>
    </>
  )
}

const PREVIEW_VIDEO_FALLBACKS = [
  EXAMPLE_VIDEO_SRC,
  "/videos/vertical-examples/example-1.mp4",
  "/videos/vertical-examples/example-3.mp4",
] as const

function PreviewVideoFill({ label }: { label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [srcIndex, setSrcIndex] = useState(0)
  const [failed, setFailed] = useState(false)
  const activeSrc = PREVIEW_VIDEO_FALLBACKS[srcIndex] ?? PREVIEW_VIDEO_FALLBACKS[0]

  if (failed) {
    return (
      <div
        className="absolute inset-0 bg-[linear-gradient(165deg,#2a1520_0%,#141418_50%,#0c0b0e_100%)]"
        aria-hidden
      />
    )
  }

  return (
    <video
      key={activeSrc}
      ref={videoRef}
      src={activeSrc}
      className="absolute inset-0 h-full w-full object-cover"
      playsInline
      muted
      loop
      autoPlay
      preload="metadata"
      onError={() => {
        setSrcIndex((prev) => {
          const next = prev + 1
          if (next < PREVIEW_VIDEO_FALLBACKS.length) return next
          setFailed(true)
          return prev
        })
      }}
      aria-label={label}
    />
  )
}

function PlatformPhone({
  platform,
  label,
  caption,
  size,
  tilt,
}: {
  platform: PlatformId
  label: string
  caption: string
  size: "side" | "center"
  tilt?: "left" | "right"
}) {
  const isCenter = size === "center"
  return (
    <div
      className={cn(
        "relative shrink-0",
        isCenter
          ? "z-10 w-[9.5rem] sm:w-[11rem] md:w-[12.5rem]"
          : "z-0 w-[7.25rem] opacity-95 sm:w-[8.25rem] md:w-[9rem]",
        tilt === "left" && "origin-bottom rotate-[-8deg] translate-y-4 sm:translate-y-5",
        tilt === "right" && "origin-bottom rotate-[8deg] translate-y-4 sm:translate-y-5",
        isCenter && "translate-y-0",
      )}
    >
      <p
        className={cn(
          "mb-1.5 text-center font-medium text-muted-foreground",
          isCenter ? "text-[11px]" : "text-[10px]",
        )}
      >
        {label}
      </p>
      <div
        className={cn(
          "relative overflow-hidden border-[5px] border-[#1A181E] bg-[#0B0A0E]",
          "shadow-[0_16px_36px_-20px_rgba(0,0,0,0.85)]",
          isCenter ? "rounded-[28px]" : "rounded-[24px]",
        )}
      >
        <div
          className={cn(
            "absolute left-1/2 top-[6px] z-40 h-3.5 -translate-x-1/2 rounded-full bg-[#050506]",
            isCenter ? "w-14" : "w-11",
          )}
          aria-hidden
        />
        <div className="relative aspect-[9/16] w-full overflow-hidden">
          <PreviewVideoFill label={`Пример в ${label}`} />
          <PlatformChrome platform={platform} caption={caption} />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-1 z-30 flex justify-center"
            aria-hidden
          >
            <span className="h-1 w-16 rounded-full bg-white/50" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewComposition() {
  const left = PLATFORM_PREVIEWS[0]!
  const center = PLATFORM_PREVIEWS[1]!
  const right = PLATFORM_PREVIEWS[2]!
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex items-end justify-center gap-2 px-2 sm:gap-3 sm:px-4">
        <PlatformPhone
          platform={left.id}
          label={left.label}
          caption={left.caption}
          size="side"
          tilt="left"
        />
        <PlatformPhone
          platform={center.id}
          label={center.label}
          caption={center.caption}
          size="center"
        />
        <PlatformPhone
          platform={right.id}
          label={right.label}
          caption={right.caption}
          size="side"
          tilt="right"
        />
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Примеры визуальной подачи в TikTok, Reels и Shorts
      </p>
    </div>
  )
}

export function TiktokLanding({ service }: { service: ServiceCatalogEntry }) {
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const formPanelId = useId()
  const formatPanelId = useId()

  const [format, setFormat] = useState<FormatId>("lifestyle")
  const [formOpen, setFormOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [trackLink, setTrackLink] = useState("")
  const [budget, setBudget] = useState("")
  const [comment, setComment] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    projectName?: string
    budget?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  const activeFormat = FORMATS.find((f) => f.id === format) ?? FORMATS[0]
  const priceLabel = service.priceLabel
  const features = service.features

  const openOrderForm = useCallback((expandForm: boolean) => {
    if (expandForm) setFormOpen(true)
    requestAnimationFrame(() => {
      scrollToId("tiktok-order")
      if (expandForm) {
        window.setTimeout(() => {
          document.getElementById("tiktok-project")?.focus()
        }, 280)
      }
    })
  }, [])

  const submitRequest = useCallback(async () => {
    if (!service.paymentEndpoint) {
      toast.error("Заявка пока недоступна")
      return
    }

    const nextErrors: { projectName?: string; budget?: string } = {}
    if (!projectName.trim()) nextErrors.projectName = "Укажите название релиза или проекта"
    if (!budget.trim()) nextErrors.budget = "Укажите бюджет"
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error(nextErrors.projectName || nextErrors.budget || "Заполните обязательные поля")
      setFormOpen(true)
      scrollToId("tiktok-order")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(service.paymentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackTitle: projectName.trim(),
          trackLink: trackLink.trim() || undefined,
          budget: budget.trim(),
          comment: comment.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        message?: string
        stub?: boolean
      }
      if (!res.ok) {
        toast.error(data.error || "Не удалось отправить заявку")
        return
      }
      toast.success(
        typeof data.message === "string" && data.message
          ? data.message
          : "Заявку получили. Деньги не списаны - свяжемся с вами.",
      )
      setProjectName("")
      setTrackLink("")
      setBudget("")
      setComment("")
      setFieldErrors({})
    } catch {
      toast.error("Ошибка при отправке заявки")
    } finally {
      setSubmitting(false)
    }
  }, [service.paymentEndpoint, projectName, trackLink, budget, comment])

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-10 pb-10 md:space-y-14">
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

      {/* A. Hero */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Продвижение через короткие видео
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            <span className="text-foreground">Ваш трек -</span>{" "}
            <span className="text-[#F51B40]">в роликах блогеров.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Покажите свою музыку аудитории блогеров. Подбираем формат короткого видео, координируем
            размещение и собираем доступную статистику публикаций.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="h-11 min-h-11 bg-[#F51B40] px-5 text-white hover:bg-[#F51B40]/90"
              onClick={() => openOrderForm(true)}
            >
              Продвинуть трек
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-h-11 px-5"
              onClick={() => scrollToId("tiktok-process")}
            >
              Как это работает
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{priceLabel}</span>
            {" - "}
            стоимость услуги
          </p>
        </div>
        <div className="min-w-0 overflow-x-hidden pt-1 lg:pt-0">
          <PreviewComposition />
        </div>
      </section>

      {/* B. Benefits */}
      <section
        className="grid gap-4 border-y border-border/80 py-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border"
        aria-label="Короткие преимущества"
      >
        {BENEFITS.map((item) => (
          <div key={item.title} className="min-w-0 sm:px-5 first:sm:pl-0 last:sm:pr-0">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>

      {/* C. Formats */}
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Идеи подачи
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Музыка задаёт настроение ролику
          </h2>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
            Один трек можно подать по-разному. Формат выбирается под музыку и содержание видео.
          </p>
        </div>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          role="group"
          aria-label="Примеры форматов"
        >
          {FORMATS.map((item) => {
            const active = item.id === format
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFormat(item.id)}
                className={cn(
                  "min-h-11 rounded-[12px] border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-[#F51B40]/50 bg-[#F51B40]/15 text-foreground"
                    : "border-border bg-muted text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <div
          id={formatPanelId}
          role="status"
          aria-live="polite"
          className="min-h-[7.5rem] rounded-[12px] border border-border bg-card px-4 py-4"
        >
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {activeFormat.title}
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{activeFormat.body}</p>
          <p className="mt-3 text-xs font-medium tracking-wide text-[#F51B40]">
            {activeFormat.tags}
          </p>
        </div>
      </section>

      {/* D. Include */}
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Что входит в услугу
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            От идеи до размещения
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {INCLUDE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-[12px] border border-border bg-card px-4 py-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {card.eyebrow}
                  </p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F51B40]/12 text-[#F51B40]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* E. Process + order */}
      <section
        id="tiktok-order"
        className="scroll-mt-20 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start"
      >
        <div id="tiktok-process" className="scroll-mt-20 space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Начнём с вашего трека
          </h2>
          <ol className="space-y-4">
            {PROCESS_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F51B40]/15 text-xs font-semibold text-[#F51B40]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="rounded-[12px] border border-[#F51B40]/25 bg-card p-5 shadow-sm lg:sticky lg:top-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{service.title}</h3>
            <p className="mt-2 text-2xl font-bold text-[#F51B40]">{priceLabel}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{service.shortDescription}</p>
          </div>

          <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-[#F51B40]" aria-hidden>
                  ·
                </span>
                <span>{feature}.</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2">
            <Button
              type="button"
              className="h-11 min-h-11 w-full bg-[#F51B40] text-white hover:bg-[#F51B40]/90"
              aria-expanded={formOpen}
              aria-controls={formPanelId}
              onClick={() => openOrderForm(true)}
            >
              Оформить продвижение
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Итоговая стоимость и сроки определяются по выбранному размещению и вашему бюджету.
            </p>
          </div>

          <div
            id={formPanelId}
            className={cn("mt-5 space-y-3 border-t border-border pt-5", !formOpen && "hidden")}
          >
            <div className="space-y-1.5">
              <Label htmlFor="tiktok-project">Название релиза / проекта</Label>
              <Input
                id="tiktok-project"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value)
                  if (fieldErrors.projectName) {
                    setFieldErrors((prev) => ({ ...prev, projectName: undefined }))
                  }
                }}
                placeholder="Мой сингл"
                className="text-base md:text-sm"
                aria-invalid={Boolean(fieldErrors.projectName)}
                disabled={submitting}
              />
              {fieldErrors.projectName ? (
                <p className="text-xs text-[#F51B40]">{fieldErrors.projectName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tiktok-link">Ссылка на трек</Label>
              <Input
                id="tiktok-link"
                value={trackLink}
                onChange={(e) => setTrackLink(e.target.value)}
                placeholder="https://..."
                className="text-base md:text-sm"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tiktok-budget">Бюджет *</Label>
              <Input
                id="tiktok-budget"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value)
                  if (fieldErrors.budget) {
                    setFieldErrors((prev) => ({ ...prev, budget: undefined }))
                  }
                }}
                placeholder="Например, 5 000 ₽"
                inputMode="text"
                className="text-base md:text-sm"
                aria-invalid={Boolean(fieldErrors.budget)}
                disabled={submitting}
              />
              {fieldErrors.budget ? (
                <p className="text-xs text-[#F51B40]">{fieldErrors.budget}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Укажите комфортный бюджет - под него подберём размещение. Ориентир витрины:{" "}
                  {priceLabel}.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tiktok-comment">Комментарий</Label>
              <Textarea
                id="tiktok-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Какое настроение или подачу хотите передать?"
                rows={3}
                className="text-base md:text-sm"
                disabled={submitting}
              />
            </div>
            <Button
              type="button"
              className="h-11 min-h-11 w-full bg-[#F51B40] text-white hover:bg-[#F51B40]/90"
              disabled={submitting}
              onClick={() => void submitRequest()}
            >
              {submitting ? "Отправка..." : service.interestCtaLabel || "Отправить заявку"}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Это заявка, не оплата. Деньги сейчас не списываются.
            </p>
          </div>
        </aside>
      </section>

      {/* F. FAQ */}
      <section id="faq" className="scroll-mt-20 space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Перед оформлением
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Что важно знать
          </h2>
        </div>
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-[12px] border border-border px-4"
        >
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`tiktok-faq-${i}`}>
              <AccordionTrigger className="text-left text-[15px]">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Button
          type="button"
          variant="outline"
          className="h-11 min-h-11"
          onClick={() => openCabinetSupportChat()}
        >
          Задать вопрос
        </Button>
      </section>
    </div>
  )
}
