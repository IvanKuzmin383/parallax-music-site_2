import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"
import { MarketingHero } from "@/components/marketing/marketing-hero"
import { marketingGlassPanelClass } from "@/components/marketing/marketing-glass"
import { Button } from "@/components/ui/button"
import { DISTRIBUTION_POINTS } from "@/lib/marketing/distribution-points"
import { cn } from "@/lib/utils"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = {
  title: "Дистрибуция музыки на 50+ площадок | Parallax Music",
  description:
    "Выпустите трек на Яндекс Музыку, VK, Spotify, Apple Music и другие площадки. Роялти без комиссии дистрибьютора, ИИ-релизы принимаем, релизы остаются в дистрибуции после окончания подписки.",
  alternates: { canonical: "/distribution" },
  openGraph: {
    title: "Дистрибуция музыки на 50+ площадок | Parallax Music",
    description:
      "Один кабинет: загрузка, модерация, релиз и роялти. Без комиссии с доходов артиста.",
    url: `${siteUrl}/distribution`,
  },
}

export default function DistributionPage() {
  return (
    <ErrorBoundary>
      <main id="main-content" className="min-h-screen">
        <MarketingHero
          title="Выпустите музыку"
          titleHighlight="на все площадки"
          description="Загрузите трек в кабинет - мы проверим материалы и доставим на Яндекс Музыку, VK, Spotify, Apple Music и 50+ сервисов. Роялти выплачиваются без комиссии дистрибьютора."
          primaryHref="/pricing"
          primaryLabel="Выбрать тариф"
          secondaryHref="/cabinet?tab=register"
          secondaryLabel="Создать кабинет"
        />

        <section className="border-t border-border/40 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-10 text-3xl font-bold tracking-tight md:text-4xl">
              Почему артисты выбирают нас
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DISTRIBUTION_POINTS.map((point) => (
                <article key={point.title} className={cn(marketingGlassPanelClass, "p-5")}>
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Check className="h-4 w-4" aria-hidden />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{point.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{point.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Как начать</h2>
            <ol className="mb-10 space-y-3 text-left">
              {[
                "Создайте кабинет",
                "Выберите подписку или тариф Fix и оплатите в кабинете",
                "Загрузите трек, обложку и метаданные",
                "Мы модерируем и отправляем на площадки - роялти выплачиваются без комиссии дистрибьютора",
              ].map((step, index) => (
                <li key={step} className={cn(marketingGlassPanelClass, "p-4")}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Шаг {index + 1}
                  </p>
                  <p className="text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-primary px-8 uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link href="/pricing">Выбрать тариф</Link>
              </Button>
              <Button size="lg" variant="outline" className="uppercase tracking-wider" asChild>
                <Link href="/features" prefetch={false}>
                  Все возможности
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </ErrorBoundary>
  )
}
