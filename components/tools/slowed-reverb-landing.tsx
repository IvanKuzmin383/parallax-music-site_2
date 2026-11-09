"use client"

import Link from "next/link"
import { Check, Music2, Shield, Sparkles, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SlowedReverbEditor } from "@/components/tools/slowed-reverb-editor"
import { dashboardGlassPanelClass } from "@/components/cabinet/dashboard/dashboard-glass"
import { cn } from "@/lib/utils"

const BENEFITS = [
  {
    icon: Upload,
    title: "Без регистрации",
    text: "Загрузите трек, выберите пресет и скачайте WAV сразу на этой странице.",
  },
  {
    icon: Shield,
    title: "Файл остаётся у вас",
    text: "Обработка в браузере: аудио не уходит на сервер и не хранится на диске.",
  },
  {
    icon: Sparkles,
    title: "Пресеты под жанр",
    text: "Slowed, Reverb и Nightcore из коробки - или настройте скорость, басы и реверб сами.",
  },
  {
    icon: Music2,
    title: "Дальше - релиз",
    text: "Понравилась версия? Создайте кабинет и выпустите её на стриминги.",
  },
] as const

const STEPS = [
  "Выберите аудиофайл (WAV, MP3, M4A, FLAC, OGG)",
  "Включите пресет Slowed, Reverb или Nightcore - или крутите параметры",
  "Послушайте превью и скачайте готовый WAV бесплатно",
] as const

const FAQ = [
  {
    q: "Нужна ли регистрация, чтобы сделать Slowed / Reverb / Nightcore?",
    a: "Нет. На этой странице инструмент полностью бесплатный и работает без аккаунта. Регистрация нужна только если хотите выпустить версию на площадки.",
  },
  {
    q: "Куда сохраняется мой трек?",
    a: "Никуда на сервер. Файл читается и обрабатывается в вашем браузере, результат скачивается как WAV. Мы не храним копию на диске.",
  },
  {
    q: "Чем Nightcore отличается от Slowed?",
    a: "Nightcore ускоряет трек и поднимает тон. Slowed замедляет и обычно добавляет басы и пространство. Reverb усиливает «зальный» хвост. Пресеты можно править слайдерами.",
  },
  {
    q: "Можно ли выпустить эту версию на Spotify и Яндекс Музыку?",
    a: "Да. Создайте кабинет Parallax Music, загрузите скачанный WAV как релиз и отправьте на модерацию. Дистрибуция доступна после регистрации.",
  },
  {
    q: "Это законно для чужих треков?",
    a: "Используйте только материалы, на которые у вас есть права, или свои треки. Инструмент не снимает ответственность за авторские права.",
  },
] as const

export function SlowedReverbLanding() {
  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-14 px-4 pb-20 pt-28 sm:px-6 md:pt-32 lg:px-8">
      <header className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Бесплатный онлайн-инструмент
        </p>
        <h1 className="text-[2.15rem] font-bold leading-[1.1] tracking-tight sm:text-[2.75rem] md:text-[3.1rem]">
          Создать трек{" "}
          <span className="text-primary">Slowed / Reverb / Nightcore</span> онлайн
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground md:text-base">
          Бесплатный Slowed Reverb Nightcore maker в браузере: загрузите песню, выберите пресет,
          скачайте WAV. Без регистрации и без хранения файла на сервере. Потом можете выпустить
          версию через кабинет Parallax Music.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="h-11 min-h-11 px-5">
            <a href="#editor">Сделать версию бесплатно</a>
          </Button>
          <Button asChild variant="outline" className="h-11 min-h-11 px-5">
            <Link href="/cabinet?tab=register">Выпустить на площадки</Link>
          </Button>
        </div>
      </header>

      <section
        id="editor"
        className={cn(dashboardGlassPanelClass, "scroll-mt-28 space-y-5 p-4 sm:p-6")}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Редактор</h2>
          <p className="text-sm text-muted-foreground">
            Превью и скачивание бесплатно. Обработка только на вашем устройстве.
          </p>
        </div>
        <SlowedReverbEditor source="public" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className={cn(dashboardGlassPanelClass, "space-y-2 p-4")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          )
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Как сделать Slowed / Reverb / Nightcore</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className={cn(dashboardGlassPanelClass, "flex gap-3 p-4")}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={cn(dashboardGlassPanelClass, "space-y-4 p-5 sm:p-6")}>
        <h2 className="text-lg font-semibold">Выпустите версию на стриминги</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Инструмент бесплатный и не требует аккаунта. Если версия зашла - зарегистрируйтесь и
          отправьте релиз в дистрибуцию Parallax Music: Spotify, Яндекс Музыка, Apple Music, VK и
          другие площадки.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            "Скачанный WAV готов к загрузке в кабинет",
            "Роялти без комиссии дистрибьютора на тарифах сервиса",
            "Один кабинет для релизов, статистики и инструментов",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button asChild>
            <Link href="/cabinet?tab=register">Создать кабинет</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/distribution">О дистрибуции</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Частые вопросы</h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item, index) => (
            <AccordionItem key={item.q} value={`faq-${index}`}>
              <AccordionTrigger className="text-left text-sm sm:text-base">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}
