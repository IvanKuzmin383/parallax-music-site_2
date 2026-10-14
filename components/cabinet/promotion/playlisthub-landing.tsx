"use client"

import { useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  AudioLines,
  CheckCircle2,
  ExternalLink,
  ListMusic,
  Search,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { PlaylisthubShowcase } from "@/components/cabinet/promotion/playlisthub-showcase"
import {
  getCabinetServiceHubBackLabel,
  getCabinetServiceHubHref,
} from "@/lib/cabinet/service-back"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import {
  PLAYLISTHUB_BASE_PRICE_LABEL,
  PLAYLISTHUB_CATALOG_URL,
  PLAYLISTHUB_DISCOUNT_TIERS,
  PLAYLISTHUB_FINAL_PRICE_LABEL,
  PLAYLISTHUB_VOLUME_PRICE_LABEL,
} from "@/lib/playlisthub-landing"
import { cn } from "@/lib/utils"

const BENEFITS = [
  {
    icon: Search,
    title: "Выбор под звучание трека",
    body: "Ищите подходящие плейлисты по жанру и настроению. Начните с тех подборок, в которых ваша музыка будет уместна",
  },
  {
    icon: ListMusic,
    title: "Понятное оформление",
    body: "Выберите плейлисты и отправьте ссылку на трек в PlaylistHub. Там же оформляется и оплачивается размещение",
  },
  {
    icon: CheckCircle2,
    title: "Размещение можно проверить",
    body: "В кабинете PlaylistHub доступны статус заказа и ссылки на плейлисты, в которых размещён трек",
  },
] as const

const STEPS = [
  {
    num: "01",
    title: "Выберите плейлисты",
    body: "Откройте каталог PlaylistHub и найдите подборки под жанр, настроение и бюджет",
  },
  {
    num: "02",
    title: "Оформите заказ",
    body: "Укажите ссылку на трек, войдите в PlaylistHub и оплатите заказ картой или с баланса сервиса",
  },
  {
    num: "03",
    title: "Куратор размещает трек",
    body: "После оплаты заказ поступает в работу куратору плейлиста. Следите за его статусом в кабинете",
  },
  {
    num: "04",
    title: "Заказ выполнен",
    body: "Когда трек добавлен во все выбранные плейлисты, заказ получает статус «Выполнено»",
  },
] as const

const FINAL_POINTS = [
  "Выбор плейлистов в каталоге",
  "Оформление и оплата в сервисе",
  "Статус и ссылки в кабинете",
] as const

const FAQ_ITEMS = [
  {
    q: "Где оформить и оплатить размещение?",
    a: "В PlaylistHub - нашем маркетплейсе плейлистов. Перейдите в каталог сервиса, выберите подходящие подборки и оформите заказ там",
  },
  {
    q: "Сколько стоит размещение?",
    a: "Базовая цена - 350 ₽ за плейлист. При большем количестве размещений действуют скидки: до 210 ₽ за плейлист при заказе 70+ плейлистов. Итоговую стоимость выбранных размещений вы увидите в PlaylistHub",
  },
  {
    q: "Это пользовательские плейлисты?",
    a: "Да. На этой странице речь о размещении в пользовательских плейлистах Яндекс Музыки из каталога PlaylistHub",
  },
  {
    q: "Можно выбрать несколько плейлистов?",
    a: "Да. В каталоге PlaylistHub можно собрать подходящие подборки для одного трека с учётом его звучания и вашего бюджета",
  },
  {
    q: "Где посмотреть статус заказа?",
    a: "В личном кабинете PlaylistHub. Там же доступны ссылки для проверки размещения",
  },
  {
    q: "Есть гарантированное число прослушиваний?",
    a: "Фиксированное число не обещаем. Результат зависит от трека, выбранных плейлистов и реакции слушателей",
  },
] as const

const HERO_POINTS = [
  { icon: AudioLines, label: "Под вашу музыку" },
  { icon: ListMusic, label: "Пользовательские плейлисты" },
] as const

const PH_FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
}

