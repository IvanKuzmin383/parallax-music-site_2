import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteAtmosphere } from "@/components/site-atmosphere"

export const metadata: Metadata = {
  title: "Страница не найдена",
  description: "Такой страницы нет. Ссылка устарела, опечатка в адресе или страница переехала.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <SiteAtmosphere />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <p className="text-sm font-black tracking-tighter sm:text-base">
          <span className="text-foreground">PARALLAX</span>
          <span className="ml-1 text-primary">MUSIC</span>
        </p>

        <p
          className="mt-8 text-[6.5rem] font-black leading-none tracking-tighter text-primary/90 sm:text-[8rem]"
          aria-hidden
        >
          404
        </p>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Страница не найдена
          </p>
          <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
            Этот адрес
            <span className="block bg-gradient-to-r from-foreground via-foreground to-foreground/45 bg-clip-text text-transparent">
              никуда не ведёт
            </span>
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Ссылка устарела, опечатка в адресе или страница переехала.
          </p>
        </div>

        <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
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

        <p className="mt-8 text-xs text-muted-foreground">
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
    </main>
  )
}
