"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Music, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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

function isDraftRelease(release: ReleaseView): boolean {
  return (
    release.kind === "draft" ||
    release.releaseStatus === "draft" ||
    release.status === "Черновик"
  )
}

function isOnModerationRelease(release: ReleaseView): boolean {
  return (
    release.releaseStatus === "on_moderation" ||
    (release.status.includes("модерац") && !release.status.includes("доработ"))
  )
}

export function ReleaseListCard({
  release,
  onDeleted,
}: {
  release: ReleaseView
  onDeleted?: () => void
}) {
  const kindMeta = formatReleaseKindMeta(release)
  const wizard = usesWizardAction(release)
  const href = wizard ? releaseContinueHref(release) : releaseDetailHref(release)
  const actionLabel = wizard ? releaseContinueLabel(release) : "Открыть"
  const primary = actionLabel === "Исправить" || actionLabel === "Оплатить" || actionLabel === "Продолжить"
  const canDelete = isDraftRelease(release)
  const canRecall = isOnModerationRelease(release)
  const [deleting, setDeleting] = useState(false)
  const [recalling, setRecalling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [recallConfirmOpen, setRecallConfirmOpen] = useState(false)

  const kindParts = kindMeta?.split(" · ") ?? []

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/cabinet/releases/${release.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось удалить черновик")
        return
      }
      toast.success("Черновик удалён")
      setConfirmOpen(false)
      onDeleted?.()
    } catch {
      toast.error("Не удалось удалить черновик")
    } finally {
      setDeleting(false)
    }
  }

  const handleRecall = async () => {
    if (recalling) return
    setRecalling(true)
    try {
      const res = await fetch(`/api/cabinet/releases/${encodeURIComponent(release.id)}/recall`, {
        method: "POST",
        credentials: "include",
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось вернуть на редактирование")
        return
      }
      toast.success("Релиз возвращён на редактирование")
      setRecallConfirmOpen(false)
      onDeleted?.()
    } catch {
      toast.error("Не удалось вернуть на редактирование")
    } finally {
      setRecalling(false)
    }
  }

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

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 py-0.5 pb-10 sm:pb-0 sm:pr-52">
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

      <div className="absolute bottom-3 right-3 flex items-center gap-2 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
        {canDelete ? (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={deleting}
                className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {deleting ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">Удалить</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить черновик?</AlertDialogTitle>
                <AlertDialogDescription>
                  Релиз «{release.title || "Без названия"}» будет удалён полностью вместе с обложкой и
                  аудиофайлами. Это действие нельзя отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting ? <Spinner className="h-4 w-4 mr-1" /> : null}
                  Удалить
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        {canRecall ? (
          <AlertDialog open={recallConfirmOpen} onOpenChange={setRecallConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={recalling}>
                {recalling ? <Spinner className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">На редактирование</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Вернуть на редактирование?</AlertDialogTitle>
                <AlertDialogDescription>
                  Релиз «{release.title || "Без названия"}» снимется с модерации. Вы сможете внести
                  правки и отправить снова. Если модератор уже взял релиз в работу, вернуть его будет
                  нельзя.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={recalling}>Отмена</AlertDialogCancel>
                <Button
                  type="button"
                  disabled={recalling}
                  onClick={() => void handleRecall()}
                >
                  {recalling ? <Spinner className="h-4 w-4 mr-1" /> : null}
                  На редактирование
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        <Button size="sm" variant={primary ? "default" : "outline"} asChild>
          <Link href={href}>{actionLabel}</Link>
        </Button>
      </div>
    </article>
  )
}
