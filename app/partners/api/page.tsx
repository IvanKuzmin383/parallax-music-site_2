import type { Metadata } from "next"
import Link from "next/link"
import { PartnerApiSwagger } from "@/components/partner-api-swagger"

export const metadata: Metadata = {
  title: "Partner API",
  description:
    "Документация Partner API Parallax Music: артисты, загрузка релизов, статусы модерации, статистика.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function PartnerApiDocsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8 space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Parallax Music · Partners
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Partner API</h1>
          <p className="max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            REST API для лейблов и музыкальных сервисов: один кабинет — много артистов, загрузка
            релизов (включая ИИ-треки), статусы модерации и дистрибуции, статистика по артистам.
            Ключ доступа выдаётся при подключении партнёрского тарифа Label.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <a className="underline underline-offset-4" href="/partner-api/openapi.json">
              OpenAPI JSON
            </a>
            <span className="text-muted-foreground">Base URL: https://api.parallaxmusic.ru/v1</span>
            <Link className="underline underline-offset-4" href="/">
              parallaxmusic.ru
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-2 sm:px-4 py-4">
        <PartnerApiSwagger />
      </div>
    </main>
  )
}
