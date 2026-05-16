"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ImportResult = {
  fileName: string
  platformKey?: string
  ok: boolean
  error?: string
  daysCount?: number
  totalPlays?: number
}

export default function MusicStatsImportPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[] | null>(null)

  const totalSelected = selectedFiles.length

  const canImport = totalSelected > 0 && !importing

  const platformLabel = useMemo(() => {
    return (k?: string) => {
      switch (k) {
        case "yandex_music":
          return "Yandex Music"
        case "itunes":
          return "iTunes Store"
        case "youtube_music":
          return "YouTube Music"
        case "vk_ok_boom":
          return "VK/OK/BOOM"
        case "spotify":
          return "Spotify"
        case "shazam":
          return "Shazam"
        case "apple_music":
          return "Apple Music"
        case "pandora":
          return "Pandora"
        case "amazon":
          return "amazon"
        default:
          return k ?? "-"
      }
    }
  }, [])

  const handleImport = async () => {
    if (!canImport) return

    setImporting(true)
    setResults(null)
    try {
      const formData = new FormData()
      for (const f of selectedFiles) formData.append("files", f)

      const response = await fetch("/api/admin/music-stats/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      const data = (await response.json().catch(() => null)) as { ok?: boolean; results?: ImportResult[] } | null

      if (!response.ok) {
        toast.error(data?.results?.[0]?.error || "Не удалось импортировать файлы")
        setResults(data?.results ?? null)
        return
      }

      const list = data?.results ?? []
      setResults(list)

      const errors = list.filter((r) => !r.ok)
      if (errors.length > 0) {
        toast.error(`Импорт с ошибками: ${errors.length}`)
      } else {
        toast.success(`Импортировано файлов: ${list.length}`)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Неизвестная ошибка"
      toast.error(message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="music-stats" />

        <div>
          <h1 className="text-2xl font-bold">Импорт статистики (все платформы)</h1>
          <p className="text-sm text-muted-foreground">Загрузите несколько JSON-файлов — система сама определит платформу и заменит данные по пересекающимся датам.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Выбор файлов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="file"
                multiple
                accept="application/json,.json"
                className="block text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-muted file:text-foreground
                  hover:file:bg-muted/70"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
              />
              <Button disabled={!canImport} onClick={() => void handleImport()}>
                {importing ? "Импорт..." : "Импорт"}
              </Button>
              <p className="text-sm text-muted-foreground">{totalSelected ? `${totalSelected} файл(ов)` : "Файлы не выбраны"}</p>
            </div>
          </CardContent>
        </Card>

        {results ? (
          <Card>
            <CardHeader>
              <CardTitle>Результат</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((r) => (
                  <div
                    key={r.fileName}
                    className={`flex items-center justify-between border rounded-md px-3 py-2 ${
                      r.ok ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {platformLabel(r.platformKey)}
                        {r.ok && r.daysCount !== undefined ? ` • дней: ${r.daysCount}` : ""}
                      </p>
                    </div>
                    <div className="text-sm font-semibold">
                      {r.ok ? r.totalPlays?.toLocaleString("ru-RU") : "Ошибка"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {importing ? (
          <p className="text-sm text-muted-foreground">
            Текущая операция: импорт файлов... ({format(new Date(), "dd.MM.yyyy HH:mm", { locale: ru })})
          </p>
        ) : null}
      </div>
    </div>
  )
}

