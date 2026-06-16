import dynamic from "next/dynamic"
import { getHeroBackgroundOgUrl } from "@/lib/hero-background"
import { ErrorBoundary } from "@/components/error-boundary"
import { Hero } from "@/components/hero"
import { Services } from "@/components/services"
import { Process } from "@/components/process"
import { Advantages } from "@/components/advantages"

const Pricing = dynamic(() => import("@/components/pricing").then((m) => m.Pricing))
const FaqSection = dynamic(() => import("@/components/faq-section").then((m) => m.FaqSection))
const Reviews = dynamic(() => import("@/components/reviews").then((m) => m.Reviews))
const Contact = dynamic(() => import("@/components/contact").then((m) => m.Contact))

export default function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parallaxmusic.ru'
  
  // Organization schema
  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Parallax Music',
    description: 'Дистрибьютор музыки, лейбл и продюсерский центр. Мы знаем, как сделать так, чтобы твою музыку услышали все',
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    image: getHeroBackgroundOgUrl(siteUrl),
    sameAs: [
      'https://instagram.com/parallaxmusic',
      'https://twitter.com/parallaxmusic',
      'https://youtube.com/@parallaxmusic',
      'https://facebook.com/parallaxmusic',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'parallaxmusiclabel@gmail.com',
    },
  }

  // WebSite schema для быстрых ссылок в Yandex
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Parallax Music',
    url: siteUrl,
    description: 'Дистрибьютор музыки, лейбл и продюсерский центр. Мы знаем, как сделать так, чтобы твою музыку услышали все',
    publisher: {
      '@type': 'Organization',
      name: 'Parallax Music',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/icon.svg`,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/blog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  // SiteNavigationElement для основных страниц (быстрые ссылки)
  const navigationLd = {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'Основная навигация',
    url: siteUrl,
    hasPart: [
      {
        '@type': 'SiteNavigationElement',
        name: 'Блог',
        url: `${siteUrl}/blog`,
        description: 'Статьи о музыкальном продюсировании, продвижении и индустрии',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Услуги',
        url: `${siteUrl}/#services`,
        description: 'Услуги музыкального лейбла и продвижения',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Процесс работы',
        url: `${siteUrl}/#process`,
        description: 'Как мы работаем с артистами',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Цены',
        url: `${siteUrl}/#pricing`,
        description: 'Тарифы и стоимость услуг',
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Контакты',
        url: `${siteUrl}/#contact`,
        description: 'Свяжитесь с нами',
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
        <Services />
        <Process />
        <Advantages />
        {/* <Platforms /> */}
        <Pricing />
        <FaqSection />
        <Reviews />
        <Contact />
      </main>
    </ErrorBoundary>
  )
}
