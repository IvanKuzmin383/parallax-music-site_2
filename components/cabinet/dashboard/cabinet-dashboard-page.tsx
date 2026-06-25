"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { useCabinetOrders } from "@/lib/cabinet/hooks/use-cabinet-orders"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { isReleaseInProgress, releaseContinueHref } from "@/lib/cabinet/adapters/map-track-to-release"
import { pickFeaturedRelease, releaseDetailHref } from "@/lib/cabinet/release-presenters"
import { getOrderDisplayStatusLabel } from "@/lib/cabinet/order-status-map"
import {
  CabinetDashboardHero,
  ReleaseCoverCard,
} from "./cabinet-dashboard-hero"
import { CabinetActionTiles, CabinetContinueWork } from "./cabinet-action-tiles"

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
  const activeOrders = orders.filter(
    (o) => o.status === "in_progress" || o.status === "paid" || o.status === "review"
  ).length
  const featured = pickFeaturedRelease(releases)
  const showcaseReleases = releases.slice(0, 6)
  const inProgressReleases = releases.filter(isReleaseInProgress).slice(0, 4)
  const activeOrderItems = orders
    .filter((o) => o.status === "in_progress" || o.status === "paid" || o.status === "review")
    .slice(0, 3)

  return (
    <div className="space-y-10 max-w-6xl">
      <CabinetDashboardHero
        displayName={user?.displayName ?? user?.email?.split("@")[0]}
        featured={featured}
        balance={balance}
        activeOrders={ordersLoading ? 0 : activeOrders}
        inProgressCount={releasesLoading ? 0 : inProgressCount}
      />

      {!releasesLoading && !ordersLoading ? (
        <CabinetContinueWork
          releases={inProgressReleases.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            coverUrl: r.coverUrl,
            href: r.kind === "draft" ? releaseContinueHref(r) : releaseDetailHref(r),
          }))}
          orders={activeOrderItems.map((o) => ({
            id: o.id,
            serviceName: o.serviceName,
            status: getOrderDisplayStatusLabel(o.status),
            href: `/cabinet/orders/${o.id}`,
          }))}
        />
      ) : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Мои релизы</h2>
            <p className="text-sm text-muted-foreground">Обложки, статусы и площадки</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cabinet/music/releases">
              Все релизы
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        {releasesLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : showcaseReleases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Пока нет релизов — начните с загрузки первого трека
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            {showcaseReleases.map((release, i) => (
              <ReleaseCoverCard
                key={release.id}
                release={release}
                size={i === 0 ? "lg" : "md"}
                className={i === 0 ? "md:col-span-2 md:row-span-2" : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <CabinetActionTiles />

      <section className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Каталог услуг</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Продвижение, оформление, AI и защита — всё в одном месте
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/cabinet/services">
            Открыть каталог
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </section>
    </div>
  )
}
