"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Music, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { releaseContinueHref } from "@/lib/cabinet/adapters/map-track-to-release"
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
    <div className="max-w-5xl space-y-6">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {releases.map((release) => (
            <Card key={release.id}>
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <div className="h-16 w-16 rounded bg-muted shrink-0 overflow-hidden relative">
                    {release.coverUrl ? (
                      <Image src={release.coverUrl} alt="" fill className="object-cover" sizes="64px" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium truncate">{release.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{release.artist}</p>
                    <StatusBadge status={release.status} kind="generic" />
                    {release.platforms && release.platforms.length > 0 ? (
                      <p className="text-xs text-muted-foreground truncate">{release.platforms.join(", ")}</p>
                    ) : null}
                  </div>
                </div>
                {release.kind === "draft" ? (
                  <Button size="sm" className="w-full mt-3" variant="outline" asChild>
                    <Link href={releaseContinueHref(release)}>
                      {release.status.includes("Ожидает оплаты") ? "Оплатить" : "Продолжить"}
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
