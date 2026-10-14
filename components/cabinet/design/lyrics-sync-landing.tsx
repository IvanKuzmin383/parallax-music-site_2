"use client"

import { useCallback, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  AudioLines,
  CheckCircle2,
  Eye,
  Mic2,
  Music2,
  Sparkles,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import {
  LyricsSyncDemo,
  scrollToLyricsDemo,
  type LyricsSyncDemoHandle,
} from "@/components/cabinet/design/lyrics-sync-demo"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import { LYRICS_SYNC_PRICE_LABEL } from "@/lib/lyrics-sync-pricing"

const BENEFIT_CARDS = [
  {
    icon: Eye,
    title: "Разобрать каждую строку",
    body: "Слушателю проще увидеть слова и понять, что звучит в конкретный момент.",
  },
  {
    icon: Mic2,
    title: "Подпевать вместе",
    body: "Подсветка помогает следить за песней и вовремя вступать в знакомые строки.",
  },
  {
    icon: Sparkles,
    title: "Замечать смысл текста",
    body: "Важные слова остаются перед глазами, пока звучит ваша музыка.",
  },
] as const

const INCLUDE_ROWS = [
  {
    icon: AudioLines,
    title: "Синхронизация с вокалом",
    body: "Свяжем строки текста с моментами их исполнения в вашей записи.",
  },
  {
    icon: CheckCircle2,
    title: "Проверка по аудио",
    body: "Проверим последовательность строк и соответствие выбранной версии трека.",
  },
  {
    icon: Music2,
    title: "Подготовка к размещению",
    body: "Подготовим синхронизированный текст для передачи в поддерживаемом формате.",
  },
] as const

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Пришлите трек и слова",
    body: "Нужны финальная аудиозапись и полный текст в порядке исполнения.",
  },
  {
    num: "02",
    title: "Сопоставим текст и вокал",
    body: "Разметим строки по времени и проверим, как они следуют за записью.",
  },
  {
    num: "03",
    title: "Подготовим результат",
    body: "Оформим синхронизированный текст для дальнейшего размещения.",
  },
] as const

const ORDER_INCLUDES = [
  "Разметка строк по времени.",
  "Проверка по аудиозаписи.",
  "Подготовка к размещению.",
] as const

const FAQ_ITEMS = [
  {
    q: "Чем отличается синхронизированный текст?",
    a: "Строки привязаны к моментам исполнения. Плеер с поддержкой этой функции выделяет нужную строку по мере звучания песни.",
  },
  {
    q: "Нужно прислать готовый текст?",
    a: "Да. Передайте полный текст вашей песни в порядке исполнения вместе с финальной аудиозаписью.",
  },
  {
    q: "Почему нужна финальная версия трека?",
    a: "Разметка связана со временем в конкретной записи. Другая длительность, вступление или структура песни могут потребовать новой синхронизации.",
  },
  {
    q: "Что делать с повторяющимся припевом?",
    a: "Приведите его текст каждый раз, когда он звучит, чтобы последовательность строк соответствовала записи.",
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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  })
}

