"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Copy, ExternalLink, GripVertical, Link2, Save } from "lucide-react"
import { toast } from "sonner"
import { SmartlinkLanding } from "@/components/smartlink/smartlink-landing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  DEFAULT_SMARTLINK_THEME,
  SMARTLINK_ACCENT_SWATCHES,
  SMARTLINK_BUTTON_STYLES,
  SMARTLINK_COVER_SHAPES,
  SMARTLINK_PRESET_META,
  SMARTLINK_PRESETS,
  getOrderedSmartlinkLinks,
  normalizeAccentHex,
  parseSmartlinkTheme,
  type SmartlinkButtonStyle,
  type SmartlinkCoverShape,
  type SmartlinkPreset,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"
import {
  PLATFORM_ICON_SRC,
  SMARTLINK_PLATFORMS,
  type PlatformLinkKey,
  type PlatformLinks,
} from "@/lib/smartlink-platforms"
import { cn } from "@/lib/utils"

type SmartlinkApiPayload = {
  releaseId: string | null
  trackId: string
  title: string
  artist: string
  coverUrl: string | null
  status: string
  theme: SmartlinkTheme
  platformLinks: PlatformLinks
  smartlinkSlug: string | null
  publicPath: string | null
  isPublic: boolean
}

const BUTTON_LABELS: Record<SmartlinkButtonStyle, string> = {
  solid: "Заливка",
  outline: "Обводка",
  soft: "Мягкие",
}

const COVER_LABELS: Record<SmartlinkCoverShape, string> = {
  rounded: "Скругление",
  soft: "Мягкие края",
  square: "Квадрат",
}

function Segmented<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (next: T) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
            value === option
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  )
}

