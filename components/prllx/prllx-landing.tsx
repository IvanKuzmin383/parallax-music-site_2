"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { SmartlinkLanding } from "@/components/smartlink/smartlink-landing"
import {
  PLATFORM_ICON_SRC,
  type PlatformLinks,
} from "@/lib/smartlink-platforms"
import { getSiteOrigin } from "@/lib/smartlink-public-origin"
import {
  DEFAULT_SMARTLINK_THEME,
  SMARTLINK_PRESET_BASE,
  SMARTLINK_PRESET_LOOK,
  SMARTLINK_PRESET_META,
  SMARTLINK_PRESET_SIGNATURE,
  SMARTLINK_ANIMATION_META,
  SMARTLINK_BUTTON_STYLES,
  getOrderedSmartlinkLinks,
  type SmartlinkPreset,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"
import { TOOLS_SMARTLINK_ACTIVE_DAYS, TOOLS_SMARTLINK_PRICE_RUB } from "@/lib/tools-smartlink-pricing"
import { cn } from "@/lib/utils"

const DEMO_COVER = "/aicover/example-03.webp"
const DEMO_TITLE = "Midnight Signal"
const DEMO_ARTIST = "PRLLX Demo"

const DEMO_LINKS: PlatformLinks = {
  spotify: "https://open.spotify.com",
  appleMusic: "https://music.apple.com",
  yandex: "https://music.yandex.ru",
  youtubeMusic: "https://music.youtube.com",
  vk: "https://vk.com/music",
  deezer: "https://www.deezer.com",
  tidal: "https://tidal.com",
}

/** Пресеты, которые крутим в живом демо на первом экране. */
const HERO_ROTATE: SmartlinkPreset[] = [
  "inkblot",
  "cassette",
  "graffiti",
  "holo",
  "ticket",
  "vinyl",
  "rave",
  "chrome",
]

const FEATURES = [
  {
    title: "30+ оформлений",
    text: "От угля и чернил до кассеты, рейва и голографии - тот же конструктор, что у релиза.",
  },
  {
    title: "Список или сетка",
    text: "Кнопки с названиями площадок или только значки. Свои ссылки и соцсети рядом.",
  },
  {
    title: "Хук 25 секунд",
    text: "Короткое превью прямо на странице - слушатель слышит трек до клика в стриминг.",
  },
  {
    title: "Живые анимации",
    text: Object.values(SMARTLINK_ANIMATION_META)
      .map((m) => m.label)
      .filter((l) => l !== "Без анимации")
      .slice(0, 5)
      .join(", ") + " и другие.",
  },
] as const

function themeForPreset(preset: SmartlinkPreset, animation: SmartlinkTheme["animation"] = "rise"): SmartlinkTheme {
  const look = SMARTLINK_PRESET_LOOK[preset]
  return {
    ...DEFAULT_SMARTLINK_THEME,
    ...look,
    preset,
    accent: DEFAULT_SMARTLINK_THEME.accent,
    animation,
    animationSpeed: 100,
    previewAudioEnabled: false,
    previewAudioStartSec: 0,
  }
}

function CtaLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string
  children: ReactNode
  variant?: "primary" | "ghost" | "outline"
  className?: string
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition",
        variant === "primary" &&
          "bg-[#E2532F] text-white shadow-[0_12px_40px_rgba(226,83,47,0.35)] hover:bg-[#c94728]",
        variant === "ghost" && "text-white/80 hover:bg-white/10 hover:text-white",
        variant === "outline" &&
          "border border-white/25 bg-white/5 text-white backdrop-blur-md hover:border-white/45 hover:bg-white/10",
        className,
      )}
    >
      {children}
    </a>
  )
}

