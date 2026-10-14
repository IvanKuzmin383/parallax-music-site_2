"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Coffee,
  Dumbbell,
  FileCheck2,
  Library,
  ShoppingBag,
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
import { BUSINESS_MUSIC_PRICE_RUB } from "@/lib/business-music-pricing"
import { PUBLICKA_RATE_RUB, playsToEarningsRub } from "@/lib/publicka-shared"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import { cn } from "@/lib/utils"

const INCLUDE_CARDS = [
  {
    icon: FileCheck2,
    title: "Проверка прав",
    body: "Уточним права на композицию для её размещения в каталоге фоновой музыки.",
  },
  {
    icon: Library,
    title: "Трек в БизнесЗвуке",
    body: "Добавим согласованный трек в каталог сервиса, где музыку используют для коммерческих пространств.",
  },
  {
    icon: BarChart3,
    title: "Статистика и роялти",
    body: "Вы увидите статистику прослушиваний и начисления за использование трека.",
  },
] as const

const USAGE_EXAMPLES = [
  {
    icon: Coffee,
    title: "Кафе и рестораны",
    body: "Музыка, которая создаёт атмосферу.",
  },
  {
    icon: ShoppingBag,
    title: "Магазины",
    body: "Звуковой фон для повседневных покупок.",
  },
  {
    icon: Dumbbell,
    title: "Фитнес и студии",
    body: "Ритм для движения и занятий.",
  },
] as const

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Оформляете заказ",
    body: "Указываете трек, добавляете ссылку и выбираете оплату картой или с баланса.",
  },
  {
    num: "02",
    title: "Согласуем материалы",
    body: "Менеджер уточняет детали. Проверяем права и готовим трек к добавлению.",
  },
  {
    num: "03",
    title: "Размещаем трек",
    body: "Добавляем композицию в каталог. Далее вы следите за статистикой и начислениями.",
  },
] as const

const ORDER_INCLUDES = [
  "Проверка прав.",
  "Добавление в каталог.",
  "Статистика и начисления роялти.",
] as const

const PLAY_PRESETS = [1000, 10_000, 100_000] as const

const FAQ_ITEMS = [
  {
    q: "Что именно входит в 5 000 ₽?",
    a: "Проверка прав, добавление одного согласованного трека в каталог БизнесЗвука, статистика прослушиваний и начисления роялти.",
  },
  {
    q: "Будут ли мой трек обязательно включать?",
    a: "Услуга предусматривает размещение в каталоге. Количество прослушиваний зависит от фактического использования трека в сервисе; заранее определённого объёма воспроизведений нет.",
  },
  {
    q: "Как рассчитываются роялти?",
    a: "По ставке 0,01 ₽ за учитываемое прослушивание. Например, 10 000 прослушиваний соответствуют начислению 100 ₽. Фактическая сумма зависит от использования трека.",
  },
  {
    q: "Что подготовить для заявки?",
    a: "Название трека или релиза и ссылку на композицию, если она есть. Менеджер свяжется с вами и уточнит информацию, необходимую для проверки прав и размещения.",
  },
  {
    q: "Сколько занимает выполнение?",
    a: "Срок зависит от услуги - обычно от 3 до 14 рабочих дней.",
  },
  {
    q: "Можно ли вернуть оплату?",
    a: "Возврат возможен до начала работы - напишите в поддержку.",
  },
] as const

function formatRub(value: number): string {
  return value.toLocaleString("ru-RU")
}

function formatPlays(value: number): string {
  return value.toLocaleString("ru-RU")
}

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

