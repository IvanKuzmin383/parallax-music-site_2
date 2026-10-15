import type { Metadata } from "next"
import { HeroBackgroundImage } from "@/components/hero-background-image"

export const metadata: Metadata = {
  title: "Технические работы",
  description:
    "На сайте Parallax Music идут технические работы. Скоро вернёмся с улучшениями.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

const EMAIL = "parallaxmusiclabel@gmail.com"
const TELEGRAM_URL = "https://t.me/parallaxmusic_rt"

export default function MaintenancePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <HeroBackgroundImage alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/60 to-background" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-8">
          <p className="text-xl font-bold tracking-tighter md:text-2xl">
            <span className="text-foreground">PARALLAX</span>
            <span className="ml-1 text-primary">MUSIC</span>
          </p>

          <div
            className="mx-auto h-1 w-12 rounded-full bg-primary maintenance-pulse"
            aria-hidden
          />

          <h1 className="font-serif text-3xl font-bold tracking-tight text-pretty sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              Идут технические работы
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-base text-muted-foreground text-pretty md:text-lg">
            Улучшаем сервис для вас. Сайт скоро снова будет доступен - спасибо за
            терпение.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row sm:gap-6">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm uppercase tracking-wider text-foreground/90 transition-colors hover:text-primary"
            >
              Telegram
            </a>
            <a
              href={`mailto:${EMAIL}`}
              className="text-sm uppercase tracking-wider text-foreground/90 transition-colors hover:text-primary"
            >
              {EMAIL}
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
