"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  AudioLines,
  BarChart3,
  CheckCircle2,
  Disc3,
  FlaskConical,
  LineChart,
  Megaphone,
  Shirt,
  Ticket,
  Users,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PromotionFreeConsultButton } from "@/components/cabinet/promotion/promotion-free-consult-button"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import {
  YandexAdsAdPreview,
  type YandexAdsPreviewMode,
} from "@/components/cabinet/promotion/yandex-ads-ad-preview"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import { useServicePrices } from "@/lib/cabinet/hooks/use-service-prices"
import {
  YANDEX_ADS_DEFAULT_OBJECT,
  YANDEX_ADS_OBJECTS,
  YANDEX_ADS_PRICE_LABEL,
  type YandexAdsObjectId,
  getYandexAdsObject,
} from "@/lib/yandex-ads-campaign"
import { cn } from "@/lib/utils"

const INCLUDE_ITEMS = [
  {
    icon: Users,
    title: "Аудитории и настройки",
    body: "Подберём аудитории и условия показа под ваш проект, географию и цель кампании",
  },
  {
    icon: Megaphone,
    title: "Тексты и визуальная подача",
    body: "Подготовим рекламные материалы, чтобы представить релиз, событие или предложение понятным языком",
  },
  {
    icon: FlaskConical,
    title: "Запуск и корректировки",
    body: "Запустим согласованную кампанию, сравним варианты объявлений и будем корректировать рекламу по статистике",
  },
  {
    icon: LineChart,
    title: "Разбор доступных показателей",
    body: "Покажем расход, показы, клики и доступные целевые действия. Объясним, что стоит изменить или проверить дальше",
  },
] as const

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Уточняем, что продвигаем",
    body: "Вы присылаете ссылку и пожелания. В переписке согласуем цель, материалы, бюджет и условия работы",
  },
  {
    num: "02",
    title: "Готовим и запускаем",
    body: "Настраиваем кампанию, готовим объявления и запускаем согласованные рекламные материалы",
  },
  {
    num: "03",
    title: "Анализируем и корректируем",
    body: "Следим за расходом и статистикой. Сравниваем подходы и обсуждаем с вами результаты",
  },
] as const

const HERO_POINTS = [
  { icon: AudioLines, label: "Под вашу задачу" },
  { icon: FlaskConical, label: "Тестирование подачи" },
  { icon: BarChart3, label: "Анализ результатов" },
] as const

const ORDER_POINTS = [
  "Детали согласуем в переписке",
  "Материалы под ваш проект",
  "Понятный разбор результатов",
] as const

const FAQ_ITEMS = [
  {
    q: "Можно продвигать не только трек?",
    a: "Да. Концерт, мерч, сайт или сообщество артиста - выбираем подачу и страницу перехода под вашу задачу",
  },
  {
    q: "Где люди увидят рекламу?",
    a: "В поиске Яндекса и на площадках рекламной сети. Конкретные места показа и форматы подбираем под задачу кампании",
  },
  {
    q: "Как формируется бюджет?",
    a: `Наша работа - ${YANDEX_ADS_PRICE_LABEL}. Рекламный бюджет обсуждаем отдельно. Перед оплатой должны быть понятны точная стоимость и состав заказа`,
  },
  {
    q: "Какие результаты можно оценить?",
    a: "Расход, показы, клики и доступные целевые действия. Возможность отслеживать действия после перехода зависит от страницы назначения и подключённой аналитики",
  },
  {
    q: "Вы гарантируете прослушивания или продажи?",
    a: "Фиксированный результат не гарантируем. Он зависит от проекта, подачи, аудитории, бюджета и страницы, на которую ведёт реклама",
  },
  {
    q: "Как обсудить детали?",
    a: "Укажите ссылку и пожелания в форме. Задачу и условия кампании согласуем в переписке",
  },
] as const

const OBJECT_ICONS = {
  release: Disc3,
  concert: Ticket,
  merch: Shirt,
  project: AudioLines,
} as const

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
}

function formatBudgetDisplay(raw: string): string {
  const trimmed = raw.trim().replace(/\s/g, "")
  if (!trimmed) return "Обсудим отдельно"
  const num = Number(trimmed.replace(",", "."))
  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) return "Обсудим отдельно"
  return `${num.toLocaleString("ru-RU")} ₽`
}

