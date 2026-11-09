import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { SlowedReverbLanding } from "@/components/tools/slowed-reverb-landing"
import { SLOWED_REVERB_PUBLIC } from "@/lib/marketing/public-landings"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = {
  title: { absolute: SLOWED_REVERB_PUBLIC.title },
  description: SLOWED_REVERB_PUBLIC.description,
  keywords: [
    "slowed reverb",
    "nightcore online",
    "создать nightcore",
    "создать slowed reverb",
    "slowed reverb maker",
    "nightcore maker",
    "бесплатный slowed reverb",
    "сделать nightcore из трека",
    "Parallax Music",
  ],
  alternates: {
    canonical: SLOWED_REVERB_PUBLIC.path,
    languages: {
      ru: `${siteUrl}${SLOWED_REVERB_PUBLIC.path}`,
      en: `${siteUrl}${SLOWED_REVERB_PUBLIC.path}`,
      "x-default": `${siteUrl}${SLOWED_REVERB_PUBLIC.path}`,
    },
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}${SLOWED_REVERB_PUBLIC.path}`,
    title: SLOWED_REVERB_PUBLIC.title,
    description: SLOWED_REVERB_PUBLIC.description,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SlowedReverbPublicPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Slowed / Reverb / Nightcore",
        item: `${siteUrl}${SLOWED_REVERB_PUBLIC.path}`,
      },
    ],
  }

  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Slowed / Reverb / Nightcore - Parallax Music",
    url: `${siteUrl}${SLOWED_REVERB_PUBLIC.path}`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
    },
    description: SLOWED_REVERB_PUBLIC.description,
    inLanguage: "ru",
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Нужна ли регистрация, чтобы сделать Slowed / Reverb / Nightcore?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Нет. Инструмент бесплатный и работает без аккаунта. Регистрация нужна только для выпуска версии на площадки.",
        },
      },
      {
        "@type": "Question",
        name: "Куда сохраняется мой трек?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Файл обрабатывается в браузере и не хранится на сервере. Результат скачивается как WAV.",
        },
      },
      {
        "@type": "Question",
        name: "Можно ли выпустить эту версию на Spotify и Яндекс Музыку?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Создайте кабинет Parallax Music и загрузите скачанный WAV как релиз в дистрибуцию.",
        },
      },
    ],
  }

  return (
    <ErrorBoundary>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <main id="main-content" className="min-h-screen">
        <SlowedReverbLanding />
      </main>
    </ErrorBoundary>
  )
}
