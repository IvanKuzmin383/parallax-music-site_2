"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  BarChart3,
  Coffee,
  Dumbbell,
  FileCheck2,
  Library,
  ShoppingBag,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
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
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-[#2A272F]">
              <Image
                src="/business-music/cafe-lounge.jpg"
                alt="Атмосфера кафе и лаунж-бара"
                fill
                sizes="56px"
                className="object-cover"
              />
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
              className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
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

  const [releaseId, setReleaseId] = useState("")
  const [comment, setComment] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    releaseId?: string
    comment?: string
  }>({})
  const [submitting, setSubmitting] = useState<"card" | "balance" | null>(null)
  const [playsPreset, setPlaysPreset] = useState<(typeof PLAY_PRESETS)[number]>(10_000)
  const { releases, loading: releasesLoading } = useCabinetReleases()
  const selectableReleases = useMemo(
    () => releases.filter((r) => r.kind !== "draft"),
    [releases]
  )
  const selectedRelease = useMemo(
    () => selectableReleases.find((r) => r.id === releaseId) ?? null,
    [selectableReleases, releaseId]
  )

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
        document.getElementById("bm-release")?.focus()
      }, 280)
    })
  }, [])

  const handlePay = useCallback(async () => {
    if (!service.paymentEndpoint) {
      toast.error("Оформление этой услуги пока недоступно")
      return
    }

    const nextErrors: { releaseId?: string; comment?: string } = {}
    if (!selectedRelease) {
      nextErrors.releaseId = "Выберите релиз из загруженных в кабинете"
    }
    if (!comment.trim() || comment.trim().length < 2) {
      nextErrors.comment = "Заполните комментарий к заказу"
    }
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error(nextErrors.releaseId || nextErrors.comment || "Заполните поля")
      scrollToId("bm-order")
      return
    }

    setSubmitting("balance")
    try {
      const res = await fetch(service.paymentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          releaseId: selectedRelease!.id,
          trackTitle: selectedRelease!.title,
          comment: comment.trim(),
          contactType: "telegram",
          contactValue: "@artist",
          returnPath: "/cabinet/promotion/business-music",
          payFromBalance: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Не удалось оплатить с баланса")
        return
      }
      if (data.paid === true) {
        toast.success("Оплата с баланса прошла успешно. Заказ принят в работу.")
        setReleaseId("")
        setComment("")
        setFieldErrors({})
        router.refresh()
        return
      }
      toast.error("Не удалось оплатить с баланса")
    } catch {
      toast.error("Ошибка при оплате с баланса")
    } finally {
      setSubmitting(null)
    }
  }, [service.paymentEndpoint, selectedRelease, comment, router])
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Музыка для бизнеса · БизнесЗвук
          </p>
          <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight break-words sm:text-4xl md:text-5xl lg:text-[3.4rem]">
            <span className="text-foreground">Ваш трек - </span>
            <br className="hidden md:block" />
            <span className="text-foreground">в музыке </span>
            <br className="hidden md:block" />
            <span className="text-[#F21D43]">для бизнеса.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Откройте для музыки ещё один канал использования. Добавим трек в каталог фоновой музыки
            БизнесЗвука после проверки прав - со статистикой и начислением роялти.
          </p>

          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight text-[#F21D43] sm:text-4xl">
              {priceDisplay}
            </p>
            <p className="text-sm text-muted-foreground">за размещение одного трека</p>
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

          <p className="text-xs leading-relaxed text-muted-foreground">
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
          <p className="max-w-2xl text-[15px] text-muted-foreground">Один трек. Три составляющие услуги.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {INCLUDE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-[14px] border border-border bg-card px-4 py-4"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F21D43]/12 text-[#F21D43]">
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

      {/* 3. Usage examples */}
      <section id="bm-examples" className="scroll-mt-20 space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Где может звучать фоновая музыка · примеры
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {USAGE_EXAMPLES.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="relative overflow-hidden rounded-[14px] border border-border bg-card px-4 py-4"
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#F21D43]/10"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-8 left-8 h-16 w-16 rotate-12 rounded-lg border border-border/80"
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#F21D43]/12 text-[#F21D43]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. Royalty calculator */}
      <section
        id="bm-royalty"
        className="scroll-mt-20 grid gap-6 rounded-[16px] border border-border bg-card p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center md:gap-8 md:p-6"
      >
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {rateLabel} ₽ за прослушивание
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Музыка используется. Роялти начисляются.
          </h2>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Начисления зависят от числа учитываемых прослушиваний. Посмотрите простой пример расчёта
            по ставке услуги.
          </p>
        </div>

        <div className="rounded-[14px] border border-border bg-muted p-4">
          <p className="text-xs font-medium text-muted-foreground">Пример · количество прослушиваний</p>
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
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {formatRub(earnings)} ₽
            </p>
            <p className="text-sm text-muted-foreground">
              {formatPlays(playsPreset)} × {rateLabel} ₽
            </p>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
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
                index > 0 && "md:border-l md:border-border",
                index === 0 && "md:pl-0",
                index === PROCESS_STEPS.length - 1 && "md:pr-0"
              )}
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-[#F21D43]">{step.num}</p>
              <p className="mt-2 font-semibold text-foreground">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. Order */}
      <section
        id="bm-order"
        className="scroll-mt-20 overflow-hidden rounded-[16px] border border-border bg-card"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5 border-b border-border p-5 md:p-6 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Размещение в БизнесЗвуке
              </p>
              <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
                Дайте треку новый контекст.
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Оформите размещение в каталоге фоновой музыки. Менеджер свяжется с вами для
                уточнения деталей.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl font-bold text-[#F21D43]">{priceDisplay}</p>
              <p className="text-sm text-muted-foreground">за один трек</p>
            </div>

            <ul className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
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
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Ваш трек</h3>

            <div className="space-y-1.5">
              <Label htmlFor="bm-release">Релиз из кабинета</Label>
              <Select
                value={releaseId || undefined}
                onValueChange={(value) => {
                  setReleaseId(value)
                  if (fieldErrors.releaseId) {
                    setFieldErrors((prev) => ({ ...prev, releaseId: undefined }))
                  }
                }}
                disabled={Boolean(submitting) || releasesLoading}
              >
                <SelectTrigger
                  id="bm-release"
                  className="w-full text-base md:text-sm"
                  aria-invalid={Boolean(fieldErrors.releaseId)}
                >
                  <SelectValue
                    placeholder={releasesLoading ? "Загрузка релизов..." : "Выберите релиз"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectableReleases.map((release) => (
                    <SelectItem key={release.id} value={release.id}>
                      {release.artist ? `${release.artist} - ${release.title}` : release.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.releaseId ? (
                <p className="text-xs text-[#F21D43]">{fieldErrors.releaseId}</p>
              ) : !releasesLoading && selectableReleases.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Нет загруженных релизов.{" "}
                  <Link
                    href="/cabinet/upload"
                    className="text-[#F21D43] underline-offset-2 hover:underline"
                  >
                    Загрузить релиз
                  </Link>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Выберите релиз, который уже загружен в кабинет.
                </p>
              )}
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
                <p className="text-xs text-muted-foreground">
                  Нужен для оформления заказа (действующая серверная проверка).
                </p>
              )}
            </div>

            <p className="pt-1 text-sm font-medium text-foreground">
              1 трек · размещение в каталоге - {priceDisplay}
            </p>

            <Button
              type="button"
              className="h-11 min-h-11 w-full bg-[#F21D43] text-white hover:bg-[#F21D43]/90"
              disabled={Boolean(submitting) || selectableReleases.length === 0}
              onClick={() => void handlePay()}
            >
              {submitting === "balance" ? "Оплата..." : "Оплатить с баланса"}
            </Button>
          </div>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="scroll-mt-20 space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">Перед размещением</h2>
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-[12px] border border-border px-4"
        >
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`bm-faq-${i}`}>
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
