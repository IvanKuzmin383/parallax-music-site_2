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
  FlaskConical,
  LineChart,
  Megaphone,
  Target,
  Users,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import { VkAdsAdPreview } from "@/components/cabinet/promotion/vk-ads-ad-preview"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import {
  VK_ADS_DEFAULT_GOAL,
  VK_ADS_GOALS,
  VK_ADS_PRICE_LABEL,
  type VkAdsGoalId,
  getVkAdsGoal,
} from "@/lib/vk-ads-campaign"
import { cn } from "@/lib/utils"

const INCLUDE_ITEMS = [
  {
    icon: Users,
    title: "Аудитории под вашу музыку",
    body: "Подберём аудитории для тестирования с учётом жанра, проекта и цели кампании.",
  },
  {
    icon: Megaphone,
    title: "Рекламная подача",
    body: "Подготовим тексты и визуальные материалы, чтобы представить ваш релиз в рекламе.",
  },
  {
    icon: FlaskConical,
    title: "Запуск и корректировки",
    body: "Запустим кампанию, сравним варианты объявлений и скорректируем настройки по статистике.",
  },
  {
    icon: LineChart,
    title: "Понятный разбор результатов",
    body: "Покажем расход и доступные показатели кампании. Объясним, какие подходы сработали и что стоит проверить дальше.",
  },
] as const

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Уточняем задачу",
    body: "Вы присылаете ссылку и пожелания. В переписке согласуем цель, бюджет и условия работы.",
  },
  {
    num: "02",
    title: "Готовим и запускаем",
    body: "Подбираем аудитории, готовим рекламные материалы и запускаем согласованную кампанию.",
  },
  {
    num: "03",
    title: "Следим и объясняем",
    body: "Анализируем статистику, корректируем рекламу и разбираем с вами результаты.",
  },
] as const

const HERO_POINTS = [
  { icon: AudioLines, label: "Под ваш релиз." },
  { icon: FlaskConical, label: "Тестирование." },
  { icon: BarChart3, label: "Разбор результатов." },
] as const

const ORDER_POINTS = [
  "Согласованная задача и условия.",
  "Материалы под ваш проект.",
  "Анализ доступной статистики.",
] as const

const FAQ_ITEMS = [
  {
    q: "Какой бюджет нужен для старта?",
    a: `Наша работа стоит ${VK_ADS_PRICE_LABEL}. Рекламный бюджет обсуждаем отдельно с учётом задачи и объёма кампании.`,
  },
  {
    q: "Где будет показываться реклама?",
    a: "Кампанию запускаем через VK Рекламу. Конкретные форматы и места показов подбираем под задачу и согласованные материалы.",
  },
  {
    q: "Будет разбор результатов?",
    a: "Покажем расход и доступные показатели кампании. Для разных задач важны разные показатели, поэтому обсуждаем их перед запуском.",
  },
  {
    q: "Вы гарантируете количество прослушиваний?",
    a: "Фиксированное количество не гарантируем. Результат зависит от музыки, подачи, аудитории, бюджета и условий рекламной площадки.",
  },
  {
    q: "Как обсудить детали?",
    a: "Укажите ссылку, цель и пожелания в форме. Детали кампании согласуем в переписке.",
  },
] as const

