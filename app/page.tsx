import dynamic from "next/dynamic"
import type { Metadata } from "next"
import { getHeroBackgroundOgUrl } from "@/lib/hero-background"
import { ErrorBoundary } from "@/components/error-boundary"
import { Hero } from "@/components/hero"
import { Services } from "@/components/services"
import { Process } from "@/components/process"
import { Advantages } from "@/components/advantages"

const Pricing = dynamic(() => import("@/components/pricing").then((m) => m.Pricing))
const ProofResults = dynamic(() =>
  import("@/components/proof-results").then((m) => m.ProofResults)
)
const ServiceCatalog = dynamic(() =>
  import("@/components/service-catalog").then((m) => m.ServiceCatalog)
)
const FaqSection = dynamic(() => import("@/components/faq-section").then((m) => m.FaqSection))
const Reviews = dynamic(() => import("@/components/reviews").then((m) => m.Reviews))
const Contact = dynamic(() => import("@/components/contact").then((m) => m.Contact))

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
const heroOgImage = getHeroBackgroundOgUrl(siteUrl)

const homeDescription =
  "Дистрибуция музыки на Яндекс Музыку, VK, Spotify, Apple Music и 50+ площадок. 100% роялти, треки не удаляем, лояльная модерация нейросетевых релизов."

export const metadata: Metadata = {
  title: "Дистрибуция и продвижение музыки | Parallax Music",
  description: homeDescription,
  keywords: [
    "ИИ-музыка",
    "дистрибуция ИИ-музыки",
    "нейросетевая музыка",
    "выпустить трек на Spotify",
    "Яндекс Музыка дистрибуция",
    "AI music distribution",
    "Parallax Music",
  ],
  alternates: {
    canonical: "/",
    languages: {
      ru: siteUrl,
      en: siteUrl,
      "x-default": siteUrl,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Дистрибуция и продвижение музыки | Parallax Music",
    description: homeDescription,
    images: [
      {
        url: heroOgImage,
        width: 1200,
        height: 630,
        alt: "Parallax Music - дистрибуция и продвижение музыки",
      },
    ],
  },
}

export default function HomePage() {
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Parallax Music",
    description: homeDescription,
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    image: heroOgImage,
    sameAs: ["https://t.me/parallaxmusic_rt", "https://vk.com/parallaxmusic_releaseteam"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "parallaxmusiclabel@gmail.com",
    },
  }

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Parallax Music",
    url: siteUrl,
    description: homeDescription,
    publisher: {
      "@type": "Organization",
      name: "Parallax Music",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.svg`,
      },
    },
  }

  const navigationLd = {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: "Основная навигация",
    url: siteUrl,
    hasPart: [
      {
        "@type": "SiteNavigationElement",
        name: "Возможности",
        url: `${siteUrl}/#services`,
        description: "Дистрибуция ИИ-музыки, защита релизов и продвижение",
      },
      {
        "@type": "SiteNavigationElement",
        name: "Тарифы",
        url: `${siteUrl}/#pricing`,
        description: "Тарифы дистрибуции музыки",
      },
      {
        "@type": "SiteNavigationElement",
        name: "Продвижение",
        url: `${siteUrl}/promotion`,
        description: "Продвижение релизов",
      },
      {
        "@type": "SiteNavigationElement",
        name: "Контакты",
        url: `${siteUrl}/#contact`,
        description: "Свяжитесь с нами",
      },
    ],
  }

  return (
    <ErrorBoundary>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(navigationLd) }}
      />
      <main id="main-content" className="min-h-screen bg-background">
        <Hero />
        <Advantages />
        <Services />
        <Process />
        <ProofResults />
        <Pricing />
        <ServiceCatalog />
        <FaqSection />
        <Reviews />
        <Contact />
      </main>
    </ErrorBoundary>
  )
}
