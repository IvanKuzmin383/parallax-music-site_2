"use client"

import Link from "next/link"
import Image from "next/image"
import { Music, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { Spinner } from "@/components/ui/spinner"

export default function MusicReleasesPage() {
  const { releases, loading } = useCabinetReleases()

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Мои релизы" description="Треки, альбомы и черновики загрузки">
        <Button asChild>
          <Link href="/cabinet/upload"><Upload className="h-4 w-4 mr-2" />Загрузить трек</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/cabinet/upload/album">Альбом</Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : releases.length === 0 ? (
        <EmptyState
          title="Релизов пока нет"
          description="Загрузите первый трек или альбом"
          icon={Music}
          action={
            <Button asChild>
              <Link href="/cabinet/upload">Загрузить трек</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {releases.map((release) => (
            <Card key={release.id}>
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <div className="h-16 w-16 rounded bg-muted shrink-0 overflow-hidden relative">
                    {release.coverUrl ? (
                      <Image src={release.coverUrl} alt="" fill className="object-cover" sizes="64px" />
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
                    <Link href={release.title.includes("Альбом") ? "/cabinet/upload/album" : "/cabinet/upload"}>
                      Продолжить
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
