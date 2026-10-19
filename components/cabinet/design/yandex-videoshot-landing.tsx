"use client"

import { Suspense, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Check } from "lucide-react"
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
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import { useI18n } from "@/lib/i18n-context"
import { YANDEX_VIDEOSHOT_PRICE_RUB } from "@/lib/yandex-videoshot-pricing"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"
import {
  resolveYandexVideoshotMode,
  VIDEO_DIRECTION_OPTIONS,
  type VideoDirectionValue,
  type YandexVideoshotMode,
} from "@/lib/yandex-videoshot-mode"
import { cn } from "@/lib/utils"
import { VideoShotPhone } from "@/components/cabinet/design/video-shot-phone"

type ContactType = "telegram" | "vk" | "max"

type FieldErrors = {
  trackUrl?: string
  demoUrl?: string
  fileUrl?: string
  isrc?: string
  upc?: string
  wishes?: string
  referencesUrl?: string
  contactValue?: string
  form?: string
}

const CODE_MAX_LEN = 32

function normalizeCode(value: string): string {
  return value.trim().toUpperCase()
}

const EXAMPLE_VIDEOS = [
  {
    src: "/videoshot/example1.MOV",
    poster: "/videoshot/example1-poster.jpg",
    caption: "Кадры из клипа",
    label: "Пример видеошота 1",
  },
  {
    src: "/videoshot/example2.MOV",
    poster: "/videoshot/example2-poster.jpg",
    caption: "Атмосферный визуал",
    label: "Пример видеошота 2",
  },
  {
    src: "/videoshot/example3.MOV",
    poster: "/videoshot/example3-poster.jpg",
    caption: "Бэкстейдж и выступление",
    label: "Пример видеошота 3",
  },
] as const

const STEPS_READY = [
  {
    num: "01",
    title: "Передайте готовое видео",
    body: "Укажите трек и пришлите готовый видеошот, который нужно добавить к нему.",
  },
  {
    num: "02",
    title: "Проверим материал",
    body: "Проверим соответствие требованиям площадки и сообщим, если нужна доработка.",
  },
  {
    num: "03",
    title: "Передадим на размещение",
    body: "Загрузим видео для вашего трека. Оно появится в плеере после публикации площадкой.",
  },
] as const

const STEPS_CREATE = [
  {
    num: "01",
    title: "Расскажите про релиз",
    body: "Пришлите трек, пожелания и референсы. Добавьте клип или бэкстейдж, если они есть.",
  },
  {
    num: "02",
    title: "Создадим видеоряд",
    body: "Соберём короткий ролик под настроение трека: из готовых кадров, графики или абстракции.",
  },
  {
    num: "03",
    title: "Проверим и разместим",
    body: "Подготовим материал по требованиям и загрузим его для вашего трека. Публикация входит в стоимость.",
  },
] as const