export function PlaylisthubLanding({ service }: { service: ServiceCatalogEntry }) {
  const pathname = usePathname()
  const backHref = getCabinetServiceHubHref(pathname)
  const backLabel = getCabinetServiceHubBackLabel(backHref, "Назад к услугам")
  const priceLabel = service.priceLabel || PLAYLISTHUB_BASE_PRICE_LABEL

  const openHowItWorks = useCallback(() => {
    requestAnimationFrame(() => scrollToId("playlisthub-steps"))
  }, [])

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1140px] space-y-12 pb-12 text-[#F7F5F8] md:space-y-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-[#F7F5F8]" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <a href={PLAYLISTHUB_CATALOG_URL} target="_blank" rel="noopener noreferrer">
            Открыть PlaylistHub
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </Button>
      </div>

      {/* 1. Hero */}
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12">
        <div className="min-w-0 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
            Плейлисты Яндекс Музыки.
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight break-words sm:text-[2.15rem] md:text-[3.1rem] lg:text-[3.25rem] lg:leading-[1.08]">
            <span className="text-[#F7F5F8]">Трек вышел.</span>
            <br className="hidden lg:block" />{" "}
            <span className="text-[#F3264D]">Помогите людям</span>
            <br className="hidden lg:block" />{" "}
            <span className="text-[#F3264D]">его найти.</span>
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-[#B3ADBC] md:text-base">
            Размещайте музыку в плейлистах своего жанра. Выберите подходящие подборки на PlaylistHub -
            нашем маркетплейсе плейлистов.
          </p>

          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight text-[#F7F5F8] sm:text-4xl">{priceLabel}</p>
            <p className="text-sm font-medium text-[#F7F5F8]">{PLAYLISTHUB_VOLUME_PRICE_LABEL}</p>
            <p className="text-sm text-[#B3ADBC]">
              Один трек · скидка зависит от количества плейлистов.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="h-11 min-h-11 bg-[#F3264D] px-5 text-white hover:bg-[#F3264D]/90"
              asChild
            >
              <a href={PLAYLISTHUB_CATALOG_URL} target="_blank" rel="noopener noreferrer">
                Выбрать плейлисты на PlaylistHub
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 min-h-11 border-[#303038] px-5"
              type="button"
              onClick={openHowItWorks}
            >
              Как это работает
            </Button>
          </div>
          <p className="text-xs text-[#B3ADBC]">Заказ и оплата - в PlaylistHub.</p>

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
          <PlaylisthubShowcase className="mx-auto" />
        </div>
      </section>

      {/* 2. Benefits */}
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
            Что даёт размещение.
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Ещё один способ познакомить людей с вашей музыкой.
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#B3ADBC]">
            Слушатели включают подборки под жанр и настроение. Размещение добавляет ваш трек в этот
            привычный сценарий прослушивания.
          </p>
        </div>
        <ul className="divide-y divide-[#303038] border-y border-[#303038]">
          {BENEFITS.map((item) => {
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
      </section>

      {/* 3. Steps */}
      <section id="playlisthub-steps" className="scroll-mt-20 space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
            Как начать.
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            От ссылки на трек до размещения.
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#B3ADBC]">
            Весь путь заказа проходит в PlaylistHub. На Parallax вы знакомитесь с услугой и переходите
            к выбору.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {STEPS.map((step) => (
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

      {/* 4. Pricing */}
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B3ADBC]">
            Скидка за объём.
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Больше плейлистов. Ниже цена размещения.
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#B3ADBC]">
            От 350 до 210 ₽ за плейлист - в зависимости от количества выбранных размещений.
          </p>
        </div>

        <div
          className="border border-[#222] bg-[#030303] p-4 sm:p-5"
          style={{ fontFamily: PH_FONT }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left text-sm text-white">
              <caption className="sr-only">
                Шкала скидок PlaylistHub: цена за плейлист в зависимости от количества
              </caption>
              <thead>
                <tr className="border-b border-[#2A2A2A] text-[11px] uppercase tracking-[0.1em] text-[#A8A8A8]">
                  <th scope="col" className="py-2.5 pr-2 font-semibold">
                    Плейлистов
                  </th>
                  <th scope="col" className="py-2.5 px-2 font-semibold">
                    Цена за 1
                  </th>
                  <th scope="col" className="py-2.5 pl-2 text-right font-semibold">
                    Скидка
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLAYLISTHUB_DISCOUNT_TIERS.map((tier) => (
                  <tr key={tier.range} className="border-b border-[#1F1F1F] last:border-b-0">
                    <td className="py-3 pr-2 font-medium">{tier.range}</td>
                    <td className="py-3 px-2 font-semibold text-[#E2DF00]">{tier.priceLabel}</td>
                    <td className="py-3 pl-2 text-right font-semibold text-[#E2DF00]">
                      {tier.discountLabel ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#8A8A8A]">
            Цена за размещение одного трека в одном плейлисте. Итоговый заказ рассчитывается в
            PlaylistHub.
          </p>
          <a
            href={PLAYLISTHUB_CATALOG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mt-4 inline-flex h-11 min-h-11 w-full items-center justify-center sm:w-auto sm:min-w-[14rem]",
              "bg-[#E2DF00] px-5 text-sm font-semibold text-black",
              "transition-opacity hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2DF00] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
            )}
          >
            Выбрать в PlaylistHub
          </a>
        </div>
      </section>

      {/* 5. Final CTA */}
      <section className="scroll-mt-20 space-y-5 border border-[#303038] bg-[#15151B]/90 p-5 md:p-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-bold tracking-[0.08em] text-white">PLAYLISTHUB</p>
          <p className="text-xs text-[#B3ADBC]">Сервис Parallax Music</p>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Выбирайте, где зазвучит ваш трек.
          </h2>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#B3ADBC]">
            Откройте каталог и подберите плейлисты для своей музыки. Актуальные цены и условия
            размещения - в PlaylistHub.
          </p>
        </div>
        <ul className="space-y-2">
          {FINAL_POINTS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-[#B3ADBC]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F3264D]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-lg font-semibold text-[#F7F5F8]">{PLAYLISTHUB_FINAL_PRICE_LABEL}</p>
        <div className="space-y-2">
          <Button
            size="lg"
            className="h-12 min-h-12 w-full bg-[#F3264D] px-5 text-base text-white hover:bg-[#F3264D]/90 sm:w-auto"
            asChild
          >
            <a href={PLAYLISTHUB_CATALOG_URL} target="_blank" rel="noopener noreferrer">
              Перейти в каталог PlaylistHub
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
            </a>
          </Button>
          <p className="text-xs text-[#B3ADBC]">Каталог откроется в новой вкладке.</p>
        </div>
      </section>

      {/* 6. FAQ */}
      <section id="faq" className="scroll-mt-20 max-w-3xl space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Вопросы о размещении.
        </h2>
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-[12px] border border-[#303038] bg-[#15151B]/60 px-4"
        >
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`ph-faq-${i}`} className="border-[#303038]">
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