type FieldErrors = {
  projectName?: string
  trackLink?: string
  budget?: string
  contact?: string
}

export function YandexAdsLanding({ service }: { service: ServiceCatalogEntry }) {
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const statusId = useId()

  const [objectId, setObjectId] = useState<YandexAdsObjectId>(YANDEX_ADS_DEFAULT_OBJECT)
  const [previewMode, setPreviewMode] = useState<YandexAdsPreviewMode>("sites")
  const [projectName, setProjectName] = useState("")
  const [trackLink, setTrackLink] = useState("")
  const [budget, setBudget] = useState("")
  const [contact, setContact] = useState("")
  const [comment, setComment] = useState("")
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const projectRef = useRef<HTMLInputElement>(null)
  const linkRef = useRef<HTMLInputElement>(null)
  const budgetRef = useRef<HTMLInputElement>(null)
  const contactRef = useRef<HTMLInputElement>(null)

  const object = getYandexAdsObject(objectId)
  const { byKey } = useServicePrices()
  const priceLabel =
    (service.priceKey ? byKey(service.priceKey)?.cardLabel : null) ||
    service.priceLabel ||
    YANDEX_ADS_PRICE_LABEL
  const contactFromProfile = Boolean(accountEmail)
  const budgetDisplay = formatBudgetDisplay(budget)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/profile", { credentials: "include" })
        if (!res.ok) return
        const data = (await res.json().catch(() => ({}))) as {
          user?: { email?: string }
          email?: string
        }
        const email =
          (typeof data.user?.email === "string" && data.user.email.trim()) ||
          (typeof data.email === "string" && data.email.trim()) ||
          ""
        if (!cancelled && email) setAccountEmail(email)
      } catch {
        /* контакт останется ручным */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const openOrderForm = useCallback(() => {
    requestAnimationFrame(() => {
      scrollToId("yandex-order")
      window.setTimeout(() => {
        projectRef.current?.focus()
      }, 280)
    })
  }, [])

  const selectObject = useCallback((id: YandexAdsObjectId) => {
    setObjectId(id)
  }, [])

  const focusFirstError = useCallback((errors: FieldErrors) => {
    if (errors.projectName) {
      projectRef.current?.focus()
      return
    }
    if (errors.trackLink) {
      linkRef.current?.focus()
      return
    }
    if (errors.budget) {
      budgetRef.current?.focus()
      return
    }
    if (errors.contact) contactRef.current?.focus()
  }, [])

  const submitRequest = useCallback(async () => {
    if (!service.paymentEndpoint) {
      toast.error("Заявка пока недоступна")
      return
    }

    const nextErrors: FieldErrors = {}
    const name = projectName.trim()
    const link = trackLink.trim()
    const contactValue = contact.trim()

    if (!name || name.length > 150) {
      nextErrors.projectName = "Заполните название проекта"
    }
    if (!link) {
      nextErrors.trackLink = "Укажите ссылку"
    } else if (!isHttpUrl(link)) {
      nextErrors.trackLink = "Укажите корректную ссылку, начинающуюся с https:// или http://"
    }

    const budgetTrimmed = budget.trim().replace(/\s/g, "")
    if (budgetTrimmed) {
      const budgetNum = Number(budgetTrimmed.replace(",", "."))
      if (!Number.isFinite(budgetNum) || !Number.isInteger(budgetNum) || budgetNum <= 0) {
        nextErrors.budget =
          "Укажите рекламный бюджет целым положительным числом или оставьте поле пустым"
      }
    }

    if (!contactFromProfile) {
      if (!contactValue || contactValue.length > 200) {
        nextErrors.contact = "Укажите контакт для связи"
      }
    } else if (contactValue && contactValue.length > 200) {
      nextErrors.contact = "Контакт слишком длинный"
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const missingCore =
        Boolean(nextErrors.projectName) ||
        Boolean(nextErrors.trackLink === "Укажите ссылку") ||
        Boolean(nextErrors.contact && !contactFromProfile)
      const toastMessage = nextErrors.trackLink?.includes("корректную")
        ? nextErrors.trackLink
        : nextErrors.budget
          ? nextErrors.budget
          : missingCore
            ? contactFromProfile
              ? "Заполните название проекта и ссылку"
              : "Заполните название проекта, ссылку и контакт для связи"
            : nextErrors.projectName ||
              nextErrors.trackLink ||
              nextErrors.contact ||
              "Проверьте поля формы"
      toast.error(toastMessage)
      scrollToId("yandex-order")
      window.setTimeout(() => focusFirstError(nextErrors), 280)
      return
    }

    setSubmitting(true)
    setStatusMessage(null)
    try {
      const res = await fetch(service.paymentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackTitle: name,
          trackLink: link,
          promotionObject: objectId,
          budget: budgetTrimmed || undefined,
          comment: comment.trim().slice(0, 2000),
          contactValue: contactValue || undefined,
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
      const successText =
        typeof data.message === "string" && data.message
          ? data.message
          : "Заявку получили. Деньги не списаны - точную стоимость и условия согласуем перед оплатой."
      toast.success(successText)
      setStatusMessage(successText)
      setProjectName("")
      setTrackLink("")
      setBudget("")
      setContact("")
      setComment("")
      setFieldErrors({})
    } catch {
      toast.error("Ошибка при отправке заявки")
    } finally {
      setSubmitting(false)
    }
  }, [
    service.paymentEndpoint,
    projectName,
    trackLink,
    budget,
    contact,
    comment,
    objectId,
    contactFromProfile,
    focusFirstError,
  ])

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1140px] space-y-12 pb-12 text-foreground md:space-y-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-foreground" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <PromotionFreeConsultButton prefillMessage="Здравствуйте! Нужна бесплатная консультация по Яндекс Директ." />
          <Button type="button" variant="outline" size="sm" onClick={() => openCabinetSupportChat()}>
            Задать вопрос
          </Button>
        </div>
      </div>

      {/* 1. Hero */}
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:gap-12">
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Продвижение в Яндекс Директ.
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight break-words sm:text-[2.15rem] md:text-[3.1rem] lg:text-[3.25rem] lg:leading-[1.08]">
            <span className="text-foreground">Из рекламы - </span>
            <br className="hidden lg:block" />
            <span className="text-[#F3264D]">к вашей музыке.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Продвигайте релиз, концерт или проект. Подготовим объявления, настроим аудитории и
            направим заинтересованных людей на нужную страницу.
          </p>

          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{priceLabel}</p>
            <p className="text-sm text-muted-foreground">Работа Parallax. Рекламный бюджет - отдельно.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="h-11 min-h-11 bg-[#F3264D] px-5 text-white hover:bg-[#F3264D]/90"
              onClick={openOrderForm}
            >
              Заказать продвижение
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-h-11 border-border px-5"
              onClick={() => scrollToId("yandex-include")}
            >
              Что входит
            </Button>
          </div>

          <ul className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            {HERO_POINTS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 shrink-0 text-[#F3264D]" aria-hidden />
                  <span>{item.label}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="min-w-0 overflow-x-hidden lg:justify-self-end">
          <YandexAdsAdPreview
            object={object}
            projectName={projectName}
            mode={previewMode}
            onModeChange={setPreviewMode}
          />
        </div>
      </section>

      {/* 2. Objects */}
      <section className="space-y-5" aria-labelledby="yandex-objects-heading">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Один инструмент - разные задачи.
          </p>
          <h2
            id="yandex-objects-heading"
            className="text-2xl font-semibold tracking-tight md:text-[1.75rem]"
          >
            Что вы хотите продвигать?
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            От нового трека до концерта и мерча. Выбираем рекламную подачу, аудитории и страницу, на
            которую придут люди.
          </p>
        </div>

        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          role="group"
          aria-label="Объект продвижения"
        >
          {YANDEX_ADS_OBJECTS.map((item) => {
            const active = item.id === objectId
            const Icon = OBJECT_ICONS[item.id]
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectObject(item.id)}
                className={cn(
                  "min-h-[5.5rem] rounded-[12px] border px-4 py-3.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3264D]/70",
                  active
                    ? "border-[#F3264D]/55 bg-[#F3264D]/12 ring-1 ring-[#F3264D]/35"
                    : "border-border bg-card hover:bg-muted",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-[#F3264D]/20 text-[#F3264D]" : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                      {item.cardCaption}
                    </span>
                    {active ? (
                      <span className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-wide text-[#F3264D]">
                        Выбрано
                      </span>
                    ) : null}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <p
          role="status"
          aria-live="polite"
          className="rounded-[12px] border border-border bg-card px-4 py-3.5 text-[15px] leading-relaxed text-muted-foreground"
        >
          {object.explanation}
        </p>
      </section>

      {/* 3. Include */}
      <section id="yandex-include" className="scroll-mt-20 space-y-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Что берём на себя.
            </p>
            <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              От идеи объявления до работы с результатом.
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Вам не нужно разбираться в настройках Директа. Передайте задачу и материалы -
              подготовим и будем вести кампанию.
            </p>
          </div>

          <ul className="divide-y divide-[#303038] border-y border-border">
            {INCLUDE_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.title} className="flex gap-3 py-3.5 first:pt-0 last:pb-0 sm:gap-4">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3264D]/12 text-[#F3264D]"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* 4. Pricing */}
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Стоимость без путаницы
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Работа с рекламой. Бюджет на показы
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Две отдельные статьи расходов. Задачу, объём работы и бюджет согласуем до запуска
          </p>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-border bg-card">
          <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-[#303038]">
            <div className="space-y-2 border-b border-border px-5 py-5 md:border-b-0 md:px-6 md:py-6">
              <p className="text-sm font-medium text-muted-foreground">Работа Parallax</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{priceLabel}</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Подготовка, настройка, ведение и анализ кампании. Точная стоимость зависит от
                согласованного объёма
              </p>
            </div>
            <div className="space-y-2 px-5 py-5 md:px-6 md:py-6">
              <p className="text-sm font-medium text-muted-foreground">Рекламный бюджет</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{priceLabel}</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Средства на размещение объявлений. Подбираем бюджет с учётом задачи и ваших
                возможностей
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Process */}
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Как проходит работа
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Ваша задача. Наш следующий шаг
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
          {PROCESS_STEPS.map((step) => (
            <li
              key={step.num}
              className="rounded-[12px] border border-border bg-card/80 px-4 py-4"
            >
              <p className="text-xs font-semibold tracking-[0.12em] text-[#F3264D]">{step.num}</p>
              <p className="mt-2 text-base font-semibold text-foreground">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. Order */}
      <section
        id="yandex-order"
        className="scroll-mt-20 grid gap-8 rounded-[16px] border border-border bg-card p-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-8 md:p-6 lg:p-8"
      >
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Начнём с вашего проекта
            </p>
            <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              Дайте нам ссылку. Расскажите о задаче
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Трек, концерт, мерч или сайт. Укажите, что хотите продвигать, - обсудим подходящую
              рекламную кампанию
            </p>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-3xl font-bold tracking-tight text-foreground">{priceLabel}</p>
            <p className="text-sm text-muted-foreground">
              Стоимость работы · рекламный бюджет отдельно
            </p>
          </div>

          <ul className="space-y-2 pt-1">
            {ORDER_POINTS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F3264D]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 space-y-4 rounded-[12px] border border-border bg-card p-4 sm:p-5">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Заявка на продвижение
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="yandex-project">
              {object.nameFieldLabel} <span className="text-[#F3264D]">*</span>
            </Label>
            <Input
              ref={projectRef}
              id="yandex-project"
              value={projectName}
              maxLength={150}
              onChange={(e) => {
                setProjectName(e.target.value)
                if (fieldErrors.projectName) {
                  setFieldErrors((prev) => ({ ...prev, projectName: undefined }))
                }
              }}
              placeholder={object.nameFieldPlaceholder}
              className="h-11 border-border bg-card text-base md:text-sm"
              aria-invalid={Boolean(fieldErrors.projectName)}
              aria-describedby={fieldErrors.projectName ? "yandex-project-error" : undefined}
              disabled={submitting}
            />
            {fieldErrors.projectName ? (
              <p id="yandex-project-error" className="text-xs text-[#F3264D]">
                {fieldErrors.projectName}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none">Что продвигаем</legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Объект в форме">
              {YANDEX_ADS_OBJECTS.map((item) => {
                const active = item.id === objectId
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => selectObject(item.id)}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3264D]/70",
                      active
                        ? "border-[#F3264D]/50 bg-[#F3264D]/12 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>{item.title}</span>
                    {active ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#F3264D]">
                        Выбрано
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="yandex-link">
              {object.linkFieldLabel} <span className="text-[#F3264D]">*</span>
            </Label>
            <Input
              ref={linkRef}
              id="yandex-link"
              value={trackLink}
              onChange={(e) => {
                setTrackLink(e.target.value)
                if (fieldErrors.trackLink) {
                  setFieldErrors((prev) => ({ ...prev, trackLink: undefined }))
                }
              }}
              placeholder="https://…"
              className="h-11 border-border bg-card text-base md:text-sm"
              aria-invalid={Boolean(fieldErrors.trackLink)}
              aria-describedby={fieldErrors.trackLink ? "yandex-link-error" : undefined}
              disabled={submitting}
            />
            {fieldErrors.trackLink ? (
              <p id="yandex-link-error" className="text-xs text-[#F3264D]">
                {fieldErrors.trackLink}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="yandex-budget">Рекламный бюджет, ₽</Label>
            <Input
              ref={budgetRef}
              id="yandex-budget"
              value={budget}
              inputMode="numeric"
              onChange={(e) => {
                setBudget(e.target.value)
                if (fieldErrors.budget) {
                  setFieldErrors((prev) => ({ ...prev, budget: undefined }))
                }
              }}
              placeholder="Например, 10000"
              className="h-11 border-border bg-card text-base md:text-sm"
              aria-invalid={Boolean(fieldErrors.budget)}
              aria-describedby={fieldErrors.budget ? "yandex-budget-error" : "yandex-budget-hint"}
              disabled={submitting}
            />
            {fieldErrors.budget ? (
              <p id="yandex-budget-error" className="text-xs text-[#F3264D]">
                {fieldErrors.budget}
              </p>
            ) : (
              <p id="yandex-budget-hint" className="text-xs text-muted-foreground">
                Необязательно. Можем обсудить.
              </p>
            )}
          </div>

          {contactFromProfile ? (
            <p className="rounded-[10px] border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground">
              Контакт для связи:{" "}
              <span className="font-medium text-foreground">{accountEmail}</span>
              {" "}(из профиля аккаунта)
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="yandex-contact">
                Контакт для связи <span className="text-[#F3264D]">*</span>
              </Label>
              <Input
                ref={contactRef}
                id="yandex-contact"
                value={contact}
                maxLength={200}
                onChange={(e) => {
                  setContact(e.target.value)
                  if (fieldErrors.contact) {
                    setFieldErrors((prev) => ({ ...prev, contact: undefined }))
                  }
                }}
                placeholder="Email или @username"
                className="h-11 border-border bg-card text-base md:text-sm"
                aria-invalid={Boolean(fieldErrors.contact)}
                aria-describedby={fieldErrors.contact ? "yandex-contact-error" : undefined}
                disabled={submitting}
              />
              {fieldErrors.contact ? (
                <p id="yandex-contact-error" className="text-xs text-[#F3264D]">
                  {fieldErrors.contact}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="yandex-comment">Комментарий</Label>
            <Textarea
              id="yandex-comment"
              value={comment}
              maxLength={2000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Желаемый старт, география или другие пожелания"
              rows={3}
              className="border-border bg-card text-base md:text-sm"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Работа Parallax</span>
              <span className="text-right font-medium text-foreground">
                {priceLabel} до определения точной цены
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Рекламный бюджет</span>
              <span className="text-right font-medium text-foreground">{budgetDisplay}</span>
            </div>
          </div>

          <Button
            type="button"
            className="h-11 min-h-11 w-full bg-[#F3264D] text-white hover:bg-[#F3264D]/90"
            disabled={submitting}
            onClick={() => void submitRequest()}
          >
            {submitting ? "Отправка..." : service.interestCtaLabel || "Отправить заявку"}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Точную стоимость и условия согласуем перед оплатой. Сейчас деньги не списываются
          </p>
          <p id={statusId} role="status" aria-live="polite" className="sr-only">
            {statusMessage || ""}
          </p>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="scroll-mt-20 space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Вопросы о продвижении
        </h2>
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-[12px] border border-border bg-card/60 px-4"
        >
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`yandex-faq-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-[15px] text-foreground">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}
