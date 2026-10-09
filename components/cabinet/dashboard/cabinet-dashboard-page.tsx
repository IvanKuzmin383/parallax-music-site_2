"use client"

import { Suspense, useMemo } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { pickUpcomingRelease } from "@/lib/cabinet/release-presenters"
import {
  buildArtistCounts,
  useArtistProjectFilter,
} from "@/lib/cabinet/hooks/use-artist-project-filter"
import {
  DashboardMetricCards,
  DashboardNextRelease,
  DashboardReleaseCalendar,
  DashboardStatsPanel,
  DashboardTasks,
} from "./dashboard-widgets"

function CabinetDashboardPageContent() {
  const { user, loading: userLoading } = useCabinetSession()
  const { releases, loading: releasesLoading, reload } = useCabinetReleases()

  const artistCounts = useMemo(() => buildArtistCounts(releases), [releases])
  const artistNames = useMemo(() => artistCounts.map((a) => a.name), [artistCounts])
  const { artistFilters, filterRelease } = useArtistProjectFilter(artistNames)
  const scopedReleases = useMemo(
    () => filterRelease(releases),
    [filterRelease, releases]
  )

  if (userLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const walletBalance = user?.walletBalance ?? 0
  const royaltyBalance = user?.streamingBalance ?? 0
  const upcoming = pickUpcomingRelease(scopedReleases)
  const releasesHref =
    artistFilters.length === 0
      ? "/cabinet/music/distribution"
      : `/cabinet/music/distribution?${artistFilters
          .map((a) => `artist=${encodeURIComponent(a)}`)
          .join("&")}`

  return (
    <div className="w-full max-w-none space-y-4 md:space-y-5">
      <DashboardMetricCards
        releasesCount={releasesLoading ? 0 : scopedReleases.length}
        balance={walletBalance}
        royalty={royaltyBalance}
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
          <DashboardTasks
            releases={scopedReleases}
            onDeleted={() => void reload()}
            allTasksHref={releasesHref}
          />
        )}
        {releasesLoading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-card/80">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <DashboardReleaseCalendar releases={scopedReleases} />
        )}
      </div>
    </div>
  )
}

export function CabinetDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <CabinetDashboardPageContent />
    </Suspense>
  )
}
