"use client"

import { useCallback, useId, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  AudioLines,
  CalendarClock,
  ChevronDown,
  FileStack,
  FileText,
  Fingerprint,
  FolderOpen,
  Lock,
  ShieldCheck,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import { cn } from "@/lib/utils"

const SCENARIOS = [
  {
    id: "release",
    label: "Готовите релиз",
    body: "Сохраните экземпляр трека, текста или обложки до публикации. В случае спора у вас будут материалы с зафиксированной датой подачи.",
  },
  {
    id: "demo",
    label: "Отправляете демо",
    body: "Зафиксируйте версию, которую показываете лейблу, продюсеру или исполнителю. Сохраните также переписку и договорённости об использовании демо.",
  },
  {
    id: "published",
    label: "Трек уже вышел",
    body: "Можно зафиксировать текущий экземпляр произведения. Дата подачи будет новой и не подтвердит, когда вы создали или впервые опубликовали трек.",
  },
] as const

type ScenarioId = (typeof SCENARIOS)[number]["id"]

const RESULT_CARDS = [
  {
    icon: FolderOpen,
    title: "Экземпляр произведения",
    body: "Сохранённые файлы позволяют установить, что именно вы передали на депонирование.",
  },
  {
    icon: CalendarClock,
    title: "Зафиксированная дата",
    body: "Дата подачи связана с конкретными материалами, а не только с названием трека.",
  },
  {
    icon: FileText,
    title: "Справка о депонировании",
    body: "Сведения о заявителе, произведении и дате - в одном документе.",
  },
] as const

const PROCESS_STEPS = [
  {
    title: "Подготовьте материалы",
    body: "Аудиофайл, текст или обложку, название произведения и сведения об авторах.",
  },
  {
    title: "Оформите депонирование",
    body: "Передайте файлы и данные. Состав материалов, срок хранения и стоимость указываются в заказе.",
  },
  {
    title: "Получите справку",
    body: "Сохраните справку о депонировании вместе с исходниками и материалами работы над произведением.",
  },
] as const

const PREPARE_ITEMS = [
  "Файлы, которые вы хотите зафиксировать.",
  "Название произведения.",
  "Имена авторов и роли каждого.",
  "Контакт для получения справки.",
] as const

const FAQ_ITEMS = [
  {
    q: "Депонирование доказывает, что я автор?",
    a: "Оно фиксирует существование переданного экземпляра на дату подачи. Авторство устанавливается с учётом других доказательств: черновиков, исходников, переписки, договоров и материалов работы над произведением.",
  },
  {
    q: "Это регистрация авторского права?",
    a: "Для возникновения авторского права на произведение регистрация не требуется. Депонирование помогает сохранить экземпляр и зафиксировать дату его передачи.",
  },
  {
    q: "Трек уже опубликован. Есть смысл депонировать?",
    a: "Можно зафиксировать текущий экземпляр произведения. Дата депонирования будет новой: она не подтверждает, когда вы создали трек или впервые его опубликовали.",
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

function DepositCertificateSample() {
  return (
    <div className="mx-auto w-full max-w-[23rem]">
      <div className="relative">
        {/* Soft glow behind the sealed card */}
        <div
          className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(ellipse_at_center,rgba(255,41,72,0.22),transparent_68%)] blur-md"
          aria-hidden
        />

        <div
          className={cn(
            "relative origin-center overflow-hidden rounded-[14px] border border-[#3A3540]",
            "bg-[linear-gradient(165deg,#1B191F_0%,#121116_55%,#0E0D11_100%)]",
            "p-5 text-[#F4F2F6]",
            "shadow-[0_22px_50px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]",
            "rotate-[1.5deg] sm:rotate-[2deg]",
          )}
          aria-hidden="true"
        >
          {/* Circuit / grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,41,72,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,41,72,0.35) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
              maskImage: "radial-gradient(ellipse at 70% 20%, black 20%, transparent 75%)",
            }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-tight">
                <span className="text-[#F4F2F6]">PARALLAX</span>{" "}
                <span className="text-[#FF2948]">MUSIC</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#9A96A3]">
                <Lock className="h-3 w-3 text-primary" aria-hidden />
                Secure deposit vault
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                Защищено
              </span>
              <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#AAA8B3]">
                Образец
              </span>
            </div>
          </div>

          <div className="relative mt-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-primary shadow-[0_0_24px_-6px_rgba(255,41,72,0.55)]">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-snug tracking-tight">
                Справка о депонировании
              </h3>
              <p className="mt-0.5 text-[11px] text-[#9A96A3]">
                Экземпляр зафиксирован · дата и отпечаток файла
              </p>
            </div>
          </div>

          <dl className="relative mt-4 space-y-2.5 text-[12px] leading-snug">
            <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-[#8A8794]">Произведение</dt>
              <dd className="mt-0.5 font-medium text-[#F4F2F6]">Название вашего трека</dd>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-[#8A8794]">Заявитель</dt>
                <dd className="mt-0.5 font-medium text-[#F4F2F6]">Имя и фамилия</dd>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-[#8A8794]">Дата подачи</dt>
                <dd className="mt-0.5 font-medium text-[#F4F2F6]">Дата депонирования</dd>
              </div>
            </div>
          </dl>

          <div className="relative mt-4 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
              <Fingerprint className="h-3.5 w-3.5" aria-hidden />
              SHA-256 · цифровой отпечаток
            </div>
            <p className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-[#C8C4D0]">
              a7f3…9c2e · 8b41…e01d · sealed
            </p>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {["Шифрование", "Щит хранения", "Неизменяемая метка"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#B8B4C0]"
              >
                {label}
              </span>
            ))}
          </div>

          <p className="relative mt-4 text-[10px] leading-relaxed text-[#7A7784]">
            Декоративный образец. Не является настоящей справкой и не заменяет юридические
            доказательства авторства.
          </p>
        </div>

        <div
          className={cn(
            "absolute -bottom-3 left-3 right-8 z-10 flex items-center gap-3 rounded-[12px]",
            "border border-primary/30 bg-[#141418] px-3 py-2.5",
            "shadow-[0_12px_28px_-10px_rgba(255,41,72,0.35)]",
            "sm:left-4 sm:right-10",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <AudioLines className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#F5F4F6]">Ваш трек.wav</p>
            <p className="text-[11px] text-[#AAA8B3]">Запечатанный экземпляр</p>
          </div>
          <Lock className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Пример защищённого оформления документа
      </p>
    </div>
  )
}

export function DepositLanding({ service }: { service: ServiceCatalogEntry }) {
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const preparePanelId = useId()
  const scenarioPanelId = useId()

  const [scenario, setScenario] = useState<ScenarioId>("release")
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const activeScenario = SCENARIOS.find((s) => s.id === scenario) ?? SCENARIOS[0]
  const priceLabel = service.priceLabel
  const interestLabel = service.interestCtaLabel || "Хочу задепонировать"

  const submitInterest = useCallback(async () => {
    if (!service.paymentEndpoint) {
      toast.error("Заявка пока недоступна")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(service.paymentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
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
      setConfirmOpen(false)
      toast.success(
        typeof data.message === "string" && data.message
          ? data.message
          : "Спасибо! Мы получили ваш интерес. Деньги не списаны.",
      )
    } catch {
      toast.error("Ошибка при отправке заявки")
    } finally {
      setSubmitting(false)
    }
  }, [service.paymentEndpoint])

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1200px] space-y-12 pb-10 md:space-y-14">
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
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Для артистов и авторов
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            <span className="text-foreground">Зафиксируйте свою музыку.</span>{" "}
            <span className="text-primary/85">Сохраните доказательства.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Депонирование - это сохранение экземпляра произведения с фиксацией даты его передачи.
            Справка поможет подтвердить, какие материалы существовали на эту дату.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="h-11 min-h-11 px-5"
              onClick={() => scrollToId("deposit-order")}
            >
              Депонировать произведение
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-h-11 px-5"
              onClick={() => scrollToId("deposit-result")}
            >
              Что я получу
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{priceLabel}</span> за депонирование
            произведения
          </p>
          <p className="text-xs tracking-wide text-muted-foreground">
            Музыка · Текст · Обложка · Фонограмма
          </p>
          {service.comingSoon ? (
            <p className="max-w-xl text-xs leading-relaxed text-amber-200/90">
              Услуга готовится к запуску. Сейчас можно оставить интерес - оплата не списывается,
              справка пока не выдаётся.
            </p>
          ) : null}
        </div>
        <div className="min-w-0 pt-2 lg:pt-0">
          <DepositCertificateSample />
        </div>
      </section>

      {/* B. Result */}
      <section id="deposit-result" className="scroll-mt-20 space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Результат
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Что останется у вас
          </h2>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
            Материалы и сведения, к которым можно обратиться, если возникнет спор.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {RESULT_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-[12px] border border-border/80 bg-card/60 px-4 py-4"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-base font-semibold tracking-tight">{card.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* C. Scenarios */}
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Когда полезно
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            До релиза. До отправки демо.
          </h2>
        </div>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          role="group"
          aria-label="Ситуации применения"
        >
          {SCENARIOS.map((item) => {
            const active = item.id === scenario
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setScenario(item.id)}
                className={cn(
                  "rounded-[12px] border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                  "min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-border/80 bg-card/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <div
          id={scenarioPanelId}
          role="status"
          aria-live="polite"
          className="min-h-[5.5rem] rounded-[12px] border border-border/80 bg-card/50 px-4 py-4"
        >
          <p className="text-[15px] leading-relaxed text-muted-foreground md:text-base">
            {activeScenario.body}
          </p>
        </div>
      </section>

      {/* D. Process + order */}
      <section
        id="deposit-order"
        className="scroll-mt-20 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start"
      >
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            От материалов до документа
          </h2>
          <ol className="space-y-4">
            {PROCESS_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
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

        <aside className="rounded-[12px] border border-primary/25 bg-card/70 p-5 shadow-sm lg:sticky lg:top-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FileStack className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-tight">Депонирование произведения</h3>
              <p className="mt-2 text-2xl font-bold text-primary">{priceLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                За музыку, текст, обложку или фонограмму
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2 border-t border-border/70 pt-4 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary" aria-hidden>
                ·
              </span>
              <span>Фиксация даты передачи материалов.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary" aria-hidden>
                ·
              </span>
              <span>Сохранение переданного экземпляра.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary" aria-hidden>
                ·
              </span>
              <span>Справка о депонировании.</span>
            </li>
          </ul>

          <div className="mt-5 space-y-2">
            <Button
              className="h-11 min-h-11 w-full"
              disabled={submitting}
              onClick={() => setConfirmOpen(true)}
            >
              {submitting ? "Отправка..." : "Оформить депонирование"}
            </Button>
            {service.interestOnly ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Сейчас это заявка интереса ({interestLabel}). Оплата не списывается - мы напишем,
                когда услуга станет доступна.
              </p>
            ) : null}
          </div>

          <Collapsible open={prepareOpen} onOpenChange={setPrepareOpen} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full justify-between px-2 text-sm text-muted-foreground hover:text-foreground"
                aria-expanded={prepareOpen}
                aria-controls={preparePanelId}
              >
                Что подготовить
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", prepareOpen && "rotate-180")}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent id={preparePanelId}>
              <ul className="space-y-1.5 px-2 pb-1 pt-1 text-sm text-muted-foreground">
                {PREPARE_ITEMS.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-primary" aria-hidden>
                      ·
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Объём материалов, срок хранения и итоговая стоимость - по выбранному тарифу.
          </p>
        </aside>
      </section>

      {/* E. FAQ */}
      <section id="faq" className="scroll-mt-20 max-w-3xl space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Вопросы перед оформлением
        </h2>
        <Accordion type="single" collapsible className="w-full rounded-[12px] border border-border/80 px-4">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`deposit-faq-${i}`}>
              <AccordionTrigger className="text-left text-[15px]">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Справка о депонировании используется вместе с другими доказательствами. Сохраните
          проекты, черновики и переписку по своему произведению.
        </p>
        <Button
          className="h-11 min-h-11"
          disabled={submitting}
          onClick={() => setConfirmOpen(true)}
        >
          {submitting ? "Отправка..." : "Оформить депонирование"}
        </Button>
      </section>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (submitting) return
          setConfirmOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Оформить депонирование?</AlertDialogTitle>
            <AlertDialogDescription>
              {service.interestOnly
                ? `Подтвердите, что вам нужна эта услуга. Сейчас отправится заявка интереса (${interestLabel}) - оплата не списывается. Мы напишем, когда депонирование станет доступно.`
                : "Подтвердите, что вам нужна услуга депонирования. После подтверждения заявка будет отправлена."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Отмена</AlertDialogCancel>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void submitInterest()}
            >
              {submitting ? "Отправка..." : "Да, нужна услуга"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
