"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, TrendingUp, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useI18n } from "@/lib/i18n-context"

export default function PromotionPage() {
  const router = useRouter()
  const { t } = useI18n()

  useEffect(() => {
    fetch("/api/cabinet/tracks", { credentials: "include" }).then((res) => {
      if (res.status === 401) {
        router.replace("/cabinet")
      }
    })
  }, [router])

  const services = [
    {
      id: "ai-cover",
      title: t.cabinet.promotion.aiCover.title,
      description: t.cabinet.promotion.aiCover.description,
      price: t.cabinet.promotion.aiCover.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/ai-cover",
      moreDetails: t.cabinet.promotion.aiCover.moreDetails,
    },
    {
      id: "vertical-video",
      title: t.cabinet.promotion.verticalVideo.title,
      description: t.cabinet.promotion.verticalVideo.description,
      price: t.cabinet.promotion.verticalVideo.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/vertical-video",
      moreDetails: t.cabinet.promotion.verticalVideo.moreDetails,
    },
    {
      id: "yandex-videoshot",
      title: t.cabinet.promotion.yandexVideoshot.title,
      description: t.cabinet.promotion.yandexVideoshot.description,
      price: t.cabinet.promotion.yandexVideoshot.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/yandex-videoshot",
      moreDetails: t.cabinet.promotion.yandexVideoshot.moreDetails,
    },
    {
      id: "ai-mastering",
      title: t.cabinet.promotion.aiMastering.title,
      description: t.cabinet.promotion.aiMastering.description,
      price: t.cabinet.promotion.aiMastering.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/ai-mastering",
      moreDetails: t.cabinet.promotion.aiMastering.moreDetails,
    },
    {
      id: "yandex-videoshot-creation",
      title: t.cabinet.promotion.yandexVideoshotCreation.title,
      description: t.cabinet.promotion.yandexVideoshotCreation.description,
      price: t.cabinet.promotion.yandexVideoshotCreation.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/yandex-videoshot-creation",
      moreDetails: t.cabinet.promotion.yandexVideoshotCreation.moreDetails,
    },
    {
      id: "yandex-videoavatar",
      title: t.cabinet.promotion.yandexVideoavatar.title,
      description: t.cabinet.promotion.yandexVideoavatar.description,
      price: t.cabinet.promotion.yandexVideoavatar.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/yandex-videoavatar",
      moreDetails: t.cabinet.promotion.yandexVideoavatar.moreDetails,
    },
    {
      id: "spotify-videoshot",
      title: t.cabinet.promotion.spotifyVideoshot.title,
      description: t.cabinet.promotion.spotifyVideoshot.description,
      price: t.cabinet.promotion.spotifyVideoshot.price,
      imageUrl: "/placeholder.jpg",
      href: "/cabinet/promotion/spotify-videoshot",
      moreDetails: t.cabinet.promotion.spotifyVideoshot.moreDetails,
    },
  ]

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cabinet">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              <h1 className="text-2xl font-bold">{t.cabinet.promotion.title}</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cabinet/my-services">{t.cabinet.myServices.myOrdersLink}</Link>
          </Button>
        </div>

        <p className="text-muted-foreground">
          {t.cabinet.promotion.description}
        </p>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {services.map((service) => (
            <Card key={service.id} className="h-full overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video relative shrink-0 bg-muted">
                <Image
                  src={service.imageUrl}
                  alt={service.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <CardHeader className="flex flex-1 flex-col gap-2">
                <CardTitle className="text-xl">{service.title}</CardTitle>
                <CardDescription className="flex-1">{service.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{service.price}</span>
                </div>
                <Button className="w-full" asChild>
                  <Link href={service.href}>
                    {service.moreDetails}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link href="/cabinet">{t.cabinet.promotion.backToCabinet}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