export function SmartlinkEditor({ releaseKey }: { releaseKey: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<SmartlinkApiPayload | null>(null)
  const [theme, setTheme] = useState<SmartlinkTheme>(DEFAULT_SMARTLINK_THEME)
  const [slug, setSlug] = useState("")
  const [customAccent, setCustomAccent] = useState(DEFAULT_SMARTLINK_THEME.accent)
  const [copied, setCopied] = useState(false)
  const [dragKey, setDragKey] = useState<PlatformLinkKey | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cabinet/smartlink/${releaseKey}`, { credentials: "include" })
      if (!res.ok) {
        setData(null)
        return
      }
      const json = (await res.json()) as SmartlinkApiPayload
      setData(json)
      const nextTheme = parseSmartlinkTheme(json.theme)
      setTheme(nextTheme)
      setCustomAccent(nextTheme.accent)
      setSlug(json.smartlinkSlug ?? "")
    } finally {
      setLoading(false)
    }
  }, [releaseKey])

  useEffect(() => {
    void load()
  }, [load])

  const activePlatformKeys = useMemo(() => {
    if (!data) return [] as PlatformLinkKey[]
    const present = SMARTLINK_PLATFORMS.filter((p) => Boolean(data.platformLinks[p.key]?.trim())).map(
      (p) => p.key,
    )
    const order = theme.platformOrder?.filter((key) => present.includes(key)) ?? []
    const rest = present.filter((key) => !order.includes(key))
    return [...order, ...rest]
  }, [data, theme.platformOrder])

  const previewLinks = useMemo(() => {
    if (!data) return []
    return getOrderedSmartlinkLinks(data.platformLinks, activePlatformKeys)
  }, [activePlatformKeys, data])

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return data?.publicPath ?? null
    if (!slug.trim()) return null
    return `${window.location.origin}/s/${slug.trim()}`
  }, [data?.publicPath, slug])

  const patchTheme = <K extends keyof SmartlinkTheme>(key: K, value: SmartlinkTheme[K]) => {
    setTheme((prev) => ({ ...prev, [key]: value }))
  }

  const onAccentPick = (hex: string) => {
    const normalized = normalizeAccentHex(hex)
    if (!normalized) return
    setCustomAccent(normalized)
    patchTheme("accent", normalized)
  }

  const movePlatform = (from: PlatformLinkKey, to: PlatformLinkKey) => {
    if (from === to) return
    const next = [...activePlatformKeys]
    const fromIdx = next.indexOf(from)
    const toIdx = next.indexOf(to)
    if (fromIdx < 0 || toIdx < 0) return
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, from)
    patchTheme("platformOrder", next)
  }

  const onSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      const accent = normalizeAccentHex(customAccent) ?? theme.accent
      const res = await fetch(`/api/cabinet/smartlink/${releaseKey}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ensureSlug: true,
          smartlinkSlug: slug.trim() || undefined,
          theme: {
            ...theme,
            accent,
            platformOrder: activePlatformKeys,
          },
        }),
      })
      const json = (await res.json()) as SmartlinkApiPayload & { error?: string }
      if (!res.ok) {
        toast.error(json.error || "Не удалось сохранить")
        return
      }
      setData(json)
      setTheme(parseSmartlinkTheme(json.theme))
      setSlug(json.smartlinkSlug ?? "")
      setCustomAccent(json.theme.accent)
      toast.success("Смартлинк сохранён")
    } catch {
      toast.error("Не удалось сохранить")
    } finally {
      setSaving(false)
    }
  }

  const onCopy = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success("Ссылка скопирована")
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Не удалось скопировать")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <p className="text-muted-foreground">Релиз не найден</p>
        <Button asChild variant="outline">
          <Link href="/cabinet/distribution/music">К списку релизов</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3 min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href={`/cabinet/distribution/music/${releaseKey}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              К релизу
            </Link>
          </Button>
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Смартлинк</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.title}</h1>
            <p className="mt-1 text-muted-foreground">{data.artist}</p>
          </div>
        </div>
        <Button onClick={() => void onSave()} disabled={saving} className="shrink-0">
          {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          Сохранить
        </Button>
      </div>

      {!data.isPublic ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Публичная страница откроется после релиза и появления обложки. Оформление и slug можно
          настроить заранее.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6 rounded-2xl border border-border bg-card/40 p-4 sm:p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Адрес ссылки</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smartlink-slug">Slug</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
                  <span className="shrink-0 text-sm text-muted-foreground">/s/</span>
                  <Input
                    id="smartlink-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder="my-release"
                    className="border-0 px-0 shadow-none focus-visible:ring-0"
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => void onCopy()} disabled={!publicUrl}>
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  {publicUrl ? (
                    <Button type="button" variant="outline" size="icon" asChild>
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Открыть">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">6-20 символов: латиница, цифры, _ или -</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Стиль</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SMARTLINK_PRESETS.map((preset) => {
                const meta = SMARTLINK_PRESET_META[preset]
                const active = theme.preset === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => patchTheme("preset", preset as SmartlinkPreset)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <p className="font-medium">{meta.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Акцент</h2>
            <div className="flex flex-wrap items-center gap-2">
              {SMARTLINK_ACCENT_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Цвет ${hex}`}
                  onClick={() => onAccentPick(hex)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-transform hover:scale-105",
                    theme.accent.toUpperCase() === hex ? "border-primary scale-105" : "border-transparent",
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={customAccent}
                  onChange={(e) => {
                    const value = e.target.value
                    setCustomAccent(value)
                    const normalized = normalizeAccentHex(value)
                    if (normalized) patchTheme("accent", normalized)
                  }}
                  className="w-[110px] font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Кнопки</Label>
              <Segmented
                value={theme.buttons}
                options={SMARTLINK_BUTTON_STYLES}
                labels={BUTTON_LABELS}
                onChange={(next) => patchTheme("buttons", next)}
              />
            </div>
            <div className="space-y-2">
              <Label>Обложка</Label>
              <Segmented
                value={theme.cover}
                options={SMARTLINK_COVER_SHAPES}
                labels={COVER_LABELS}
                onChange={(next) => patchTheme("cover", next)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="font-semibold">Площадки</h2>
              <p className="text-xs text-muted-foreground">
                Порядок кнопок на странице. Ссылки добавляет лейбл после выхода релиза.
              </p>
            </div>
            {activePlatformKeys.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Пока нет ссылок на площадки - в превью будет заглушка.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {activePlatformKeys.map((key) => {
                  const platform = SMARTLINK_PLATFORMS.find((p) => p.key === key)
                  if (!platform) return null
                  return (
                    <li
                      key={key}
                      draggable
                      onDragStart={() => setDragKey(key)}
                      onDragEnd={() => setDragKey(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragKey) movePlatform(dragKey, key)
                        setDragKey(null)
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2",
                        dragKey === key && "opacity-60",
                      )}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={PLATFORM_ICON_SRC[key]}
                        alt=""
                        className="h-6 w-6 rounded-[22%] object-contain"
                      />
                      <span className="text-sm font-medium">{platform.label}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-[2rem] border border-border bg-black shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-center gap-1 border-b border-white/10 py-2">
              <span className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>
            <div className="max-h-[640px] overflow-y-auto">
              {data.coverUrl ? (
                <SmartlinkLanding
                  title={data.title}
                  artist={data.artist}
                  coverUrl={data.coverUrl}
                  links={previewLinks}
                  theme={{ ...theme, accent: normalizeAccentHex(customAccent) ?? theme.accent }}
                  preview
                />
              ) : (
                <div className="flex min-h-[520px] items-center justify-center bg-[#111] px-6 text-center text-sm text-white/60">
                  Нужна обложка, чтобы показать превью
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Превью как на телефоне</p>
        </aside>
      </div>
    </div>
  )
}
