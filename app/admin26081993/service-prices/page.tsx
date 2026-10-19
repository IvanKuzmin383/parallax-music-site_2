"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PriceItem = {
  key: string
  title: string
  unitHint?: string
  priceRub: number
  compareAtRub: number | null
  discountPercent: number | null
  fromDb: boolean
  updatedAt: string | null
}

type Draft = {
  priceRub: string
  compareAtRub: string
  discountPercent: string
}

function draftFromItem(item: PriceItem): Draft {
  return {
    priceRub: String(item.priceRub),
    compareAtRub: item.compareAtRub != null ? String(item.compareAtRub) : "",
    discountPercent: item.discountPercent != null ? String(item.discountPercent) : "",
  }
}

function parsePositive(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").replace(/\s/g, ""))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export default function AdminServicePricesPage() {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [items, setItems] = useState<PriceItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch("/api/admin/service-prices", { credentials: "include" })
    if (res.status === 401) {
      setIsAuthenticated(false)
      return
    }
    if (!res.ok) throw new Error("fail")
    const data = (await res.json()) as { items?: PriceItem[] }
    const list = data.items ?? []
    setItems(list)
    setDrafts(Object.fromEntries(list.map((i) => [i.key, draftFromItem(i)])))
    setIsAuthenticated(true)
  }

  useEffect(() => {
    load()
      .catch(() => toast.error("Не удалось загрузить цены"))
      .finally(() => setLoading(false))
  }, [])

  const updateDraft = (key: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const cur = prev[key] ?? { priceRub: "", compareAtRub: "", discountPercent: "" }
      const next = { ...cur, ...patch }

      // Автозаполнение: цена + % → "было"; цена + "было" → %
      const price = parsePositive(next.priceRub)
      if (patch.discountPercent !== undefined && price != null) {
        const pct = parsePositive(next.discountPercent)
        if (pct != null && pct > 0 && pct < 100) {
          const compare = Math.round((price / (1 - pct / 100)) * 100) / 100
          next.compareAtRub = String(compare)
        }
      } else if (patch.compareAtRub !== undefined && price != null) {
        const compare = parsePositive(next.compareAtRub)
        if (compare != null && compare > price) {
          next.discountPercent = String(Math.round(((compare - price) / compare) * 100))
        } else if (!next.compareAtRub.trim()) {
          next.discountPercent = ""
        }
      } else if (patch.priceRub !== undefined) {
        const compare = parsePositive(next.compareAtRub)
        if (price != null && compare != null && compare > price) {
          next.discountPercent = String(Math.round(((compare - price) / compare) * 100))
        }
      }

      return { ...prev, [key]: next }
    })
  }

  const save = async (key: string) => {
    const d = drafts[key]
    if (!d) return
    const priceRub = parsePositive(d.priceRub)
    if (priceRub == null) {
      toast.error("Укажите корректную цену")
      return
    }
    const compareRaw = d.compareAtRub.trim()
    const compareAtRub = compareRaw ? parsePositive(compareRaw) : null
    if (compareRaw && compareAtRub == null) {
      toast.error("Некорректная старая цена")
      return
    }

    setSavingKey(key)
    try {
      const res = await fetch("/api/admin/service-prices", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          priceRub,
          compareAtRub: compareAtRub,
        }),
      })
      const data = (await res.json()) as { item?: PriceItem; error?: string }
      if (!res.ok || !data.item) {
        toast.error(data.error || "Не удалось сохранить")
        return
      }
      setItems((prev) => prev.map((i) => (i.key === key ? data.item! : i)))
      setDrafts((prev) => ({ ...prev, [key]: draftFromItem(data.item!) }))
      toast.success("Сохранено")
    } finally {
      setSavingKey(null)
    }
  }

  const reset = async (key: string) => {
    setSavingKey(key)
    try {
      const res = await fetch("/api/admin/service-prices", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, reset: true }),
      })
      const data = (await res.json()) as { item?: PriceItem; error?: string }
      if (!res.ok || !data.item) {
        toast.error(data.error || "Не удалось сбросить")
        return
      }
      setItems((prev) => prev.map((i) => (i.key === key ? data.item! : i)))
      setDrafts((prev) => ({ ...prev, [key]: draftFromItem(data.item!) }))
      toast.success("Сброшено на значение из кода")
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <AdminSectionNav active="service-prices" />
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <AdminSectionNav active="service-prices" />
        <p className="text-sm text-muted-foreground">
          Войдите в админку на главной странице раздела.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-6 px-4 sm:px-6">
      <AdminSectionNav active="service-prices" />
      <div>
        <h1 className="text-2xl font-semibold">Цены услуг</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Можно указать только цену или цену + скидку / старую цену (два из трёх
          автозаполняют третье). Подписки и тиры вертикальных видео здесь не
          редактируются.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const d = drafts[item.key] ?? draftFromItem(item)
          const previewPrice = parsePositive(d.priceRub)
          const previewCompare = parsePositive(d.compareAtRub)
          const previewPct =
            previewPrice != null && previewCompare != null && previewCompare > previewPrice
              ? Math.round(((previewCompare - previewPrice) / previewCompare) * 100)
              : null

          return (
            <Card key={item.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {item.title}
                  {item.unitHint ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.unitHint}
                    </span>
                  ) : null}
                  {item.fromDb ? (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                      Из БД
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      Дефолт
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`price-${item.key}`}>Цена, ₽</Label>
                    <Input
                      id={`price-${item.key}`}
                      inputMode="decimal"
                      value={d.priceRub}
                      onChange={(e) => updateDraft(item.key, { priceRub: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`pct-${item.key}`}>Скидка, %</Label>
                    <Input
                      id={`pct-${item.key}`}
                      inputMode="decimal"
                      placeholder="необяз."
                      value={d.discountPercent}
                      onChange={(e) =>
                        updateDraft(item.key, { discountPercent: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`old-${item.key}`}>Старая цена, ₽</Label>
                    <Input
                      id={`old-${item.key}`}
                      inputMode="decimal"
                      placeholder="необяз."
                      value={d.compareAtRub}
                      onChange={(e) =>
                        updateDraft(item.key, { compareAtRub: e.target.value })
                      }
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Превью:{" "}
                  {previewPrice != null ? (
                    <>
                      <span className="font-medium text-primary">
                        {previewPrice.toLocaleString("ru-RU")} ₽
                      </span>
                      {previewPct != null ? (
                        <>
                          {" "}
                          · скидка {previewPct}% ·{" "}
                          <span className="line-through">
                            {previewCompare!.toLocaleString("ru-RU")} ₽
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingKey === item.key}
                    onClick={() => void save(item.key)}
                  >
                    Сохранить
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingKey === item.key || !item.fromDb}
                    onClick={() => void reset(item.key)}
                  >
                    Сбросить на дефолт
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