export function PrllxLanding() {
  const site = getSiteOrigin()
  const registerHref = `${site}/cabinet?tab=register`
  const loginHref = `${site}/cabinet`

  const [preset, setPreset] = useState<SmartlinkPreset>("inkblot")
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    if (!autoRotate) return
    const id = window.setInterval(() => {
      setPreset((prev) => {
        const i = HERO_ROTATE.indexOf(prev)
        return HERO_ROTATE[(i + 1) % HERO_ROTATE.length] ?? HERO_ROTATE[0]
      })
    }, 4200)
    return () => window.clearInterval(id)
  }, [autoRotate])

  const theme = useMemo(() => themeForPreset(preset, "cascade"), [preset])
  const links = useMemo(() => getOrderedSmartlinkLinks(DEMO_LINKS, theme), [theme])

  const galleryPresets = useMemo(
    () => [...SMARTLINK_PRESET_BASE, ...SMARTLINK_PRESET_SIGNATURE] as SmartlinkPreset[],
    [],
  )

  const pickPreset = (next: SmartlinkPreset) => {
    setAutoRotate(false)
    setPreset(next)
  }

  return (
    <div className="min-h-screen bg-[#070708] text-[#F5F5F5] antialiased">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-1/4 top-0 h-[55vh] w-[70vw] rounded-full bg-[#E2532F]/18 blur-[120px]" />
        <div className="absolute -right-1/4 top-1/3 h-[45vh] w-[55vw] rounded-full bg-[#4F8CFF]/12 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[40vh] w-[40vw] rounded-full bg-[#C8F542]/08 blur-[90px]" />
        <div className="sl-film-grain absolute inset-0 opacity-40" />
      </div>

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tighter sm:text-3xl">prllx</span>
          <span className="hidden text-xs uppercase tracking-[0.2em] text-white/40 sm:inline">
            .link
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <CtaLink href={loginHref} variant="ghost" className="px-4 py-2 text-xs sm:text-sm">
            Войти
          </CtaLink>
          <CtaLink href={registerHref} className="px-4 py-2 text-xs sm:text-sm">
            Создать
          </CtaLink>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:pb-24 lg:pt-8">
        <div className="sl-anim-rise space-y-6" style={{ ["--sl-anim-ms" as string]: "900ms" }}>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#E2532F]">
            Smartlink by Parallax
          </p>
          <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Музыка заслуживает
            <span className="block bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              короткий линк
            </span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/65 sm:text-lg">
            Один адрес - все площадки. Стиль как у релиза: чернила, кассета, граффити, голо и ещё
            десятки оформлений из конструктора.
          </p>
          <div className="flex flex-wrap gap-3">
            <CtaLink href={registerHref}>Собрать свой prllx.link</CtaLink>
            <CtaLink href={loginHref} variant="outline">
              Войти в кабинет
            </CtaLink>
          </div>
          <p className="text-sm text-white/45">
            {TOOLS_SMARTLINK_PRICE_RUB} ₽ · {TOOLS_SMARTLINK_ACTIVE_DAYS} дней публикации · ссылка вида{" "}
            <span className="text-white/80">prllx.link/ваш-трек</span>
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[340px] lg:max-w-none">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent opacity-60 blur-xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-black/40 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">Live preview</span>
              <span className="truncate text-xs font-medium text-white/70">
                {SMARTLINK_PRESET_META[preset].label}
              </span>
            </div>
            <div className="max-h-[560px] overflow-y-auto [&_a]:pointer-events-none">
              <SmartlinkLanding
                title={DEMO_TITLE}
                artist={DEMO_ARTIST}
                coverUrl={DEMO_COVER}
                links={links}
                theme={theme}
                preview
                brandHref={site}
                brandLabel="Parallax Music"
                className="!min-h-[520px]"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {HERO_ROTATE.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => pickPreset(p)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition",
                  preset === p
                    ? "bg-[#E2532F] text-white"
                    : "bg-white/8 text-white/60 hover:bg-white/14 hover:text-white",
                )}
              >
                {SMARTLINK_PRESET_META[p].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 border-t border-white/10 bg-black/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Весь конструктор - в одной ссылке
            </h2>
            <p className="mt-3 text-white/55">
              Те же пресеты, кнопки, шрифты и анимации, что в кабинете Parallax. Слушатель видит
              готовую сцену релиза.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  "sl-anim-cascade rounded-2xl border border-white/10 bg-white/[0.04] p-5",
                  i % 2 === 1 && "sm:translate-y-3",
                )}
                style={{
                  ["--sl-anim-ms" as string]: "800ms",
                  ["--sl-anim-i" as string]: String(i),
                }}
              >
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {SMARTLINK_BUTTON_STYLES.map((style) => (
              <span
                key={style}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-[11px] uppercase tracking-wider",
                  style === "solid" && "bg-[#E2532F] text-white",
                  style === "outline" && "border border-white/30 text-white/80",
                  style === "soft" && "bg-white/15 text-white/90",
                  style === "glass" &&
                    "border border-white/20 bg-white/10 text-white backdrop-blur-md",
                  style === "bare" && "text-white/50 underline-offset-2",
                )}
              >
                {style}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Preset gallery */}
      <section className="relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Выберите настроение</h2>
              <p className="mt-2 max-w-xl text-white/55">
                Нажмите пресет - демо слева (или выше на мобиле) переключится. Все оформления из
                редактора смартлинка.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              className="self-start text-xs uppercase tracking-[0.16em] text-white/45 hover:text-white/80"
            >
              {autoRotate ? "Пауза ротации" : "Авто-ротация"}
            </button>
          </div>

          <div className="mb-8 overflow-x-auto pb-2 lg:hidden">
            <div className="flex w-max gap-2">
              {galleryPresets.map((p) => (
                <button
                  key={`m-${p}`}
                  type="button"
                  onClick={() => pickPreset(p)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
                    preset === p ? "bg-white text-black" : "bg-white/10 text-white/70",
                  )}
                >
                  {SMARTLINK_PRESET_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {galleryPresets.map((p) => {
              const active = preset === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => pickPreset(p)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-4 text-left transition",
                    active
                      ? "border-[#E2532F]/70 bg-[#E2532F]/15 shadow-[0_0_0_1px_rgba(226,83,47,0.35)]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                  )}
                >
                  <div className="mb-3 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={DEMO_COVER}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover opacity-90 transition group-hover:scale-105"
                    />
                    <div className="flex -space-x-1.5">
                      {(["spotify", "yandex", "appleMusic"] as const).map((key) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={key}
                          src={PLATFORM_ICON_SRC[key]}
                          alt=""
                          className="h-5 w-5 rounded-full bg-black/40 p-0.5"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{SMARTLINK_PRESET_META[p].label}</p>
                  <p className="mt-1 text-xs leading-snug text-white/45">
                    {SMARTLINK_PRESET_META[p].description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative z-10 border-y border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Ваш линк - prllx.link/…
            </h2>
            <p className="mt-3 text-white/55">
              Создайте смартлинк в кабинете Parallax Music. Короткий домен, полный контроль над
              сценой и площадками.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaLink href={registerHref} className="min-w-[200px]">
              Создать аккаунт
            </CtaLink>
            <CtaLink href={loginHref} variant="outline" className="min-w-[160px]">
              Войти
            </CtaLink>
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-semibold text-white/70">prllx.link</span>
          {" · "}
          продукт{" "}
          <a href={site} className="underline-offset-2 hover:text-white/70 hover:underline">
            Parallax Music
          </a>
        </p>
        <div className="flex flex-wrap gap-4">
          <a href={`${site}/offer`} className="hover:text-white/70">
            Оферта
          </a>
          <a href={`${site}/privacy`} className="hover:text-white/70">
            Конфиденциальность
          </a>
          <a href={loginHref} className="hover:text-white/70">
            Кабинет
          </a>
        </div>
      </footer>
    </div>
  )
}
