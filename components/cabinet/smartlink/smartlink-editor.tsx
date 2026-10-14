"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { SmartlinkLanding } from "@/components/smartlink/smartlink-landing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  DEFAULT_SMARTLINK_THEME,
  SMARTLINK_ACCENT_SWATCHES,
  SMARTLINK_ANIMATION_META,
  SMARTLINK_ANIMATIONS,
  SMARTLINK_BUTTON_STYLES,
  SMARTLINK_COVER_SHAPES,
  SMARTLINK_FONTS,
  SMARTLINK_FONT_META,
  SMARTLINK_PRESET_META,
  SMARTLINK_PRESETS,
  getOrderedSmartlinkLinks,
  normalizeAccentHex,
  parseSmartlinkTheme,
  type SmartlinkAnimation,
  type SmartlinkButtonStyle,
  type SmartlinkCoverShape,
  type SmartlinkExtraLink,
  type SmartlinkFont,
  type SmartlinkPreset,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"
import {
  PLATFORM_ICON_SRC,
  SMARTLINK_PLATFORMS,
  normalizePlatformLinks,
  platformLabel,
  type PlatformLinkKey,
  type PlatformLinks,
} from "@/lib/smartlink-platforms"
import {
  DEFAULT_SMARTLINK_SOCIALS,
  SOCIAL_ICON_SRC,
  SMARTLINK_SOCIALS,
  SMARTLINK_SOCIAL_ICON_STYLES,
  type SmartlinkSocialIconStyle,
  type SmartlinkSocialItem,
  type SmartlinkSocialKey,
  type SmartlinkSocialPosition,
} from "@/lib/smartlink-socials"
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
  glass: "Glass",
}

const COVER_LABELS: Record<SmartlinkCoverShape, string> = {
  rounded: "Скругл.",
  soft: "Мягкие",
  square: "Квадрат",
}

const SOCIAL_STYLE_LABELS: Record<SmartlinkSocialIconStyle, string> = {
  glass: "Glass",
  flat: "Flat",
  bare: "Без обёртки",
}

function Segmented<T extends string>({
  value,
  options,
  labels,
  onChange,
  cols,
}: {
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (next: T) => void
  cols?: number
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols ?? Math.min(options.length, 4)}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-md border px-1.5 py-1.5 text-[11px] font-medium leading-tight transition-colors",
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-2.5 py-2 text-left text-xs"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "left-4" : "left-0.5",
          )}
        />
      </span>
    </button>
  )
}

function EditorSection({
  title,
  defaultOpen = true,
  children,
  trailing,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
  trailing?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-xl border border-border/80 bg-card/30">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium"
        >
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
          />
          <span className="truncate">{title}</span>
        </button>
        {trailing}
      </div>
      {open ? <div className="space-y-3 p-3">{children}</div> : null}
    </section>
  )
}