const FAQ_ITEMS = [
  {
    q: "Какой вариант выбрать?",
    a: "Если ролик готов, выберите "У меня есть видео" за 900 ₽. Если нужен видеоряд под трек, выберите "Нужно создать видео" за 3000 ₽.",
  },
  {
    q: "Публикация включена в создание за 3000 ₽?",
    a: "Да. В стоимость входят создание одного видеошота, проверка соответствия требованиям и загрузка в Яндекс Музыку.",
  },
  {
    q: "Нужен ли готовый клип для создания?",
    a: "Можно использовать ваш клип или бэкстейдж. Другие направления - моушн-дизайн и абстрактная графика. Пожелания уточним в переписке.",
  },
  {
    q: "Можно подготовить видеошот до выхода трека?",
    a: "Да. Закажите создание для готовящегося релиза и передайте аудиофайл или демо. Укажите детали будущего релиза в пожеланиях.",
  },
  {
    q: "Где появится видеошот?",
    a: "В мобильном плеере Яндекс Музыки при прослушивании трека, после публикации площадкой.",
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

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function contactPlaceholder(type: ContactType): string {
  if (type === "telegram") return "@username или ссылка"
  if (type === "vk") return "Ссылка или id VK"
  return "Номер или ссылка Max"
}

function ModeCard({
  selected,
  disabled,
  title,
  description,
  bullets,
  price,
  badge,
  onSelect,
  name,
  value,
}: {
  selected: boolean
  disabled?: boolean
  title: string
  description: string
  bullets: string[]
  price: string
  badge?: string
  onSelect: () => void
  name: string
  value: string
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col rounded-[16px] border bg-card p-5 transition-colors",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-[#F21D43] focus-within:ring-offset-2 focus-within:ring-offset-[#09090C]",
        selected ? "border-[#F21D43]" : "border-border hover:border-primary/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
            selected
              ? "border-[#F21D43] bg-[#F21D43] text-white"
              : "border-border bg-muted text-transparent",
          )}
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        {bullets.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-[#F21D43]" aria-hidden>
              ·
            </span>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="text-2xl font-bold tracking-tight text-[#F21D43]">{price}</p>
        {badge ? (
          <span className="rounded-md border border-[#F21D43]/40 bg-[#F21D43]/10 px-2 py-0.5 text-xs font-medium text-[#F21D43]">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="sr-only">{selected ? "Выбрано" : "Не выбрано"}</span>
    </label>
  )
}

function YandexVideoshotLandingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { t } = useI18n()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(
    backHref,
    t.cabinet.promotion.backToServices,
  )
  const formHintId = useId()
  const modeGroupName = useId()

  const [mode, setMode] = useState<YandexVideoshotMode>(() =>
    resolveYandexVideoshotMode(pathname, searchParams.get("mode")),
  )

  const [trackUrl, setTrackUrl] = useState("")
  const [demoUrl, setDemoUrl] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [isrc, setIsrc] = useState("")
  const [upc, setUpc] = useState("")
  const [wishes, setWishes] = useState("")
  const [comment, setComment] = useState("")
  const [videoDirection, setVideoDirection] = useState<VideoDirectionValue>("team")
  const [referencesUrl, setReferencesUrl] = useState("")
  const [contactType, setContactType] = useState<ContactType>("telegram")
  const [contactValue, setContactValue] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false)
  const paymentSuccessHandledRef = useRef(false)

  const trackUrlRef = useRef<HTMLInputElement>(null)
  const demoUrlRef = useRef<HTMLInputElement>(null)
  const fileUrlRef = useRef<HTMLInputElement>(null)
  const isrcRef = useRef<HTMLInputElement>(null)
  const upcRef = useRef<HTMLInputElement>(null)
  const wishesRef = useRef<HTMLTextAreaElement>(null)
  const contactValueRef = useRef<HTMLInputElement>(null)

  const price =
    mode === "create" ? YANDEX_VIDEOSHOT_CREATION_PRICE_RUB : YANDEX_VIDEOSHOT_PRICE_RUB
  const steps = mode === "create" ? STEPS_CREATE : STEPS_READY

  useEffect(() => {
    setMode(resolveYandexVideoshotMode(pathname, searchParams.get("mode")))
  }, [pathname, searchParams])

  useEffect(() => {
    fetch("/api/cabinet/tracks", { credentials: "include" }).then(async (res) => {
      if (res.status === 401) {
        router.replace("/cabinet")
      }
    })
  }, [router])

  useEffect(() => {
    const paymentState = searchParams.get("payment")
    const orderId = searchParams.get("orderId")
    if (paymentState === "fail") {
      toast.error("Оплата не завершена, заказ не оформлен")
      const params = new URLSearchParams(searchParams.toString())
      params.delete("payment")
      params.delete("orderId")
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      return
    }
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
        const params = new URLSearchParams(searchParams.toString())
        params.delete("payment")
        params.delete("orderId")
        if (!params.get("mode")) {
          params.set("mode", resolveYandexVideoshotMode(pathname, null))
        }
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }
    })()
  }, [searchParams, router, pathname])

  const applyMode = (next: YandexVideoshotMode) => {
    if (loading || next === mode) return
    setMode(next)
    setFieldErrors({})
    const params = new URLSearchParams(searchParams.toString())
    params.delete("payment")
    params.delete("orderId")
    params.set("mode", next)
    const qs = params.toString()
    router.replace(`${pathname}?${qs}`, { scroll: false })
  }

  const clearFieldError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validateLocal = (): FieldErrors => {
    const errors: FieldErrors = {}
    const contact = contactValue.trim()
    if (!contact || contact.length < 2) {
      errors.contactValue = "Укажите контакт для связи"
    }
    const isrcNorm = normalizeCode(isrc)
    const upcNorm = normalizeCode(upc)
    if (!isrcNorm) errors.isrc = "Укажите ISRC трека"
    else if (isrcNorm.length > CODE_MAX_LEN) errors.isrc = `ISRC не длиннее ${CODE_MAX_LEN} символов`
    if (!upcNorm) errors.upc = "Укажите UPC релиза"
    else if (upcNorm.length > CODE_MAX_LEN) errors.upc = `UPC не длиннее ${CODE_MAX_LEN} символов`

    if (mode === "ready") {
      const track = trackUrl.trim()
      const file = fileUrl.trim()
      if (!track) errors.trackUrl = "Укажите ссылку на трек в Яндекс Музыке"
      else if (!isHttpUrl(track)) errors.trackUrl = "Укажите корректную ссылку (http/https)"
      if (!file) errors.fileUrl = "Передайте готовое видео"
      else if (!isHttpUrl(file)) errors.fileUrl = "Укажите корректную ссылку (http/https)"
    } else {
      const demo = demoUrl.trim()
      const wish = wishes.trim()
      const refs = referencesUrl.trim()
      if (!demo || demo.length < 2) errors.demoUrl = "Укажите ссылку на трек или демо"
      else if (demo.includes("://") && !isHttpUrl(demo)) {
        errors.demoUrl = "Укажите корректную ссылку на трек или демо (http/https)"
      }
      if (!wish || wish.length < 2) {
        errors.wishes = "Добавьте пожелания или напишите "На ваш вкус""
      }
      if (refs && !isHttpUrl(refs)) {
        errors.referencesUrl = "Укажите корректную ссылку (http/https)"
      }
    }
    return errors
  }

  const focusFirstError = (errors: FieldErrors) => {
    if (mode === "ready") {
      if (errors.trackUrl) {
        trackUrlRef.current?.focus()
        return
      }
      if (errors.fileUrl) {
        fileUrlRef.current?.focus()
        return
      }
    } else {
      if (errors.demoUrl) {
        demoUrlRef.current?.focus()
        return
      }
      if (errors.wishes) {
        wishesRef.current?.focus()
        return
      }
    }
    if (errors.isrc) {
      isrcRef.current?.focus()
      return
    }
    if (errors.upc) {
      upcRef.current?.focus()
      return
    }
    if (errors.contactValue) contactValueRef.current?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateLocal()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      focusFirstError(errors)
      return
    }
    setFieldErrors({})
    setLoading(true)
    try {
      const endpoint =
        mode === "create"
          ? "/api/cabinet/payments/yandex-videoshot-creation/create"
          : "/api/cabinet/payments/yandex-videoshot/create"
      const codes = {
        isrc: normalizeCode(isrc),
        upc: normalizeCode(upc),
      }
      const body =
        mode === "create"
          ? {
              trackTitle: demoUrl.trim(),
              comment: wishes.trim(),
              videoDirection,
              referencesUrl: referencesUrl.trim() || undefined,
              ...codes,
              contactType,
              contactValue: contactValue.trim(),
            }
          : {
              trackTitle: trackUrl.trim(),
              fileUrl: fileUrl.trim(),
              comment: comment.trim() || undefined,
              ...codes,
              contactType,
              contactValue: contactValue.trim(),
            }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        paid?: boolean
        error?: string
      }
      if (!res.ok) {
        setFieldErrors({ form: data.error || "Не удалось создать заказ" })
        return
      }
      if (data.paid) {
        toast.success("Оплата с баланса прошла успешно. Заказ принят в работу.")
        return
      }
      setFieldErrors({ form: "Не удалось создать заказ" })
    } catch {
      setFieldErrors({ form: "Ошибка сети. Попробуйте ещё раз." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] space-y-14 pb-10 text-foreground md:space-y-16">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-11 w-11 shrink-0 text-foreground hover:bg-card"
        >
          <Link href={backHref} aria-label={backLabel}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{backLabel}</p>
      </div>

      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        <div className="min-w-0 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Видеошот в Яндекс Музыке
          </p>
          <h1 className="text-[2.1rem] font-bold leading-[1.12] tracking-tight sm:text-[2.6rem] md:text-[3rem]">
            Дайте треку <span className="text-[#F21D43]">движе{"\u00AD"}ние</span>.
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Короткий видеоряд передаёт настроение вашей музыки во время прослушивания. Загрузим ваш
            готовый ролик или создадим видеошот под трек.
          </p>
          <div>
            <p className="text-4xl font-bold tracking-tight text-[#F21D43]">
              от {YANDEX_VIDEOSHOT_PRICE_RUB} {"\u20BD"}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Загрузка - {YANDEX_VIDEOSHOT_PRICE_RUB} {"\u20BD"}.</li>
              <li>
                Создание и загрузка - {YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} {"\u20BD"}.
              </li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="h-11 min-h-11 bg-[#F21D43] px-5 text-white hover:bg-[#F21D43]/90"
              onClick={() => scrollToId("yandex-videoshot-variants")}
            >
              Выбрать вариант
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 border-border bg-transparent text-foreground hover:bg-card"
              onClick={() => scrollToId("yandex-videoshot-examples")}
            >
              Посмотреть примеры
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Вертикальный ролик · В плеере трека · Под вашу музыку
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 lg:items-end">
          <VideoShotPhone
            src={EXAMPLE_VIDEOS[0].src}
            poster={EXAMPLE_VIDEOS[0].poster}
            label="Пример видеошота в плеере"
            size="hero"
            caption="Настроение вашего трека"
          />
          <p className="text-xs text-muted-foreground">До 15 сек.</p>
        </div>
      </section>

      <section id="yandex-videoshot-variants" className="scroll-mt-20 space-y-5">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Два варианта. Один результат
          </p>
          <h2 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">
            Видео уже есть? Или создадим его вместе?
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Выберите нужный объём работы. В обоих вариантах проверим материал и передадим видеошот
            для размещения в Яндекс Музыке
          </p>
        </div>

        <div
          className="grid gap-3 md:grid-cols-2"
          role="radiogroup"
          aria-label="Вариант услуги видеошота"
        >
          <ModeCard
            name={modeGroupName}
            value="ready"
            selected={mode === "ready"}
            disabled={loading}
            onSelect={() => applyMode("ready")}
            title="У меня есть видео"
            description="Передайте готовый видеошот. Мы проверим его и загрузим для вашего трека"
            bullets={["Проверка материала.", "Загрузка в Яндекс Музыку."]}
            price={`${YANDEX_VIDEOSHOT_PRICE_RUB} ₽ за один готовый видеошот`}
          />
          <ModeCard
            name={modeGroupName}
            value="create"
            selected={mode === "create"}
            disabled={loading}
            onSelect={() => applyMode("create")}
            title="Нужно создать видео"
            description="Соберём видеоряд под ваш трек из готовых кадров, графики или абстракции"
            bullets={["Создание видеошота.", "Проверка и загрузка."]}
            price={`${YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} ₽ за один видеошот`}
            badge="Публикация включена"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Выбрано:{" "}
            <span className="font-medium text-foreground">
              {mode === "ready" ? "У меня есть видео" : "Нужно создать видео"} · {price} {"\u20BD"}
            </span>
          </p>
          <Button
            type="button"
            className="h-11 min-h-11 bg-[#F21D43] px-5 text-white hover:bg-[#F21D43]/90"
            onClick={() => scrollToId("yandex-videoshot-order")}
            disabled={loading}
          >
            Оформить за {price} {"\u20BD"}
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          В {YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} {"\u20BD"} входят создание, проверка и публикация
          одного видеошота. Это полная стоимость выбранного варианта.
        </p>
      </section>

      <section id="yandex-videoshot-examples" className="scroll-mt-20 space-y-5">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Примеры отображения
          </p>
          <h2 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">
            Звучит музыка. Работает образ.
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Клип, атмосферный визуал или выступление - у каждого трека своё настроение.
          </p>
        </div>
        <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {EXAMPLE_VIDEOS.map((video) => (
            <VideoShotPhone
              key={video.src}
              src={video.src}
              poster={video.poster}
              caption={video.caption}
              label={video.label}
              size="gallery"
            />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">
          От вашего материала до видео в плеере.
        </h2>
        <div className="grid gap-3 md:grid-cols-3" aria-live="polite">
          {steps.map((step) => (
            <div
              key={`${mode}-${step.num}`}
              className="rounded-[14px] border border-border bg-card px-4 py-4"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-[#F21D43]">{step.num}</p>
              <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "ready"
            ? "Для готового ролика: вертикальное видео 5-15 секунд."
            : "Для создания: целевая длительность ролика 6-15 секунд."}
        </p>
      </section>

      <section
        id="yandex-videoshot-order"
        className="scroll-mt-20 grid gap-6 rounded-[16px] border border-border bg-card p-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-8 md:p-6"
      >
        <div className="space-y-4" aria-live="polite">
          {mode === "ready" ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Загрузка готового видеошота
                </p>
                <h2 className="mt-1 text-xl font-bold md:text-2xl">Видео готово? Добавим к треку.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Передайте видео и ссылку на трек. Менеджер уточнит детали в переписке, а мы
                  проверим материал и отправим его для размещения.
                </p>
              </div>
              <div className="rounded-[14px] border border-border bg-muted p-4">
                <p className="text-3xl font-bold tracking-tight text-[#F21D43]">
                  {YANDEX_VIDEOSHOT_PRICE_RUB} {"\u20BD"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Проверка и загрузка одного готового ролика.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-[#F21D43]" aria-hidden>
                    ·
                  </span>
                  Проверка требований.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#F21D43]" aria-hidden>
                    ·
                  </span>
                  Загрузка в Яндекс Музыку.
                </li>
              </ul>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Создание видеошота с публикацией
                </p>
                <h2 className="mt-1 text-xl font-bold md:text-2xl">Как выглядит ваша музыка?</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Пришлите трек и пожелания к образу. Менеджер уточнит детали в переписке, а команда
                  создаст видеошот и передаст его для размещения.
                </p>
              </div>
              <div className="rounded-[14px] border border-border bg-muted p-4">
                <p className="text-3xl font-bold tracking-tight text-[#F21D43]">
                  {YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} {"\u20BD"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Создание, проверка и публикация одного видеошота.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-[#F21D43]" aria-hidden>
                    ·
                  </span>
                  Создание видеоряда.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#F21D43]" aria-hidden>
                    ·
                  </span>
                  Проверка требований и загрузка.
                </li>
              </ul>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <h3 className="text-base font-semibold">Оформить заказ</h3>

          <fieldset disabled={loading} className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium">Вариант</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm",
                  mode === "ready"
                    ? "border-[#F21D43] bg-[#F21D43]/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name={`${modeGroupName}-form`}
                  value="ready"
                  checked={mode === "ready"}
                  onChange={() => applyMode("ready")}
                  className="sr-only"
                />
                Готовое видео · {YANDEX_VIDEOSHOT_PRICE_RUB} {"\u20BD"}
              </label>
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm",
                  mode === "create"
                    ? "border-[#F21D43] bg-[#F21D43]/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name={`${modeGroupName}-form`}
                  value="create"
                  checked={mode === "create"}
                  onChange={() => applyMode("create")}
                  className="sr-only"
                />
                Создание и публикация · {YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} {"\u20BD"}
              </label>
            </div>
          </fieldset>

          {mode === "ready" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="yandex-videoshot-track-url">Ссылка на трек в Яндекс Музыке</Label>
                <Input
                  id="yandex-videoshot-track-url"
                  ref={trackUrlRef}
                  type="url"
                  inputMode="url"
                  placeholder="https://music.yandex.ru/album/.../track/..."
                  value={trackUrl}
                  onChange={(e) => {
                    setTrackUrl(e.target.value)
                    clearFieldError("trackUrl")
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.trackUrl)}
                  aria-describedby={
                    fieldErrors.trackUrl ? "yandex-videoshot-track-url-error" : undefined
                  }
                  className="h-11 border-border bg-muted text-base md:text-sm"
                />
                {fieldErrors.trackUrl ? (
                  <p
                    id="yandex-videoshot-track-url-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.trackUrl}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="yandex-videoshot-isrc">ISRC</Label>
                  <Input
                    id="yandex-videoshot-isrc"
                    ref={isrcRef}
                    value={isrc}
                    onChange={(e) => {
                      setIsrc(e.target.value)
                      clearFieldError("isrc")
                    }}
                    placeholder="RU-ABC-25-00001"
                    maxLength={CODE_MAX_LEN}
                    disabled={loading}
                    autoCapitalize="characters"
                    aria-invalid={Boolean(fieldErrors.isrc)}
                    aria-describedby={
                      fieldErrors.isrc ? "yandex-videoshot-isrc-error" : undefined
                    }
                    className="h-11 border-border bg-muted text-base md:text-sm"
                  />
                  {fieldErrors.isrc ? (
                    <p
                      id="yandex-videoshot-isrc-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {fieldErrors.isrc}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yandex-videoshot-upc">UPC</Label>
                  <Input
                    id="yandex-videoshot-upc"
                    ref={upcRef}
                    value={upc}
                    onChange={(e) => {
                      setUpc(e.target.value)
                      clearFieldError("upc")
                    }}
                    placeholder="123456789012"
                    maxLength={CODE_MAX_LEN}
                    disabled={loading}
                    inputMode="numeric"
                    aria-invalid={Boolean(fieldErrors.upc)}
                    aria-describedby={
                      fieldErrors.upc ? "yandex-videoshot-upc-error" : undefined
                    }
                    className="h-11 border-border bg-muted text-base md:text-sm"
                  />
                  {fieldErrors.upc ? (
                    <p
                      id="yandex-videoshot-upc-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {fieldErrors.upc}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yandex-videoshot-file-url">Ссылка на готовое видео</Label>
                <Input
                  id="yandex-videoshot-file-url"
                  ref={fileUrlRef}
                  type="url"
                  inputMode="url"
                  placeholder="https://disk.yandex.ru/..."
                  value={fileUrl}
                  onChange={(e) => {
                    setFileUrl(e.target.value)
                    clearFieldError("fileUrl")
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.fileUrl)}
                  aria-describedby={
                    fieldErrors.fileUrl ? "yandex-videoshot-file-url-error" : formHintId
                  }
                  className="h-11 border-border bg-muted text-base md:text-sm"
                />
                <p id={formHintId} className="text-xs text-muted-foreground">
                  Откройте доступ к просмотру и скачиванию файла.
                </p>
                {fieldErrors.fileUrl ? (
                  <p
                    id="yandex-videoshot-file-url-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.fileUrl}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yandex-videoshot-comment">Комментарий (необязательно)</Label>
                <Textarea
                  id="yandex-videoshot-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  disabled={loading}
                  placeholder="Пожелания к проверке или размещению"
                  className="border-border bg-muted"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="yandex-videoshot-demo-url">Ссылка на трек или демо</Label>
                <Input
                  id="yandex-videoshot-demo-url"
                  ref={demoUrlRef}
                  type="text"
                  inputMode="url"
                  placeholder="https://disk.yandex.ru/... или ссылка на трек"
                  value={demoUrl}
                  onChange={(e) => {
                    setDemoUrl(e.target.value)
                    clearFieldError("demoUrl")
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.demoUrl)}
                  aria-describedby={
                    fieldErrors.demoUrl ? "yandex-videoshot-demo-url-error" : undefined
                  }
                  className="h-11 border-border bg-muted text-base md:text-sm"
                />
                {fieldErrors.demoUrl ? (
                  <p
                    id="yandex-videoshot-demo-url-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.demoUrl}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="yandex-videoshot-create-isrc">ISRC</Label>
                  <Input
                    id="yandex-videoshot-create-isrc"
                    ref={mode === "create" ? isrcRef : undefined}
                    value={isrc}
                    onChange={(e) => {
                      setIsrc(e.target.value)
                      clearFieldError("isrc")
                    }}
                    placeholder="RU-ABC-25-00001"
                    maxLength={CODE_MAX_LEN}
                    disabled={loading}
                    autoCapitalize="characters"
                    aria-invalid={Boolean(fieldErrors.isrc)}
                    aria-describedby={
                      fieldErrors.isrc ? "yandex-videoshot-create-isrc-error" : undefined
                    }
                    className="h-11 border-border bg-muted text-base md:text-sm"
                  />
                  {fieldErrors.isrc ? (
                    <p
                      id="yandex-videoshot-create-isrc-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {fieldErrors.isrc}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yandex-videoshot-create-upc">UPC</Label>
                  <Input
                    id="yandex-videoshot-create-upc"
                    ref={mode === "create" ? upcRef : undefined}
                    value={upc}
                    onChange={(e) => {
                      setUpc(e.target.value)
                      clearFieldError("upc")
                    }}
                    placeholder="123456789012"
                    maxLength={CODE_MAX_LEN}
                    disabled={loading}
                    inputMode="numeric"
                    aria-invalid={Boolean(fieldErrors.upc)}
                    aria-describedby={
                      fieldErrors.upc ? "yandex-videoshot-create-upc-error" : undefined
                    }
                    className="h-11 border-border bg-muted text-base md:text-sm"
                  />
                  {fieldErrors.upc ? (
                    <p
                      id="yandex-videoshot-create-upc-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {fieldErrors.upc}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yandex-videoshot-direction">Направление видеоряда</Label>
                <select
                  id="yandex-videoshot-direction"
                  className={cn(
                    "flex h-11 w-full rounded-md border border-border bg-muted px-3 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43]",
                  )}
                  value={videoDirection}
                  onChange={(e) => setVideoDirection(e.target.value as VideoDirectionValue)}
                  disabled={loading}
                >
                  {VIDEO_DIRECTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yandex-videoshot-wishes">Пожелания к видеошоту</Label>
                <Textarea
                  id="yandex-videoshot-wishes"
                  ref={wishesRef}
                  value={wishes}
                  onChange={(e) => {
                    setWishes(e.target.value)
                    clearFieldError("wishes")
                  }}
                  rows={4}
                  disabled={loading}
                  placeholder="Настроение, цвета, визуальные образы и идеи"
                  aria-invalid={Boolean(fieldErrors.wishes)}
                  aria-describedby={
                    fieldErrors.wishes
                      ? "yandex-videoshot-wishes-error"
                      : "yandex-videoshot-wishes-hint"
                  }
                  className="border-border bg-muted"
                />
                <p id="yandex-videoshot-wishes-hint" className="text-xs text-muted-foreground">
                  Если конкретной идеи нет, напишите "На ваш вкус".
                </p>
                {fieldErrors.wishes ? (
                  <p
                    id="yandex-videoshot-wishes-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.wishes}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yandex-videoshot-references">
                  Исходники или референсы (необязательно)
                </Label>
                <Input
                  id="yandex-videoshot-references"
                  type="url"
                  inputMode="url"
                  placeholder="https://disk.yandex.ru/..."
                  value={referencesUrl}
                  onChange={(e) => {
                    setReferencesUrl(e.target.value)
                    clearFieldError("referencesUrl")
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.referencesUrl)}
                  aria-describedby={
                    fieldErrors.referencesUrl
                      ? "yandex-videoshot-references-error"
                      : "yandex-videoshot-references-hint"
                  }
                  className="h-11 border-border bg-muted text-base md:text-sm"
                />
                <p id="yandex-videoshot-references-hint" className="text-xs text-muted-foreground">
                  Можно передать позже в переписке.
                </p>
                {fieldErrors.referencesUrl ? (
                  <p
                    id="yandex-videoshot-references-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.referencesUrl}
                  </p>
                ) : null}
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="yandex-videoshot-contact-type">Способ связи</Label>
              <select
                id="yandex-videoshot-contact-type"
                className={cn(
                  "flex h-11 w-full rounded-md border border-border bg-muted px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F21D43]",
                )}
                value={contactType}
                onChange={(e) => setContactType(e.target.value as ContactType)}
                disabled={loading}
              >
                <option value="telegram">Telegram</option>
                <option value="vk">VK</option>
                <option value="max">Max</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yandex-videoshot-contact-value">Контакт для связи</Label>
              <Input
                id="yandex-videoshot-contact-value"
                ref={contactValueRef}
                value={contactValue}
                onChange={(e) => {
                  setContactValue(e.target.value)
                  clearFieldError("contactValue")
                }}
                placeholder={contactPlaceholder(contactType)}
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.contactValue)}
                aria-describedby={
                  fieldErrors.contactValue ? "yandex-videoshot-contact-value-error" : undefined
                }
                className="h-11 border-border bg-muted text-base md:text-sm"
              />
              {fieldErrors.contactValue ? (
                <p
                  id="yandex-videoshot-contact-value-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {fieldErrors.contactValue}
                </p>
              ) : null}
            </div>
          </div>

          <p className="text-sm font-medium" aria-live="polite">
            Итого: {price} {"\u20BD"}
          </p>

          {fieldErrors.form ? (
            <p className="text-sm text-destructive" role="alert">
              {fieldErrors.form}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 min-h-11 w-full bg-[#F21D43] text-white hover:bg-[#F21D43]/90 sm:w-auto"
          >
            {loading ? "Создаём заказ..." : `Оплатить ${price} ₽`}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">Частые вопросы</h2>
        <Accordion
          type="single"
          collapsible
          className="rounded-[14px] border border-border bg-card px-4"
        >
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
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
            <DialogTitle>Оплата прошла</DialogTitle>
            <DialogDescription className="pt-2 text-base text-foreground">
              Заказ принят. Мы обработаем материал по выбранному варианту. Публикация на площадке -
              отдельный этап после проверки.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              className="min-w-[120px] bg-[#F21D43] hover:bg-[#F21D43]/90"
              onClick={() => setPaymentSuccessOpen(false)}
            >
              Понятно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function YandexVideoshotLanding() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] bg-muted p-4" />}>
      <YandexVideoshotLandingInner />
    </Suspense>
  )
}
