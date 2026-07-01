import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { StihiLanding } from "@/components/stihi-landing"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = {
  title: "AI-песня из стихотворения - заказать песню на ваш текст | Parallax Music",
  description:
    "Превратим ваши стихи в AI-песню с вокалом, сделаем обложку и выпустим на Spotify, Яндекс Музыке, Apple Music и других площадках. 2 варианта на выбор. От 3 000 ₽.",
  keywords: [
    "AI песня из стиха",
    "песня на стихотворение",
    "нейросеть песня",
    "стихи в песню",
    "заказать AI песню",
    "публикация музыки на площадках",
    "роялти со стихов",
    "Parallax Music",
  ],
  alternates: {
    canonical: "/stihi",
    languages: {
      ru: `${siteUrl}/stihi`,
      en: `${siteUrl}/stihi`,
      "x-default": `${siteUrl}/stihi`,
    },
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/stihi`,
    title: "AI-песня из стихотворения - заказать песню на ваш текст | Parallax Music",
    description:
      "Создадим AI-песню по вашему стихотворению: 2 варианта на выбор, обложка и публикация на стримингах. Без студии и музыкантов.",
  },
}

export default function StihiPage() {
  return (
    <ErrorBoundary>
      <main id="main-content" className="min-h-screen bg-background">
        <StihiLanding />
      </main>
    </ErrorBoundary>
  )
}