export function SmartlinkEditor({ releaseKey }: { releaseKey: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<SmartlinkApiPayload | null>(null)
  const [theme, setTheme] = useState<SmartlinkTheme>(DEFAULT_SMARTLINK_THEME)
  const [platformLinks, setPlatformLinks] = useState<PlatformLinks>({})
  const [slug, setSlug] = useState("")
  const [customAccent, setCustomAccent] = useState(DEFAULT_SMARTLINK_THEME.accent)
  const [copied, setCopied] = useState(false)
  const [dragKey, setDragKey] = useState<PlatformLinkKey | null>(null)
  const [addPlatformOpen, setAddPlatformOpen] = useState(false)
  const [addSocialOpen, setAddSocialOpen] = useState(false)

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
      setPlatformLinks(normalizePlatformLinks(json.platformLinks))
      setSlug(json.smartlinkSlug ?? "")
    } finally {
      setLoading(false)
    }
  }, [releaseKey])

  useEffect(() => {
    void load()
  }, [load])

  const socials = theme.socials ?? { ...DEFAULT_SMARTLINK_SOCIALS, items: [] }

  const activePlatformKeys = useMemo(() => {
    const present = SMARTLINK_PLATFORMS.filter((p) => Boolean(platformLinks[p.key]?.trim())).map(
      (p) => p.key,
    )
    const order = theme.platformOrder?.filter((key) => present.includes(key)) ?? []
    const rest = present.filter((key) => !order.includes(key))
    return [...order, ...rest]
  }, [platformLinks, theme.platformOrder])

  const availableToAdd = useMemo(
    () => SMARTLINK_PLATFORMS.filter((p) => !platformLinks[p.key]?.trim()),
    [platformLinks],
  )

  const availableSocials = useMemo(
    () => SMARTLINK_SOCIALS.filter((s) => !socials.items.some((i) => i.network === s.key)),
    [socials.items],
  )

  const previewTheme = useMemo(() => {
    const accent = normalizeAccentHex(customAccent) ?? theme.accent
    return parseSmartlinkTheme({
      ...theme,
      accent,
      platformOrder: activePlatformKeys,
    })
  }, [activePlatformKeys, customAccent, theme])

  const previewLinks = useMemo(
    () => getOrderedSmartlinkLinks(platformLinks, previewTheme),
    [platformLinks, previewTheme],
  )

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return data?.publicPath ?? null
    if (!slug.trim()) return null
    return `${window.location.origin}/s/${slug.trim()}`
  }, [data?.publicPath, slug])

  const patchTheme = <K extends keyof SmartlinkTheme>(key: K, value: SmartlinkTheme[K]) => {
    setTheme((prev) => ({ ...prev, [key]: value }))
  }

  const patchSocials = (partial: Partial<typeof socials>) => {
    setTheme((prev) => ({
      ...prev,
      socials: { ...(prev.socials ?? { ...DEFAULT_SMARTLINK_SOCIALS, items: [] }), ...partial },
    }))
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

  const addPlatform = (key: PlatformLinkKey) => {
    setPlatformLinks((prev) => ({ ...prev, [key]: prev[key] || "https://" }))
    patchTheme("platformOrder", [...activePlatformKeys, key])
    setAddPlatformOpen(false)
  }

  const removePlatform = (key: PlatformLinkKey) => {
    setPlatformLinks((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    patchTheme(
      "platformOrder",
      activePlatformKeys.filter((k) => k !== key),
    )
  }

  const addSocial = (network: SmartlinkSocialKey) => {
    const items: SmartlinkSocialItem[] = [...socials.items, { network, url: "https://" }]
    patchSocials({ enabled: true, items })
    setAddSocialOpen(false)
  }

  const updateSocialUrl = (network: SmartlinkSocialKey, url: string) => {
    patchSocials({
      items: socials.items.map((item) => (item.network === network ? { ...item, url } : item)),
    })
  }

  const removeSocial = (network: SmartlinkSocialKey) => {
    patchSocials({ items: socials.items.filter((item) => item.network !== network) })
  }

  const addExtraLink = () => {
    const extra: SmartlinkExtraLink = {
      id: crypto.randomUUID().slice(0, 8),
      label: "Ссылка",
      url: "https://",
    }
    patchTheme("extraLinks", [...(theme.extraLinks ?? []), extra])
  }

  const updateExtraLink = (id: string, partial: Partial<SmartlinkExtraLink>) => {
    patchTheme(
      "extraLinks",
      (theme.extraLinks ?? []).map((item) => (item.id === id ? { ...item, ...partial } : item)),
    )
  }

  const removeExtraLink = (id: string) => {
    patchTheme(
      "extraLinks",
      (theme.extraLinks ?? []).filter((item) => item.id !== id),
    )
  }

  const onSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      const accent = normalizeAccentHex(customAccent) ?? theme.accent
      const cleanedLinks = normalizePlatformLinks(
        Object.fromEntries(
          Object.entries(platformLinks).filter(([, url]) => {
            const t = (url ?? "").trim()
            return t.length > 0 && t !== "https://" && t !== "http://"
          }),
        ) as PlatformLinks,
      )
      const res = await fetch(`/api/cabinet/smartlink/${releaseKey}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ensureSlug: true,
          smartlinkSlug: slug.trim() || undefined,
          platformLinks: cleanedLinks,
          theme: {
            ...theme,
            accent,
            platformOrder: activePlatformKeys,
            socials: {
              ...socials,
              items: socials.items.filter((i) => i.url.trim() && i.url !== "https://"),
            },
            extraLinks: (theme.extraLinks ?? []).filter(
              (i) => i.label.trim() && i.url.trim() && i.url !== "https://",
            ),
          },
        }),
      })
      const json = (await res.json()) as SmartlinkApiPayload & { error?: string }
      if (!res.ok) {
        toast.error(json.error || "Не удалось сохранить")
        return
      }
      setData(json)
      const nextTheme = parseSmartlinkTheme(json.theme)
      setTheme(nextTheme)
      setPlatformLinks(normalizePlatformLinks(json.platformLinks))
      setSlug(json.smartlinkSlug ?? "")
      setCustomAccent(nextTheme.accent)
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
    <div className="w-full max-w-none space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2 h-8">
            <Link href={`/cabinet/distribution/music/${releaseKey}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              К релизу
            </Link>
          </Button>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Смартлинк</p>
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{data.title}</h1>
            <p className="truncate text-sm text-muted-foreground">{data.artist}</p>
          </div>
        </div>
        <Button onClick={() => void onSave()} disabled={saving} className="shrink-0">
          {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          Сохранить
        </Button>
      </div>

      {!data.isPublic ? (
        <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          Публичная страница откроется после релиза и обложки. Оформление можно настроить заранее.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <EditorSection title="Адрес">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-2">
                <span className="shrink-0 text-xs text-muted-foreground">/s/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                  placeholder="my-release"
                  className="h-8 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                  maxLength={20}
                />
              </div>
              <div className="flex gap-1.5">
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => void onCopy()} disabled={!publicUrl}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                {publicUrl ? (
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </EditorSection>

          <EditorSection title="Площадки">
            <div className="space-y-1.5">
              {activePlatformKeys.map((key) => (
                <div
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
                    "flex items-center gap-1.5 rounded-md border border-border bg-background/70 p-1.5",
                    dragKey === key && "opacity-50",
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={PLATFORM_ICON_SRC[key]} alt="" className="h-5 w-5 rounded-[20%] object-contain" />
                  <div className="min-w-0 flex-1 space-y-1">
                    {key === "other" ? (
                      <Input
                        value={theme.otherLabel ?? ""}
                        onChange={(e) => patchTheme("otherLabel", e.target.value.slice(0, 40))}
                        placeholder="Название"
                        className="h-7 text-xs"
                      />
                    ) : (
                      <p className="truncate px-1 text-[11px] font-medium">{platformLabel(key)}</p>
                    )}
                    <Input
                      value={platformLinks[key] ?? ""}
                      onChange={(e) =>
                        setPlatformLinks((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder="https://"
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removePlatform(key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full justify-start gap-1.5 text-xs"
                onClick={() => setAddPlatformOpen((v) => !v)}
                disabled={availableToAdd.length === 0}
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить площадку
              </Button>
              {addPlatformOpen ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                  {availableToAdd.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => addPlatform(p.key)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={PLATFORM_ICON_SRC[p.key]} alt="" className="h-5 w-5 rounded-[20%] object-contain" />
                      {p.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Доп. ссылки с произвольным названием</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addExtraLink}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Ещё
                </Button>
              </div>
              {(theme.extraLinks ?? []).map((item) => (
                <div key={item.id} className="flex items-start gap-1.5 rounded-md border border-border p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={PLATFORM_ICON_SRC.other} alt="" className="mt-1 h-5 w-5" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input
                      value={item.label}
                      onChange={(e) => updateExtraLink(item.id, { label: e.target.value.slice(0, 40) })}
                      className="h-7 text-xs"
                      placeholder="Название"
                    />
                    <Input
                      value={item.url}
                      onChange={(e) => updateExtraLink(item.id, { url: e.target.value })}
                      className="h-7 font-mono text-xs"
                      placeholder="https://"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExtraLink(item.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </EditorSection>

          <EditorSection
            title="Соцсети"
            trailing={
              <button
                type="button"
                role="switch"
                aria-checked={socials.enabled}
                onClick={() => patchSocials({ enabled: !socials.enabled })}
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  socials.enabled ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                    socials.enabled ? "left-4" : "left-0.5",
                  )}
                />
              </button>
            }
          >
            {socials.enabled ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Где на странице</Label>
                  <Segmented
                    value={socials.position}
                    options={["above", "below"] as const}
                    labels={{ above: "Над обложкой", below: "Под обложкой" }}
                    onChange={(next) => patchSocials({ position: next as SmartlinkSocialPosition })}
                    cols={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Вид иконок</Label>
                  <Segmented
                    value={socials.iconStyle}
                    options={SMARTLINK_SOCIAL_ICON_STYLES}
                    labels={SOCIAL_STYLE_LABELS}
                    onChange={(next) => patchSocials({ iconStyle: next })}
                    cols={3}
                  />
                </div>
                <div className="space-y-1.5">
                  {socials.items.map((item) => {
                    const meta = SMARTLINK_SOCIALS.find((s) => s.key === item.network)
                    return (
                      <div key={item.network} className="flex items-center gap-1.5 rounded-md border border-border p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={SOCIAL_ICON_SRC[item.network]} alt="" className="h-5 w-5 rounded-md" />
                        <Input
                          value={item.url}
                          onChange={(e) => updateSocialUrl(item.network, e.target.value)}
                          placeholder={`Ссылка · ${meta?.label ?? item.network}`}
                          className="h-7 font-mono text-xs"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSocial(item.network)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full justify-start gap-1.5 text-xs"
                    onClick={() => setAddSocialOpen((v) => !v)}
                    disabled={availableSocials.length === 0}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Добавить соцсеть
                  </Button>
                  {addSocialOpen ? (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg">
                      {availableSocials.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => addSocial(s.key)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={SOCIAL_ICON_SRC[s.key]} alt="" className="h-5 w-5 rounded-md" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Включите, чтобы добавить Telegram, TikTok и другие сети.</p>
            )}
          </EditorSection>

          <EditorSection title="Стиль">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
              {SMARTLINK_PRESETS.map((preset) => {
                const meta = SMARTLINK_PRESET_META[preset]
                const active = theme.preset === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => patchTheme("preset", preset as SmartlinkPreset)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-left transition-colors",
                      active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                    )}
                  >
                    <p className="text-xs font-medium">{meta.label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{meta.description}</p>
                  </button>
                )
              })}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Акцент</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {SMARTLINK_ACCENT_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Цвет ${hex}`}
                    onClick={() => onAccentPick(hex)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2",
                      theme.accent.toUpperCase() === hex ? "border-primary" : "border-transparent",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <Input
                  value={customAccent}
                  onChange={(e) => {
                    const value = e.target.value
                    setCustomAccent(value)
                    const normalized = normalizeAccentHex(value)
                    if (normalized) patchTheme("accent", normalized)
                  }}
                  className="h-7 w-[96px] font-mono text-xs"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Кнопки</Label>
                <Segmented
                  value={theme.buttons}
                  options={SMARTLINK_BUTTON_STYLES}
                  labels={BUTTON_LABELS}
                  onChange={(next) => patchTheme("buttons", next)}
                  cols={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Обложка</Label>
                <Segmented
                  value={theme.cover}
                  options={SMARTLINK_COVER_SHAPES}
                  labels={COVER_LABELS}
                  onChange={(next) => patchTheme("cover", next)}
                  cols={3}
                />
              </div>
            </div>

            <div className="grid gap-1.5 sm:grid-cols-3">
              <Toggle
                checked={theme.buttonBorder}
                onChange={(next) => patchTheme("buttonBorder", next)}
                label="Обводка кнопок"
              />
              <Toggle
                checked={theme.buttonShadow}
                onChange={(next) => patchTheme("buttonShadow", next)}
                label="Тень кнопок"
              />
              <Toggle
                checked={theme.coverShadow}
                onChange={(next) => patchTheme("coverShadow", next)}
                label="Тень обложки"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Шрифт</Label>
              <Segmented
                value={theme.font}
                options={SMARTLINK_FONTS}
                labels={{
                  sans: SMARTLINK_FONT_META.sans.label,
                  rounded: SMARTLINK_FONT_META.rounded.label,
                  serif: SMARTLINK_FONT_META.serif.label,
                  mono: SMARTLINK_FONT_META.mono.label,
                }}
                onChange={(next) => patchTheme("font", next as SmartlinkFont)}
                cols={4}
              />
              <p className="text-[10px] text-muted-foreground">Только системные шрифты устройства - без внешних загрузок.</p>
            </div>
          </EditorSection>

          <EditorSection title="Анимация появления" defaultOpen={false}>
            <div className="flex flex-wrap gap-1">
              {SMARTLINK_ANIMATIONS.map((anim) => {
                const meta = SMARTLINK_ANIMATION_META[anim]
                const active = theme.animation === anim
                return (
                  <button
                    key={anim}
                    type="button"
                    onClick={() => patchTheme("animation", anim as SmartlinkAnimation)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      active
                        ? "border-transparent bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {SMARTLINK_ANIMATION_META[theme.animation].description}. Только в браузере, сервер не грузит.
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <Label className="text-[11px]">Скорость</Label>
                <span className="text-muted-foreground">{theme.animationSpeed}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={140}
                step={5}
                value={theme.animationSpeed}
                onChange={(e) => patchTheme("animationSpeed", Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
                disabled={theme.animation === "none"}
              />
            </div>
          </EditorSection>
        </div>

        <aside className="xl:sticky xl:top-3 xl:self-start">
          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-black shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-center border-b border-white/10 py-1.5">
              <span className="h-1.5 w-10 rounded-full bg-white/20" />
            </div>
            <div className="max-h-[620px] overflow-y-auto">
              {data.coverUrl ? (
                <SmartlinkLanding
                  key={`${previewTheme.animation}-${previewTheme.animationSpeed}-${previewTheme.preset}`}
                  title={data.title}
                  artist={data.artist}
                  coverUrl={data.coverUrl}
                  links={previewLinks}
                  theme={previewTheme}
                  preview
                />
              ) : (
                <div className="flex min-h-[480px] items-center justify-center bg-[#111] px-6 text-center text-sm text-white/60">
                  Нужна обложка для превью
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Превью · анимация перезапускается при смене</p>
        </aside>
      </div>
    </div>
  )
}
