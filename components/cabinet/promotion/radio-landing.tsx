"use client"

import { useCallback, useId, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  CheckCircle2,
  Disc3,
  FileCheck2,
  Radio,
  Sparkles,
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

const INCLUDE_CARDS = [
  {
    icon: Sparkles,
    title: "Подготовка материалов",
    body: "Уточним информацию о треке и подготовим материалы для размещения",
  },
  {
    icon: Radio,
    title: "Трек в радио-витрине",
    body: "Разместим произведение в радио-витрине Parallax Music по согласованным условиям",
  },
  {
    icon: FileCheck2,
    title: "Подтверждение",
    body: "Сообщим о выполнении размещения, чтобы вы могли проверить результат",
  },
] as const

const PROCESS_STEPS = [
  {
    title: "Оставьте заявку",
    body: "Укажите название релиза, ссылку на трек и пожелания",
  },
  {
    title: "Уточним детали",
    body: "Свяжемся с вами и обсудим условия, стоимость и сроки",
  },
  {
    title: "Выполним размещение",
    body: "Подготовим материалы и разместим трек по согласованным условиям",
  },
  {
    title: "Подтвердим результат",
    body: "Сообщим о завершении работы",
  },
] as const

const PREPARE_ITEMS = [
  "Название релиза или проекта",
  "Ссылку на трек, если она есть",
  "Пожелания к размещению и контакт для связи",
] as const

const FAQ_ITEMS = [
  {
    q: "Что входит в услугу?",
    a: "Подготовка материалов, размещение трека в радио-витрине Parallax Music и подтверждение выполнения",
  },
  {
    q: "Нужно ли сейчас оплачивать?",
    a: "Сейчас заявка предварительная и оплата не списывается. Мы свяжемся с вами для уточнения деталей",
  },
  {
    q: "Какие сроки размещения?",
    a: "Сроки определяются при согласовании условий по вашему треку. Конкретный срок должен быть указан перед оформлением размещения",
  },
] as const

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

function RadioVitrineSample() {
  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <div className="relative overflow-visible px-2 py-3 sm:px-3">
        <div
          className={cn(
            "relative origin-center rounded-[12px] border border-border bg-card p-4 text-foreground",
            "shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)]",
            "rotate-[1.5deg] sm:rotate-[2deg]",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Parallax / Радио
            </p>
            <span className="rounded-md border border-[#FFB4C3]/35 bg-[#F01F43]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FFB4C3]">
              Образец
            </span>
          </div>

          <div className="relative mx-auto mt-4 flex aspect-square w-full max-w-[12.5rem] items-center justify-center overflow-hidden rounded-[12px] bg-gradient-to-br from-[#2A1A22] via-[#1A1218] to-[#0E0C10]">
            <div
              className="absolute inset-[18%] rounded-full border border-[#FFB4C3]/25 bg-[#1C1218]"
              aria-hidden
            />
            <div
              className="absolute inset-[34%] rounded-full border border-[#F01F43]/40 bg-[#0C0A0E]"
              aria-hidden
            />
            <Disc3 className="relative h-10 w-10 text-[#FFB4C3]/90" aria-hidden />
          </div>

          <div className="mt-4 space-y-1">
            <p className="truncate text-base font-semibold tracking-tight">Название трека</p>
            <p className="truncate text-sm text-muted-foreground">Имя артиста</p>
            <p className="text-xs text-muted-foreground/90">Радио-витрина Parallax Music</p>
          </div>

          <div
            className={cn(
              "absolute -bottom-4 left-3 right-3 rounded-[10px] border border-border bg-card px-3 py-2.5",
              "shadow-[0_10px_24px_-16px_rgba(0,0,0,0.8)]",
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F01F43]/12 text-[#F01F43]">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Подтверждение размещения</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Трек · Условия · Результат</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">Пример оформления результата</p>
    </div>
  )
}

export function RadioLanding({ service }: { service: ServiceCatalogEntry }) {
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const formPanelId = useId()
  const statusId = useId()

  const [formOpen, setFormOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [trackLink, setTrackLink] = useState("")
  const [comment, setComment] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    projectName?: string
    trackLink?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const priceLabel = service.priceLabel
  const features = service.features

  const openOrderForm = useCallback((expandForm: boolean) => {
    if (expandForm) setFormOpen(true)
    requestAnimationFrame(() => {
      scrollToId("radio-order")
      if (expandForm) {
        window.setTimeout(() => {
          document.getElementById("radio-project")?.focus()
        }, 280)
      }
    })
  }, [])

  const submitRequest = useCallback(async () => {
    if (!service.paymentEndpoint) {
      toast.error("Заявка пока недоступна")
      return
    }

    const nextErrors: { projectName?: string; trackLink?: string } = {}
    if (!projectName.trim()) {
      nextErrors.projectName = "Укажите название релиза или проекта"
    }
    const link = trackLink.trim()
    if (link && !isHttpUrl(link)) {
      nextErrors.trackLink = "Укажите корректную ссылку (http или https)"
    }
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error(nextErrors.projectName || nextErrors.trackLink || "Заполните обязательные поля")
      setFormOpen(true)
      scrollToId("radio-order")
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
          trackTitle: projectName.trim(),
          trackLink: link || undefined,
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
      const successText =
        typeof data.message === "string" && data.message
          ? data.message
          : "Заявка отправлена. Мы свяжемся с вами для уточнения деталей. Оплата не списана."
      toast.success(successText)
      setStatusMessage(successText)
      setProjectName("")
      setTrackLink("")
      setComment("")
      setFieldErrors({})
    } catch {
      toast.error("Ошибка при отправке заявки")
    } finally {
      setSubmitting(false)
    }
  }, [service.paymentEndpoint, projectName, trackLink, comment])

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
            Радио-витрина Parallax Music
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight break-words sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            <span className="text-foreground">Ваш трек - </span>
            <span className="text-[#F01F43]">в радио-витрине </span>
            <span className="text-foreground">Parallax Music.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Ещё одна точка знакомства с вашей музыкой. Подготовим материалы, разместим трек в
            радио-витрине Parallax Music и подтвердим выполнение.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="h-11 min-h-11 bg-[#F01F43] px-5 text-white hover:bg-[#F01F43]/90"
              onClick={() => openOrderForm(true)}
            >
              Оставить заявку
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-h-11 px-5"
              onClick={() => scrollToId("radio-include")}
            >
              Что я получу
            </Button>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{priceLabel}</span>
              {" "}
              за трек
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Предварительная заявка. Оплата сейчас не списывается.
            </p>
          </div>
        </div>
        <div className="min-w-0 overflow-x-hidden pt-1 lg:pt-0">
          <RadioVitrineSample />
        </div>
      </section>

      {/* B. Include */}
      <section id="radio-include" className="scroll-mt-20 space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Что входит
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            От подготовки до размещения
          </h2>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
            Понятный состав услуги и подтверждение выполненной работы.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {INCLUDE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-[12px] border border-border bg-card/80 px-4 py-4"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F01F43]/12 text-[#F01F43]">
                  <Icon className="h-4 w-4" aria-hidden />
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

      {/* C. Process + order */}
      <section
        id="radio-order"
        className="scroll-mt-20 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start"
      >
        <div id="radio-process" className="scroll-mt-20 space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Начнём с вашего релиза
          </h2>
          <ol className="space-y-4">
            {PROCESS_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F01F43]/15 text-xs font-semibold text-[#F01F43]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-[12px] border border-border bg-card/60 px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Что подготовить</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {PREPARE_ITEMS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#F01F43]" aria-hidden>
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="rounded-[12px] border border-[#F01F43]/25 bg-card/80 p-5 shadow-sm lg:sticky lg:top-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Размещение в радио-витрине
            </h3>
            <p className="mt-2 text-2xl font-bold text-[#F01F43]">{priceLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">За один трек</p>
          </div>

          <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
            {features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-[#F01F43]" aria-hidden>
                  ·
                </span>
                <span>{feature.endsWith(".") ? feature : `${feature}.`}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2">
            <Button
              type="button"
              className="h-11 min-h-11 w-full bg-[#F01F43] text-white hover:bg-[#F01F43]/90"
              aria-expanded={formOpen}
              aria-controls={formPanelId}
              onClick={() => openOrderForm(true)}
            >
              Оставить заявку
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Сейчас собираем предварительные заявки. Оплата не списывается. Мы свяжемся с вами для
              уточнения деталей.
            </p>
          </div>

          <div
            id={formPanelId}
            className={cn("mt-5 space-y-3 border-t border-border pt-5", !formOpen && "hidden")}
          >
            <h4 className="text-base font-semibold text-foreground">Заявка на услугу</h4>
            <div className="space-y-1.5">
              <Label htmlFor="radio-project">Название релиза / проекта</Label>
              <Input
                id="radio-project"
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
                <p className="text-xs text-[#F01F43]">{fieldErrors.projectName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="radio-link">Ссылка на трек</Label>
              <Input
                id="radio-link"
                value={trackLink}
                onChange={(e) => {
                  setTrackLink(e.target.value)
                  if (fieldErrors.trackLink) {
                    setFieldErrors((prev) => ({ ...prev, trackLink: undefined }))
                  }
                }}
                placeholder="https://…"
                className="text-base md:text-sm"
                aria-invalid={Boolean(fieldErrors.trackLink)}
                disabled={submitting}
              />
              {fieldErrors.trackLink ? (
                <p className="text-xs text-[#F01F43]">{fieldErrors.trackLink}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Можно оставить пустым, если ссылки ещё нет.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="radio-comment">Комментарий</Label>
              <Textarea
                id="radio-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Пожелания к размещению"
                rows={3}
                className="text-base md:text-sm"
                disabled={submitting}
              />
            </div>
            <Button
              type="button"
              className="h-11 min-h-11 w-full bg-[#F01F43] text-white hover:bg-[#F01F43]/90"
              disabled={submitting}
              onClick={() => void submitRequest()}
            >
              {submitting ? "Отправляем…" : service.interestCtaLabel || "Отправить заявку"}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Это предварительная заявка. Оплата сейчас не списывается.
            </p>
            <div id={statusId} role="status" aria-live="polite" className="sr-only">
              {statusMessage}
            </div>
            {statusMessage ? (
              <p className="rounded-[10px] border border-border bg-muted/60 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                {statusMessage}
              </p>
            ) : null}
          </div>
        </aside>
      </section>

      {/* D. FAQ */}
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
            <AccordionItem key={item.q} value={`radio-faq-${i}`}>
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
