import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Disc3, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteAtmosphere } from "@/components/site-atmosphere"

export const metadata: Metadata = {
  title: "Страница не найдена",
  description: "Такой страницы нет. Вернитесь на главную Parallax Music или в кабинет.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <SiteAtmosphere />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:gap-14 lg:py-16">
        <div className="relative mx-auto w-full max-w-md shrink-0 lg:mx-0 lg:max-w-sm xl:max-w-md">
          <div className="relative aspect-square overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
            <img
              src="/hero-studio.webp"
              alt="Студия - визуал страницы 404 Parallax Music"
              className="absolute inset-0 h-full w-full object-cover object-center"
              fetchPriority="high"
              decoding="async"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <Disc3 className="h-4 w-4 text-primary" aria-hidden />
                <span>Трек не в ротации</span>
              </div>
              <span className="text-4xl font-black tabular-nums tracking-tighter text-primary sm:text-5xl">
                404
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-6 text-center lg:text-left">
          <p className="text-sm font-black tracking-tighter sm:text-base">
            <span className="text-foreground">PARALLAX</span>
            <span className="ml-1 text-primary">MUSIC</span>
          </p>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Страница не найдена
            </p>
            <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
              Этот адрес
              <span className="block bg-gradient-to-r from-foreground via-foreground to-foreground/45 bg-clip-text text-transparent">
                никуда не ведёт
              </span>
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0">
              Ссылка устарела, опечатка в адресе или страница переехала. Выберите, куда вернуться -
              на главную или в кабинет.
            </p>
          </div>

          <div className="flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center lg:justify-start">
            <Button asChild size="lg" className="min-h-11">
              <Link href="/">
                <Home className="h-4 w-4" />
                На главную
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-11">
              <Link href="/cabinet">
                <ArrowLeft className="h-4 w-4" />
                В кабинет
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Нужна помощь?{" "}
            <a
              href="https://t.me/parallaxmusic_rt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Напишите в Telegram
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
