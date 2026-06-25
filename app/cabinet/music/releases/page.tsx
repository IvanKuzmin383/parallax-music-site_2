"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Music, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { releaseContinueHref } from "@/lib/cabinet/adapters/map-track-to-release"
import { releaseDetailHref } from "@/lib/cabinet/release-presenters"
import { ReleaseCoverCard } from "@/components/cabinet/dashboard/cabinet-dashboard-hero"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function UploadReleaseButton({ variant = "default" }: { variant?: "default" | "outline" }) {
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/user", { credentials: "include" })
        if (!res.ok) {
          setProfileComplete(false)
          return
        }
        const data = (await res.json()) as { user?: { profileCompleteForUpload?: boolean } }
        setProfileComplete(data.user?.profileCompleteForUpload === true)
      } catch {
        setProfileComplete(false)
      }
    })()
  }, [])

  const disabled = profileComplete === false
  const loading = profileComplete === null

  const buttonInner = (
    <>
      <Upload className="h-4 w-4 mr-2" />
      Загрузить релиз
    </>
  )

  if (loading) {
    return (
      <Button variant={variant} disabled>
        {buttonInner}
      </Button>
    )
  }

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={variant} disabled>
              {buttonInner}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Заполните обязательные поля в профиле, чтобы загрузить релиз
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button asChild variant={variant}>
      <Link href="/cabinet/upload">{buttonInner}</Link>
    </Button>
  )
}

export default function MusicReleasesPage() {
  const { releases, loading } = useCabinetReleases()

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader title="Мои релизы" description="Черновики и опубликованные релизы">
        <UploadReleaseButton />
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : releases.length === 0 ? (
        <EmptyState
          title="Релизов пока нет"
          description="Загрузите первый релиз"
          icon={Music}
          action={<UploadReleaseButton />}
        />
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {releases.map((release) => (
            <div key={release.id} className="space-y-2">
              <ReleaseCoverCard release={release} size="md" />
              {release.kind === "draft" ? (
                <Button size="sm" className="w-full" variant="outline" asChild>
                  <Link href={releaseContinueHref(release)}>
                    {release.status.includes("Ожидает оплаты") ? "Оплатить" : "Продолжить"}
                  </Link>
                </Button>
              ) : (
                <Button size="sm" className="w-full" variant="ghost" asChild>
                  <Link href={releaseDetailHref(release)}>Открыть релиз</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
