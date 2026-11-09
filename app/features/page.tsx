import type { Metadata } from "next"
import Link from "next/link"
import { ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { FeaturesCatalog } from "@/components/marketing/features-catalog"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

const title = "Возможности кабинета - обложки, мастеринг, видео, смартлинки, продвижение | Parallax Music"
const description =
  "Всё для релиза в одном кабинете: AI-обложки, мастеринг, slowed / reverb, сниппеты, видеошоты, смартлинки, синхронизация текста (VK и Apple Music) и продвижение."

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/features" },
  openGraph: { type: "website", url: `${siteUrl}/features`, title, description },
}

export default function FeaturesPage() {
  return (
    <ErrorBoundary>
      <main id="main-content" className="min-h-screen">
        <div className="mx-auto w-full max-w-[1180px] space-y-10 px-4 pb-20 pt-28 sm:px-6 md:pt-32 lg:px-8">
          <header className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Возможности
            </p>
            <h1 className="text-[2.15rem] font-bold leading-[1.1] tracking-tight sm:text-[2.75rem] md:text-[3.25rem]">
              Всё для релиза - <span className="text-primary">в одном кабинете</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground md:text-base">
              Оформление, звук, видео и продвижение рядом с дистрибуцией. Те же инструменты и цены,
              что внутри кабинета.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-11 min-h-11 px-5">
                <Link href="/cabinet?tab=register">Создать кабинет</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 min-h-11 px-5">
                <Link href="/distribution">Дистрибуция</Link>
              </Button>
            </div>
          </header>

          <FeaturesCatalog />
        </div>
      </main>
    </ErrorBoundary>
  )
}