const GOAL_ICONS = {
  listeners: AudioLines,
  followers: Users,
  visits: Target,
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

export function VkAdsLanding({ service }: { service: ServiceCatalogEntry }) {
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const goalExplanationId = useId()
  const statusId = useId()

  const [goalId, setGoalId] = useState<VkAdsGoalId>(VK_ADS_DEFAULT_GOAL)
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

  const goal = getVkAdsGoal(goalId)
  const priceLabel = service.priceLabel || VK_ADS_PRICE_LABEL
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
        if (!cancelled && email) {
          setAccountEmail(email)
        }
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
      scrollToId("vk-order")
      window.setTimeout(() => {
        projectRef.current?.focus()
      }, 280)
    })
  }, [])

  const selectGoal = useCallback((id: VkAdsGoalId) => {
    setGoalId(id)
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
    if (errors.contact) {
      contactRef.current?.focus()
    }
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
        nextErrors.budget = "Укажите положительный рекламный бюджет или оставьте поле пустым"
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
      const toastMessage =
        nextErrors.trackLink?.includes("корректную")
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
      scrollToId("vk-order")
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
          campaignGoal: goalId,
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
    goalId,
    contactFromProfile,
    focusFirstError,
  ])

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-[1140px] space-y-12 pb-12 text-[#F7F5F8] md:space-y-16"
      style={{ colorScheme: "dark" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-[#F7F5F8]" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => openCabinetSupportChat()}>
          Задать вопрос
        </Button>
      </div>

      {/* 1. Hero */}
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:items-center">
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
            Таргетированная реклама в VK
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight break-words sm:text-[2.15rem] md:text-[3rem] lg:text-[3.25rem] lg:leading-[1.08]">
            <span className="text-[#F7F5F8]">Знакомьте новых </span>
            <br className="hidden lg:block" />
            <span className="text-[#F3264D]">слушателей</span>
            <span className="text-[#F7F5F8]"> со своей </span>
            <br className="hidden lg:block" />
            <span className="text-[#F7F5F8]">музыкой.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-[#B3ADBC] md:text-base">
            Настроим рекламную кампанию под ваш трек или проект. Подготовим объявления, протестируем
            аудитории и будем корректировать рекламу по результатам.
          </p>

          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight text-[#F7F5F8] sm:text-4xl">{priceLabel}</p>
            <p className="text-sm text-[#B3ADBC]">Работа Parallax. Рекламный бюджет - отдельно.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="h-11 min-h-11 bg-[#F3264D] px-5 text-white hover:bg-[#F3264D]/90"
              onClick={openOrderForm}
            >
              Заказать рекламу
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-h-11 border-[#303038] px-5"
              onClick={() => scrollToId("vk-include")}
            >
              Что входит
            </Button>
          </div>

          <ul className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            {HERO_POINTS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.label} className="flex items-center gap-2 text-sm text-[#B3ADBC]">
                  <Icon className="h-4 w-4 shrink-0 text-[#F3264D]" aria-hidden />
                  <span>{item.label}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="min-w-0 overflow-x-hidden lg:justify-self-end">
          <VkAdsAdPreview goal={goal} projectName={projectName} />
        </div>
      </section>

      {/* 2. Goals */}
      <section className="space-y-5" aria-labelledby="vk-goals-heading">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
            Начинаем с задачи.
          </p>
          <h2 id="vk-goals-heading" className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Что нужно вашему проекту?
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#B3ADBC]">
            Цель кампании влияет на аудитории, рекламную подачу и показатели, которые мы будем
            оценивать.
          </p>
        </div>

        <div
          className="grid gap-3 sm:grid-cols-3"
          role="group"
          aria-label="Цель кампании"
        >
          {VK_ADS_GOALS.map((item) => {
            const active = item.id === goalId
            const Icon = GOAL_ICONS[item.id]
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectGoal(item.id)}
                className={cn(
                  "min-h-[5.5rem] rounded-[12px] border px-4 py-3.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3264D]/70",
                  active
                    ? "border-[#F3264D]/55 bg-[#F3264D]/12 ring-1 ring-[#F3264D]/35"
                    : "border-[#303038] bg-[#15151B] hover:bg-[#1A1A21]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-[#F3264D]/20 text-[#F3264D]" : "bg-[#1E1E26] text-[#B3ADBC]",
                    )}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#F7F5F8]">{item.title}</span>
                    <span className="mt-1 block text-[13px] leading-snug text-[#B3ADBC]">
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
          id={goalExplanationId}
          role="status"
          aria-live="polite"
          className="rounded-[12px] border border-[#303038] bg-[#15151B] px-4 py-3.5 text-[15px] leading-relaxed text-[#B3ADBC]"
        >
          {goal.explanation}
        </p>
      </section>

      {/* 3. Include */}
      <section id="vk-include" className="scroll-mt-20 space-y-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
              Что входит в работу.
            </p>
            <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              Кампания, которой занимаются.
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-[#B3ADBC]">
              От первой рекламной гипотезы до анализа результатов. Вы передаёте материалы и задачу -
              мы готовим и ведём рекламу.
            </p>
          </div>

          <ul className="divide-y divide-[#303038] border-y border-[#303038]">
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
                    <p className="text-sm font-semibold text-[#F7F5F8]">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#B3ADBC]">{item.body}</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
            Стоимость без путаницы.
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Наша работа. Ваш рекламный бюджет.
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#B3ADBC]">
            Две отдельные статьи расходов. Условия кампании согласуем перед запуском.
          </p>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-[#303038] bg-[#15151B]">
          <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-[#303038]">
            <div className="space-y-2 border-b border-[#303038] px-5 py-5 md:border-b-0 md:px-6 md:py-6">
              <p className="text-sm font-medium text-[#B3ADBC]">Работа Parallax</p>
              <p className="text-2xl font-bold tracking-tight text-[#F7F5F8]">{priceLabel}</p>
              <p className="text-[13px] leading-relaxed text-[#B3ADBC]">
                Подготовка, настройка, ведение и анализ кампании. Итоговая стоимость зависит от
                согласованного объёма работы.
              </p>
            </div>
            <div className="space-y-2 px-5 py-5 md:px-6 md:py-6">
              <p className="text-sm font-medium text-[#B3ADBC]">Рекламный бюджет</p>
              <p className="text-2xl font-bold tracking-tight text-[#F7F5F8]">отдельно</p>
              <p className="text-[13px] leading-relaxed text-[#B3ADBC]">
                Средства на размещение рекламы. Размер подбираем под вашу задачу и возможности.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Process */}
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
            Как проходит работа.
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            От вашего трека до рекламной кампании.
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
          {PROCESS_STEPS.map((step) => (
            <li
              key={step.num}
              className="rounded-[12px] border border-[#303038] bg-[#15151B]/80 px-4 py-4"
            >
              <p className="text-xs font-semibold tracking-[0.12em] text-[#F3264D]">{step.num}</p>
              <p className="mt-2 text-base font-semibold text-[#F7F5F8]">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#B3ADBC]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. Order form */}
      <section
        id="vk-order"
        className="scroll-mt-20 grid gap-8 rounded-[16px] border border-[#303038] bg-[#15151B]/90 p-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-8 md:p-6 lg:p-8"
      >
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
              Продвижение в VK.
            </p>
            <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              Начнём с вашей музыки.
            </h2>
            <p className="text-[15px] leading-relaxed text-[#B3ADBC]">
              Расскажите, что хотите продвигать. Поможем определить задачу кампании и согласуем
              детали в переписке.
            </p>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-3xl font-bold tracking-tight text-[#F7F5F8]">{priceLabel}</p>
            <p className="text-sm text-[#B3ADBC]">
              Стоимость нашей работы · рекламный бюджет отдельно
            </p>
          </div>

          <ul className="space-y-2 pt-1">
            {ORDER_POINTS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#B3ADBC]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F3264D]" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 space-y-4 rounded-[12px] border border-[#303038] bg-[#0F0F14] p-4 sm:p-5">
          <h3 className="text-lg font-semibold tracking-tight text-[#F7F5F8]">
            Ваш релиз и задача.
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="vk-project">Название релиза / проекта</Label>
            <Input
              ref={projectRef}
              id="vk-project"
              value={projectName}
              maxLength={150}
              onChange={(e) => {
                setProjectName(e.target.value)
                if (fieldErrors.projectName) {
                  setFieldErrors((prev) => ({ ...prev, projectName: undefined }))
                }
              }}
              placeholder="Артист - название релиза"
              className="h-11 border-[#303038] bg-[#15151B] text-base md:text-sm"
              aria-invalid={Boolean(fieldErrors.projectName)}
              aria-describedby={fieldErrors.projectName ? "vk-project-error" : undefined}
              disabled={submitting}
            />
            {fieldErrors.projectName ? (
              <p id="vk-project-error" className="text-xs text-[#F3264D]">
                {fieldErrors.projectName}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vk-link">{goal.linkFieldLabel}</Label>
            <Input
              ref={linkRef}
              id="vk-link"
              value={trackLink}
              onChange={(e) => {
                setTrackLink(e.target.value)
                if (fieldErrors.trackLink) {
                  setFieldErrors((prev) => ({ ...prev, trackLink: undefined }))
                }
              }}
              placeholder="https://…"
              className="h-11 border-[#303038] bg-[#15151B] text-base md:text-sm"
              aria-invalid={Boolean(fieldErrors.trackLink)}
              aria-describedby={fieldErrors.trackLink ? "vk-link-error" : undefined}
              disabled={submitting}
            />
            {fieldErrors.trackLink ? (
              <p id="vk-link-error" className="text-xs text-[#F3264D]">
                {fieldErrors.trackLink}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none">Цель кампании</legend>
            <div className="grid gap-2" role="radiogroup" aria-label="Цель кампании в форме">
              {VK_ADS_GOALS.map((item) => {
                const active = item.id === goalId
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => selectGoal(item.id)}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3264D]/70",
                      active
                        ? "border-[#F3264D]/50 bg-[#F3264D]/12 text-[#F7F5F8]"
                        : "border-[#303038] bg-[#15151B] text-[#B3ADBC] hover:text-[#F7F5F8]",
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
            <Label htmlFor="vk-budget">Рекламный бюджет, ₽</Label>
            <Input
              ref={budgetRef}
              id="vk-budget"
              value={budget}
              inputMode="numeric"
              onChange={(e) => {
                setBudget(e.target.value)
                if (fieldErrors.budget) {
                  setFieldErrors((prev) => ({ ...prev, budget: undefined }))
                }
              }}
              placeholder="Например, 10000"
              className="h-11 border-[#303038] bg-[#15151B] text-base md:text-sm"
              aria-invalid={Boolean(fieldErrors.budget)}
              aria-describedby={fieldErrors.budget ? "vk-budget-error" : "vk-budget-hint"}
              disabled={submitting}
            />
            {fieldErrors.budget ? (
              <p id="vk-budget-error" className="text-xs text-[#F3264D]">
                {fieldErrors.budget}
              </p>
            ) : (
              <p id="vk-budget-hint" className="text-xs text-[#B3ADBC]">
                Необязательно. Можем обсудить.
              </p>
            )}
          </div>

          {contactFromProfile ? (
            <p className="rounded-[10px] border border-[#303038] bg-[#15151B] px-3 py-2.5 text-sm text-[#B3ADBC]">
              Контакт для связи:{" "}
              <span className="font-medium text-[#F7F5F8]">{accountEmail}</span>
              {" "}(из профиля аккаунта)
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="vk-contact">Контакт для связи</Label>
              <Input
                ref={contactRef}
                id="vk-contact"
                value={contact}
                maxLength={200}
                onChange={(e) => {
                  setContact(e.target.value)
                  if (fieldErrors.contact) {
                    setFieldErrors((prev) => ({ ...prev, contact: undefined }))
                  }
                }}
                placeholder="Email или @username"
                className="h-11 border-[#303038] bg-[#15151B] text-base md:text-sm"
                aria-invalid={Boolean(fieldErrors.contact)}
                aria-describedby={fieldErrors.contact ? "vk-contact-error" : undefined}
                disabled={submitting}
              />
              {fieldErrors.contact ? (
                <p id="vk-contact-error" className="text-xs text-[#F3264D]">
                  {fieldErrors.contact}
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="vk-comment">Комментарий</Label>
            <Textarea
              id="vk-comment"
              value={comment}
              maxLength={2000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Желаемый старт, аудитория или другие пожелания"
              rows={3}
              className="border-[#303038] bg-[#15151B] text-base md:text-sm"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2 border-t border-[#303038] pt-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[#B3ADBC]">Работа Parallax</span>
              <span className="text-right font-medium text-[#F7F5F8]">
                {priceLabel} до определения точной стоимости
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[#B3ADBC]">Рекламный бюджет</span>
              <span className="text-right font-medium text-[#F7F5F8]">{budgetDisplay}</span>
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
          <p className="text-xs leading-relaxed text-[#B3ADBC]">
            Точную стоимость и условия согласуем перед оплатой. Сейчас деньги не списываются.
          </p>
          <p id={statusId} role="status" aria-live="polite" className="sr-only">
            {statusMessage || ""}
          </p>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="scroll-mt-20 max-w-3xl space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Вопросы о продвижении.
        </h2>
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-[12px] border border-[#303038] bg-[#15151B]/60 px-4"
        >
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`vk-faq-${i}`} className="border-[#303038]">
              <AccordionTrigger className="text-left text-[15px] text-[#F7F5F8]">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-[#B3ADBC]">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}