export function LyricsSyncLanding({ service }: { service: ServiceCatalogEntry }) {
  const pathname = usePathname()
  const router = useRouter()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const formHeadingId = useId()
  const statusId = useId()
  const phoneRef = useRef<HTMLDivElement | null>(null)
  const demoRef = useRef<LyricsSyncDemoHandle | null>(null)

  const [trackLink, setTrackLink] = useState("")
  const [lyricsText, setLyricsText] = useState("")
  const [comment, setComment] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    trackLink?: string
    lyricsText?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [demoPlaying, setDemoPlaying] = useState(false)
  const [demoEnded, setDemoEnded] = useState(false)

  const priceLabel = LYRICS_SYNC_PRICE_LABEL

  const openOrderForm = useCallback(() => {
    requestAnimationFrame(() => {
      scrollToId("lyrics-sync-order")
      window.setTimeout(() => {
        document.getElementById("lyrics-sync-form-title")?.focus()
      }, 280)
    })
  }, [])

  const runDemo = useCallback(() => {
    scrollToLyricsDemo(phoneRef)
    window.setTimeout(
      () => {
        demoRef.current?.toggle()
      },
      prefersReducedMotion() ? 0 : 220
    )
  }, [])

  const submitRequest = useCallback(async () => {
    if (!service.paymentEndpoint) {
      toast.error("Оформление этой услуги пока недоступно")
      return
    }

    const link = trackLink.trim()
    const lyrics = lyricsText.replace(/\r\n/g, "\n").trim()
    const nextErrors: { trackLink?: string; lyricsText?: string } = {}

    if (!link) {
      nextErrors.trackLink = "Укажите ссылку на финальную версию трека"
    } else if (!isHttpUrl(link)) {
      nextErrors.trackLink = "Укажите корректную ссылку (http или https)"
    }
    if (!lyrics) {
      nextErrors.lyricsText = "Укажите полный текст песни в порядке исполнения"
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error(
        nextErrors.trackLink || nextErrors.lyricsText || "Заполните обязательные поля"
      )
      scrollToId("lyrics-sync-order")
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
          trackLink: link,
          fileUrl: link,
          lyricsText: lyrics,
          comment: comment.replace(/\r\n/g, "\n").trim(),
          payFromBalance: true,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        paid?: boolean
        orderId?: string
      }
      if (!res.ok) {
        toast.error(data.error || "Не удалось оплатить с баланса")
        return
      }
      if (data.paid === true) {
        const successText = "Оплата с баланса прошла успешно. Заказ принят в работу."
        toast.success(successText)
        setStatusMessage(successText)
        setTrackLink("")
        setLyricsText("")
        setComment("")
        setFieldErrors({})
        router.refresh()
        return
      }
      toast.error("Не удалось оплатить с баланса")
    } catch {
      toast.error("Ошибка при оплате с баланса")
    } finally {
      setSubmitting(false)
    }
  }, [service.paymentEndpoint, trackLink, lyricsText, comment, router])

  const heroDemoLabel = demoPlaying
    ? "Пауза"
    : demoEnded
      ? "Повторить пример"
      : "Запустить пример"

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] space-y-12 pb-12 md:space-y-20">
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

      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <div className="order-1 min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8AFBD]">
            Синхронизированный текст песни
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight break-words text-[#F7F4F6] sm:text-4xl md:text-5xl lg:text-[3.15rem]">
            Вашу песню слушают.
            <br />
            Теперь ей подпевают.
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-[#B8AFBD] md:text-base">
            Синхронизируем строки текста с вокалом. В плеере с поддержкой синхронизации слова
            появляются в нужный момент - слушателю проще следить за песней и подпевать.
          </p>

          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-[#F7F4F6] sm:text-3xl">
              {priceLabel}
            </p>
            <p className="text-sm text-[#B8AFBD]">Стоимость услуги за один трек</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="h-11 min-h-11 bg-[#F21D43] px-5 text-white hover:bg-[#F21D43]/90"
              onClick={openOrderForm}
            >
              Заказать синхронизацию
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-h-11 px-5"
              onClick={runDemo}
            >
              {heroDemoLabel}
            </Button>
          </div>

          <p className="text-sm text-[#B8AFBD]">
            Текст в такт вокалу · Проверка по аудио · Готовая разметка
          </p>
        </div>

        <div className="order-2 min-w-0 overflow-x-hidden">
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-end lg:justify-center lg:gap-5">
            <LyricsSyncDemo
              ref={demoRef}
              phoneRef={phoneRef}
              onPlayingChange={(playing, ended) => {
                setDemoPlaying(playing)
                setDemoEnded(ended)
              }}
            />
            <div className="hidden max-w-[9.5rem] space-y-1 pb-16 text-left lg:block">
              <p className="text-sm font-semibold text-[#F7F4F6]">В нужный момент</p>
              <p className="text-xs leading-relaxed text-[#B8AFBD]">
                Каждая строка на своём месте
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-medium text-[#F7F4F6] lg:hidden">
            В нужный момент
            <span className="mt-1 block text-xs font-normal text-[#B8AFBD]">
              Каждая строка на своём месте
            </span>
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8AFBD]">
            Зачем это вашему треку
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
            Слушать. Читать. Подпевать.
          </h2>
          <p className="max-w-2xl text-[15px] text-[#B8AFBD]">
            Слова становятся частью прослушивания. Любимые строчки можно прочитать и повторить
            вместе с песней.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {BENEFIT_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-[22px] border border-[#302831] bg-[#151419] px-5 py-5"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F21D43]/12 text-[#F21D43]">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-[#F7F4F6]">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#B8AFBD]">{card.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8AFBD]">
            Что входит в работу
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
            У каждой строки своё время.
          </h2>
          <p className="max-w-2xl text-[15px] text-[#B8AFBD]">
            Подготовим разметку по финальной записи песни и проверим её вместе с аудио.
          </p>
        </div>
        <ul className="space-y-3">
          {INCLUDE_ROWS.map((row) => {
            const Icon = row.icon
            return (
              <li
                key={row.title}
                className="flex gap-4 rounded-[22px] border border-[#302831] bg-[#151419] px-5 py-4"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F21D43]/12 text-[#F21D43]">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#F7F4F6]">{row.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#B8AFBD]">{row.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="max-w-2xl text-sm leading-relaxed text-[#B8AFBD]">
          Отображение зависит от поддержки функции конкретным плеером и способа размещения. Мы
          готовим разметку для дальнейшей передачи - без обещания публикации на всех площадках.
        </p>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8AFBD]">
            Как проходит работа
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
            От готового текста до строки на экране.
          </h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {PROCESS_STEPS.map((step) => (
            <li
              key={step.num}
              className="rounded-[22px] border border-[#302831] bg-[#151419] px-5 py-5"
            >
              <p className="text-xs font-semibold tracking-[0.12em] text-[#F21D43]">{step.num}</p>
              <p className="mt-2 font-semibold text-[#F7F4F6]">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#B8AFBD]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="lyrics-sync-order"
        className="scroll-mt-20 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start"
      >
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8AFBD]">
            Синхронизация текста
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
            Пусть ваши слова будут на экране.
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-[#B8AFBD]">
            Передайте финальную запись и текст. Менеджер уточнит детали в переписке.
          </p>
          <div className="space-y-1 pt-1">
            <p className="text-2xl font-bold text-[#F21D43]">{priceLabel}</p>
            <p className="text-sm text-[#B8AFBD]">За один трек</p>
          </div>
          <ul className="space-y-2 text-sm text-[#B8AFBD]">
            {ORDER_INCLUDES.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#F21D43]" aria-hidden>
                  ·
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-[#B8AFBD]">
            Оплата списывается с баланса кабинета. После оплаты менеджер уточнит детали в переписке.
          </p>
        </div>

        <aside
          className="rounded-[22px] border border-[#302831] bg-[#151419] p-5 shadow-sm sm:p-6"
          aria-labelledby={formHeadingId}
        >
          <h3
            id="lyrics-sync-form-title"
            tabIndex={-1}
            className="scroll-mt-24 text-lg font-semibold tracking-tight text-[#F7F4F6] outline-none"
          >
            <span id={formHeadingId}>Ваш трек и текст</span>
          </h3>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lyrics-sync-track">Финальная версия трека</Label>
              <Input
                id="lyrics-sync-track"
                value={trackLink}
                onChange={(e) => {
                  setTrackLink(e.target.value)
                  if (fieldErrors.trackLink) {
                    setFieldErrors((prev) => ({ ...prev, trackLink: undefined }))
                  }
                }}
                placeholder="https://disk.yandex.ru/..."
                className="text-base md:text-sm"
                aria-invalid={Boolean(fieldErrors.trackLink)}
                aria-describedby={
                  fieldErrors.trackLink ? undefined : "lyrics-sync-track-hint"
                }
                disabled={submitting}
              />
              {fieldErrors.trackLink ? (
                <p className="text-xs text-[#F21D43]">{fieldErrors.trackLink}</p>
              ) : (
                <p id="lyrics-sync-track-hint" className="text-xs text-[#B8AFBD]">
                  Используйте именно ту запись, для которой нужен текст.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lyrics-sync-lyrics">Текст песни</Label>
              <Textarea
                id="lyrics-sync-lyrics"
                value={lyricsText}
                onChange={(e) => {
                  setLyricsText(e.target.value)
                  if (fieldErrors.lyricsText) {
                    setFieldErrors((prev) => ({ ...prev, lyricsText: undefined }))
                  }
                }}
                placeholder="Полный текст песни в порядке исполнения"
                rows={8}
                className="whitespace-pre-wrap text-base md:text-sm"
                aria-invalid={Boolean(fieldErrors.lyricsText)}
                aria-describedby={
                  fieldErrors.lyricsText ? undefined : "lyrics-sync-lyrics-hint"
                }
                disabled={submitting}
              />
              {fieldErrors.lyricsText ? (
                <p className="text-xs text-[#F21D43]">{fieldErrors.lyricsText}</p>
              ) : (
                <p id="lyrics-sync-lyrics-hint" className="text-xs text-[#B8AFBD]">
                  Укажите повторяющиеся куплеты и припевы полностью.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lyrics-sync-comment">Комментарий</Label>
              <Textarea
                id="lyrics-sync-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Особенности текста или версии трека"
                rows={3}
                className="whitespace-pre-wrap text-base md:text-sm"
                disabled={submitting}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#302831] pt-4 text-sm">
              <span className="text-[#B8AFBD]">Один трек</span>
              <span className="font-semibold text-[#F7F4F6]">{priceLabel}</span>
            </div>

            <Button
              type="button"
              className="h-11 min-h-11 w-full bg-[#F21D43] text-white hover:bg-[#F21D43]/90"
              disabled={submitting}
              onClick={() => void submitRequest()}
            >
              {submitting ? "Оплата…" : "Оплатить с баланса"}
            </Button>
            <p className="text-xs leading-relaxed text-[#B8AFBD]">
              Сумма спишется с баланса кабинета сразу после подтверждения.
            </p>
            <div id={statusId} role="status" aria-live="polite" className="sr-only">
              {statusMessage}
            </div>
            {statusMessage ? (
              <p className="rounded-[14px] border border-[#302831] bg-[#1A161B] px-3 py-2.5 text-sm leading-relaxed text-[#F7F4F6]">
                {statusMessage}
              </p>
            ) : null}
          </div>
        </aside>
      </section>

      <section id="faq" className="scroll-mt-20 max-w-3xl space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B8AFBD]">
            Короткие ответы
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#F7F4F6] md:text-[1.75rem]">
            Частые вопросы
          </h2>
        </div>
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-[22px] border border-[#302831] px-4"
        >
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`lyrics-sync-faq-${i}`}>
              <AccordionTrigger className="text-left text-[15px]">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-[#B8AFBD]">
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
