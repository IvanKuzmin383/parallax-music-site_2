"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SmartlinkLanding } from "@/components/smartlink/smartlink-landing"
import {
  SMARTLINK_PLATFORMS,
  normalizePlatformLinks,
  type PlatformLinks,
  type PlatformLinkKey,
} from "@/lib/smartlink-platforms"
import {
  DEFAULT_SMARTLINK_THEME,
  getOrderedSmartlinkLinks,
  parseSmartlinkTheme,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"
import { TOOLS_SMARTLINK_PRICE_RUB } from "@/lib/tools-smartlink-pricing"
import { useCabinetSession } from "@/lib/cabinet/hooks/cabinet-session-provider"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"

type EditorPayload = {
  id: string
  slug: string
  title: string
  artistName: string
  coverUrl: string | null
  hasPreviewAudio: boolean
  theme: SmartlinkTheme
  platformLinks: PlatformLinks
  status: string
  publicPath: string
  isPublic: boolean
  needsPayment: boolean
  priceRub: number
}

export function ToolsSmartlinkEditorClient({ smartlinkId }: { smartlinkId: string }) {
  const { user, refresh } = useCabinetSession()
  const { releases } = useCabinetReleases()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paying, setPaying] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importReleaseId, setImportReleaseId] = useState("")
  const [data, setData] = useState<EditorPayload | null>(null)
  const [title, setTitle] = useState("")
  const [artistName, setArtistName] = useState("")
  const [slug, setSlug] = useState("")
  const [platformLinks, setPlatformLinks] = useState<PlatformLinks>({})
  const [theme, setTheme] = useState<SmartlinkTheme>(DEFAULT_SMARTLINK_THEME)
  const [coverTick, setCoverTick] = useState(0)
  const importCandidates = releases.filter(
    (r) => r.kind !== "draft" && r.releaseStatus !== "draft" && r.status !== "Черновик"
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cabinet/tools/smartlinks/${smartlinkId}`, {
        credentials: "include",
      })
      if (!res.ok) {
        setData(null)
        return
      }
      const json = (await res.json()) as EditorPayload
      setData(json)
      setTitle(json.title)
      setArtistName(json.artistName)
      setSlug(json.slug)
      setPlatformLinks(normalizePlatformLinks(json.platformLinks))
      setTheme(parseSmartlinkTheme(json.theme))
    } finally {
      setLoading(false)
    }
  }, [smartlinkId])

  useEffect(() => {
    void load()
  }, [load])

  const previewLinks = useMemo(
    () => getOrderedSmartlinkLinks(platformLinks, theme),
    [platformLinks, theme]
  )

  const publicUrl =
    typeof window !== "undefined" && slug.trim()
      ? `${window.location.origin}/s/${slug.trim()}`
      : data?.publicPath ?? null

  const onSave = async () => {
    setSaving(true)
    try {
      const cleaned = normalizePlatformLinks(
        Object.fromEntries(
          Object.entries(platformLinks).filter(([, url]) => {
            const t = (url ?? "").trim()
            return t.length > 0 && t !== "https://" && t !== "http://"
          })
        ) as PlatformLinks
      )
      const res = await fetch(`/api/cabinet/tools/smartlinks/${smartlinkId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artistName,
          slug,
          platformLinks: cleaned,
          theme,
        }),
      })
      const json = (await res.json()) as EditorPayload & { error?: string }
      if (!res.ok) {
        toast.error(json.error || "Не удалось сохранить")
        return
      }
      setData(json)
      setSlug(json.slug)
      toast.success("Сохранено")
    } finally {
      setSaving(false)
    }
  }

  const uploadCover = async (file: File | null) => {
    if (!file) return
    const fd = new FormData()
    fd.set("file", file)
    const res = await fetch(`/api/cabinet/tools/smartlinks/${smartlinkId}/cover`, {
      method: "POST",
      credentials: "include",
      body: fd,
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      toast.error(json.error || "Не удалось загрузить обложку")
      return
    }
    toast.success("Обложка загружена")
    setCoverTick((n) => n + 1)
    void load()
  }

  const uploadAudio = async (file: File | null) => {
    if (!file) return
    const fd = new FormData()
    fd.set("file", file)
    const res = await fetch(`/api/cabinet/tools/smartlinks/${smartlinkId}/audio`, {
      method: "POST",
      credentials: "include",
      body: fd,
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      toast.error(json.error || "Не удалось загрузить аудио")
      return
    }
    toast.success("Отрывок загружен")
    void load()
  }

  const pay = async () => {
    setPaying(true)
    try {
      const res = await fetch("/api/cabinet/payments/tools-smartlink/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smartlinkId }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!res.ok) {
        toast.error(json.error || "Не удалось оплатить")
        return
      }
      toast.success("Смартлинк активирован")
      await refresh()
      void load()
    } finally {
      setPaying(false)
    }
  }

  const importFromRelease = async () => {
    if (!importReleaseId.trim()) {
      toast.error("Выберите релиз")
      return
    }
    setImporting(true)
    try {
      const res = await fetch("/api/cabinet/tools/smartlinks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromReleaseId: importReleaseId.trim() }),
      })
      const json = (await res.json()) as { id?: string; error?: string }
      if (!res.ok || !json.id) {
        toast.error(json.error || "Не удалось импортировать")
        return
      }
      toast.success("Создан смартлинк из релиза")
      window.location.href = `/cabinet/tools/smartlinks/${json.id}`
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <Link href="/cabinet/tools/smartlinks" className="text-sm text-muted-foreground">
          ← К списку
        </Link>
        <p>Смартлинк не найден</p>
      </div>
    )
  }

  const price = data.priceRub || TOOLS_SMARTLINK_PRICE_RUB
  const balance = user?.walletBalance ?? 0
  const coverSrc = data.coverUrl ? `${data.coverUrl}?t=${coverTick}` : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/cabinet/tools/smartlinks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К смартлинкам
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {importCandidates.length > 0 ? (
            <>
              <select
                className="flex h-8 max-w-[14rem] rounded-md border border-input bg-background px-2 text-sm"
                value={importReleaseId}
                disabled={importing}
                onChange={(e) => setImportReleaseId(e.target.value)}
                aria-label="Релиз для импорта"
              >
                <option value="">Из релиза…</option>
                {importCandidates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!importReleaseId || importing}
                onClick={() => void importFromRelease()}
              >
                {importing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Импорт
              </Button>
            </>
          ) : null}
          <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Сохранить
          </Button>
        </div>
      </div>

      {data.needsPayment ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
          <p className="text-sm">
            Чтобы страница стала публичной, оплатите {price.toLocaleString("ru-RU")} ₽ с баланса
            (год). Баланс: {balance.toLocaleString("ru-RU")} ₽.
          </p>
          <Button type="button" onClick={() => void pay()} disabled={paying || balance < price}>
            {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Оплатить {price.toLocaleString("ru-RU")} ₽
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          Публичная страница активна
          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {publicUrl}
            </a>
          ) : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Название</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Артист</Label>
              <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Slug (URL)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">parallaxmusic.ru/s/{slug || "…"}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Обложка</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => void uploadCover(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Отрывок (WAV/MP3)</Label>
              <Input
                type="file"
                accept=".wav,.mp3,audio/wav,audio/mpeg"
                onChange={(e) => void uploadAudio(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                {data.hasPreviewAudio ? "Файл загружен" : "Пока без превью"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ссылки на площадки</Label>
            <div className="space-y-2">
              {SMARTLINK_PLATFORMS.slice(0, 8).map((p) => (
                <div key={p.key} className="grid grid-cols-[7rem_1fr] items-center gap-2">
                  <span className="text-xs text-muted-foreground">{p.label}</span>
                  <Input
                    value={platformLinks[p.key as PlatformLinkKey] ?? ""}
                    placeholder="https://"
                    onChange={(e) =>
                      setPlatformLinks((prev) => ({ ...prev, [p.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-[28rem] overflow-hidden rounded-xl border border-border bg-black">
          <SmartlinkLanding
            title={title || "Название"}
            artist={artistName || "Артист"}
            coverUrl={coverSrc || ""}
            links={previewLinks}
            theme={theme}
            previewAudioSrc={null}
          />
        </div>
      </div>
    </div>
  )
}
