"use client"

import { Suspense, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Check, ImageIcon, Layers, Sparkles } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  AI_COVER_PRICE_RUB,
  type AiCoverContactType,
  type AiCoverFieldErrors,
  validateAiCoverOrder,
} from "@/lib/ai-cover-order"
import { cn } from "@/lib/utils"

type PortfolioItem = {
  src: string
  alt: string
}

const PORTFOLIO: PortfolioItem[] = [
  { src: "/aicover/example-01.webp", alt: "Пример обложки 1" },
  { src: "/aicover/example-02.webp", alt: "Пример обложки 2" },
  { src: "/aicover/example-03.webp", alt: "Пример обложки 3" },
  { src: "/aicover/example-04.webp", alt: "Пример обложки 4" },
  { src: "/aicover/example-05.webp", alt: "Пример обложки 5" },
  { src: "/aicover/example-06.webp", alt: "Пример обложки 6" },
  { src: "/aicover/example-07.webp", alt: "Пример обложки 7" },
  { src: "/aicover/example-08.webp", alt: "Пример обложки 8" },
  { src: "/aicover/example-09.webp", alt: "Пример обложки 9" },
  { src: "/aicover/example-10.webp", alt: "Пример обложки 10" },
  { src: "/aicover/example-11.webp", alt: "Пример обложки 11" },
]

const GALLERY_INITIAL = 8

const RESULT_CARDS = [
  {
    icon: Layers,
    title: "6-9 вариантов",
    body: "Подготовим варианты по материалам релиза и вашим пожеланиям к оформлению.",
  },
  {
    icon: Check,
    title: "Выбор и согласование",
    body: "Вы выбираете один вариант, а мы согласуем его финальное оформление.",
  },
  {
    icon: ImageIcon,
    title: "Файл 3000 x 3000",
    body: "Получаете выбранную обложку в готовом размере для передачи на стриминги.",
  },
] as const

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Материалы релиза",
    body: "Присылаете материалы релиза и пожелания к оформлению, если они есть.",
  },
  {
    num: "02",
    title: "6-9 вариантов",
    body: "Готовим и отправляем обложки на выбор. Вы отмечаете один понравившийся вариант.",
  },
  {
    num: "03",
    title: "Финальная обложка",
    body: "Согласуем оформление и готовим выбранную обложку в размере 3000 x 3000 пикселей.",
  },
] as const

