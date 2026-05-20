import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { ScrollToTop } from "@/components/scroll-to-top"
import { I18nProvider } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site-shell"
import { fontClassNames } from "@/lib/fonts"
import "./globals.css"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = {
  title: {
    default: "Parallax Music - Label & Promotion Agency",
    template: "%s | Parallax Music",
  },
  description:
    "Дистрибьютор музыки, лейбл и продюсерский центр. Мы знаем, как сделать так, чтобы твою музыку услышали все",
  keywords: [
    "music label",
    "music promotion",
    "artist management",
    "music agency",
    "record label",
    "music marketing",
  ],
  authors: [{ name: "Parallax Music" }],
  creator: "Parallax Music",
  publisher: "Parallax Music",
  metadataBase: new URL(siteUrl),
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
    locale: "ru_RU",
    url: siteUrl,
    siteName: "Parallax Music",
    title: "Parallax Music - Label & Promotion Agency",
    description:
      "Дистрибьютор музыки, лейбл и продюсерский центр. Мы знаем, как сделать так, чтобы твою музыку услышали все",
    images: [
      {
        url: `${siteUrl}/music-studio-recording-session-dark-moody-atmosphe.jpg`,
        width: 1200,
        height: 630,
        alt: "Parallax Music - Professional Music Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parallax Music - Label & Promotion Agency",
    description:
      "Дистрибьютор музыки, лейбл и продюсерский центр. Мы знаем, как сделать так, чтобы твою музыку услышали все",
    images: [`${siteUrl}/music-studio-recording-session-dark-moody-atmosphe.jpg`],
    creator: "@parallaxmusic",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const yandexMetrikaId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID
  const isValidId = yandexMetrikaId && /^\d+$/.test(String(yandexMetrikaId).trim())
  const metrikaId = isValidId ? String(yandexMetrikaId).trim() : null
  const scriptUrl = metrikaId ? `https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}` : null
  const topMailRuCounterId = "3752795"

  return (
    <html lang="ru" className={fontClassNames}>
      <head>
        <link rel="preconnect" href="https://top-fwz1.mail.ru" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://top-fwz1.mail.ru" />
      </head>
      <body className="font-sans antialiased">
        <I18nProvider>
          {metrikaId && scriptUrl && (
            <>
              <Script
                id="yandex-metrika-queue"
                strategy="lazyOnload"
                dangerouslySetInnerHTML={{
                  __html: `
                    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                    m[i].l=1*new Date();})(window, document, "script", "${scriptUrl}", "ym");
                    ym(${metrikaId}, "init", {
                      clickmap: true,
                      trackLinks: true,
                      accurateTrackBounce: true,
                      webvisor: true,
                    });
                  `,
                }}
              />
              <Script id="yandex-metrika-loader" src={scriptUrl} strategy="lazyOnload" />
            </>
          )}
          <Script
            id="top-mail-ru-counter"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
              var _tmr = window._tmr || (window._tmr = []);
              _tmr.push({id: "${topMailRuCounterId}", type: "pageView", start: (new Date()).getTime()});
              (function (d, w, id) {
                if (d.getElementById(id)) return;
                var ts = d.createElement("script"); ts.type = "text/javascript"; ts.async = true; ts.id = id;
                ts.src = "https://top-fwz1.mail.ru/js/code.js";
                var f = function () {var s = d.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ts, s);};
                if (w.opera == "[object Opera]") { d.addEventListener("DOMContentLoaded", f, false); } else { f(); }
              })(document, window, "tmr-code");
            `,
            }}
          />
          <SiteShell>{children}</SiteShell>
          <ScrollToTop />
          <SonnerToaster />
          {metrikaId && (
            <noscript>
              <div>
                <img
                  src={`https://mc.yandex.ru/watch/${metrikaId}`}
                  style={{ position: "absolute", left: "-9999px" }}
                  alt=""
                />
              </div>
            </noscript>
          )}
          <noscript>
            <div>
              <img
                src={`https://top-fwz1.mail.ru/counter?id=${topMailRuCounterId};js=na`}
                style={{ position: "absolute", left: "-9999px" }}
                alt="Top.Mail.Ru"
              />
            </div>
          </noscript>
        </I18nProvider>
      </body>
    </html>
  )
}
