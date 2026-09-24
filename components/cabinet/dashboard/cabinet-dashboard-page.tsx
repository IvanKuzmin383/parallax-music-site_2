"use client"

import { Spinner } from "@/components/ui/spinner"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { pickUpcomingRelease } from "@/lib/cabinet/release-presenters"
import {
  DashboardMetricCards,
  DashboardNextRelease,
  DashboardReleaseCalendar,
  DashboardStatsPanel,
  DashboardTasks,
} from "./dashboard-widgets"

export function CabinetDashboardPage() {
  const { user, loading: userLoading } = useCabinetSession()
  const { releases, loading: releasesLoading } = useCabinetReleases()

  if (userLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const balance = user?.streamingBalance ?? 0
  const upcoming = pickUpcomingRelease(releases)

  return (
    <div className="w-full max-w-none space-y-4 md:space-y-5">
      <DashboardMetricCards
        releasesCount={releasesLoading ? 0 : releases.length}
        balance={balance}
        royalty={balance}
      />

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DashboardStatsPanel />
        {releasesLoading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-card/80">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <DashboardNextRelease release={upcoming} />
        )}
      </div>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {releasesLoading ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-card/80">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <DashboardTasks releases={releases} />
        )}
        {releasesLoading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-card/80">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <DashboardReleaseCalendar releases={releases} />
        )}
      </div>
    </div>
  )
}