const FAQ_ITEMS = [
  {
    q: "Что входит в 500 руб.?",
    a: "6-9 AI-вариантов на выбор, согласование одного выбранного варианта и одна финальная обложка 3000 x 3000 пикселей.",
  },
  {
    q: "Можно добавить имя артиста и название релиза?",
    a: "Да. В форме включите «Добавить на обложку имя артиста и название релиза» и заполните оба поля. Стоимость остается 500 руб.",
  },
  {
    q: "Можно заказать обложку без текста?",
    a: "Да. Оставьте галку выключенной. Имя артиста и название релиза для нанесения на обложку указывать не потребуется.",
  },
  {
    q: "Что написать в пожеланиях?",
    a: "Жанр, настроение, желаемые цвета и визуальные образы. Можно добавить ссылки на референсы. Если конкретной идеи нет, напишите «На ваш вкус».",
  },
  {
    q: "В каком размере будет готовая обложка?",
    a: "3000 x 3000 пикселей.",
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

function contactPlaceholder(type: AiCoverContactType): string {
  if (type === "telegram") return "@username или ссылка"
  if (type === "vk") return "Ссылка или id VK"
  return "Номер или ссылка Max"
}

function HeroCovers() {
  const front = PORTFOLIO[0]
  const backLeft = PORTFOLIO[1]
  const backRight = PORTFOLIO[2]
  return (
    <div className="relative mx-auto w-full max-w-[22rem] sm:max-w-[26rem]">
      <p className="mb-3 text-center text-[11px] font-medium text-[#B2AAB8]">
        Примеры работ Parallax Music
      </p>
      <div className="relative mx-auto aspect-square w-full max-w-[20rem] sm:max-w-[22rem]">
        <div
          className={cn(
            "absolute left-0 top-[8%] z-0 w-[58%] overflow-hidden rounded-[12px] border border-[#2B2630]",
            "origin-bottom -rotate-[8deg] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)]",
            "motion-safe:transition-transform",
          )}
        >
          <img
            src={backLeft.src}
            alt=""
            width={600}
            height={600}
            className="aspect-square w-full object-cover"
            decoding="async"
          />
        </div>
        <div
          className={cn(
            "absolute right-0 top-[6%] z-0 w-[58%] overflow-hidden rounded-[12px] border border-[#2B2630]",
            "origin-bottom rotate-[9deg] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)]",
            "motion-safe:transition-transform",
          )}
        >
          <img
            src={backRight.src}
            alt=""
            width={600}
            height={600}
            className="aspect-square w-full object-cover"
            decoding="async"
          />
        </div>
        <div
          className={cn(
            "absolute left-1/2 top-[12%] z-10 w-[72%] -translate-x-1/2 overflow-hidden rounded-[14px]",
            "border border-[#2B2630] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.9)]",
          )}
        >
          <img
            src={front.src}
            alt={front.alt}
            width={900}
            height={900}
            className="aspect-square w-full object-cover"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>
    </div>
  )
}

function AiCoverLandingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const commentHintId = useId()
  const textHintId = useId()

  const [includeTextOnCover, setIncludeTextOnCover] = useState(false)
  const [artistName, setArtistName] = useState("")
  const [releaseTitle, setReleaseTitle] = useState("")
  const [comment, setComment] = useState("")
  const [contactType, setContactType] = useState<AiCoverContactType>("telegram")
  const [contactValue, setContactValue] = useState("")
  const [fieldErrors, setFieldErrors] = useState<AiCoverFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false)
  const [galleryExpanded, setGalleryExpanded] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const paymentSuccessHandledRef = useRef(false)
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([])
  const closePreviewRef = useRef<HTMLButtonElement | null>(null)

  const artistNameRef = useRef<HTMLInputElement | null>(null)
  const releaseTitleRef = useRef<HTMLInputElement | null>(null)
  const commentRef = useRef<HTMLTextAreaElement | null>(null)
  const contactTypeRef = useRef<HTMLSelectElement | null>(null)
  const contactValueRef = useRef<HTMLInputElement | null>(null)

  const extraCount = Math.max(0, PORTFOLIO.length - GALLERY_INITIAL)
  const visibleItems = galleryExpanded ? PORTFOLIO : PORTFOLIO.slice(0, GALLERY_INITIAL)
  const previewItem = previewIndex !== null ? PORTFOLIO[previewIndex] : null

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
        router.replace("/cabinet/promotion/ai-cover", { scroll: false })
      }
    })()
  }, [searchParams, router])

  useEffect(() => {
    if (previewIndex === null) return
    const t = window.setTimeout(() => closePreviewRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [previewIndex])

  const focusFirstError = (errors: AiCoverFieldErrors) => {
    if (errors.artistName) {
      artistNameRef.current?.focus()
      return
    }
    if (errors.releaseTitle) {
      releaseTitleRef.current?.focus()
      return
    }
    if (errors.comment) {
      commentRef.current?.focus()
      return
    }
    if (errors.contactType) {
      contactTypeRef.current?.focus()
      return
    }
    if (errors.contactValue) {
      contactValueRef.current?.focus()
    }
  }

  const handleIncludeTextChange = (checked: boolean) => {
    setIncludeTextOnCover(checked)
    if (!checked) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.artistName
        delete next.releaseTitle
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validated = validateAiCoverOrder({
      includeTextOnCover,
      artistName,
      releaseTitle,
      comment,
      contactType,
      contactValue,
    })

    if (!validated.ok) {
      setFieldErrors(validated.fieldErrors)
      setFormError(validated.error)
      focusFirstError(validated.fieldErrors)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/payments/ai-cover/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          includeTextOnCover: validated.includeTextOnCover,
          ...(validated.includeTextOnCover
            ? {
                artistName: validated.artistName,
                releaseTitle: validated.releaseTitle,
              }
            : {}),
          comment: validated.comment,
          contactType: validated.contactType,
          contactValue: validated.contactValue,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        confirmationUrl?: string
        error?: string
        fieldErrors?: AiCoverFieldErrors
      }
      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors)
          focusFirstError(data.fieldErrors)
        }
        setFormError(data.error || "Не удалось создать платёж, попробуйте позже")
        return
      }
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
        return
      }
      setFormError("Не удалось создать платёж, попробуйте позже")
    } catch {
      setFormError("Ошибка сети, попробуйте позже")
    } finally {
      setLoading(false)
    }
  }

  const openPreview = (index: number) => {
    setPreviewIndex(index)
  }

  const closePreview = () => {
    const idx = previewIndex
    setPreviewIndex(null)
    if (idx !== null) {
      window.setTimeout(() => triggerRefs.current[idx]?.focus(), 0)
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

      <section
        id="ai-cover-hero"
        className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10"
      >
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B2AAB8]">
            AI-обложка для вашего релиза
          </p>
          <h1 className="text-[2.15rem] font-bold leading-[1.1] tracking-tight sm:text-[2.75rem] md:text-[3.25rem]">
            <span className="text-[#F7F4F6]">Обложка </span>
            <span className="text-[#F21D43]">под ваш звук.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-[#B2AAB8] md:text-base">
            Подготовим 6-9 AI-вариантов по материалам вашего релиза и пожеланиям. Выберите один - мы
            согласуем оформление и подготовим финальную обложку 3000 x 3000 для стримингов.
          </p>
          <div>
            <p className="text-3xl font-bold tracking-tight text-[#F21D43] sm:text-4xl">
              {AI_COVER_PRICE_RUB} {"\u20BD"}
            </p>
            <p className="mt-1 text-sm text-[#B2AAB8]">За одну готовую обложку</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="h-11 min-h-11 bg-[#F21D43] px-5 text-white hover:bg-[#F21D43]/90"
              onClick={() => scrollToId("ai-cover-order")}
            >
              Заказать обложку
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 border-[#2B2630] bg-transparent"
              onClick={() => scrollToId("ai-cover-gallery")}
            >
              Посмотреть работы
            </Button>
          </div>
          <p className="text-sm text-[#B2AAB8]">6-9 вариантов на выбор · Один финальный файл</p>
        </div>

        <HeroCovers />
      </section>

      <section id="ai-cover-result" className="scroll-mt-20 space-y-5">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
            От идеи релиза до готовой обложки
          </h2>
          <p className="text-[15px] text-[#B2AAB8]">
            Несколько вариантов для выбора. Один финальный образ для вашего трека.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {RESULT_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-[14px] border border-[#2B2630] bg-[#151419] px-4 py-4"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F21D43]/12 text-[#F21D43]">
                <card.icon className="h-4 w-4" aria-hidden />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-[#F7F4F6]">{card.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#B2AAB8]">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="ai-cover-gallery" className="scroll-mt-20 space-y-5">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
            Разные треки. Разные образы.
          </h2>
          <p className="text-[15px] text-[#B2AAB8]">
            Примеры работ. Нажмите на обложку, чтобы рассмотреть её крупнее.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((item) => {
            const portfolioIndex = PORTFOLIO.findIndex((p) => p.src === item.src)
            return (
              <button
                key={item.src}
                type="button"
                ref={(el) => {
                  triggerRefs.current[portfolioIndex] = el
                }}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-[12px] border border-[#2B2630] bg-[#151419]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090C]",
                )}
                aria-label={`Открыть просмотр: ${item.alt}`}
                onClick={() => openPreview(portfolioIndex)}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  width={600}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                />
              </button>
            )
          })}
        </div>

        {extraCount > 0 ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 border-[#2B2630] bg-transparent"
              onClick={() => setGalleryExpanded((v) => !v)}
            >
              {galleryExpanded
                ? "Скрыть дополнительные работы"
                : `Показать ещё ${extraCount} ${extraCount === 1 ? "работу" : "работы"}`}
            </Button>
          </div>
        ) : null}
      </section>

      <section id="ai-cover-process" className="scroll-mt-20 space-y-5">
        <h2 className="text-2xl font-bold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
          Вы выбираете образ. Мы готовим финал.
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PROCESS_STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-[14px] border border-[#2B2630] bg-[#151419]/90 px-4 py-4"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-[#F21D43]">{step.num}</p>
              <h3 className="mt-2 text-sm font-semibold text-[#F7F4F6]">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#B2AAB8]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="ai-cover-order"
        className="scroll-mt-20 grid gap-6 rounded-[16px] border border-[#2B2630] bg-[#151419]/90 p-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-8 md:p-6"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B2AAB8]">Заказ</p>
            <h2 className="mt-1 text-xl font-bold text-[#F7F4F6] md:text-2xl">
              Какой образ у вашего трека?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#B2AAB8]">
              Расскажите про релиз и оставьте контакт. Менеджер уточнит материалы и пожелания для
              работы над обложкой.
            </p>
          </div>

          <div className="rounded-[14px] border border-[#2B2630] bg-[#09090C]/70 p-4">
            <p className="text-3xl font-bold tracking-tight text-[#F21D43]">
              {AI_COVER_PRICE_RUB} {"\u20BD"}
            </p>
            <p className="mt-1 text-sm text-[#B2AAB8]">За одну финальную обложку</p>
          </div>

          <ul className="space-y-2 text-sm text-[#B2AAB8]">
            <li className="flex gap-2">
              <span className="text-[#F21D43]" aria-hidden>
                ·
              </span>
              6-9 AI-вариантов на выбор.
            </li>
            <li className="flex gap-2">
              <span className="text-[#F21D43]" aria-hidden>
                ·
              </span>
              Согласование выбранной обложки.
            </li>
            <li className="flex gap-2">
              <span className="text-[#F21D43]" aria-hidden>
                ·
              </span>
              Финальный файл 3000 x 3000.
            </li>
          </ul>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-[#B2AAB8]">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB4C5]" aria-hidden />
            Текст на обложке - по желанию, без доплаты.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <h3 className="text-base font-semibold text-[#F7F4F6]">Заказать обложку</h3>

          <div className="flex items-start gap-3 rounded-md border border-[#2B2630] p-3">
            <Checkbox
              id="ai-cover-include-text"
              checked={includeTextOnCover}
              onCheckedChange={(checked) => handleIncludeTextChange(checked === true)}
              disabled={loading}
              className="mt-0.5"
            />
            <label
              htmlFor="ai-cover-include-text"
              className="cursor-pointer text-sm font-normal leading-snug text-[#F7F4F6]"
            >
              Добавить на обложку имя артиста и название релиза
            </label>
          </div>

          {includeTextOnCover ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="ai-cover-artist-name">Имя артиста</Label>
                  <Input
                    id="ai-cover-artist-name"
                    ref={artistNameRef}
                    value={artistName}
                    onChange={(e) => {
                      setArtistName(e.target.value)
                      if (fieldErrors.artistName) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.artistName
                          return next
                        })
                      }
                    }}
                    placeholder="Как должно быть написано на обложке"
                    disabled={loading}
                    aria-invalid={Boolean(fieldErrors.artistName)}
                    aria-describedby={
                      fieldErrors.artistName ? "ai-cover-artist-name-error" : textHintId
                    }
                    className="h-11 text-base md:text-sm"
                  />
                  {fieldErrors.artistName ? (
                    <p id="ai-cover-artist-name-error" className="text-sm text-destructive">
                      {fieldErrors.artistName}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="ai-cover-release-title">Название релиза</Label>
                  <Input
                    id="ai-cover-release-title"
                    ref={releaseTitleRef}
                    value={releaseTitle}
                    onChange={(e) => {
                      setReleaseTitle(e.target.value)
                      if (fieldErrors.releaseTitle) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.releaseTitle
                          return next
                        })
                      }
                    }}
                    placeholder="Точное название для обложки"
                    disabled={loading}
                    aria-invalid={Boolean(fieldErrors.releaseTitle)}
                    aria-describedby={
                      fieldErrors.releaseTitle ? "ai-cover-release-title-error" : textHintId
                    }
                    className="h-11 text-base md:text-sm"
                  />
                  {fieldErrors.releaseTitle ? (
                    <p id="ai-cover-release-title-error" className="text-sm text-destructive">
                      {fieldErrors.releaseTitle}
                    </p>
                  ) : null}
                </div>
              </div>
              <p id={textHintId} className="text-xs text-[#B2AAB8]">
                Используем это написание на обложке
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ai-cover-comment">Расскажите про релиз</Label>
            <Textarea
              id="ai-cover-comment"
              ref={commentRef}
              placeholder="Жанр, настроение, цвета, визуальные образы или ссылки на референсы"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                if (fieldErrors.comment) {
                  setFieldErrors((prev) => {
                    const next = { ...prev }
                    delete next.comment
                    return next
                  })
                }
              }}
              rows={3}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.comment)}
              aria-describedby={fieldErrors.comment ? "ai-cover-comment-error" : commentHintId}
              className="text-base md:text-sm"
            />
            {fieldErrors.comment ? (
              <p id="ai-cover-comment-error" className="text-sm text-destructive">
                {fieldErrors.comment}
              </p>
            ) : (
              <p id={commentHintId} className="text-xs text-[#B2AAB8]">
                Если нет конкретной идеи, можно написать «На ваш вкус»
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-cover-contact-type">Способ связи</Label>
            <select
              id="ai-cover-contact-type"
              ref={contactTypeRef}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
              value={contactType}
              onChange={(e) => setContactType(e.target.value as AiCoverContactType)}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.contactType)}
            >
              <option value="telegram">Telegram</option>
              <option value="vk">VK</option>
              <option value="max">Max</option>
            </select>
            {fieldErrors.contactType ? (
              <p className="text-sm text-destructive">{fieldErrors.contactType}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-cover-contact-value">Контакт</Label>
            <Input
              id="ai-cover-contact-value"
              ref={contactValueRef}
              type="text"
              placeholder={contactPlaceholder(contactType)}
              value={contactValue}
              onChange={(e) => {
                setContactValue(e.target.value)
                if (fieldErrors.contactValue) {
                  setFieldErrors((prev) => {
                    const next = { ...prev }
                    delete next.contactValue
                    return next
                  })
                }
              }}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.contactValue)}
              aria-describedby={
                fieldErrors.contactValue ? "ai-cover-contact-value-error" : undefined
              }
              className="h-11 text-base md:text-sm"
            />
            {fieldErrors.contactValue ? (
              <p id="ai-cover-contact-value-error" className="text-sm text-destructive">
                {fieldErrors.contactValue}
              </p>
            ) : null}
          </div>

          <p className="text-sm font-semibold text-[#F7F4F6]">
            Итого: {AI_COVER_PRICE_RUB} {"\u20BD"}
          </p>

          {formError && !Object.keys(fieldErrors).length ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-11 min-h-11 w-full bg-[#F21D43] text-white hover:bg-[#F21D43]/90"
            disabled={loading}
          >
            {loading ? "Создание платежа…" : `Оплатить ${AI_COVER_PRICE_RUB} \u20BD`}
          </Button>
        </form>
      </section>

      <section id="ai-cover-faq" className="scroll-mt-20 max-w-3xl space-y-5">
        <h2 className="text-2xl font-bold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
          Частые вопросы
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`ai-cover-faq-${i}`} className="border-[#2B2630]">
              <AccordionTrigger className="text-left text-[#F7F4F6] hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[#B2AAB8]">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <Dialog
        open={previewIndex !== null}
        onOpenChange={(open) => {
          if (!open) closePreview()
        }}
      >
        <DialogContent
          className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-3 overflow-y-auto border-[#2B2630] bg-[#151419] p-4 sm:max-w-xl sm:p-5"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <DialogHeader className="space-y-1 pr-12 text-left">
            <DialogTitle className="text-[#F7F4F6]">
              {previewItem?.alt ?? "Пример обложки"}
            </DialogTitle>
            <DialogDescription className="text-[#B2AAB8]">
              Пример работы Parallax Music
            </DialogDescription>
          </DialogHeader>
          <button
            ref={closePreviewRef}
            type="button"
            className="absolute top-3 right-3 inline-flex h-11 min-h-11 min-w-11 items-center justify-center rounded-md border border-[#2B2630] bg-[#09090C] px-3 text-sm font-medium text-[#F7F4F6] hover:bg-[#1A181E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43]"
            aria-label="Закрыть просмотр"
            onClick={closePreview}
          >
            Закрыть
          </button>
          {previewItem ? (
            <div className="mx-auto flex w-full max-w-md items-center justify-center">
              <img
                src={previewItem.src}
                alt={previewItem.alt}
                width={1200}
                height={1200}
                className="aspect-square max-h-[min(70vh,560px)] w-full object-contain"
                decoding="async"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
            <Button
              type="button"
              className="min-w-[120px]"
              onClick={() => setPaymentSuccessOpen(false)}
            >
              ОК
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AiCoverLanding() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-background p-4" />}>
      <AiCoverLandingInner />
    </Suspense>
  )
}
