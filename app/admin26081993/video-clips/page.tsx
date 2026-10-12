"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  VIDEO_CLIP_STATUS_LABELS,
  type VideoClipStatus,
  type VideoClipView,
} from "@/lib/video-clips-shared"

type LinkDraft = {
  appleMusicUrl: string
  yandexMusicUrl: string
  vkUrl: string
}

export default function AdminVideoClipsPage() {
  const [clips, setClips] = useState<VideoClipView[]>([])
  const [loading, setLoading] = useState(true)
  const [linkDrafts, setLinkDrafts] = useState<Record<string, LinkDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/video-clips?limit=100", { credentials: "include" })
      if (!res.ok) throw new Error("Ошибка загрузки")
      const data = (await res.json()) as { rows?: VideoClipView[] }
      const rows = data.rows ?? []
      setClips(rows)
      setLinkDrafts(
        Object.fromEntries(
          rows.map((c) => [
            c.id,
            {
              appleMusicUrl: c.platformLinks.appleMusic ?? "",
              yandexMusicUrl: c.platformLinks.yandex ?? "",
              vkUrl: c.platformLinks.vk ?? "",
            },
          ])
        )
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onStatusChange(id: string, status: VideoClipStatus) {
    try {
      const res = await fetch("/api/admin/video-clips", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || "Ошибка")
      }
      toast.success("Статус обновлён")
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    }
  }

  async function onSaveLinks(id: string) {
    const draft = linkDrafts[id]
    if (!draft) return
    setSavingId(id)
    try {
      const res = await fetch("/api/admin/video-clips", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          appleMusicUrl: draft.appleMusicUrl,
          yandexMusicUrl: draft.yandexMusicUrl,
          vkUrl: draft.vkUrl,
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || "Ошибка")
      }
      toast.success("Ссылки сохранены")
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <AdminSectionNav active="video-clips" />
      <div>
        <h1 className="text-2xl font-bold">Видеоклипы</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Каталог клипов клиентов (Дистрибуция → Видеоклипы). После оплаты заказа клип
          появляется со статусом «На модерации». Укажите ссылки на площадки - в кабинете
          иконки станут активными.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Клипы ({clips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока пусто</p>
          ) : (
            <div className="space-y-3">
              {clips.map((c) => {
                const draft = linkDrafts[c.id] ?? {
                  appleMusicUrl: "",
                  yandexMusicUrl: "",
                  vkUrl: "",
                }
                return (
                  <div
                    key={c.id}
                    className="space-y-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium truncate">{c.title}</p>
                        <p className="text-muted-foreground truncate">{c.artist}</p>
                        {c.fileUrl ? (
                          <a
                            href={c.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary truncate block"
                          >
                            Исходник
                          </a>
                        ) : null}
                        {c.comment ? (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            Пожелания: {c.comment}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {c.releaseDate ? <span>Публикация: {c.releaseDate}</span> : null}
                          {c.previewTimecodeSec !== null ? (
                            <span>Превью: {c.previewTimecodeSec} сек</span>
                          ) : null}
                        </div>
                      </div>
                      <Select
                        value={c.status}
                        onValueChange={(v) => void onStatusChange(c.id, v as VideoClipStatus)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(VIDEO_CLIP_STATUS_LABELS) as VideoClipStatus[]).map(
                            (s) => (
                              <SelectItem key={s} value={s}>
                                {VIDEO_CLIP_STATUS_LABELS[s]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Apple Music</Label>
                        <Input
                          value={draft.appleMusicUrl}
                          onChange={(e) =>
                            setLinkDrafts((prev) => ({
                              ...prev,
                              [c.id]: { ...draft, appleMusicUrl: e.target.value },
                            }))
                          }
                          placeholder="https://music.apple.com/..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Яндекс Музыка</Label>
                        <Input
                          value={draft.yandexMusicUrl}
                          onChange={(e) =>
                            setLinkDrafts((prev) => ({
                              ...prev,
                              [c.id]: { ...draft, yandexMusicUrl: e.target.value },
                            }))
                          }
                          placeholder="https://music.yandex.ru/..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">VK</Label>
                        <Input
                          value={draft.vkUrl}
                          onChange={(e) =>
                            setLinkDrafts((prev) => ({
                              ...prev,
                              [c.id]: { ...draft, vkUrl: e.target.value },
                            }))
                          }
                          placeholder="https://vk.com/..."
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={savingId === c.id}
                      onClick={() => void onSaveLinks(c.id)}
                    >
                      {savingId === c.id ? "Сохранение..." : "Сохранить ссылки"}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
