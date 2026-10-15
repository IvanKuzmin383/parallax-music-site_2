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
  SMARTLINK_ANIM_SPEED_MAX,
  SMARTLINK_ANIM_SPEED_MIN,
  SMARTLINK_BUTTON_STYLES,
  SMARTLINK_COVER_SHAPES,
  SMARTLINK_FONTS,
  SMARTLINK_FONT_META,
  SMARTLINK_PLATFORM_LAYOUTS,
  SMARTLINK_PLATFORM_LAYOUT_META,
  SMARTLINK_PRESET_BASE,
  SMARTLINK_PRESET_LOOK,
  SMARTLINK_PRESET_META,
  SMARTLINK_PRESET_SIGNATURE,
  SMARTLINK_PREVIEW_AUDIO_DURATION_SEC,
  SMARTLINK_PREVIEW_AUDIO_START_MAX,
  getOrderedSmartlinkLinks,
  normalizeAccentHex,
  parseSmartlinkTheme,
  type SmartlinkAnimation,
  type SmartlinkButtonStyle,
  type SmartlinkCoverShape,
  type SmartlinkExtraLink,
  type SmartlinkFont,
  type SmartlinkPlatformLayout,
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
  smartlinkPublic?: boolean
  canEnablePromo?: boolean
  defaultPreviewStartSec?: number
}

const BUTTON_LABELS: Record<SmartlinkButtonStyle, string> = {
  solid: "Плотные",
  outline: "Контур",
  soft: "Приглушённые",
  glass: "Матовые",
  bare: "Без фона",
}

const COVER_LABELS: Record<SmartlinkCoverShape, string> = {
  rounded: "Скругление",
  soft: "Мягкие",
  square: "Квадрат",
}

const SOCIAL_STYLE_LABELS: Record<SmartlinkSocialIconStyle, string> = {
  glass: "Матовые",
  flat: "Плитки",
  bare: "Без фона",
}

