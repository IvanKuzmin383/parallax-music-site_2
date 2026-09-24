"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { SERVICES_CATALOG } from "@/lib/cabinet/services-catalog"

export default function PromotionPage() {
  const router = useRouter()

  useEffect(() => {
    fetch("/api/cabinet/tracks", { credentials: "include" }).then((res) => {
      if (res.status === 401) {
        router.replace("/cabinet")
      }
    })
  }, [router])

  const services = useMemo(
    () => SERVICES_CATALOG.filter((s) => s.category === "promotion"),
    [],
  )

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Продвижение"
        description="Реклама, плейлисты, радио и другие услуги для роста прослушиваний"
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/cabinet/my-services">Мои заказы услуг</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.slug} className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-1 flex-col gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Megaphone className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">{service.title}</CardTitle>
              <CardDescription className="flex-1">{service.shortDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xl font-bold text-primary">{service.priceLabel}</p>
              <Button className="w-full" asChild>
                <Link href={service.href}>
                  Подробнее
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" asChild>
          <Link href="/cabinet">
            <ArrowLeft className="mr-2 h-4 w-4" />
            В кабинет
          </Link>
        </Button>
      </div>
    </div>
  )
}