function BiznesZvukCatalogSample() {
  return (
    <div className="mx-auto w-full max-w-[22rem]">
      <div className="relative overflow-visible px-1 py-2 sm:px-2">
        <div
          className={cn(
            "relative origin-center rounded-[14px] border border-[#E4D9CB] bg-[#F1E9DE] p-4 text-[#1A1614]",
            "shadow-[0_22px_44px_-18px_rgba(0,0,0,0.55)]",
            "rotate-[1.25deg] sm:rotate-[2deg]",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-[#1A1614]">БизнесЗвук</p>
              <p className="mt-0.5 text-[11px] text-[#6B635C]">Каталог фоновой музыки</p>
            </div>
            <span className="shrink-0 rounded-md border border-[#F21D43]/30 bg-[#F21D43]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#F21D43]">
              Образец
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-[#D9CFC2] bg-[#FAF6F0] p-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-[#2A272F] text-[#FFB4C5]"
              aria-hidden
            >
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1A1614]">Ваш трек</p>
              <p className="truncate text-xs text-[#6B635C]">Имя артиста</p>
              <span className="mt-1.5 inline-flex rounded-md bg-[#2A272F]/08 px-1.5 py-0.5 text-[10px] font-medium text-[#4A4440]">
                Музыка для пространств
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[#6B635C]">
            Новый контекст для вашей музыки
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {["Кафе", "Магазины", "Фитнес"].map((label) => (
            <span
              key={label}
              className="rounded-md border border-[#2A272F] bg-[#151419]/90 px-2.5 py-1 text-[11px] font-medium text-[#B0A9B6]"
            >
              {label}
            </span>
          ))}
          <span className="rounded-md bg-[#F21D43] px-2.5 py-1 text-[11px] font-semibold text-white">
            {PUBLICKA_RATE_RUB.toLocaleString("ru-RU")} ₽ / за прослушивание
          </span>
        </div>
      </div>
    </div>
  )
}

function BusinessMusicLandingInner({ service }: { service: ServiceCatalogEntry }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const paymentHandledRef = useRef(false)

  const [projectName, setProjectName] = useState("")
  const [trackLink, setTrackLink] = useState("")
  const [comment, setComment] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    projectName?: string
    trackLink?: string
    comment?: string
  }>({})
  const [submitting, setSubmitting] = useState<"card" | "balance" | null>(null)
  const [playsPreset, setPlaysPreset] = useState<(typeof PLAY_PRESETS)[number]>(10_000)

  const priceRub = BUSINESS_MUSIC_PRICE_RUB
  const priceDisplay = `${formatRub(priceRub)} ₽`
  const earnings = playsToEarningsRub(playsPreset)
  const rateLabel = PUBLICKA_RATE_RUB.toLocaleString("ru-RU")

  useEffect(() => {
    const paymentState = searchParams.get("payment")
    const orderId = searchParams.get("orderId")
    if (paymentState === "fail") {
      toast.error("Оплата не завершена")
      router.replace(service.href)
      return
    }
    if (paymentState !== "return" || !orderId || paymentHandledRef.current) return
    paymentHandledRef.current = true
    void (async () => {
      try {
        const res = await fetch(
          `/api/cabinet/payments/order-status?orderId=${encodeURIComponent(orderId)}`,
          { credentials: "include" }
        )
        const data = await res.json().catch(() => ({}))
        if (data.status === "paid") {
          toast.success("Оплата прошла успешно. Заказ принят в работу.")
          router.replace(service.href)
        } else if (data.status === "failed") {
          toast.error("Оплата не завершена")
        }
      } catch {
        toast.error("Не удалось проверить статус оплаты")
      }
    })()
  }, [searchParams, router, service.href])

  const openOrderForm = useCallback(() => {
    requestAnimationFrame(() => {
      scrollToId("bm-order")
      window.setTimeout(() => {
        document.getElementById("bm-project")?.focus()
      }, 280)
    })
  }, [])

  const handlePay = useCallback(
    async (payFromBalance: boolean) => {
      if (!service.paymentEndpoint) {
        toast.error("Оформление этой услуги пока недоступно")
        return
      }

      const nextErrors: { projectName?: string; trackLink?: string; comment?: string } = {}
      if (!projectName.trim()) {
        nextErrors.projectName = "Укажите название трека / релиза"
      }
      const link = trackLink.trim()
      if (link && !isHttpUrl(link)) {
        nextErrors.trackLink = "Укажите корректную ссылку (http или https)"
      }
      if (!comment.trim() || comment.trim().length < 2) {
        nextErrors.comment = "Заполните комментарий к заказу"
      }
      setFieldErrors(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        toast.error(
          nextErrors.projectName || nextErrors.trackLink || nextErrors.comment || "Заполните поля"
        )
        scrollToId("bm-order")
        return
      }

      setSubmitting(payFromBalance ? "balance" : "card")
      try {
        const res = await fetch(service.paymentEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            trackTitle: projectName.trim(),
            trackLink: link || undefined,
            fileUrl: link || undefined,
            comment: comment.trim(),
            contactType: "telegram",
            contactValue: "@artist",
            returnPath: "/cabinet/promotion/business-music",
            ...(payFromBalance ? { payFromBalance: true } : {}),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(
            data.error ||
              (payFromBalance ? "Не удалось оплатить с баланса" : "Не удалось создать оплату")
          )
          return
        }
        if (data.paid === true) {
          toast.success("Оплата с баланса прошла успешно. Заказ принят в работу.")
          setProjectName("")
          setTrackLink("")
          setComment("")
          setFieldErrors({})
          router.refresh()
          return
        }
        const payUrl =
          (typeof data.paymentUrl === "string" && data.paymentUrl) ||
          (typeof data.confirmationUrl === "string" && data.confirmationUrl) ||
          ""
        if (payUrl) {
          window.location.href = payUrl
          return
        }
        toast.error(payFromBalance ? "Не удалось оплатить с баланса" : "Не удалось создать оплату")
      } catch {
        toast.error(payFromBalance ? "Ошибка при оплате с баланса" : "Ошибка при создании оплаты")
      } finally {
        setSubmitting(null)
      }
    },
    [service.paymentEndpoint, projectName, trackLink, comment, router]
  )

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

      {/* 1. Hero */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:gap-10">
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B0A9B6]">
            Музыка для бизнеса · БизнесЗвук
          </p>
          <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight break-words sm:text-4xl md:text-5xl lg:text-[3.4rem]">
            <span className="text-[#F7F4F6]">Ваш трек - </span>
            <br className="hidden md:block" />
            <span className="text-[#F7F4F6]">в музыке </span>
            <br className="hidden md:block" />
            <span className="text-[#F21D43]">для бизнеса.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-[#B0A9B6] md:text-base">
            Откройте для музыки ещё один канал использования. Добавим трек в каталог фоновой музыки
            БизнесЗвука после проверки прав - со статистикой и начислением роялти.
          </p>

          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight text-[#F21D43] sm:text-4xl">
              {priceDisplay}
            </p>
            <p className="text-sm text-[#B0A9B6]">за размещение одного трека</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="h-11 min-h-11 bg-[#F21D43] px-5 text-white hover:bg-[#F21D43]/90"
              onClick={openOrderForm}
            >
              Разместить трек
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-h-11 px-5"
              onClick={() => scrollToId("bm-include")}
            >
              Что я получу
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-[#B0A9B6]">
            Проверка прав · Размещение в каталоге · Статистика и роялти
          </p>
        </div>

        <div className="min-w-0 overflow-x-hidden pt-1 lg:pt-0">
          <BiznesZvukCatalogSample />
        </div>
      </section>

      {/* 2. Include */}
      <section id="bm-include" className="scroll-mt-20 space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Что вы получаете
          </h2>
          <p className="max-w-2xl text-[15px] text-[#B0A9B6]">Один трек. Три составляющие услуги.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {INCLUDE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-[14px] border border-[#2A272F] bg-[#151419]/90 px-4 py-4"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F21D43]/12 text-[#F21D43]">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-[#F7F4F6]">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#B0A9B6]">{card.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. Usage examples */}
      <section id="bm-examples" className="scroll-mt-20 space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B0A9B6]">
          Где может звучать фоновая музыка · примеры
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {USAGE_EXAMPLES.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="relative overflow-hidden rounded-[14px] border border-[#2A272F] bg-[#151419]/90 px-4 py-4"
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#F21D43]/10"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-8 left-8 h-16 w-16 rotate-12 rounded-lg border border-[#2A272F]/80"
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A272F] text-[#FFB4C5]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-[#F7F4F6]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#B0A9B6]">{item.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. Royalty calculator */}
      <section
        id="bm-royalty"
        className="scroll-mt-20 grid gap-6 rounded-[16px] border border-[#2A272F] bg-[#151419]/70 p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center md:gap-8 md:p-6"
      >
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FFB4C5]">
            {rateLabel} ₽ за прослушивание
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Музыка используется. Роялти начисляются.
          </h2>
          <p className="max-w-xl text-[15px] leading-relaxed text-[#B0A9B6]">
            Начисления зависят от числа учитываемых прослушиваний. Посмотрите простой пример расчёта
            по ставке услуги.
          </p>
        </div>

        <div className="rounded-[14px] border border-[#2A272F] bg-[#09090C]/70 p-4">
          <p className="text-xs font-medium text-[#B0A9B6]">Пример · количество прослушиваний</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Количество прослушиваний">
            {PLAY_PRESETS.map((plays) => {
              const selected = playsPreset === plays
              return (
                <Button
                  key={plays}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  className={cn(
                    "h-10 min-h-10 min-w-[4.5rem]",
                    selected && "bg-[#F21D43] text-white hover:bg-[#F21D43]/90"
                  )}
                  onClick={() => setPlaysPreset(plays)}
                >
                  {formatPlays(plays)}
                </Button>
              )
            })}
          </div>
          <div className="mt-4 space-y-1" aria-live="polite">
            <p className="text-2xl font-bold tracking-tight text-[#F7F4F6]">
              {formatRub(earnings)} ₽
            </p>
            <p className="text-sm text-[#B0A9B6]">
              {formatPlays(playsPreset)} × {rateLabel} ₽
            </p>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#B0A9B6]">
            Пример расчёта по ставке услуги. Не гарантия дохода и не сумма к выводу.
          </p>
        </div>
      </section>

      {/* 5. Process */}
      <section id="bm-process" className="scroll-mt-20 space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          От заявки до каталога
        </h2>
        <ol className="grid gap-4 md:grid-cols-3 md:gap-0">
          {PROCESS_STEPS.map((step, index) => (
            <li
              key={step.num}
              className={cn(
                "min-w-0 md:px-4",
                index > 0 && "md:border-l md:border-[#2A272F]",
                index === 0 && "md:pl-0",
                index === PROCESS_STEPS.length - 1 && "md:pr-0"
              )}
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-[#F21D43]">{step.num}</p>
              <p className="mt-2 font-semibold text-[#F7F4F6]">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#B0A9B6]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. Order */}
      <section
        id="bm-order"
        className="scroll-mt-20 overflow-hidden rounded-[16px] border border-[#2A272F] bg-[#151419]/90"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5 border-b border-[#2A272F] p-5 md:p-6 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B0A9B6]">
                Размещение в БизнесЗвуке
              </p>
              <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
                Дайте треку новый контекст.
              </h2>
              <p className="text-[15px] leading-relaxed text-[#B0A9B6]">
                Оформите размещение в каталоге фоновой музыки. Менеджер свяжется с вами для
                уточнения деталей.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl font-bold text-[#F21D43]">{priceDisplay}</p>
              <p className="text-sm text-[#B0A9B6]">за один трек</p>
            </div>

            <ul className="space-y-2 border-t border-[#2A272F] pt-4 text-sm text-[#B0A9B6]">
              {ORDER_INCLUDES.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#F21D43]" aria-hidden>
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 p-5 md:p-6">
            <h3 className="text-lg font-semibold tracking-tight text-[#F7F4F6]">Ваш трек</h3>

            <div className="space-y-1.5">
              <Label htmlFor="bm-project">Название трека / релиза</Label>
              <Input
                id="bm-project"
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
                disabled={Boolean(submitting)}
              />
              {fieldErrors.projectName ? (
                <p className="text-xs text-[#F21D43]">{fieldErrors.projectName}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bm-link">Ссылка на трек · если есть</Label>
              <Input
                id="bm-link"
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
                disabled={Boolean(submitting)}
              />
              {fieldErrors.trackLink ? (
                <p className="text-xs text-[#F21D43]">{fieldErrors.trackLink}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bm-comment">Комментарий</Label>
              <Textarea
                id="bm-comment"
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value)
                  if (fieldErrors.comment) {
                    setFieldErrors((prev) => ({ ...prev, comment: undefined }))
                  }
                }}
                placeholder="Что стоит учесть при размещении"
                rows={3}
                className="text-base md:text-sm"
                aria-invalid={Boolean(fieldErrors.comment)}
                disabled={Boolean(submitting)}
              />
              {fieldErrors.comment ? (
                <p className="text-xs text-[#F21D43]">{fieldErrors.comment}</p>
              ) : (
                <p className="text-xs text-[#B0A9B6]">
                  Нужен для оформления заказа (действующая серверная проверка).
                </p>
              )}
            </div>

            <p className="pt-1 text-sm font-medium text-[#F7F4F6]">
              1 трек · размещение в каталоге - {priceDisplay}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Button
                type="button"
                className="h-11 min-h-11 w-full bg-[#F21D43] text-white hover:bg-[#F21D43]/90 sm:flex-1"
                disabled={Boolean(submitting)}
                onClick={() => void handlePay(false)}
              >
                {submitting === "card" ? "Создание..." : "Оплатить картой"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-11 w-full sm:flex-1"
                disabled={Boolean(submitting)}
                onClick={() => void handlePay(true)}
              >
                {submitting === "balance" ? "Оплата..." : "Оплатить с баланса"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="scroll-mt-20 max-w-3xl space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">Перед размещением</h2>
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-[12px] border border-[#2A272F] px-4"
        >
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`bm-faq-${i}`}>
              <AccordionTrigger className="text-left text-[15px]">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-[#B0A9B6]">
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

export function BusinessMusicLanding({ service }: { service: ServiceCatalogEntry }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20 text-sm text-muted-foreground">Загрузка...</div>
      }
    >
      <BusinessMusicLandingInner service={service} />
    </Suspense>
  )
}
