"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function AdminVideoClipsPage() {
  const [clips, setClips] = useState<VideoClipView[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/video-clips?limit=100", { credentials: "include" })
      if (!res.ok) throw new Error("Ошибка загрузки")
      const data = (await res.json()) as { rows?: VideoClipView[] }
      setClips(data.rows ?? [])
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

  return (
    <div className="space-y-4 p-4">
      <AdminSectionNav active="video-clips" />
      <div>
        <h1 className="text-2xl font-bold">Видеоклипы</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Каталог клипов клиентов (Дистрибуция → Видеоклипы). После оплаты заказа клип
          появляется со статусом «На модерации».
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
            <div className="space-y-2">
              {clips.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.title}</p>
                    <p className="text-muted-foreground truncate">{c.artist}</p>
                    {c.fileUrl ? (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary truncate block"
                      >
                        Файл
                      </a>
                    ) : null}
                  </div>
                  <Select
                    value={c.status}
                    onValueChange={(v) => void onStatusChange(c.id, v as VideoClipStatus)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(VIDEO_CLIP_STATUS_LABELS) as VideoClipStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {VIDEO_CLIP_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
