"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  {
    q: "Как заказать?",
    a: "Услуга оформляется при загрузке релиза в кабинете: отметьте «Синхронизация текста» в дополнительных услугах и оплатите вместе с релизом.",
  },
] as const

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function LyricsSyncLanding({ service }: { service: ServiceCatalogEntry }) {
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const phoneRef = useRef<HTMLDivElement | null>(null)
  const demoRef = useRef<LyricsSyncDemoHandle | null>(null)

  const [demoPlaying, setDemoPlaying] = useState(false)
  const [demoEnded, setDemoEnded] = useState(false)

  const priceLabel = LYRICS_SYNC_PRICE_LABEL

  const runDemo = useCallback(() => {
    scrollToLyricsDemo(phoneRef)
    window.setTimeout(
      () => {
        demoRef.current?.toggle()
      },
      prefersReducedMotion() ? 0 : 220
    )
  }, [])

  const heroDemoLabel = demoPlaying
    ? "Пауза"
    : demoEnded
      ? "Повторить пример"
      : "Запустить пример"

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] space-y-12 pb-12 text-foreground md:space-y-20">
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {service.title}
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight break-words text-foreground sm:text-4xl md:text-5xl lg:text-[3.15rem]">
            Вашу песню слушают.
            <br />
            Теперь ей подпевают
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
            Синхронизируем строки текста с вокалом. В плеере с поддержкой синхронизации слова
            появляются в нужный момент - слушателю проще следить за песней и подпевать
          </p>

          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {priceLabel}
            </p>
            <p className="text-sm text-muted-foreground">Стоимость услуги за один трек</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button size="lg" className="h-11 min-h-11 px-5" asChild>
              <Link href="/cabinet/upload">Заказать при загрузке релиза</Link>
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

          <p className="text-sm text-muted-foreground">
            Текст в такт вокалу · Проверка по аудио · Готовая разметка
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Оформление доступно в шаге дополнительных услуг при загрузке релиза. Эта страница -
            описание услуги
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
              <p className="text-sm font-semibold text-foreground">В нужный момент</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Каждая строка на своём месте
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-medium text-foreground lg:hidden">
            В нужный момент
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Каждая строка на своём месте
            </span>
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Зачем это вашему треку
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
            Слушать Читать Подпевать
          </h2>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
            Слова становятся частью прослушивания. Любимые строчки можно прочитать и повторить
            вместе с песней
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {BENEFIT_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-[22px] border border-border/80 bg-card/60 px-5 py-5"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
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

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Что входит в работу
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
            У каждой строки своё время
          </h2>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
            Подготовим разметку по финальной записи песни и проверим её вместе с аудио
          </p>
        </div>
        <ul className="space-y-3">
          {INCLUDE_ROWS.map((row) => {
            const Icon = row.icon
            return (
              <li
                key={row.title}
                className="flex gap-4 rounded-[22px] border border-border/80 bg-card/60 px-5 py-4"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{row.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{row.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Отображение зависит от поддержки функции конкретным плеером и способа размещения. Мы
          готовим разметку для дальнейшей передачи - без обещания публикации на всех площадках
        </p>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Как проходит работа
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
            От готового текста до строки на экране
          </h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {PROCESS_STEPS.map((step) => (
            <li
              key={step.num}
              className="rounded-[22px] border border-border/80 bg-card/60 px-5 py-5"
            >
              <p className="text-xs font-semibold tracking-[0.12em] text-primary">{step.num}</p>
              <p className="mt-2 font-semibold text-foreground">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[22px] border border-border/80 bg-card/60 px-5 py-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Как заказать
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
          При загрузке релиза
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Отметьте «Синхронизация текста» в дополнительных услугах при загрузке релиза. Текст песни
          уже есть в карточке трека - отдельно форму на этой странице заполнять не нужно. Стоимость:{" "}
          <span className="font-semibold text-foreground">{priceLabel}</span> за трек
        </p>
        <div className="mt-5">
          <Button className="h-11 min-h-11 px-5" asChild>
            <Link href="/cabinet/upload">Перейти к загрузке</Link>
          </Button>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 max-w-3xl space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Короткие ответы
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
            Частые вопросы
          </h2>
        </div>
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-[22px] border border-border/80 px-4"
        >
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`lyrics-sync-faq-${i}`}>
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
