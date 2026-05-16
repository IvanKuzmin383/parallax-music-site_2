import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { AiLanding } from "@/components/ai-landing"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = {
  title: "Дистрибуция ИИ-музыки — релиз ИИ-музыки на площадки | Parallax Music",
  description:
    "Помогаем артистам выпускать и монетизировать ИИ треки. Дистрибуция AI-музыки на Spotify, Apple Music, Яндекс Музыке и других платформах, консультации по правам и защита от блокировок.",
  keywords: [
    "ИИ-музыка",
    "нейросетевая музыка",
    "дистрибуция ИИ-музыки",
    "релиз нейросетевых треков",
    "AI music distribution",
    "release AI-generated music",
    "Spotify",
    "Apple Music",
    "Яндекс Музыка",
  ],
  alternates: {
    canonical: "/ai",
    languages: {
      ru: `${siteUrl}/ai`,
      en: `${siteUrl}/ai`,
      "x-default": `${siteUrl}/ai`,
    },
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/ai`,
    title: "Дистрибуция ИИ-музыки — релиз ИИ-музыки на площадки | Parallax Music",
    description:
      "Публикация и монетизация ИИ-музыки на стриминговых платформах. Плейлист-питчинг, консультации по правам и защита от блокировок.",
  },
}

export default function AiPage() {
  return (
    <ErrorBoundary>
      <main id="main-content" className="min-h-screen bg-background">
        <AiLanding />
      </main>
    </ErrorBoundary>
  )
}

