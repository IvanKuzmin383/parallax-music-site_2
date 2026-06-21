"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowRight, ClipboardList, Disc3, Music, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { ServiceCard } from "@/components/cabinet/services/service-card"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { useCabinetOrders } from "@/lib/cabinet/hooks/use-cabinet-orders"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { QUICK_ACTIONS, RECOMMENDED_SERVICE_SLUGS, SERVICES_CATALOG, getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { Spinner } from "@/components/ui/spinner"
import Image from "next/image"

export function CabinetDashboardPage() {
  const { user, loading: userLoading } = useCabinetSession()
  const { orders, loading: ordersLoading } = useCabinetOrders("all")
  const { releases, inProgressCount, loading: releasesLoading } = useCabinetReleases()

  if (userLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const balance = user?.streamingBalance ?? 0
  const activeOrders = orders.filter((o) => o.status === "in_progress" || o.status === "paid" || o.status === "review").length
  const recentOrders = orders.slice(0, 5)
  const recentReleases = releases.slice(0, 5)
  const recommended = RECOMMENDED_SERVICE_SLUGS.map((slug) => getServiceBySlug(slug)).filter(Boolean)

  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeader
        title="Добро пожаловать в Parallax Music"
        description="Выпускайте, оформляйте, продвигайте и защищайте свою музыку в одном кабинете."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Баланс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{balance.toLocaleString("ru-RU")} ₽</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Активные заказы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ordersLoading ? "—" : activeOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Disc3 className="h-4 w-4" /> Релизы в работе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{releasesLoading ? "—" : inProgressCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Music className="h-4 w-4" /> Доступные роялти
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{balance.toLocaleString("ru-RU")} ₽</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Быстрые действия</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardContent className="pt-6 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Последние заказы</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cabinet/orders">Все заказы</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            {ordersLoading ? (
              <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
            ) : recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Заказов пока нет</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{order.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "d MMM yyyy", { locale: ru })} · {order.amount.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/cabinet/orders/${order.id}`}>Подробнее</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Мои релизы</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cabinet/music/releases">Все релизы</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            {releasesLoading ? (
              <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
            ) : recentReleases.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Релизов пока нет</p>
            ) : (
              <div className="space-y-3">
                {recentReleases.map((release) => (
                  <div key={release.id} className="flex items-center gap-3 border-b border-border pb-3 last:border-0">
                    <div className="h-12 w-12 rounded bg-muted shrink-0 overflow-hidden relative">
                      {release.coverUrl ? (
                        <Image src={release.coverUrl} alt="" fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Music className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{release.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{release.artist}</p>
                    </div>
                    <StatusBadge status={release.status} kind="generic" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Рекомендованные услуги</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommended.map((service) => service ? <ServiceCard key={service.slug} service={service} compact /> : null)}
        </div>
      </section>
    </div>
  )
}
