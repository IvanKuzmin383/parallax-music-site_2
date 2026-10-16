import type { Metadata } from "next"
import { PrllxLanding } from "@/components/prllx/prllx-landing"
import { getConfiguredSmartlinkOrigin } from "@/lib/smartlink-public-origin"

const smartlinkOrigin = getConfiguredSmartlinkOrigin() || "https://prllx.link"

export const metadata: Metadata = {
  title: "prllx.link - смартлинки для музыки",
  description:
    "Короткий линк на все площадки. 30+ оформлений из конструктора Parallax Music: чернила, кассета, граффити, голо и другие.",
  alternates: {
    canonical: smartlinkOrigin,
  },
  openGraph: {
    title: "prllx.link - смартлинки для музыки",
    description:
      "Один адрес - все стриминги. Стиль как у релиза. Создайте смартлинк в кабинете Parallax Music.",
    url: smartlinkOrigin,
    siteName: "prllx.link",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "prllx.link - смартлинки для музыки",
    description: "Короткий линк на все площадки. Конструктор оформлений Parallax Music.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrllxLandingPage() {
  return <PrllxLanding />
}