function PresetSwatch({ preset, accent }: { preset: SmartlinkPreset; accent: string }) {
  const base = "relative h-7 w-full overflow-hidden rounded-md border border-white/10"
  if (preset === "sheet" || preset === "ticket") {
    return (
      <div className={cn(base, "bg-[#F3EFE6] p-1")}>
        <div
          className={cn(
            "h-full w-full",
            preset === "ticket" ? "rounded-sm border border-dashed border-black/30" : "rounded-full",
          )}
          style={{ backgroundColor: accent }}
        />
      </div>
    )
  }
  if (preset === "neon") {
    return (
      <div className={cn(base, "bg-[#0B0B0C] p-1")}>
        <div
          className="h-full w-full rounded-full border bg-transparent"
          style={{
            borderColor: accent,
            boxShadow: `0 0 8px ${accent}`,
          }}
        />
      </div>
    )
  }
  if (preset === "vinyl" || preset === "grid" || preset === "rave") {
    return (
      <div className={cn(base, "flex items-center justify-center gap-0.5 bg-[#111] p-1")}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-3 border border-white/25",
              preset === "vinyl" ? "rounded-full" : "rounded-sm",
            )}
            style={{
              backgroundColor: i === 1 ? accent : "rgba(255,255,255,0.12)",
              boxShadow: preset === "rave" && i === 1 ? `0 0 6px ${accent}` : undefined,
            }}
          />
        ))}
      </div>
    )
  }
  if (preset === "cassette") {
    return (
      <div className={cn(base, "flex items-center justify-center gap-1 bg-[#2a2a30] p-1")}>
        <span className="h-3 w-3 rounded-full border border-white/20 bg-[#111]" />
        <span className="h-4 w-5 rounded-sm" style={{ backgroundColor: accent }} />
        <span className="h-3 w-3 rounded-full border border-white/20 bg-[#111]" />
      </div>
    )
  }
  if (preset === "graffiti") {
    return (
      <div className={cn(base, "bg-[#111] p-1")}>
        <div
          className="h-full w-full -rotate-2 rounded-sm border-2 border-black"
          style={{ backgroundColor: accent, boxShadow: "2px 2px 0 #000" }}
        />
      </div>
    )
  }
  if (preset === "stage") {
    return (
      <div className={cn(base, "bg-[#0B0B0C] p-1")}>
        <div
          className="h-full w-full rounded-sm border"
          style={{
            borderColor: `color-mix(in srgb, ${accent} 60%, #888)`,
            background: `linear-gradient(180deg, rgba(255,255,255,0.12), transparent), #161618`,
          }}
        />
      </div>
    )
  }
  if (preset === "polaroid") {
    return (
      <div className={cn(base, "bg-[#1a1714] p-1")}>
        <div className="flex h-full w-full flex-col bg-[#f7f4ee] p-0.5">
          <div className="min-h-0 flex-1" style={{ backgroundColor: accent }} />
          <div className="mt-0.5 h-1 bg-[#e8e4dc]" />
        </div>
      </div>
    )
  }
  if (preset === "arcade") {
    return (
      <div className={cn(base, "bg-[#0a0a12] p-1")}>
        <div
          className="h-full w-full border-2 border-black"
          style={{ backgroundColor: accent, boxShadow: "2px 2px 0 #111" }}
        />
      </div>
    )
  }
  if (preset === "vhs") {
    return (
      <div className={cn(base, "bg-[#050814] p-1")}>
        <div className="relative h-full w-full bg-[#0a1430]">
          <div className="absolute inset-x-0 top-1/3 h-px bg-cyan-400/40" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-cyan-400/25" />
          <span className="absolute left-0.5 top-0.5 text-[6px] text-cyan-200">▶</span>
        </div>
      </div>
    )
  }
  if (preset === "zine") {
    return (
      <div className={cn(base, "bg-[#ebe6dc] p-1")}>
        <div
          className="h-full w-full -rotate-2 border-2 border-black"
          style={{ backgroundColor: accent, boxShadow: "2px 2px 0 #111" }}
        />
      </div>
    )
  }
  if (preset === "chrome") {
    return (
      <div className={cn(base, "bg-[#1a1a22] p-1")}>
        <div
          className="h-full w-full rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(145deg, #f5f5f5 0%, #b8b8c0 35%, #7a7a86 60%, #d8d8e0 100%)",
          }}
        />
      </div>
    )
  }
  if (preset === "noir") {
    return (
      <div className={cn(base, "flex bg-[#050505] p-1")}>
        <div className="w-0.5 shrink-0" style={{ backgroundColor: accent }} />
        <div className="ml-1 h-full flex-1 bg-white/15" />
      </div>
    )
  }
  if (preset === "orbit") {
    return (
      <div className={cn(base, "relative bg-[#0B0B0C]")}>
        <span
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: accent }}
        />
        {[0, 1, 2, 3].map((i) => {
          const a = ((i / 4) * 360 - 90) * (Math.PI / 180)
          return (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50"
              style={{
                left: `${50 + 32 * Math.cos(a)}%`,
                top: `${50 + 32 * Math.sin(a)}%`,
              }}
            />
          )
        })}
      </div>
    )
  }
  if (preset === "stamp") {
    return (
      <div className={cn(base, "bg-[#101012] p-1")}>
        <div
          className="h-full w-full rotate-1 border-2 border-dashed"
          style={{ borderColor: accent, backgroundColor: "rgba(255,255,255,0.06)" }}
        />
      </div>
    )
  }
  if (preset === "holo") {
    return (
      <div className={cn(base, "bg-[#0B0B0C] p-1")}>
        <div
          className="h-full w-full rounded-full"
          style={{
            backgroundImage: `linear-gradient(120deg, ${accent}, #7dd3fc, ${accent})`,
            opacity: 0.85,
          }}
        />
      </div>
    )
  }
  if (preset === "diary") {
    return (
      <div
        className={cn(base, "bg-[#f4efe4] p-1")}
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent 0 5px, rgba(80,120,180,0.25) 5px 6px)",
        }}
      >
        <div className="h-full w-full border border-black/10 bg-white/50" />
      </div>
    )
  }
  if (preset === "sunset") {
    return (
      <div className={cn(base, "bg-[#0B0B0C] p-1")}>
        <div
          className="h-full w-full rounded-full"
          style={{ backgroundImage: `linear-gradient(135deg, ${accent}, #0a0a0a)` }}
        />
      </div>
    )
  }
  if (preset === "terminal") {
    return (
      <div className={cn(base, "flex items-center bg-[#0B0B0C] px-1.5 font-mono text-[9px] text-white/70")}>
        &gt; listen
      </div>
    )
  }
  if (preset === "poster") {
    return (
      <div className={cn(base, "bg-[#111]")}>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute bottom-0.5 left-1 text-[8px] font-bold text-white">TITLE</div>
      </div>
    )
  }
  if (preset === "carbon") {
    return (
      <div
        className={cn(base, "p-1")}
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 6px), #121214",
        }}
      >
        <div className="h-full w-full rounded-sm bg-white/10" />
      </div>
    )
  }
  if (preset === "cinema") {
    return (
      <div className={cn(base, "bg-[#0B0B0C]")}>
        <div className="absolute inset-x-0 top-0 h-1 bg-black" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black" />
        <div className="absolute inset-x-2 top-1/2 h-2 -translate-y-1/2" style={{ backgroundColor: accent }} />
      </div>
    )
  }
  if (preset === "blur" || preset === "glass" || preset === "film") {
    return (
      <div className={cn(base, "bg-[#1a1a1e] p-1")}>
        <div
          className="h-full w-full rounded-full opacity-80"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 40%, rgba(255,255,255,0.2))`,
          }}
        />
      </div>
    )
  }
  return (
    <div className={cn(base, "bg-[#0B0B0C] p-1")}>
      <div
        className={cn(
          "h-full w-full",
          preset === "capsule" ? "rounded-full" : preset === "inkblot" ? "rounded-[40%]" : "rounded-sm",
        )}
        style={{ backgroundColor: accent }}
      />
    </div>
  )
}

function PresetPickButton({
  preset,
  accent,
  active,
  onPick,
}: {
  preset: SmartlinkPreset
  accent: string
  active: boolean
  onPick: () => void
}) {
  const meta = SMARTLINK_PRESET_META[preset]
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        "relative rounded-lg border p-1.5 text-left transition-all",
        active
          ? "border-primary bg-primary/20 shadow-[0_0_0_2px_var(--primary)]"
          : "border-border/80 bg-card/20 hover:border-primary/50 hover:bg-card/40",
      )}
    >
      {active ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          ✓
        </span>
      ) : null}
      <PresetSwatch preset={preset} accent={accent} />
      <p
        className={cn(
          "mt-1 truncate text-xs font-semibold leading-tight",
          active ? "text-primary" : "text-foreground",
        )}
      >
        {meta.label}
      </p>
    </button>
  )
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
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-lg border px-2.5 py-2 text-sm font-medium leading-snug whitespace-nowrap transition-colors",
            cols && cols >= 5 ? "px-2 text-[13px]" : null,
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
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "left-[1.35rem]" : "left-0.5",
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
    <section className="rounded-2xl border border-border/80 bg-card/30">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-base font-semibold"
        >
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
          />
          <span className="truncate">{title}</span>
        </button>
        {trailing}
      </div>
      {open ? <div className="space-y-4 p-4">{children}</div> : null}
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
  const [promoPublic, setPromoPublic] = useState(false)

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
      const parsedTheme = parseSmartlinkTheme(json.theme)
      const defaultStart =
        typeof json.defaultPreviewStartSec === "number" ? json.defaultPreviewStartSec : 0
      // Если хук ещё не настраивали - подставляем секунду из карточки релиза (TikTok)
      const nextTheme =
        !parsedTheme.previewAudioEnabled &&
        parsedTheme.previewAudioStartSec === 0 &&
        defaultStart > 0
          ? { ...parsedTheme, previewAudioStartSec: defaultStart }
          : parsedTheme
      setTheme(nextTheme)
      setCustomAccent(nextTheme.accent)
      setPlatformLinks(normalizePlatformLinks(json.platformLinks))
      setSlug(json.smartlinkSlug ?? "")
      setPromoPublic(Boolean(json.smartlinkPublic))
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

  const applyPreset = (preset: SmartlinkPreset) => {
    const look = SMARTLINK_PRESET_LOOK[preset]
    setTheme((prev) => ({ ...prev, preset, ...look }))
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
          smartlinkPublic: data.canEnablePromo ? promoPublic : undefined,
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
      setPromoPublic(Boolean(json.smartlinkPublic))
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
    <div className="flex w-full max-w-none flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="sticky top-0 z-30 -mx-1 shrink-0 space-y-2 border-b border-border/50 bg-background/95 px-1 pb-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 lg:static lg:border-0 lg:bg-transparent lg:pb-0 lg:backdrop-blur-none">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-sm">
          <Link href={`/cabinet/distribution/music/${releaseKey}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            К релизу
          </Link>
        </Button>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 truncate">
            <p className="truncate text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{data.artist}</span>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className="font-semibold text-foreground">{data.title}</span>
            </p>
          </div>

          <div className="flex min-w-0 max-w-[min(100%,22rem)] flex-[1.2] items-center gap-1.5 sm:max-w-none">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5">
              <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">/s/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="my-release"
                className="h-9 border-0 px-0 text-sm shadow-none focus-visible:ring-0 sm:text-base"
                maxLength={20}
                aria-label="Адрес смартлинка"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => void onCopy()}
              disabled={!publicUrl}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            {publicUrl ? (
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>

          <Button
            onClick={() => void onSave()}
            disabled={saving}
            size="default"
            className="h-9 shrink-0 px-3 text-sm sm:px-4"
          >
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Сохранить</span>
          </Button>
        </div>
      </div>

      {data.canEnablePromo ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/40 px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">Промо-смартлинк</p>
            <p className="text-xs text-muted-foreground">
              Открыть публичную страницу до официального релиза (модерация / площадки). Нужна обложка.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={promoPublic}
            aria-label="Включить промо-смартлинк"
            onClick={() => setPromoPublic((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              promoPublic ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform",
                promoPublic ? "left-[1.35rem]" : "left-0.5"
              )}
            />
          </button>
        </div>
      ) : null}

      {!data.isPublic ? (
        <p className="shrink-0 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950 dark:text-amber-100">
          {data.canEnablePromo
            ? "Включите «Промо-смартлинк» и сохраните - страница станет доступна по ссылке (нужна обложка)."
            : "Публичная страница откроется после релиза и обложки. Оформление можно настроить заранее."}
        </p>
      ) : (
        <p className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-950 dark:text-emerald-100">
          Публичная страница активна
          {data.smartlinkPublic && data.status !== "released" ? " (промо)" : ""}.
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
        <div className="min-h-0 space-y-4 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          <EditorSection title="Стиль">
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Базовые
                </p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {SMARTLINK_PRESET_BASE.map((preset) => (
                    <PresetPickButton
                      key={preset}
                      preset={preset}
                      accent={theme.accent}
                      active={theme.preset === preset}
                      onPick={() => applyPreset(preset)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Характер
                </p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
                  {SMARTLINK_PRESET_SIGNATURE.map((preset) => (
                    <PresetPickButton
                      key={preset}
                      preset={preset}
                      accent={theme.accent}
                      active={theme.preset === preset}
                      onPick={() => applyPreset(preset)}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {SMARTLINK_PRESET_META[theme.preset].description}
              </p>
              <div className="space-y-2">
                <Label className="text-sm">Акцент</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {SMARTLINK_ACCENT_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Цвет ${hex}`}
                      onClick={() => onAccentPick(hex)}
                      className={cn(
                        "h-9 w-9 rounded-full border-2",
                        theme.accent.toUpperCase() === hex ? "border-primary" : "border-transparent",
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                  <label
                    className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-border shadow-inner"
                    title="Палитра цветов"
                    style={{
                      background:
                        "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-[3px] rounded-full border border-black/20"
                      style={{
                        backgroundColor: normalizeAccentHex(customAccent) ?? theme.accent,
                      }}
                    />
                    <input
                      type="color"
                      aria-label="Выбрать цвет на палитре"
                      value={(normalizeAccentHex(customAccent) ?? theme.accent).toLowerCase()}
                      onChange={(e) => onAccentPick(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <Input
                    value={customAccent}
                    onChange={(e) => {
                      const value = e.target.value
                      setCustomAccent(value)
                      const normalized = normalizeAccentHex(value)
                      if (normalized) patchTheme("accent", normalized)
                    }}
                    className="h-9 w-[110px] font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </EditorSection>

          <EditorSection title="Звук на странице" defaultOpen={false}>
            <Toggle
              checked={theme.previewAudioEnabled}
              onChange={(next) => {
                setTheme((prev) => {
                  const defaultStart =
                    typeof data?.defaultPreviewStartSec === "number"
                      ? data.defaultPreviewStartSec
                      : 0
                  return {
                    ...prev,
                    previewAudioEnabled: next,
                    previewAudioStartSec:
                      next && prev.previewAudioStartSec === 0 && defaultStart > 0
                        ? defaultStart
                        : prev.previewAudioStartSec,
                  }
                })
              }}
              label="Проигрывать хук при открытии"
            />
            {theme.previewAudioEnabled ? (
              <div className="space-y-2">
                <Label className="text-sm" htmlFor="smartlink-preview-start">
                  Начало хука, сек
                </Label>
                <Input
                  id="smartlink-preview-start"
                  type="number"
                  min={0}
                  max={SMARTLINK_PREVIEW_AUDIO_START_MAX}
                  step={1}
                  value={theme.previewAudioStartSec}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === "") {
                      patchTheme("previewAudioStartSec", 0)
                      return
                    }
                    const n = Math.trunc(Number(raw))
                    if (!Number.isFinite(n)) return
                    patchTheme(
                      "previewAudioStartSec",
                      Math.min(SMARTLINK_PREVIEW_AUDIO_START_MAX, Math.max(0, n)),
                    )
                  }}
                  className="h-11 max-w-[160px] text-base"
                />
                <p className="text-sm text-muted-foreground">
                  На странице крутится короткий фрагмент ~{SMARTLINK_PREVIEW_AUDIO_DURATION_SEC} сек с
                  этой секунды (не весь трек). Звук включается сразу; если браузер запретит - кнопка
                  «Вкл. звук».
                  {typeof data?.defaultPreviewStartSec === "number" && data.defaultPreviewStartSec > 0
                    ? ` В релизе для TikTok указано: ${data.defaultPreviewStartSec} сек.`
                    : null}
                </p>
                {data && !data.isPublic ? (
                  <p className="text-sm text-amber-700 dark:text-amber-200">
                    Хук заработает на публичной странице после релиза.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                По умолчанию выключено - страница без автозвука и без нагрузки на сервер.
              </p>
            )}
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
                    "flex items-center gap-2 rounded-lg border border-border bg-background/70 px-2 py-1.5",
                    dragKey === key && "opacity-50",
                  )}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={PLATFORM_ICON_SRC[key]} alt="" className="h-6 w-6 shrink-0 rounded-[20%] object-contain" />
                  {key === "other" ? (
                    <Input
                      value={theme.otherLabel ?? ""}
                      onChange={(e) => patchTheme("otherLabel", e.target.value.slice(0, 40))}
                      placeholder="Название"
                      className="h-8 w-[7.5rem] shrink-0 text-sm"
                    />
                  ) : (
                    <span className="w-[7.5rem] shrink-0 truncate text-sm font-medium">
                      {platformLabel(key)}
                    </span>
                  )}
                  <Input
                    value={platformLinks[key] ?? ""}
                    onChange={(e) =>
                      setPlatformLinks((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder="https://"
                    className="h-8 min-w-0 flex-1 font-mono text-xs sm:text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removePlatform(key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-start gap-2 text-sm hover:!scale-100 hover:!shadow-none active:!scale-100"
                onClick={() => setAddPlatformOpen((v) => !v)}
                disabled={availableToAdd.length === 0}
              >
                <Plus className="h-4 w-4" />
                Добавить площадку
              </Button>
              {addPlatformOpen ? (
                <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                  {availableToAdd.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => addPlatform(p.key)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={PLATFORM_ICON_SRC[p.key]} alt="" className="h-6 w-6 rounded-[20%] object-contain" />
                      {p.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2.5 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Доп. ссылки с произвольным названием</p>
                <Button type="button" variant="ghost" size="sm" className="h-9 text-sm" onClick={addExtraLink}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ещё
                </Button>
              </div>
              {(theme.extraLinks ?? []).map((item) => (
                <div key={item.id} className="flex items-start gap-2.5 rounded-xl border border-border p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={PLATFORM_ICON_SRC.other} alt="" className="mt-1.5 h-7 w-7" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Input
                      value={item.label}
                      onChange={(e) => updateExtraLink(item.id, { label: e.target.value.slice(0, 40) })}
                      className="h-9 text-sm"
                      placeholder="Название"
                    />
                    <Input
                      value={item.url}
                      onChange={(e) => updateExtraLink(item.id, { url: e.target.value })}
                      className="h-10 font-mono text-sm"
                      placeholder="https://"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => removeExtraLink(item.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </EditorSection>

          <EditorSection
            title="Соцсети"
            defaultOpen={false}
            trailing={
              <button
                type="button"
                role="switch"
                aria-checked={socials.enabled}
                onClick={() => patchSocials({ enabled: !socials.enabled })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  socials.enabled ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    socials.enabled ? "left-[1.35rem]" : "left-0.5",
                  )}
                />
              </button>
            }
          >
            {socials.enabled ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Расположение</Label>
                  <Segmented
                    value={socials.position}
                    options={["above", "below"] as const}
                    labels={{ above: "Сверху", below: "Снизу" }}
                    onChange={(next) => patchSocials({ position: next as SmartlinkSocialPosition })}
                    cols={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Оформление значков</Label>
                  <Segmented
                    value={socials.iconStyle}
                    options={SMARTLINK_SOCIAL_ICON_STYLES}
                    labels={SOCIAL_STYLE_LABELS}
                    onChange={(next) => patchSocials({ iconStyle: next })}
                    cols={3}
                  />
                </div>
                <div className="space-y-2.5">
                  {socials.items.map((item) => {
                    const meta = SMARTLINK_SOCIALS.find((s) => s.key === item.network)
                    return (
                      <div key={item.network} className="flex items-center gap-2.5 rounded-xl border border-border p-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={SOCIAL_ICON_SRC[item.network]} alt="" className="h-7 w-7 rounded-md" />
                        <Input
                          value={item.url}
                          onChange={(e) => updateSocialUrl(item.network, e.target.value)}
                          placeholder={`Ссылка · ${meta?.label ?? item.network}`}
                          className="h-10 font-mono text-sm"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => removeSocial(item.network)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-start gap-2 text-sm hover:!scale-100 hover:!shadow-none active:!scale-100"
                    onClick={() => setAddSocialOpen((v) => !v)}
                    disabled={availableSocials.length === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Добавить соцсеть
                  </Button>
                  {addSocialOpen ? (
                    <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                      {availableSocials.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => addSocial(s.key)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={SOCIAL_ICON_SRC[s.key]} alt="" className="h-6 w-6 rounded-md" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Включите, чтобы добавить Telegram, TikTok и другие сети.</p>
            )}
          </EditorSection>

          <EditorSection title="Детали" defaultOpen={false}>
            <div className="space-y-2">
              <Label className="text-sm">Кнопки</Label>
              <Segmented
                value={theme.buttons}
                options={SMARTLINK_BUTTON_STYLES}
                labels={BUTTON_LABELS}
                onChange={(next) => patchTheme("buttons", next)}
                cols={5}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Обложка</Label>
              <Segmented
                value={theme.cover}
                options={SMARTLINK_COVER_SHAPES}
                labels={COVER_LABELS}
                onChange={(next) => patchTheme("cover", next)}
                cols={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Вид площадок</Label>
              <Segmented
                value={theme.platformLayout}
                options={SMARTLINK_PLATFORM_LAYOUTS}
                labels={{
                  list: SMARTLINK_PLATFORM_LAYOUT_META.list.label,
                  icons: SMARTLINK_PLATFORM_LAYOUT_META.icons.label,
                }}
                onChange={(next) => patchTheme("platformLayout", next as SmartlinkPlatformLayout)}
                cols={2}
              />
              {(theme.preset === "vinyl" ||
                theme.preset === "grid" ||
                theme.preset === "rave" ||
                theme.preset === "orbit") &&
              theme.platformLayout !== "icons" ? (
                <p className="text-xs text-muted-foreground">
                  Стиль «{SMARTLINK_PRESET_META[theme.preset].label}» лучше смотрится со значками
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle
                checked={theme.buttonBorder}
                onChange={(next) => patchTheme("buttonBorder", next)}
                label="Контур кнопок"
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

            <div className="space-y-2">
              <Label className="text-sm">Шрифт</Label>
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
            </div>
          </EditorSection>

          <EditorSection title="Анимация входа" defaultOpen={false}>
            <div className="flex flex-wrap gap-1.5">
              {SMARTLINK_ANIMATIONS.map((anim) => {
                const meta = SMARTLINK_ANIMATION_META[anim]
                const active = theme.animation === anim
                return (
                  <button
                    key={anim}
                    type="button"
                    onClick={() => patchTheme("animation", anim as SmartlinkAnimation)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label className="text-sm">Скорость</Label>
                <span className="text-muted-foreground">{theme.animationSpeed}%</span>
              </div>
              <input
                type="range"
                min={SMARTLINK_ANIM_SPEED_MIN}
                max={SMARTLINK_ANIM_SPEED_MAX}
                step={1}
                value={theme.animationSpeed}
                onChange={(e) => patchTheme("animationSpeed", Number(e.target.value))}
                className="h-2 w-full accent-[var(--primary)]"
                disabled={theme.animation === "none"}
              />
            </div>
          </EditorSection>
        </div>

        <aside className="shrink-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:self-stretch">
          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-black shadow-2xl ring-1 ring-white/10 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
            <div className="flex items-center justify-center border-b border-white/10 py-2">
              <span className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>
            <div className="max-h-[min(680px,calc(100dvh-12rem))] overflow-y-auto lg:max-h-none">
              {data.coverUrl ? (
                <SmartlinkLanding
                  key={`${previewTheme.animation}-${previewTheme.animationSpeed}-${previewTheme.preset}-${previewTheme.platformLayout}`}
                  title={data.title}
                  artist={data.artist}
                  coverUrl={data.coverUrl}
                  links={previewLinks}
                  theme={previewTheme}
                  preview
                />
              ) : (
                <div className="flex min-h-[520px] items-center justify-center bg-[#111] px-6 text-center text-base text-white/60">
                  Нужна обложка для превью
                </div>
              )}
            </div>
          </div>
          <p className="mt-2.5 shrink-0 text-center text-xs text-muted-foreground">
            Превью · анимация перезапускается при смене
          </p>
        </aside>
      </div>
    </div>
  )
}
