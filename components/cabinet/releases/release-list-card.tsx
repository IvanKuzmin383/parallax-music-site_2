"use client"

import Link from "next/link"
import Image from "next/image"
import { Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import type { ReleaseView } from "@/lib/cabinet/types"
import {
  formatReleaseKindMeta,
  releaseContinueHref,
  releaseContinueLabel,
  releaseStatusHint,
} from "@/lib/cabinet/adapters/map-track-to-release"
import { releaseDetailHref } from "@/lib/cabinet/release-presenters"

function usesWizardAction(release: ReleaseView): boolean {
  return (
    release.kind === "draft" ||
    release.releaseStatus === "upload_pending" ||
    release.releaseStatus === "rejected" ||
    release.releaseStatus === "awaiting_payment" ||
    release.status.includes("доработ") ||
    release.status.includes("оплат") ||
    release.status === "Черновик"
  )
}

export function ReleaseListCard({ release }: { release: ReleaseView }) {
  const kindMeta = formatReleaseKindMeta(release)
  const wizard = usesWizardAction(release)
  const href = wizard ? releaseContinueHref(release) : releaseDetailHref(release)
  const actionLabel = wizard ? releaseContinueLabel(release) : "Открыть"
  const primary = actionLabel === "Исправить" || actionLabel === "Оплатить" || actionLabel === "Продолжить"

  const kindParts = kindMeta?.split(" · ") ?? []

  return (
    <article className="relative flex items-stretch gap-3 sm:gap-4 rounded-xl bg-card/70 p-3 sm:p-4">
      <Link
        href={href}
        className="relative aspect-square shrink-0 self-stretch overflow-hidden rounded-lg bg-muted"
      >
        {release.coverUrl ? (
          <Image
            src={release.coverUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
            sizes="160px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 py-0.5 pb-10 sm:pb-0 sm:pr-28">
        <div className="space-y-1.5">
          <div>
            <Link
              href={href}
              className="font-semibold text-base sm:text-lg leading-tight hover:underline line-clamp-1"
            >
              {release.title || "Без названия"}
            </Link>
            <p className="text-sm text-muted-foreground truncate">{release.artist || "—"}</p>
          </div>
          {kindMeta ? (
            <p className="text-xs text-muted-foreground">
              {kindParts.length > 1 ? (
                <>
                  <span className="font-medium text-foreground/90">{kindParts[0]}</span>
                  {" · "}
                  {kindParts.slice(1).join(" · ")}
                </>
              ) : (
                kindMeta
              )}
            </p>
          ) : null}
          <StatusBadge status={release.status} kind="generic" withIcon className="text-[11px]" />
        </div>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
          {releaseStatusHint(release)}
        </p>
      </div>

      <div className="absolute bottom-3 right-3 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
        <Button size="sm" variant={primary ? "default" : "outline"} asChild>
          <Link href={href}>{actionLabel}</Link>
        </Button>
      </div>
    </article>
  )
}
